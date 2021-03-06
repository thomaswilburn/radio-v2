/*
Singleton class for the app
Elements can import this to get access to app state
Also handles coordinating between the player and the other UI elements
*/

import Table from "./lib/storage.js";
import Emitter from "./lib/emitter.js";

class Radio extends Emitter {
  constructor() {
    super();
    this.feeds = new Table("feeds");
    this.on("sync-export", () => this.syncUp());
    this.on("sync-import", () => this.syncDown());
  }
  
  async read(key) {
    var v = localStorage.getItem(key);
    if (!v) return null;
    return JSON.parse(v);
  }
  
  async write(key, value) {
    var v = JSON.stringify(value);
    localStorage.setItem(key, v);
  }
  
  async syncUp() {
    var feeds = await this.feeds.getAll();
    var body = JSON.stringify(feeds);
    var post = await fetch("/fetch-key-repeat/new", {
      method: "POST",
      body,
      mode: "cors"
    });
    var { key } = await post.json();
    if (!key) {
      return alert("Unable to sync with the copy/paste server!");
    }
    alert(`Got a sync key: ${key}`);
  }
  
  async syncDown() {
    var key = prompt("Sync key?");
    if (!key) return;
    var request = await fetch(`/fetch-key-repeat/${key}`);
    var json = await request.json();
    if (!json instanceof Array) return alert("Unable to parse feed array!");
    for (var feed of json) {
      var legacy = typeof feed == "string";
      var url = legacy ? feed : feed.url;
      var data = legacy ? { url, subscribed: Date.now() } : feed;
      await this.feeds.set(url, data);
    }
  }
}

export default new Radio();
