var measurements = new WeakMap();

export var measure = function(elements) {
  elements = Array.from(elements);
  for (var e of elements) {
    measurements.set(e, e.getBoundingClientRect());
  }
}

var tick = () => new Promise(ok => requestAnimationFrame(ok));
var invalidate = () => document.body.offsetWidth;

export var flip = function(elements) {
  elements = Array.from(elements);
  for (var element of elements) {
    element.getAnimations().forEach(a => a.finish());
    var previous = measurements.get(element);
    if (!previous) continue;
    var bounds = element.getBoundingClientRect();
    var dx = previous.left - bounds.left;
    var dy = previous.top - bounds.top;
    if (Math.abs(dy) < 10) continue;
    element.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(0, 0)` }
    ], { duration: 300, easing: "ease", fill: "both" })
  }
}
