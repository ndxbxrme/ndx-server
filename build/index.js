(function() {
  'use strict';
  var config, controllers, middleware, settings;

  settings = require('./settings.js');

  config = null;

  controllers = [];

  middleware = [];

  module.exports = {
    config: function(args) {
      config = args;
      config.autoId = '_id';
      config.awsBucket = settings.AWS_BUCKET;
      config.awsRegion = settings.AWS_REGION || 'us-east-1';
      config.awsId = settings.AWS_ID;
      config.awsKey = settings.AWS_KEY;
      settings.USER_TABLE = settings.USER_TABLE || config.userTable || 'users';
      if (config.tables && config.tables.length) {
        if (config.tables.indexOf(settings.USER_TABLE) === -1) {
          config.tables.push(settings.USER_TABLE);
        }
      } else {
        config.tables = [settings.USER_TABLE];
      }
      return this;
    },
    controller: function(ctrl) {
      var type;
      type = Object.prototype.toString.call(ctrl);
      if (type === '[object Function]') {
        controllers.push(ctrl);
      } else {
        controllers.push(require(ctrl));
      }
      return this;
    },
    use: function(ctrl) {},
    start: function() {
      var app, bodyParser, compression, ctrl, database, express, http, i, len, maintenance, port, server, socket;
      console.log('ndx server starting');
      database = require('ndxdb')(config);
      require('memory-tick').start(60, function(mem) {
        return console.log('memory', mem);
      });
      express = require('express');
      compression = require('compression');
      bodyParser = require('body-parser');
      http = require('http');
      socket = require('./socket.js');
      maintenance = require('./maintenance.js');
      app = express();
      port = config.port || settings.PORT;
      app.use(compression()).use(maintenance({
        database: database
      })).use(bodyParser.json());
      require('./passport.js')(app, database, config);
      require('./keep-awake.js')(app, config.host);
      for (i = 0, len = controllers.length; i < len; i++) {
        ctrl = controllers[i];
        ctrl(app, database, socket);
      }
      require('./static_routes.js')(app);
      server = http.createServer(app);
      socket.setup(server);
      return server.listen(port, function() {
        return console.log('ndx server listening on', port);
      });
    }
  };

}).call(this);

//# sourceMappingURL=index.js.map
