import ElementBase from "./lib/element-base.js";
import { matchData } from "./lib/common.js";
import app from "./app.js";
import "./podcast-feed.js";
import { measure, flip } from "./lib/flip.js";

class PodcastList extends ElementBase {
  constructor() {
    super();
    this.load().then(() => app.feeds.on("change", this.load));
  }
  
  static get boundMethods() {
    return [
      "load",
      "onUnsubRequest"
    ];
  }

  connectedCallback() {
    app.on("podcast-unsubscribe", this.onUnsubRequest);
    app.on("podcast-subscribe", this.onSubscribeRequest);
  }

  disconnectedCallback() {
    app.off("podcast-unsubscribe", this.onUnsubRequest);
    app.off("podcast-subscribe", this.onSubscribeRequest);
  }
  
  async load() {
    var feeds = await app.feeds.getAll();
    if (!feeds.length) {
      feeds = [
        { url: "https://www.npr.org/rss/podcast.php?id=510312", subscribed: 0 },
        { url: "https://rss.acast.com/vicegamingsnewpodcast", subscribed: 1 },
        { url: "https://rss.simplecast.com/podcasts/2269/rss", subscribed: 2 }
      ];
      for (var f of feeds) {
        await app.feeds.set(f.url, f);
      }
    }
    feeds = feeds.sort(function(a, b) {
      if (a.latest || b.latest) {
        return (b.latest || 0) - (a.latest || 0);
      }
      return a.subscribed - b.subscribed;
    });
    await customElements.whenDefined("podcast-feed");
    measure(this.children);
    matchData(this, feeds, "url", function(item) {
      var list = document.createElement("podcast-feed");
      list.src = item.url;
      return list;
    });
    flip(this.children);
  }
  
  async onUnsubRequest(data) {
    var { url } = data;
    var feed = await app.feeds.get(url);
    if (!feed) return;
    var confirmed = confirm(`Unsubscribe from ${feed.title || feed.url}?`);
    if (!confirmed) return;
    await app.feeds.delete(url);
  }
  
  async onSubscribeRequest() {
    var url = prompt("Feed URL?");
    if (!url) return;
    var subscribed = Date.now();
    await app.feeds.set(url, { url, subscribed });
  }

  static get template() {
    return `<slot></slot>`;
  }
}

PodcastList.define("podcast-list");
