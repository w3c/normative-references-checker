/*
 Copyright © 2017 World Wide Web Consortium, (Massachusetts Institute of Technology,
 European Research Consortium for Informatics and Mathematics, Keio University, Beihang).
 All Rights Reserved.

 This work is distributed under the W3C® Software License [1] in the hope that it will
 be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

 [1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/

const io = require('io-promise');
const jsdom = require("jsdom");
const links = require("./lib/links.js");
const format = require("./lib/views/default.js");

const { JSDOM } = jsdom;

var inputURL = process.argv[2];

if (inputURL === undefined) {
  inputURL = "https://www.w3.org/TR/hr-time/";
  console.error("[error] Missing input url, using " + inputURL);
}

const originURL = inputURL; // in case we do respec processing

// output file
var outputFile = process.argv[3];

if (outputFile === undefined) {
  outputFile = "report.html";
}

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
  return io.save(outputFile, outputHTML);
}).catch(console.error);
