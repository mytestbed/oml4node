oml4node
========

An OML (client) module for node.js


[![NPM version](https://badge.fury.io/js/oml.png)](http://badge.fury.io/js/oml)

Installation
------------

    $ npm install oml

API
---


```javascript
var oml = require('oml');

// Initialise module first
//
oml.init({appName: 'myApp'});

// Creating a measurement point called 'foo' 
// which will report the voltage of a specific generator
//
var m1 = oml.mp('foo', [['generator', oml.T.string], ['voltage', oml.T.int32]]);

// Send a measurement
//
m1('gen1', 221);

```

License
-------

MIT