import Emitter from "./emitter.js";

class Table extends Emitter {
  constructor(name) {
    super();
    this.name = name;
    this.db = new Promise(function(ok, fail) { 
      var opening = window.indexedDB.open(name, 1);
      opening.onsuccess = e => ok(e.target.result);
      opening.onerror = fail;
      opening.onupgradeneeded = e => {
        e.target.result.createObjectStore(name, { autoIncrement: true });
      }
    });
  }
  
  async transaction() {
    var db = await this.db;
    return db.transaction([this.name], "readwrite");
  }
  
  async getStore() {
    var transaction = await this.transaction();
    return transaction.objectStore(this.name);
  }
  
  wrapRequest(request) {
    return new Promise(function(ok, fail) {
      request.onsuccess = e => ok(e.target.result);
      request.onerror = fail;
    });
  }
  
  async set(key, value) {
    var store = await this.getStore();
    await this.wrapRequest(store.put(value, key));
    this.fire("change", { type: "set", key, value });
  }
  
  async get(key) {
    var store = await this.getStore();
    return this.wrapRequest(store.get(key));
  }
  
  async getAll() {
    var store = await this.getStore();
    return this.wrapRequest(store.getAll());
  }
  
  async delete(key) {
    var store = await this.getStore();
    await this.wrapRequest(store.delete(key));
    this.fire("change", { type: "delete", key });
  }

  [Symbol.asyncIterator]() {
    var cursor;
    var next = async () => {
      if (!cursor) {
        var store = await this.getStore();
        cursor = store.openCursor();
      }
      var result = await this.wrapRequest(cursor);
      if (result) {
        result.continue();
        return { value: result.value, done: false };
      }
      return { done: true }
    }
    return { next };
  }
}

export default Table;