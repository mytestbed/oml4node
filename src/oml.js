//
// Implements a simple client for emitting OML measurements.
//

var net = require('net');
var os = require('os');
var _ = require('underscore');

DEFAULTS = {
  host: 'localhost',
  port: 4030,

};

var Sock = null; // set by init()
var NoOp = false; // Skip OML when --oml-noop is set

// Initialise the OML framework.
//
// @param opts host
// @param opts port
// @param opts domain
// @param opts sender_id
// @param opts app_name
//
// @returns true if successful, false otherwise (need a better solution to signal errors)
//
module.exports.init = function(opts, cfgFunc) {
  if (Sock) return true;

  if (! opts) { opts = {}; };
  NoOp = (opts.noop == true);
  parseArgv(opts);
  if (cfgFunc && _.isFunction(cfgFunc)) {
    cfgFunc();
  }
  if (NoOp) { return true; }
  Sock = connect(opts);
  return true;
};

function parseArgv(opts) {
  var argv = process.argv;
  for (var i = 0; i < argv.length; i++) {
    var p = argv[i];
    var consume = 0;

    if (p.indexOf("--oml-id") == 0) {
      opts.id = argv[i + 1];
      consume = 2;
    } else if (p.indexOf("--oml-domain") == 0) {
      opts.domain = argv[i + 1];
      consume = 2;
    } else if (p.indexOf("--oml-collect") == 0) {
      opts.collect = argv[i + 1];
      consume = 2;
    } else  if (p.indexOf("--oml-noop") == 0) {
      NoOp = true;
      consume = 1;
    } else if (p.indexOf("--oml-config") == 0) {
      opts.config = argv[i + 1];
      consume = 2;
    } else if (p.indexOf("--oml-help") == 0) {
      console.log("OML options:\n");
      console.log("\t--oml-id id                  Name to identify this app instance");
      console.log("\t--oml-domain DOMAIN          Name of experimental domain");
      console.log("\t--oml-collect URI            URI of server to send measurements to [file:-]");
      console.log("\t--oml-noop                   Do not collect measurements");
      console.log("\t--oml-config FILE            File holding OML configuration parameters");
      console.log("\t--oml-help                   Show this message");
      process.exit(0);
    }
    if (consume > 0) {
      argv.splice(i, consume);
      i--;
    }
  }
  if (NoOp) { return true; };

  if (! opts.collect) { opts.collect = 'file:-'; }
  var uri = opts.collect.split(":");
  switch (uri.length) {
    case 1:
      opts.uri = ['tcp', uri[0], DEFAULTS.port];
      break;
    case 2:
      p = uri[0];
      if (p.indexOf("tcp") == 0 || p.indexOf("file") == 0) {
        opts.uri = [p, uri[1], (p.indexOf("tcp") == 0) ? DEFAULTS.port : null];
      } else {
        opts.uri = ['tcp', uri[0], uri[1]];
      }
      break;
    case 3:
      p = uri[0];
      if (! (p.indexOf("tcp") == 0 || p.indexOf("file") == 0)) {
        module.exports.logger.fatal("Wrong format for OML options '--oml-collect URI', should be 'tcp|file:name[:port]'");
      }
      opts.uri = uri;
      break; // OK
    default:
      module.exports.logger.fatal("Wrong format for OML options '--oml-collect URI', should be 'tcp|file:name[:port]'");
  }
  if (! opts.id) {
    opts.id = os.hostname() + '-' + process.pid;
  }
}

