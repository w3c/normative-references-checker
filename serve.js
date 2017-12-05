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
  new RegExp("^https?://www.w3.org/TR/"),
  new RegExp("^https?://[-a-zA-Z0-9]+.github.io/"),
  new RegExp("^https?://drafts.csswg.org/")
]

function isAuthorized(url) {
  for (let index = 0; index < AUTHORIZED_URLS.length; index++) {
    if (AUTHORIZED_URLS[index].test(url)) return true;
  }
  return false;
}

app.get('/', function (req, res, next) {
  if (!req.query.url) {
    logArgs("[missing url]");
    res.status(400).send("<p>missing url parameter</p>");
  } else {
      var inputURL = req.query.url;
      var originURL = inputURL;
      
      if (!isAuthorized(inputURL)) {
        logArgs("[unauthorized] " + inputURL);
        res.status(403).send("<p>unauthorized url parameter</p>");
        return;
      }
      // use https://
      if (inputURL.startsWith("http://")) {
        inputURL = "https://" + inputURL.substring("http://".length);
      }
      if (!inputURL.startsWith("https://")) { // just in case...
        logArgs("[unauthorized] " + inputURL);
        res.status(403).send("<p>unauthorized url parameter</p>");
        return;
      }
      if (inputURL in currentlyRunning) {
        logArgs("[ongoing] " + inputURL);
        res.status(409).send("<p>duplicate request?</p>");
        return;
      }
      currentlyRunning[inputURL] = true;
      logArgs("[get] " + inputURL);
      JSDOM.fromURL(inputURL).then(dom => {
        return dom.window.document;
      }).then(document => {
        var script = document.querySelector("script.remove");
        if (script !==  null) {
          inputURL = "https://labs.w3.org/spec-generator/?type=respec&url=" + inputURL;
          logArgs("[respec] " + inputURL);
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
        });
        res.send(outputHTML);
      }).catch(e => {
        logArgs("[error] " + e.name);
        if (e.statusCode) {
          res.status(e.statusCode).send("<p>Received " + e.statusCode);          
        } else {
          res.status(500).send("<p>Received " + e.name);
        }
      }).then(function () {
        delete currentlyRunning[inputURL];
      });
    }
});

var port = process.env.PORT || 5000;

app.listen(port, function() {

    console.log("Express server listening on port %d in %s mode", port, app.settings.env);

    console.log("App started in", (Date.now() - t0) + "ms.");

});
