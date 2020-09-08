export var matchData = function(container, data, key = "key", element = "div") {
  var children = Array.from(container.children);
  var elements = new Map();
  var items = new Map();
  var unmatched = [];
  data.forEach(function(item) {
    var [ match ] = children.filter(c => c.dataset.key == item[key]);
    if (match) {
      elements.set(item, match);
      items.set(match, item);
    } else {
      unmatched.push(item);
    }
  });
  // remove children that don't exist anymore
  children = children.filter(function(child) {
    if (items.has(child)) return true;
    child.remove();
  });
  // create new children
  unmatched.forEach(function(item) {
    var child = typeof element == "string" ? document.createElement(element) : element(item);
    child.dataset.key = item[key];
    elements.set(item, child);
  });
  // re-sort to match
  var result = data.map(function(item, i) {
    var child = elements.get(item);
    if (children[i] != child) {
      if (children[i]) {
        container.insertBefore(child, children[i]);
      } else {
        container.appendChild(child);
      }
    }
    return [ item, child ];
  });
  return result;
}

export var proxyXML = function(dest) {
  var here = window.location.pathname;
  // remove trailing path parts
  here = here.replace(/\/[^\/]*$/, "");
  var url = new URL(window.location.origin + here + "/proxy");
  url.searchParams.set("url", dest);
  return getXML(url);
};

export var getXML = function(url) {
  return new Promise(function(ok, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url.toString());
    xhr.responseType = "document";
    xhr.send();
    xhr.onload = () => ok(xhr.response);
    xhr.onerror = fail;
  })
}

export var removeCDATA = str => str.replace(/^<!\[CDATA\[|<[^>]+>|\]\]>$/g, "").trim();

export var $ = (s, d = document) => Array.from(d.querySelectorAll(s));
$.one = (s, d = document) => d.querySelector(s);
