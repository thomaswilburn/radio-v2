var express = require("express");
var https = require("https");
var http = require("http");
var stream = require("stream");

var app = express();

app.use(express.static("."));

var tap = new stream.Transform();
tap._transform = function(chunk, encoding, callback) {
  console.log(chunk.toString());
  callback(null, chunk);
};

var fetch = function(address, req, output) {
  var parsed = new URL(address);
  var remote = parsed.protocol == "http:" ? http : https;
  var { host, pathname, search } = parsed;
  var headers = Object.assign({}, req.headers);
  delete headers.host;
  delete headers.referer;
  console.log(`Fetching: ${parsed.toString()}`);
  headers["user-agent"] = "Radio";
  var p = remote.get({
    host,
    path: pathname + search,
    headers
  }, function(proxied) {
    if (proxied.statusCode > 300 && proxied.headers.location) {
      console.log(`Redirected from ${parsed.toString()} to ${proxied.headers.location}`);
      return fetch(proxied.headers.location, req, output);
    }
    delete proxied.headers["content-security-policy-report-only"];
    output.writeHead(proxied.statusCode, proxied.headers);
    proxied.pipe(output);
  });
  p.on("error", err => {
    console.log(err);
    output.writeHead(500);
    output.end();
  });
}

app.get("/proxy", function(req, response) {
  var url = new URL("http://localhost" + req.url);
  var address = url.searchParams.get("url");
  fetch(address, req, response);
});

app.listen(process.env.PORT || 8000);
