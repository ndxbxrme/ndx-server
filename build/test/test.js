(function() {
  'use strict';
  exports.databaseReady = function(test) {
    var e, error, ndx;
    test.expect(1);
    try {
      ndx = require('../index.js').config({
        database: 'rb',
        tables: ['users', 'tasks'],
        port: 23000
      }).controller(function(ndx) {
        return ndx.database.on('ready', function() {
          return console.log('database ready');
        });
      }).start();
      test.ok(true, 'database ready');
      return test.done();
    } catch (error) {
      e = error;
      console.log(e);
      return test.done();
    }
  };


  /*
   */

}).call(this);

//# sourceMappingURL=test.js.map
