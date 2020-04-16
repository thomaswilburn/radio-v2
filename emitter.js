export default class Emitter {
  constructor() {
    this.events = {};
  }
  
  on(e, callback) {
    if (!this.events[e]) this.events[e] = [];
    this.events[e].push(callback);
  }
  
  off(e, callback) {
    if (!this.events[e]) return;
    this.events[e] = this.events[e].filter(f => f != callback);
  }
  
  fire(e, data) {
    if (!this.events[e]) return;
    // console.log(e, this.events[e]);
    this.events[e].forEach(f => f(data));
  }
  
}