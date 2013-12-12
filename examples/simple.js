
var oml = require('../src/oml');

//oml.init({host: 'localhost', port: 3003});
oml.init({host: 'srv.mytestbed.net', port: 3003});

var m1 = oml.mp('foo', [['a', oml.T.string], ['i', oml.T.int32], ['f', oml.T.bool], ['b', oml.T.blob]]);

m1('hi\n', 12, true, "fo\tv");

setInterval(function() {
  var i = Math.floor(100000 * Math.random());
  m1('x' + i, i, i % 2 == 0, 'y' + i);
}, 1000);


