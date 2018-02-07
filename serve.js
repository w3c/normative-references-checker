var express = require("express");
var t0 = Date.now();

var app = module.exports = express();
const jsdom = require("jsdom");
const links = require("./lib/links.js");
const format = require("./lib/views/default.js");

const { JSDOM } = jsdom;

function logArgs() {
  var args = [ "[log]" ];
  args = args.concat(Array.from(arguments));
  process.nextTick(function() {
    console.log.apply(console, args);
  });
}

function warnArgs() {
  var args = [ "[warn]" ];
  args = args.concat(Array.from(arguments));
  process.nextTick(function() {
    console.warn.apply(console, args);
  });
}

function errArgs() {
  var args = [ "[err]" ];
  args = args.concat(Array.from(arguments));
  process.nextTick(function() {
    console.error.apply(console, args);
  });
}

var currentlyRunning = {};

var AUTHORIZED_URLS = [
  new RegExp("^https?://www.w3.org/TR/"),
  new RegExp("^https?://[-a-zA-Z0-9]+.github.io/"),
  new RegExp("^https?://rawgit.com/"),
  new RegExp("^https?://drafts.csswg.org/")
]

function isAuthorized(url) {
  return AUTHORIZED_URLS.reduce((r, e) => r || e.test(url), false);
}

app.enable('trust proxy');

app.get('/', function (req, res, next) {
  res.send("<html lang=en><head><title>Normative references checker</title></head>"
  + "<body><h1>Normative references checker</h1>"
  + "<form method=get action='./check'><input name=url type=text placeholder=URL size=40><button type=submit>Submit</button></form>"
  + "</body></html>");
});

app.get('/check', function (req, res, next) {
  if (!req.query.url) {
    warnArgs("missing url");
    res.status(400).send("<p>missing url parameter</p>");
  } else {
      var inputURL = req.query.url;
      var originURL = inputURL;
      
      if (!isAuthorized(inputURL)) {
        warnArgs("unauthorized: " + req.ip + " " + inputURL);
        res.status(403).send("<p>unauthorized url parameter</p>");
        return;
      }
      // use https://
      if (inputURL.startsWith("http://")) {
        inputURL = "https://" + inputURL.substring("http://".length);
      }
      if (!inputURL.startsWith("https://")) { // just in case...
        warnArgs("unauthorized: " + req.ip + " " + inputURL);
        res.status(403).send("<p>unauthorized url parameter</p>");
        return;
      }
      if (inputURL in currentlyRunning) {
        logArgs("already running: " + inputURL);
        res.status(409).send("<p>duplicate request?</p>");
        return;
      }
      currentlyRunning[inputURL] = true;
      logArgs("processing " + inputURL);
      JSDOM.fromURL(inputURL).then(dom => {
        return dom.window.document;
      }).then(document => {
        if (links.isRespec(document)) {
          inputURL = "https://labs.w3.org/spec-generator/?type=respec&url=" + inputURL;
          logArgs("spec-generator: " + inputURL);
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
          foundNormativeSection: lists.foundNormativeSection,
          isBikeshed: links.isBikeshed(document),
          unknownLinks: lists.unknown,
          knownLinks: lists.known
        });
        res.send(outputHTML);
      }).catch(e => {
        if (e.statusCode) {
          errArgs(e.statusCode + " " + e.name + ": " + inputURL);
          res.status(e.statusCode).send("<p>Received " + e.name + " " + e.statusCode);          
        } else {
          errArgs(e.name + ": " + inputURL);
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
