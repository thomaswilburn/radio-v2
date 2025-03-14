import Emitter from "./emitter.js";

var instances = new Map();

class Table extends Emitter {
  constructor(name) {
    if (instances.has(name)) return instances.get(name);
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
    instances.set(name, this);
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

  async *[Symbol.asyncIterator]() {
    var store = await this.getStore();
    var cursor = store.openCursor();
    var stream = new ReadableStream({
      start(controller) {
        cursor.onerror = e => controller.error(e);
        cursor.onsuccess = e => {
          var { result } = e.target;
          if (result) {
            var { value } = result;
            controller.enqueue(value);
            result.continue();
          } else {
            controller.close();
          }
        }
      }
    });
    yield *stream;
  }

  async *where(condition) {
    for await (var item of this) {
      if (condition(item)) {
        yield item;
      }
    }
  }
}

export default Table;
