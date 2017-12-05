var express = require("express");
var t0 = Date.now();

var app = module.exports = express();
const jsdom = require("jsdom");
const links = require("./lib/links.js");
const format = require("./lib/views/default.js");

const { JSDOM } = jsdom;

function logArgs() {
  var args = arguments;
  process.nextTick(function() {
    console.log.apply(console, args);
  });
}

var currentlyRunning = {};

var AUTHORIZED_URLS = [
  new RegExp("https?://www.w3.org/TR/"),
  new RegExp("https?://w3c.github.io/"),
]

function isAuthorized(url) {
  for (let index = 0; index < AUTHORIZED_URLS.length; index++) {
    if (AUTHORIZED_URLS[index].test(url)) return true;
  }
  return false;
}

app.get('/norm', function (req, res, next) {
  if (!req.query.url) {
    res.send("<p>missing url parameter</p>");
  } else {
      var inputURL = req.query.url;
      var originURL = inputURL;
      logArgs("[log] " + inputURL);
      if (!isAuthorized(inputURL)) {
        res.send("<p>unauthorized url parameter</p>");
        return;
      }
      // convenience
      if (inputURL.startsWith("http://www.w3.org/")) {
        inputURL = "https://www.w3.org/" + inputURL.substring("http://www.w3.org/".length);
      }
      
      JSDOM.fromURL(inputURL).then(dom => {
        return dom.window.document;
      }).then(document => {
        var script = document.querySelector("script.remove");
        if (script !==  null) {
          inputURL = "https://labs.w3.org/spec-generator/?type=respec&url=" + inputURL;
          return JSDOM.fromURL(inputURL).then(dom => {
            return dom.window.document;
          });
        }
        return document;
      }).then(document => {
        var title = document.querySelector("head title").textContent;
        var lists = links.getLinks(document, inputURL);
      
        var outputHTML = format.toHTML({
          title: title,
          inputURL: inputURL,
          originURL: originURL,
          unknownLinks: lists.unknown,
          knownLinks: lists.known
        })
        res.send(outputHTML);
      });
  }
});

var port = process.env.PORT || 5000;

app.listen(port, function() {

    console.log("Express server listening on port %d in %s mode", port, app.settings.env);

    console.log("App started in", (Date.now() - t0) + "ms.");

});
