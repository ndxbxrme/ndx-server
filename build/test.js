(function() {
  'use strict';
  var ndx;

  ndx = require('./index.js').config({
    database: 'rb',
    tables: ['users', 'tasks'],
    port: 23000
  }).controller(function(ndx) {
    return ndx.app.get('/api/thing', function(req, res) {
      return res.json({
        hey: 'yo'
      });
    });
  }).start();

}).call(this);

//# sourceMappingURL=test.js.map
