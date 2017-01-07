(function() {
  'use strict';
  var gzippo;

  gzippo = require('gzippo');

  module.exports = function(app) {
    app.use('/scripts', gzippo.staticGzip('./build/client/scripts'));
    app.use('/images', gzippo.staticGzip('./build/client/images'));
    app.use('/styles', gzippo.staticGzip('./build/client/styles'));
    app.use('/views', gzippo.staticGzip('./build/client/views'));
    app.use('/swf', gzippo.staticGzip('./build/client/swf'));
    app.use('/fonts', gzippo.staticGzip('./fonts'));
    app.use('/favicon', gzippo.staticGzip('./favicon'));
    app.use('/bower', gzippo.staticGzip('./bower'));
    app.use('/build/client', gzippo.staticGzip('./build/client'));
    return app.all('/*', function(req, res) {
      return res.sendFile('index.html', {
        root: './build/client'
      });
    });
  };

}).call(this);

//# sourceMappingURL=static_routes.js.map
