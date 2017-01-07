(function() {
  'use strict';
  var http, ip;

  http = require('http');

  ip = require('ip');

  module.exports = function(app, port) {
    app.get('/api/keep-awake', function(req, res) {
      return res.end('i\'m real');
    });
    return setInterval(function() {
      return http.get('http://' + ip.address() + ':' + port + '/api/keep-awake');
    }, 5 * 60 * 1000);
  };

}).call(this);

//# sourceMappingURL=keep-awake.js.map
