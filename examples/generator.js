
var oml = require('../src/oml');

// Initialise module first
//
oml.init({appName: 'gen'});

// Creating a measurement point called 'voltage'
// which will report the voltage of a specific generator
//
var mp = oml.mp('voltage', [['generator', oml.T.string], ['voltage', oml.T.double], ['noise', oml.T.double]]);

function r() { return Math.random() - 0.5; }
function noise(mul) { return 4 * mul * r() * r(); }

var i = 0;
var step = 15 / 180;
setInterval(function() {
  var n1 = noise(0.1);
  var a1 = Math.sin(i);
  mp('gen1', a1 + n1, n1);
  var n2 = noise(0.06);
  var a2 = Math.cos(i);
  mp('gen2', a2 + n2, n2);

  i += step;
}, 1000);


