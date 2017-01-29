(function() {
  'use strict';
  var ObjectID, chalk, config, controllers, middleware, settings, uselist, version;

  settings = require('./settings.js');

  ObjectID = require('bson-objectid');

  chalk = require('chalk');

  version = require('../package').version;

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
      var MemoryStore, bodyParser, compression, cookieParser, ctrl, express, flash, helmet, http, j, k, len, len1, maintenance, ndx, session, useCtrl;
      console.log("ndx server starting");
      if (!config) {
        this.config();
      }
      ndx = {
        id: ObjectID.generate(),
        extend: function(dest, source) {
          var i, results;
          if (!dest) {
            dest = {};
          }
          if (!source) {
            source = {};
          }
          results = [];
          for (i in source) {
            if (source.hasOwnProperty(i)) {
              results.push(dest[i] = source[i]);
            } else {
              results.push(void 0);
            }
          }
          return results;
        }
      };
      ndx.database = require('ndxdb').config(config).start();
      express = require('express');
      compression = require('compression');
      bodyParser = require('body-parser');
      session = require('express-session');
      MemoryStore = require('session-memory-store')(session);
      cookieParser = require('cookie-parser');
      flash = require('connect-flash');
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
      })).use(bodyParser.json()).use(cookieParser(ndx.settings.SESSION_SECRET)).use(session({
        name: 'NDXSESSION',
        secret: ndx.settings.SESSION_SECRET,
        saveUninitialized: true,
        resave: true,
        store: new MemoryStore({
          expires: 60 * 5
        })
      })).use(flash());
      ndx.server = http.createServer(ndx.app);
      require('./controllers/token')(ndx);
      for (j = 0, len = uselist.length; j < len; j++) {
        useCtrl = uselist[j];
        useCtrl(ndx);
      }
      for (k = 0, len1 = controllers.length; k < len1; k++) {
        ctrl = controllers[k];
        ctrl(ndx);
      }
      return ndx.server.listen(ndx.port, function() {
        return console.log(chalk.yellow("ndx server v" + (chalk.cyan.bold(version)) + " listening on " + (chalk.cyan.bold(ndx.port))));
      });
    }
  };

}).call(this);

//# sourceMappingURL=index.js.map
