/*
 Copyright © 2017 World Wide Web Consortium, (Massachusetts Institute of Technology,
 European Research Consortium for Informatics and Mathematics, Keio University, Beihang).
 All Rights Reserved.

 This work is distributed under the W3C® Software License [1] in the hope that it will
 be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

 [1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/

const io = require('./io-promise');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// ignore the differences for those
const HTTP_URLs = [
  "http://www.w3.org/",
  "http://lists.w3.org/"
];

var inputURL = process.argv[2];

if (inputURL === undefined) {
  inputURL = "http://www.w3.org/TR/hr-time/";
  console.error("[error] Missing input url, using " + inputURL);
}

const originURL = inputURL; // in case we do respec processing

// output file
var outputFile = process.argv[3];

if (outputFile === undefined) {
  outputFile = "report.html";
}

// is the anchor informative?
function isInformative(anchor) {
  if (anchor.classList.contains("isAInformativeReference")) // based on the informative reference section
    return true;
  var github = new RegExp("https://github.com/[^/]+/[^/]+/commits?/[^/]+"); // avoid changes section
  if (github.test(anchor.href)) return true;

  // inspect the parent
  var parent = anchor.parentElement;
  while (parent !== null) {

    var className = parent.className;
    if (/informative|note|issue|example/.test(parent.className)) {
      // unfortunately, bikeshed doesn't use informative for sections, so we miss a lot of informative sections :(
      return true;
    }
    if (parent.localName === "div" && /head/.test(parent.className)) {
      return true; // avoid the <div class="head"> per pubrules
    }
    if (/abstract|sotd|references/.test(parent.id)) { // this is for respec
      return true;
    }
    if (parent.getAttribute("data-fill-with")) { // this is for bikeshed
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

function findSectionTitle(node, id) {
  var text = "#" + id;
  if (/div|section/.test(node.localName)) {
    var header = node.querySelector("h2, h3, h4, h5, h6");
    if (header !== null) {
      return header.textContent;
    }
  }
  return text;
}

// find the nearest ancestor id
function findId(node) {
  var found = false;
  var id = { id: null, text: null };
  var parent = node.parentElement;
  while (!found && parent !== null) {
    if (parent.id !== "") {
      id.id = parent.id;
      id.text = findSectionTitle(parent, id.id);
      found = true;
    }
    parent = parent.parentElement;
  }
  return id;
}

// find the nearest useful element with an id
function findParent(node) {  
  var parent = node.parentElement;
  while (parent !== null) {
    if (/div|p|section|li|td|th|dt|dd|pre/.test(parent.localName)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

const refsets = { normative: null, informative: null };
// find the normative and informative references section and return what's found there.
function processReferences(document) {
  var normativeRefSection = document.querySelectorAll("#normative-references *[href], h3#normative + dl *[href]");
  var informativeRefSection = document.querySelectorAll("#informative-references *[href], h3#informative + dl *[href]");
  var map = { has_norm_refs: false, has_inform_refs: false };
  refsets.normative = normativeRefSection;
  refsets.informative = informativeRefSection;
  normativeRefSection.forEach(anchor => {
    map.has_norm_refs = true;
    anchor.classList.add("isANormativeReference");
    anchor.setAttribute("data-href", getDocumentSubURL(anchor.href));
  });
  informativeRefSection.forEach(anchor => {
    map.has_inform_refs = true;
    anchor.classList.add("isAInformativeReference");
    anchor.setAttribute("data-href", getDocumentSubURL(anchor.href));
  });

  if (normativeRefSection.length === 0) {
    console.warn("[WARNING] Didn't find a normative reference section");      
  }
  if (informativeRefSection.length === 0) {
    console.warn("[WARNING] Didn't find an informative reference section");      
  }

}

// based on the normative reference section
function isNormativeReference(href) {
  var references = refsets.normative;
  for (let index = 0; index < references.length; index++) {
    const nhref = references[index].getAttribute("data-href");
    if (href.startsWith(nhref)) {
      return true;
    }
  }
  return false;
}

// trim fragment and http/https protocol to simplify the output
function getDocumentURL(href) {
  var index = href.indexOf('#');
  if (index === -1) return href;
  return href.substring(0, index);
}

function getDocumentSubURL(href) {
  href = getDocumentURL(href);
  var https = href.indexOf('https://');
  if (https !== -1) {
    href = href.substring(8);
  } else {
    var http = href.indexOf('http://');
    if (http !== -1) href = href.substring(7);
  }
  return href;
}

// Here we go

function getEntry(ar, key) {
  var entry = ar[key];
  if (entry === undefined) {
    entry = [];
    ar[key] = entry;
  }
  return entry;
}

function getNormativeHref(document, url) {
  var docURL = getDocumentSubURL(url);
  var anchors = document.querySelectorAll("a[href]");

  var normative_anchors = {
    unknown: [],
    known: []
  };
  // do the aliasing first since it's the safest
  anchors.forEach(anchor => {
    var href = getDocumentSubURL(anchor.href);
    if (!href.startsWith(docURL) && !isInformative(anchor)) {
      if (isNormativeReference(href)) {
        if (!anchor.classList.contains("isANormativeReference")) {
          getEntry(normative_anchors.known, href).push(anchor);
        }
      } else {
        getEntry(normative_anchors.unknown, href).push(anchor);
      }
    }
  });
  return normative_anchors;
}

// display
function getHTMLList(links, base) {
  var output = "";
  
  var total = 0;

  for (var key in links) {
    total++;
  }

  output += "<p>Found " + total + " references in this category</p>";
  output += "<ol>";

  for (var key in links) {
    var entry = links[key];
    var href = getDocumentURL(entry[0].href);
    var liOutput = "<li>";
    liOutput += "<a href='" + href + "'>" + href + "</a>";
    liOutput += "<ul>";
    entry.forEach(anchor => {
      var id = findId(anchor);
      var container = findParent(anchor);
      anchor.classList.add("mark");
      liOutput += "<li><p>";
      if (id.id !== null) {
        liOutput += "<a href='"+base+"#"+id.id+"'>"+id.text+"</a></p>";
      }
      if (container !== null) {
        var tag = "p";
        if (container.localName === "pre") tag = "pre";
        liOutput += '<' + tag + '>' + container.innerHTML + '</' + tag + '>';
      } else {
        liOutput += "<p>" + anchor.outerHTML + "</p>";
      }
      liOutput += "</li>";
    })
    liOutput += "</ul>";
    liOutput += "</li>";
    output += liOutput;
  }
  output += "</ol>";
  return output;
}
JSDOM.fromURL(inputURL).then(dom => {
  return dom.window.document;
}).then(document => {
  var script = document.querySelector("script.remove");
  if (script !==  null) {
    console.warn("[WARNING] Detected a respec document. Switching to spec-generator.");
    inputURL = "https://labs.w3.org/spec-generator/?type=respec&url=" + inputURL;
    return JSDOM.fromURL(inputURL).then(dom => {
      return dom.window.document;
    });
  }
  return document;
}).then(document => {
  console.log("Preprocessing the document...")
  processReferences(document);
  return document;
}).then(document => {
  var title = document.querySelector("head title").textContent;
  console.log("Calculate the set of normative references...")
  var links = getNormativeHref(document, inputURL);

  console.log("Generate the report...")
  var output = "<html><title>Link report for " + title + "</title>"
   + "<base href='"+originURL+"'>"
   + "<style>a.mark { border: 4px solid red; padding: 2px; }</style>"
   + "<link rel='stylesheet' href='https://www.w3.org/StyleSheets/TR/2016/base'>"
   + " <h1>Link report for <a href='" + originURL + "'>" + title + "</a></h1>";
  if (originURL !== inputURL) {
    output += "<p>(Using the <a href='" + inputURL + "'>spec-generator version</a>)</p>"
  }
  output += "<h2 id='charlie'>Content</h2><ul><li><a href='#unknown'>References that might need to be made normative</a></li>";
  output += "<li><a href='#known'>References that are already normative</a></li>";
  
  output += "</ul><h2 id='unknown'>References that might need to be made normative</h2>";
  output += getHTMLList(links.unknown, originURL);
  output += "<h2 id='known'>References that are already normative</h2>";
  output += getHTMLList(links.known, originURL);
  output += "</html>";
  console.log("Done. Saving...")
  return io.save(outputFile, output);
}).catch(console.error);
