var URL = {};

// trim fragment and http/https protocol to simplify the output
URL.removeFragment = function(href) {
  var index = href.indexOf('#');
  if (index === -1) return href;
  return href.substring(0, index);
};

URL.hostPath = function(href) {
  href = URL.removeFragment(href);
  var https = href.indexOf('https://');
  if (https !== -1) {
    href = href.substring(8);
  } else {
    var http = href.indexOf('http://');
    if (http !== -1) href = href.substring(7);
  }
  return href;
};

module.exports = URL;
