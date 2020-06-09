addEventListener("install", function(e) {
  console.clear();
  console.log("installed", e);
});

addEventListener("activate", function(e) {
  console.log("activated", e);
});

addEventListener("fetch", async function(e) {
  var url = new URL(e.request.url);
  // short-circuit external (or proxied) requests
  if (url.hostname != location.hostname || url.pathname.match(/^\/proxy/)) return;

  console.log(`Intercepted fetch for ${url}`);
  var respond = async function() {
    var cache = await caches.open("offline");
    try {
      var network = await fetch(e.request);
      if (network.status >= 300) throw "Redirected for 'local' files";
      e.waitUntil(cache.put(e.request, network.clone()));
      console.log(`Cached ${url}`);
      return network;
    } catch (err) {
      console.log(err);
      console.log(`Network failed, returning cache for ${url}`);
      return cache.match(e.request);
    }
  };

  e.respondWith(respond());
  
});