import ElementBase from "./lib/element-base.js";
import { matchData, debounce } from "./lib/common.js";
import app from "./app.js";
import "./podcast-feed.js";
import { measure, flip } from "./lib/flip.js";

const OVERSCROLL_THRESHOLD = window.innerHeight * .5;
const REFRESH_THRESHOLD = OVERSCROLL_THRESHOLD * .8;
const START_OVERSCROLL = 30;

class PodcastList extends ElementBase {
  
  static boundMethods = [
    "load",
    "onUnsubRequest",
    "onTouchStart",
    "onTouchEnd",
    "onTouchMove"
  ]

  constructor() {
    super();
    this.load().then(() => app.feeds.on("change", debounce(this.load)));
    app.on("list-top", () => {
      var first = this.querySelector("podcast-feed");
      if (first) {
        first.scrollIntoView({ behavior: "smooth" });
      }
    });

    // handle menu taps
    var { list } = this.elements;
    this.addEventListener("menu-state", e => {
      this.classList.toggle("menu-open", e.detail.open);
    });

    // overscroll refresh
    this.scrollOrigin = false;
    this.addEventListener("touchstart", this.onTouchStart);
    this.addEventListener("touchend", this.onTouchEnd);
    this.addEventListener("touchmove", this.onTouchMove);
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
        var aUnread = a.listened && a.listened > a.latest ? 10 : 1;
        var bUnread = b.listened && b.listened > b.latest ? 10 : 1;
        return (b.latest || 0) / bUnread - (a.latest || 0) / aUnread;
      }
      return a.subscribed - b.subscribed;
    });
    await customElements.whenDefined("podcast-feed");
    measure(this.children);
    matchData(this, feeds, "url", function(item) {
      var list = document.createElement("podcast-feed");
      list.src = item.url;
      list.setAttribute("role", "listitem");
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

  onTouchStart(e) {
    if (this.scrollTop == 0 && !this.scrollOrigin) {
      this.scrollOrigin = e.touches[0].clientY;
      this.elements.refresh.classList.remove("released");
    }
  }

  onTouchEnd(e) {
    if (this.scrollOrigin && this.scrollTop == 0) {
      var offset = e.changedTouches[0].clientY - this.scrollOrigin;
      if (offset > REFRESH_THRESHOLD) app.fire("refresh-all");
    }
    this.scrollOrigin = false;
    this.elements.refresh.style.transform = "";
    this.elements.refresh.classList.add("released");
    this.style.overflowY = "";
  }

  onTouchMove(e) {
    if (this.scrollOrigin) {
      var { refresh } = this.elements;
      var offset = e.changedTouches[0].clientY - this.scrollOrigin;
      if (offset < 0) return;
      if (offset > START_OVERSCROLL) {
        this.style.overflowY = "hidden";
      }
      if (offset > OVERSCROLL_THRESHOLD) offset = OVERSCROLL_THRESHOLD;
      var half = OVERSCROLL_THRESHOLD * .5;
      var scaled = Math.sin(offset / OVERSCROLL_THRESHOLD * (Math.PI / 2)) * half;
      refresh.style.transform = `translateY(${scaled}px)`;
      refresh.classList.toggle("will-refresh", offset > REFRESH_THRESHOLD);
      var ratio = offset / REFRESH_THRESHOLD;
      refresh.classList.toggle("pulled-33", ratio > .3);
      refresh.classList.toggle("pulled-66", ratio > .6);
      refresh.classList.toggle("pulled-100", ratio > .9);
    }
  }
}

PodcastList.define("podcast-list", "podcast-list.html");
