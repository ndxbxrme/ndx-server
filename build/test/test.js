(function() {
  'use strict';
  var ndx;

  ndx = require('../index.js').config({
    database: 'rb',
    tables: ['users', 'tasks'],
    port: 23000
  }).controller(function(ndx) {
    return ndx.database.on('ready', function() {
      return console.log(ndx.database.getDb().users.data.length);
    });
  }).start();

}).call(this);

//# sourceMappingURL=test.js.map
