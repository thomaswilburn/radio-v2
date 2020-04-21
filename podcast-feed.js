import ElementBase from "./lib/element-base.js";
import { $, matchData, proxyXML, removeCDATA } from "./lib/common.js";
import app from "./app.js";
import "./podcast-episode.js";

class PodcastFeed extends ElementBase {
  constructor() {
    super();
    this.feed = null;
    this.query = null;
    this.offset = 0;
    this.limit = 10;
    this.pageSize = 10;
    
    this.elements.expandButton.addEventListener("click", this.onClickExpand);
    this.elements.title.addEventListener("click", this.onClickExpand);
    this.elements.showMoreButton.addEventListener("click", this.onClickMore);
    this.elements.unsubscribeButton.addEventListener("click", this.onClickUnsubscribe);
    this.elements.renameButton.addEventListener("click", this.onClickRename);
    this.elements.searchButton.addEventListener("click", this.onClickSearch);
    this.elements.refreshButton.addEventListener("click", this.onClickRefresh);
    this.addEventListener("episode-play", this.sendPlayRequest);
    app.on("refresh-all", this.load);
  }
  
  static get boundMethods() {
    return [
      "load",
      "onClickExpand",
      "onClickMore",
      "onClickUnsubscribe",
      "onClickRename",
      "onClickSearch",
      "onClickRefresh",
      "sendPlayRequest"
    ]
  }
  
  static get observedAttributes() {
    return ["src"];
  }
  
  static get mirroredProps() {
    return ["src"];
  }
  
  attributeChangedCallback(attr, was, value) {
    switch (attr) {
      case "src":
        this.load(value);
        break;
    }
  }
  
  async load(url = this.src) {
    this.classList.add("loading");
    var metadata = this.metadata = await app.feeds.get(url);
    this.elements.title.innerHTML = metadata.renamed || metadata.title || this.elements.title.innerHTML;
    var xml = await proxyXML(url);
    var parsed = this.parseFeed(xml);
    // save title and current request time for later
    metadata.title = parsed.title;
    metadata.requested = Date.now();
    app.feeds.set(url, metadata);
    // update UI
    this.elements.title.innerHTML = metadata.renamed || metadata.title;
    this.feed = parsed;
    var listened = metadata.listened || 0;
    var unheard = this.feed.items.filter(f => f.date > listened).length;
    this.elements.unheard.innerHTML = unheard;
    this.elements.total.innerHTML = this.feed.items.length;
    // render episode items
    await window.customElements.whenDefined("podcast-episode");
    this.render();
    this.classList.remove("loading");
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
    matchData(this.elements.items, items, "enclosure", function(item) {
      var episode = document.createElement("podcast-episode");
      episode.setAttribute("src", item.enclosure);
      episode.innerHTML = `
        <div slot="title">${item.title}</div>
        <div slot="description">${item.description.replace(/\n+/g, "<br><br>")}</div>
      `;
      return episode;
    });
  }
  
  parseFeed(document) {
    var parsed = {};
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
      return result;
    });
    parsed.title = $.one("channel title", document).textContent.trim();
    return parsed;
  }
  
  onClickSearch() {
    var query = prompt("Search feed for term:", this.query || "");
    this.query = query;
    this.render();
  }
  
  async onClickRename() {
    var metadata = await app.feeds.get(this.src);
    metadata.renamed = prompt("New name?", metadata.renamed || metadata.title).trim();
    await app.feeds.set(this.src, metadata);
    this.elements.title.innerHTML = metadata.renamed || metadata.title;
  }
  
  onClickRefresh() {
    this.load();
  }
  
  onClickUnsubscribe() {
    app.fire("podcast-unsubscribe", { url: this.src });
  }
  
  onClickExpand() {
    this.classList.toggle("expanded");
    this.elements.expandButton.setAttribute("aria-pressed", this.classList.contains("expanded"));
  }
  
  onClickMore() {
    this.limit += this.pageSize;
    this.render();
  }
  
  async sendPlayRequest(e) {
    var { url } = e.detail;
    var episode = this.feed.items.find(e => e.enclosure == url);
    app.fire("play-request", {
      ...episode,
      feed: this.feed.title
    });
    var metadata = await app.feeds.get(this.src);
    metadata.listened = Date.now();
    app.feeds.set(this.src, metadata);
    this.elements.unheard.innerHTML = 0;
  }
}

PodcastFeed.define("podcast-feed", "podcast-feed.html");