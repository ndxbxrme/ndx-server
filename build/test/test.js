(function() {
  'use strict';
  var ndx;

  ndx = require('../index.js').config({
    appName: 'testApp',
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
    console.log(ndx.generateID());
    return ndx.app.use('/api/something', function(req, res, next) {
      return res.end('<html><body><h1>test</h1></body></html>');
    });
  }).start();

}).call(this);

//# sourceMappingURL=test.js.map
