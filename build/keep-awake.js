(function() {
  'use strict';
  var http;

  http = require('http');

  module.exports = function(app, host) {
    if (host) {
      app.get('/api/keep-awake', function(req, res) {
        return res.end('i\'m real');
      });
      return setInterval(function() {
        return http.get('http://' + host + '/api/keep-awake');
      }, 5 * 60 * 1000);
    }
  };

}).call(this);

//# sourceMappingURL=keep-awake.js.map
