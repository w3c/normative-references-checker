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
    if (/div|p|section|li|td|th|dt|dd|pre|details/.test(parent.localName)) {
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
function getHTMLList(links, base, details) {
  var withDetails = details || false;
  var output = "";
  
  var total = 0;

  for (var key in links) {
    total++;
  }

  output += "<p>Found " + total + " references in this category</p>";
  output += "<ol>";

  var sorted = [];
  for (var key in links) {
    sorted.push(key);
  }  
  sorted = sorted.sort();

  sorted.forEach(key => {
    var entry = links[key];
    var href = URL.removeFragment(entry[0].href);
    var liOutput = "<li>";
    if (withDetails) {
      liOutput += "<details><summary>" + href + "</summary><div>"
        + link(href, href) + "<ul>";      
    } else {
      liOutput += link(href, href) + "<ul>";
    }
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
    if (withDetails) {
      liOutput += "</ul></div></details></li>";
    } else {
      liOutput += "</ul></li>";
    }
    output += liOutput;
  });
  output += "</ol>";
  return output;
}


View.toHTML = function (result) {
  const title = result.title || "Missing title";
  const inputURL = result.inputURL || "http://www.example.com/missing/inputURL";
  const originURL = result.originURL || "http://www.example.com/missing/originURL"; 
  const foundNormativeSection = result.foundNormativeSection || false; 
  const isBikeshed = result.isBikeshed || false; 
  const unknownLinks = result.unknownLinks || [];
  const knownLinks = result.knownLinks || [];

  baseURL = originURL;

  var output = "<html><title>Link report for " + title + "</title>"
   + "<style>a.mark { border: 4px solid red; padding: 2px; } summary { cursor: pointer} "
   + ".note { padding: .5em; border: .5em;border-left-style: solid;border-color: #52E052; background: #E9FBE9; overflow: auto;	}</style>"
   + "<link rel=stylesheet href='https://www.w3.org/StyleSheets/TR/base'>"
   + "<div class=head><h1>Link report for "+link(originURL, title)+"</h1></div>";
  if (originURL !== inputURL) {
    output += "<p class=note>Respec detected. Using the "+link(inputURL, "spec-generator")+" to load the document.</p>"
  }
  if (!foundNormativeSection) {
    output += "<p class=note>The script was unable to find a normative references section in your document."
     + " You may wish to <a href='https://github.com/plehegar/normative-references/issues'>report</a> this.</p>";
  }
  if (isBikeshed) {
    output += "<p class=note>You're using bikeshed. We can't detect <a "
    +" href='https://github.com/tabatkins/bikeshed/issues/954'>informative sections</a>.</p>";
  }
  output += "<h2 id=content>Content</h2><ul><li><a href='#unknown'>References that might need to be made normative</a></li>";
  output += "<li><a href='#known'>References that are already normative</a></li>";
  
  output += "</ul><h2 id=unknown>References that might need to be made normative</h2>";
  output += getHTMLList(unknownLinks, originURL);
  output += "<h2 id=known>References that are already normative</h2>";
  output += getHTMLList(knownLinks, originURL, true);
  output += "<hr><p><a href='https://github.com/plehegar/normative-references/'>I'm on GitHub</a></p>";
  output += "</html>";

  return output;
};

module.exports = View;