function connect(opts) {
  var my = {};
  var schemaCount = 0;
  var startTime = Math.floor((new Date()).getTime() / 1000);
  var schemas = []; // store all schema definitions in case of reconnect

  var domain = opts.domain || 'unknown_domain';
  var senderId = opts.id;
  var appName = opts.appName || 'unknown_app';

  my.write = function(msg) {
    return out.write(msg);
  };

  my.writeln = function(msg) {
    return out.write(msg + "\n");
  };

  my.registerSchema = function(name, schema) {
    var schemaId = (schemaCount += 1);
    var qName = appName + '_' + name;
    var colDescr = _.map(schema, function(col) { return col[0] + ':' + col[1]; });

    // 1 generator_sin label:string phase:double value:double
    var schemaDescr = schemaId + " " + qName + " " + colDescr.join(' ');
    // ts schemaId seqNo key val
    l = [0, 0, schemaId, '.', 'schema', schemaDescr];
    var s = l.join('\t');
    schemas.push(s);
    my.writeln(s);
    return schemaId;
  };

  my.ts = function() {
    return (new Date()).getTime() / 1000 - startTime;
  };

  // INIT
  var connected = false;
  var connection = null;
  var unsentChunk = null; // holding chunk while re-establishing connection
  var doneCbk = null; // Call after consuming unsentChunk

  var out = null;

  function startConnection() {
    var uri = opts.uri;
    var host = uri[1];
    var port = uri[2];


    module.exports.logger.debug("Connecting to '" + host + ':' + port + "'.");
    connection = net.connect({host: host, port:  port}, function() {
      module.exports.logger.info('client connected');
      connected = true;

      sendHeader(connection);
      if (unsentChunk) {
        connection.write(unsentChunk);
        unsentChunk = null;
        doneCbk();
      }
    });

    connection.writeln = function(msg) {
      return connection.write(msg + "\n");
    };

    connection.on('error', function(err) {
      module.exports.logger.warn('client error - ' + err);
      connected = false;
      setTimeout(startConnection, 1000);
    });

    connection.on('end', function() {
      module.exports.logger.info('client disconnected');
      connected = false;
      setTimeout(startConnection, 1000);
    });

    out = new require('stream').Writable({decodeStrings: false});
    out._write = function(chunk, encoding, done) {
      //console.log('_WRITE(' + connected + ') ' + chunk);
      if (connected) {
        connection.write(chunk);
        done();
      } else {
        unsentChunk = chunk;
        doneCbk = done;
      }
    };
  };

  function openFile(uri) {
    var path = uri[1];

    if (path == '-') {
      out = {};
      out.write = function(str) { console.log(str); };
      out = process.stdout;
    } else {
      out = require('fs').createWriteStream(path);
    }

    sendHeader(my);
  }

  function sendHeader(out) {
    out.writeln("protocol: 4");
    out.writeln("content: text");
    out.writeln("domain: " + domain);
    out.writeln("start-time: " + startTime);
    out.writeln("sender-id: " + senderId);
    out.writeln("app-name: " + appName);
    out.writeln("schema: 0 _experiment_metadata subject:string key:string value:string");
    out.write("\n");
    _.each(schemas, function(s) { out.writeln(s); });
  }

  (opts.uri.indexOf("tcp") == 0) ? startConnection(opts.uri) : openFile(opts.uri);

  return my;
};



// Supported types in schema
//
module.exports.T = {
  int32: 'int32',
  uint32: 'uint32',
  int64: 'int64',
  uint64: 'uint64',
  double: 'double',
  string: 'string',
  blob: 'blob',
  guid: 'guid',
  bool: 'bool'
};

function noop_f() {};

module.exports.mp = function(name, schema) {
  if (NoOp) { return noop_f; };
  if (! Sock) return new Error("OML: Call 'init' first");

  var streamId = Sock.registerSchema(name, schema);
  var schemaTypes = _.map(schema, function(col) { return col[1]; });
  var seqNo = 0;

  function my() {
    var m = [Sock.ts(), streamId, seqNo += 1];
    //console.log("S>>>> " + m);
    for (var i = 0; i < arguments.length; i++) {
      var val = arguments[i];
      switch(schemaTypes[i]) {
        case 'string':
          val = val.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
          break;
        case 'bool':
          val = val ? 'T' : 'F';
          break;
        case 'blob':
          val = new Buffer(val).toString('base64');
          break;
      }
      //console.log("VAL: " + val);
      //console.log("m: " + m);
      //m.push(val);
      m[i + 3] = val;
      if (m[i + 3] != val) {
        // This is a VERY weird bug where only on the first time through appending a
        // value actually ends up as the first element
        module.exports.logger.info("BUG: Array", m);
        m[i + 3] = val; // let's try again
        if (m[i + 3] != val) {
          module.exports.logger.warn("BUG: Can't fix Array", m);
          return true;
        }
        m[0] = Sock.ts();
      }
      //console.log("N>>>> " + m + '----' + m[0]);
    }
    var row = m.join("\t");
    //console.log(">>>> " + m);
    return Sock.writeln(row);
  };

  return my;
};

module.exports.logger = function() {
  var my = {};
  my.debug = function(msg) { console.log('DEBUG(oml): ' + msg); };
  my.info = function(msg) { console.log(' INFO(oml): ' + msg); };
  my.warn = function(msg) { console.log(' WARN(oml): ' + msg); };
  my.error = function(msg) { console.log('ERROR(oml): ' + msg); };
  my.fatal = function(msg) {
    console.log('FATAL(oml): ' + msg);
    process.exit(1);
  };

  return my;
}();




