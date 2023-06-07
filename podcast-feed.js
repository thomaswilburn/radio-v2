import ElementBase from "./lib/element-base.js";
import { $, matchData, widont } from "./lib/common.js";
import app from "./app.js";
import "./podcast-episode.js";
import "./podcast-menu.js";

var removeCDATA = str => str.replace(/^<!\[CDATA\[|<[^>]+>|\]\]>$/g, "").trim();

class PodcastFeed extends ElementBase {

  static boundMethods = [
    "load",
    "onClickExpand",
    "onClickPlayLatest",
    "onClickMore",
    "onClickUnsubscribe",
    "onClickRename",
    "onClickSearch",
    "onClickRefresh",
    "onClickMarkHeard",
    "sendPlayRequest"
  ]

  feed = null;
  query = null;
  offset = 0;
  limit = 10;
  pageSize = 10;
  proxied = true;
  etag = null;
  since = null;

  constructor() {
    super();
    
    this.elements.playLatest.addEventListener("click", this.onClickPlayLatest);
    this.elements.title.addEventListener("click", this.onClickExpand);
    this.elements.showMoreButton.addEventListener("click", this.onClickMore);
    // this.elements.unsubscribeButton.addEventListener("click", this.onClickUnsubscribe);
    // this.elements.renameButton.addEventListener("click", this.onClickRename);
    // this.elements.searchButton.addEventListener("click", this.onClickSearch);
    // this.elements.refreshButton.addEventListener("click", this.onClickRefresh);
    // this.elements.markHeardButton.addEventListener("click", this.onClickMarkHeard);

    this.addEventListener("menu-action:refresh", this.onClickRefresh);
    this.addEventListener("menu-action:search", this.onClickSearch);
    this.addEventListener("menu-action:unsubscribe", this.onClickUnsubscribe);
    this.addEventListener("menu-action:rename", this.onClickRename);
    this.addEventListener("menu-action:clear", this.onClickMarkHeard);
    this.addEventListener("menu-action:latest", this.onClickPlayLatest);

    this.addEventListener("menu-state", e => this.classList.toggle("menu-open", e.detail.open));
    
    this.addEventListener("episode-play", this.sendPlayRequest);
  }
  
  connectedCallback() {
    app.on("refresh-all", this.load);
    app.on("clear-all", this.onClickMarkHeard);
  }

  disconnectedCallback() {
    app.off("refresh-all", this.load);
    app.off("clear-all", this.onClickMarkHeard);
  }
  
  static observedAttributes = ["src"]
  static mirroredProps = ["src"]
  
  attributeChangedCallback(attr, was, value) {
    switch (attr) {
      case "src":
        this.etag = null;
        this.since = null;
        this.load(value);
        break;
    }
  }

  getHeader(xhr, header) {
    var headers = xhr.getAllResponseHeaders();
    var includes = new RegExp("^" + header, "mi");
    if (!includes.test(headers)) {
      return null;
    }
    return xhr.getResponseHeader(header);
  }

