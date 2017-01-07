(function() {
  'use strict';
  module.exports = function(options) {
    var database;
    database = options.database;
    return function(req, res, next) {
      if (database.maintenance()) {
        if (req.originalUrl === '/maintenance-off' || req.originalUrl === '/api/upload/database' || req.originalUrl === '/api/getdb') {
          return next();
        } else {
          return res.end('Database maintenance time, please come back later');
        }
      } else {
        return next();
      }
    };
  };

}).call(this);

//# sourceMappingURL=maintenance.js.map
