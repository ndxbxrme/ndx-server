(function() {
  'use strict';
  var ObjectID, config, controllers, middleware, settings, uselist;

  settings = require('./settings.js');

  ObjectID = require('bson-objectid');

  config = null;

  controllers = [];

  uselist = [];

  middleware = [];

  module.exports = {
    config: function(args) {
      config = args || {};
      config.database = config.database || settings.DATABASE || 'db';
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
        controllers.push(require('../../' + ctrl));
      }
      return this;
    },
    use: function(ctrl) {
      var type;
      type = Object.prototype.toString.call(ctrl);
      if (type === '[object Function]') {
        uselist.push(ctrl);
      } else {
        uselist.push(require('../../' + ctrl));
      }
      return this;
    },
    start: function() {
      var bodyParser, compression, ctrl, express, helmet, http, i, j, len, len1, maintenance, ndx, useCtrl;
      console.log('ndx server starting');
      require('memory-tick').start(60 * 10, function(mem) {
        return console.log('memory:', mem);
      });
      ndx = {
        id: ObjectID.generate()
      };
      ndx.database = require('ndxdb').config(config).start();
      express = require('express');
      compression = require('compression');
      bodyParser = require('body-parser');
      http = require('http');
      helmet = require('helmet');
      maintenance = require('./maintenance.js');
      ndx.app = express();
      ndx["static"] = express["static"];
      ndx.port = settings.PORT || config.port;
      ndx.host = settings.HOST || config.host;
      ndx.settings = settings;
      ndx.app.use(compression()).use(helmet()).use(maintenance({
        database: ndx.database
      })).use(bodyParser.json());
      ndx.server = http.createServer(ndx.app);
      ndx.app.get('/api/db', function(req, res) {
        return res.json(ndx.database.getDb());
      });
      for (i = 0, len = uselist.length; i < len; i++) {
        useCtrl = uselist[i];
        useCtrl(ndx);
      }
      for (j = 0, len1 = controllers.length; j < len1; j++) {
        ctrl = controllers[j];
        ctrl(ndx);
      }
      return ndx.server.listen(ndx.port, function() {
        return console.log('ndx server listening on', ndx.port);
      });
    }
  };

}).call(this);

//# sourceMappingURL=index.js.map