  getXML(url) {
    return new Promise((ok, fail) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url.toString());
      xhr.responseType = "document";
      if (this.etag) {
        xhr.setRequestHeader("If-None-Match", this.etag);
      }
      if (this.since) {
        xhr.setRequestHeader("If-Modified-Since", this.since);
      }
      xhr.send();
      xhr.onload = () => {
        if (xhr.status == 304) return fail(xhr);
        this.etag = this.getHeader(xhr, "etag");
        // nobody correctly sets allow-headers for CORS requests
        // but the browser will still reject them
        // so only store the last-modified if it's explicitly allowed
        var allowHeaders = this.getHeader(xhr, "access-control-allow-headers");
        if (this.proxied || (allowHeaders && allowHeaders.match(/if-modified-since/))) {
          // this.since = this.getHeader(xhr, "last-modified");
        }
        ok(xhr);
      };
      xhr.onerror = err => fail(xhr);
    });
  }

  proxyXML(dest) {
    var here = window.location.pathname;
    // remove trailing path parts
    here = here.replace(/\/[^\/]*$/, "");
    var url = new URL(window.location.origin + here + "/proxy");
    url.searchParams.set("url", dest);
    return this.getXML(url);
  }

  async requestFeed(url) {
    var request;
    try {
      // technically, everything is proxied now
      // the bandwidth savings are too high to ignore (5MB vs. 1MB)
      if (this.proxied) {
        request = await this.proxyXML(url);
        console.log(`Successful proxy request for ${url}`);
      } else {
        request = await this.getXML(url);
        console.log(`Successful CORS request for ${url}`);
      }
    } catch (err) {
      // retry through the proxy
      if (!this.proxied && err.status == 0) {
        this.proxied = true;
        return this.requestFeed(url);
      }
      if (err.status == 304) {
        throw err;
      }
    }
    return request.response;
  }
  
  async load(url = this.src) {
    this.classList.add("loading");
    var metadata = this.metadata = await app.feeds.get(url);
    this.elements.title.innerHTML = metadata.renamed || metadata.title || this.elements.title.innerHTML;
    try {
      var xml = await this.requestFeed(url);
    } catch (err) {
      this.classList.remove("loading");
      if (err.status == 304) {
        console.info("Feed is unchanged since last request", url);
      } else {
        console.error("Unable to load feed: ", url);
      }
      return;
    }
    this.classList.remove("loading");
    var parsed = this.parseFeed(xml);
    // save title and current request time for later
    metadata.title = parsed.title;
    metadata.requested = Date.now();
    metadata.latest = parsed.latest;
    metadata.credit = parsed.credit;
    app.feeds.set(url, metadata);
    // update UI
    var title = metadata.renamed || metadata.title
    this.elements.title.innerHTML = title;
    var feedTitleLabels = this.shadowRoot.querySelectorAll(".feed-name");
    feedTitleLabels.forEach(t => t.innerHTML = title);
    this.feed = parsed;
    var listened = metadata.listened || 0;
    var unheard = this.feed.items.filter(f => f.date > listened).length;
    this.dataset.unheard = unheard;
    // render episode items
    await window.customElements.whenDefined("podcast-episode");
    this.render();
  }
  
  getViewable() {
    if (this.query) {
      var term = new RegExp(this.query, "i");
      return this.feed.items.filter(item => item.title.match(term) || item.description.match(term));
    }
    return this.feed.items.slice(this.offset, this.offset + this.limit);
  }
  
  render() {
    this.classList.toggle("searching", this.query);
    var items = this.getViewable();
    this.elements.showMoreButton.style.display = items.length == this.feed.items.length ? "none" : "";
    matchData(this, items, "enclosure", function(item) {
      var episode = document.createElement("podcast-episode");
      episode.setAttribute("src", item.enclosure);
      episode.innerHTML = `
        <div slot="title">${widont(item.title)}</div>
        <div slot="description">${item.description.replace(/\n+/g, "<br><br>")}</div>
      `;
      episode.setAttribute("role", "listitem");
      return episode;
    });
  }
  
  parseFeed(document) {
    var parsed = {};
    var artwork = $.one("image url", document);
    artwork = artwork ? artwork.textContent.trim() : null;
    parsed.items = $("item", document).map(function(item) {
      var result = {};
      ["pubDate", "title", "description", "link"].forEach(function(k) {
        var element = $.one(k, item);
        if (element) result[k] = removeCDATA(element.textContent);
      });
      var enclosure = item.querySelector("enclosure");
      if (!enclosure) return null;
      result.enclosure = enclosure.getAttribute("url");
      result.date = new Date(result.pubDate ? Date.parse(result.pubDate) : 0);
      var trackArt = item.getElementsByTagName("itunes:image")[0];
      result.artwork = trackArt ? trackArt.getAttribute("href") : artwork;
      return result;
    }).filter(i => i).sort((a, b) => b.date - a.date);
    parsed.title = $.one("channel title", document).textContent.trim();
    parsed.latest = Math.max(...parsed.items.map(i => i.date));
    var credit = document.getElementsByTagName("itunes:author")[0] ||
      document.getElementsByTagName("media:credit")[0] ||
      $.one("author", document) || null;
    parsed.credit = credit ? credit.textContent.trim() : "";
    return parsed;
  }

  onClickPlayLatest() {
    var episode = this.querySelector("podcast-episode");
    episode.onClickPlay();
  }
  
  onClickSearch() {
    var query = prompt("Search feed for term:", this.query || "");
    this.query = query;
    if (query) this.classList.add("expanded");
    this.render();
  }
  
  async onClickRename() {
    var metadata = await app.feeds.get(this.src);
    var name = prompt("New name?", metadata.renamed || metadata.title)
    if (!name) return;
    metadata.renamed = name.trim();
    await app.feeds.set(this.src, metadata);
    this.elements.title.innerHTML = metadata.renamed || metadata.title;
    this.feed.title = metadata.renamed;
  }
  
  onClickRefresh() {
    this.load();
  }
  
  onClickUnsubscribe() {
    app.fire("podcast-unsubscribe", { url: this.src });
  }
  
  onClickExpand() {
    var expanded = this.classList.toggle("expanded");
    if (expanded) {
      this.elements.title.scrollIntoView({ behavior: "smooth", block: "start" });
      this.elements.itemsHeader.focus({ preventScroll: true });
      if (Number(this.dataset.unheard)) {
        var first = this.querySelector("podcast-episode");
        if (first && !first.classList.contains("expanded")) first.onExpand();
      }
    } else {
      this.elements.title.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  
  onClickMore() {
    this.limit += this.pageSize;
    this.render();
  }

  async onClickMarkHeard() {
    var metadata = await app.feeds.get(this.src);
    metadata.listened = Date.now();
    await app.feeds.set(this.src, metadata);
    this.dataset.unheard = 0;
    // close, but do not scroll - animation needs to run
    this.classList.toggle("expanded", false);
    this.elements.expandButton.setAttribute("aria-pressed", false);
  }
  
  async sendPlayRequest(e) {
    var { url } = e.detail;
    var episode = this.feed.items.find(e => e.enclosure == url);
    app.fire("play-request", {
      ...episode,
      feed: this.feed.title,
      credit: this.feed.credit
    });
    var metadata = await app.feeds.get(this.src);
    var listened = Math.max(metadata.listened || 0, episode.date * 1);
    metadata.listened = listened;
    var unheard = this.feed.items.filter(f => f.date > listened).length;
    app.feeds.set(this.src, metadata);
    this.dataset.unheard = unheard;
  }
}

PodcastFeed.define("podcast-feed", "podcast-feed.html");
