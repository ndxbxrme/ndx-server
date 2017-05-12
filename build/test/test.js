(function() {
  'use strict';
  var ndx;

  ndx = require('../index.js').config({
    database: 'rb',
    tables: ['users', 'tasks'],
    port: 23000,
    logToScreen: true
  }).controller(function(ndx) {
    return ndx.database.on('ready', function() {
      return console.log(ndx.database.getDb().users.data.length);
    });
  }).use(function(ndx) {
    var data;
    data = {
      name: 'bobby',
      age: 23
    };
    console.log(data);
    return ndx.makeSlug('users', '{{name.toUpperCase()}} {{age}}', data, function() {
      return console.log(data);
    });
  }).start();

}).call(this);

//# sourceMappingURL=test.js.map
