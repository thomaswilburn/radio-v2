var measurements = new WeakMap();

export var measure = function(elements) {
  console.log(elements.length);
  elements = Array.from(elements);
  elements.forEach(function(e) {
    measurements.set(e, e.getBoundingClientRect());
  });
}

var tick = () => new Promise(ok => requestAnimationFrame(ok));
var invalidate = () => document.body.offsetWidth;

export var flip = function(elements) {
  elements = Array.from(elements);
  elements.forEach(function(element) {
    var previous = measurements.get(element);
    if (!previous) return;
    var bounds = element.getBoundingClientRect();
    if (bounds.top == previous.top) return;
    var dx = previous.left - bounds.left;
    var dy = previous.top - bounds.top;
    element.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(0, 0)` }
    ], { duration: 300, easing: "ease" })
  });
}