"use strict";

const  URL = require("../utils/url.js");

var View = {};

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

var baseURL = "";

function link(href, text) {
  if (href.indexOf('#') === 0) {
    href = baseURL+href;    
  }
  return "<a href='"+href+"'>"+text+"</a>";
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
    var href = URL.removeFragment(entry[0].href);
    var liOutput = "<li>" + link(href, href) + "<ul>";
    entry.forEach(anchor => {
      var id = findId(anchor);
      var container = findParent(anchor);
      liOutput += "<li><p>";
      if (id.id !== null) {
        liOutput += "<p>"+link(base+"#"+id.id, id.text)+"</p>";
      }
      anchor.classList.add("mark"); // nice display
      if (container !== null) {
        var tag = "p";
        if (/pre/.test(container.localName)) tag = container.localName;
        liOutput += '<' + tag + '>' + container.innerHTML + '</' + tag + '>';
      } else {
        liOutput += "<p>" + anchor.outerHTML + "</p>";
      }
      anchor.classList.remove("mark"); // clean up
      liOutput += "</li>";
    })
    liOutput += "</ul></li>";
    output += liOutput;
  }
  output += "</ol>";
  return output;
}


View.toHTML = function (result) {
  const title = result.title || "Missing title";
  const inputURL = result.inputURL || "http://www.example.com/missing/inputURL";
  const originURL = result.originURL || "http://www.example.com/missing/originURL"; 
  const unknownLinks = result.unknownLinks || [];
  const knownLinks = result.knownLinks || [];

  baseURL = originURL;

  var output = "<html><title>Link report for " + title + "</title>"
   + "<style>a.mark { border: 4px solid red; padding: 2px; }</style>"
   + "<link rel='stylesheet' href='https://www.w3.org/StyleSheets/TR/base'>"
   + " <h1>Link report for "+link(originURL, title)+"</h1>";
  if (originURL !== inputURL) {
    output += "<p>(Using the "+link(inputURL, "spec-generator version")+")</p>"
  }
  output += "<h2 id='charlie'>Content</h2><ul><li><a href='#unknown'>References that might need to be made normative</a></li>";
  output += "<li><a href='#known'>References that are already normative</a></li>";
  
  output += "</ul><h2 id='unknown'>References that might need to be made normative</h2>";
  output += getHTMLList(unknownLinks, originURL);
  output += "<h2 id='known'>References that are already normative</h2>";
  output += getHTMLList(knownLinks, originURL);
  output += "</html>";

  return output;
};

module.exports = View;
