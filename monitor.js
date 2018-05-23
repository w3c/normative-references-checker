// const monitor  = require('./monitor.js');
// var app = express();
// monitor.install(app, [options]);
//
// options.path - HTTP root path for the monitor, default is /monitor
// options.entries - max number of entries to return in the log
//
// This will expose the following resources
// /monitor/logs
// /monitor/ping
// /monitor/usage

// if you want server timing, add the following after all router/middleware
// monitor.stats(app);
// and don't forget to use next() im between for each router/middleware
// you'll then see those time info added to the log

var request_current = 0;
var request_total = 0;

var logs = [];
var MAX_ENTRIES = 50;

function add(msg) {
  if (logs.length === (MAX_ENTRIES * 2)) {
    // reset the logs to only contain the max number of entries
    logs = logs.slice(MAX_ENTRIES);
  }
  logs.push(msg);
}

function getDate(msg) {
  return  "[" + (new Date()).toISOString() + "] " + msg;
}

logStat = function(msg) {
  var args = "[stat] " + msg;
  add(args);
  process.nextTick(function() {
    console.log(args);
  });
}

exports.log = function(msg) {
  var args = "[log] " + getDate(msg);
  add(args);
  process.nextTick(function() {
    console.log(args);
  });
}

exports.warn = function(msg) {
  var args = "[warn] " + getDate(msg);
  add(args);
  process.nextTick(function() {
    console.warn(args);
  });
}

exports.err = function(msg) {
  var args = "[err] " + getDate(msg);
  add(args);
  process.nextTick(function() {
    console.error(args);
  });
}

var instance_identifier = "" + Math.floor(Math.random() * 10000000);

exports.install = function(app, options) {
  var path = '/monitor';
  if (options !== undefined) {
    if (options.path !== undefined) {
      path = options.path;
    }
    if (options.entries !== undefined) {
      MAX_ENTRIES = options.entries;
    }

  }

  // monitor all methods
  app.use(function (req, res, next) {
    exports.log(req.method + " " + req.originalUrl);
    request_total++;
    request_current++;
    req.startTime = Date.now();
    next();
  });

  // grabs the logs easily
  app.get(path + '/logs', function (req, res, next) {
    process.nextTick(function() {
      console.warn("[monitor] " + getDate("/logs " + req.ip));
    });
    var output = "";
    var begin = logs.length - MAX_ENTRIES;
    var end = logs.length;
    if (begin < 0) {
      begin = 0;
    }
    output = logs[begin++];
    for (let index = begin; index < end; index++) {
      output += '\n' + logs[index];
    }
    res.set('Content-Type', 'text/plain');
    res.send(output);
    next();
  });

  // simple way to check if the server is alive
  app.get(path + '/ping', function (req, res, next) {
    res.set('Content-Type', 'text/plain');
    res.send('pong');
    next();
  });

  // simple way to check if the server is alive
  app.get(path + '/usage', function (req, res, next) {
    res.set('Content-Type', 'application/json');
    var obj = process.memoryUsage();
    obj.uptime = process.uptime();
    obj.cpuUsage = process.cpuUsage();
    obj.requests = { total: request_total, current: request_current };
    res.send(JSON.stringify(obj));
    next();
  });
}

exports.stats = function(app, options) {
  var path = '/monitor';
  if (options !== undefined) {
    if (options.path !== undefined) {
      path = options.path;
    }
  }

  // grabs the logs easily
  app.use(function (req, res, next) {
    var log = req.method + " " + req.originalUrl;
    if (req.get("traceparent") !== undefined) {
      log = "[" + req.get("traceparent") + "] " + log;
    }
    logStat("[" + (Date.now() - req.startTime) + "ms] " + log);
    request_current--;
    next();
  });
}
