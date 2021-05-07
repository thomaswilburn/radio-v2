import ElementBase from "./lib/element-base.js";
import { $, matchData, proxyXML, getXML, removeCDATA } from "./lib/common.js";
import app from "./app.js";
import "./podcast-episode.js";

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

  constructor() {
    super();
    this.feed = null;
    this.query = null;
    this.offset = 0;
    this.limit = 10;
    this.pageSize = 10;
    this.proxied = false;
    
    this.elements.expandButton.addEventListener("click", this.onClickExpand);
    this.elements.playLatest.addEventListener("click", this.onClickPlayLatest);
    this.elements.title.addEventListener("click", this.onClickExpand);
    this.elements.showMoreButton.addEventListener("click", this.onClickMore);
    this.elements.unsubscribeButton.addEventListener("click", this.onClickUnsubscribe);
    this.elements.renameButton.addEventListener("click", this.onClickRename);
    this.elements.searchButton.addEventListener("click", this.onClickSearch);
    this.elements.refreshButton.addEventListener("click", this.onClickRefresh);
    this.elements.markHeardButton.addEventListener("click", this.onClickMarkHeard);
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
        this.load(value);
        break;
    }
  }

  async requestFeed(url) {
    var response;
    if (this.proxied) return proxyXML(url);
    try {
      response = await getXML(url);
      console.log(`Successful CORS request for ${url}`);
    } catch (err) {
      console.log(`Direct request for ${url} failed, using proxy`);
      this.proxied = true;
      response = await proxyXML(url);
    }
    return response;
  }
  
  async load(url = this.src) {
    this.classList.add("loading");
    var metadata = this.metadata = await app.feeds.get(url);
    this.elements.title.innerHTML = metadata.renamed || metadata.title || this.elements.title.innerHTML;
    try {
      var xml = await this.requestFeed(url);
    } catch (err) {
      this.classList.remove("loading");
      console.log("Unable to load feed: ", url);
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
        <div slot="title">${item.title}</div>
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
    });
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
    this.elements.expandButton.setAttribute("aria-pressed", expanded);
    if (expanded) {
      this.elements.title.scrollIntoView({ behavior: "smooth", block: "start" });
      this.elements.itemsHeader.focus({ preventScroll: true });
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
    metadata.listened = Date.now();
    app.feeds.set(this.src, metadata);
    this.dataset.unheard = 0;
  }
}

PodcastFeed.define("podcast-feed", "podcast-feed.html");
