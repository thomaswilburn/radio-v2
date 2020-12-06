addEventListener("install", function(e) {
  console.clear();
  console.log("installed", e);
});

addEventListener("activate", function(e) {
  console.log("activated", e);
});

addEventListener("fetch", async function(e) {

});
