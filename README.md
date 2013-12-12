OML Client for Node.js
=======================

[![NPM version](https://badge.fury.io/js/oml.png)](http://badge.fury.io/js/oml)
[![Build Status](https://travis-ci.org/mytestbed/oml4node.png)](https://travis-ci.org/mytestbed/oml4node)

    % npm install oml

<!--
 * [GitHub pages][gh-pages]
 * [API reference][gh-pages-apiref]
-->

An OML (client) module for node.js

Project status:

 - Expected to work

Not yet:

 - Completely stable APIs
 - Reading from environment variables
 - Supporting XML config files
 - Comprehensive tests
 - Measured test coverage
 - Comprehensive documentation
 - Known to be used in production (if anyone *is* using it in
   production, do let me know)


API
---


```javascript
var oml = require('oml');

// Initialise module first
//
oml.init({appName: 'myApp'});

// Creating a measurement point called 'm1' 
// which will report the voltage of a specific generator
var m1 = oml.mp('foo', [['generator', oml.T.string], ['voltage', oml.T.double]]);

// Send a measurement every 1 second
var i = 0;
var step = 15 / 180;
setInterval(function() {
  m1('gen1', Math.sin(i));
  i += step
});

```

Check out the __examples__ directory for more examples.

To get a full list of command line flags, start your application with the `--oml-help` flag.

License
-------

MIT