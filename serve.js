const express = require("express");
const io = require("io-promise");
const t0 = Date.now();

const monitor  = require('./monitor.js');
let app = module.exports = express();
const jsdom = require("jsdom");
const links = require("./lib/links.js");
const format = require("./lib/views/default.js");

const { JSDOM } = jsdom;

let currentlyRunning = {};

let AUTHORIZED_URLS = [];

io.read("./url-authorized.txt").then(data => {
  data.split('\n').forEach(line => {
    if (!(line.charAt(0) === '#')) {
      line = line.trim();
      if (line !== "") {
        AUTHORIZED_URLS.push(new RegExp(line));
      }
    }
  })
})
function isAuthorized(url) {
  return AUTHORIZED_URLS.reduce((r, e) => r || e.test(url), false);
}

app.enable('trust proxy');

monitor.setName("Normative reference checker");
monitor.install(app);

let FORM = null;
app.get('/', function (req, res, next) {
  if (FORM === null) {
    io.read('./docs/form.html').then(data => {
      FORM = data;
      res.send(FORM);
    }).catch(e => res.status(500).send("contact Starman. He is orbiting somewhere in space in his car."));
  } else {
    res.send(FORM);
  }
});

app.get('/doc', function (req, res, next) {
  io.read('./docs/index.html').then(data => {
      res.send(data);
    }).catch(e => res.status(500).send("contact Starman. He is orbiting somewhere in space in his car."));
});

app.get('/check', function (req, res, next) {
  if (!req.query.url) {
    monitor.warn("missing url");
    res.status(400).send("<p>missing url parameter</p>");
  } else {
      let inputURL = req.query.url;
      let originURL = inputURL;
      let isRespec = false;

      if (!isAuthorized(inputURL)) {
        monitor.warn("unauthorized: " + req.ip + " " + inputURL);
        res.status(403).send("<p>unauthorized url parameter</p>");
        return;
      }
      // use https://
      if (inputURL.startsWith("http://")) {
        inputURL = "https://" + inputURL.substring("http://".length);
      }
      if (!inputURL.startsWith("https://")) { // just in case...
        monitor.warn("unauthorized: " + req.ip + " " + inputURL);
        res.status(403).send("<p>unauthorized url parameter</p>");
        return;
      }
      if (inputURL in currentlyRunning) {
        monitor.log("already running: " + inputURL);
        res.status(409).send("<p>duplicate request?</p>");
        return;
      }
      originURL = inputURL;
      currentlyRunning[originURL] = true;
      monitor.log("processing " + inputURL);
      JSDOM.fromURL(inputURL).then(dom => {
        return dom.window.document;
      }).then(document => {
        if (links.isRespec(document)) {
          isRespec = true;
          inputURL = "https://labs.w3.org/spec-generator/?type=respec&url=" + inputURL;
          monitor.log("spec-generator: " + inputURL);
          return JSDOM.fromURL(inputURL).then(dom => {
            return dom.window.document;
          });
        }
        return document;
      }).then(document => {
        let title = document.querySelector("head title").textContent;
        let lists = links.getLinks(document, "" + document.location);
        let outputHTML = format.toHTML({
          title: title,
          inputURL: inputURL,
          originURL: "" + document.location,
          foundNormativeSection: lists.foundNormativeSection,
          isRespec: isRespec,
          isBikeshed: links.isBikeshed(document),
          unknownLinks: lists.unknown,
          knownLinks: lists.known
        });
        res.send(outputHTML);
      }).catch(e => {
        var status = 500;
        if (e.statusCode) {
          status = e.statusCode;

        }
        console.log(e);
        errArgs(status + " " + e.name + ": " + inputURL);
        res.status(status)
           .send("<html><title>Error</title><h1>Error " + status + "</h1>"
           + "<p>Received "
                  + e.name + " from <a href='" + inputURL + "'>" + inputURL + '</a>');
  }).then(function () {
        delete currentlyRunning[originURL];
        next();
      });
    }
});

monitor.stats(app);

let port = process.env.PORT || 5000;

app.listen(port, function() {

    console.log("Express server listening on port %d in %s mode", port, app.settings.env);

    console.log("App started in", (Date.now() - t0) + "ms.");

});
