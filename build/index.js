(function() {
  'use strict';
  var ObjectID, chalk, configured, controllers, middleware, settings, underscored, uselist, version;

  settings = require('./settings.js');

  ObjectID = require('bson-objectid');

  chalk = require('chalk');

  underscored = require('underscore.string').underscored;

  version = require('../package').version;

  configured = false;

  controllers = [];

  uselist = [];

  middleware = [];

  module.exports = {
    config: function(config) {
      var key, keyU;
      for (key in config) {
        keyU = underscored(key).toUpperCase();
        settings[keyU] = config[key] || settings[keyU];
      }
      if (settings.TABLES && settings.TABLES.length) {
        if (settings.TABLES.indexOf(settings.USER_TABLE) === -1) {
          settings.TABLES.push(settings.USER_TABLE);
        }
      } else {
        settings.TABLES = [settings.USER_TABLE];
      }
      configured = true;
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
      var bodyParser, compression, cookieParser, ctrl, express, fs, helmet, http, https, j, k, len, len1, maintenance, ndx, useCtrl;
      console.log("ndx server starting");
      if (!configured) {
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
        },
        startTime: new Date().valueOf(),
        version: version
      };
      ndx.database = require('ndxdb').config(settings).start();
      express = require('express');
      compression = require('compression');
      bodyParser = require('body-parser');
      cookieParser = require('cookie-parser');
      http = require('http');
      if (settings.SSL_PORT) {
        https = require('https');
        fs = require('fs');
      }
      helmet = require('helmet');
      maintenance = require('./maintenance.js');
      ndx.app = express();
      ndx["static"] = express["static"];
      ndx.port = settings.PORT;
      ndx.ssl_port = settings.SSL_PORT;
      ndx.host = settings.HOST;
      ndx.settings = settings;
      ndx.app.use(compression()).use(helmet()).use(maintenance({
        database: ndx.database
      })).use(bodyParser.json()).use(cookieParser(ndx.settings.SESSION_SECRET));
      ndx.server = http.createServer(ndx.app);
      if (settings.SSL_PORT) {
        ndx.sslserver = https.createServer({
          key: fs.readFileSync('key.pem'),
          cert: fs.readFileSync('cert.pem')
        }, ndx.app);
      }
      require('./controllers/token')(ndx);
      for (j = 0, len = uselist.length; j < len; j++) {
        useCtrl = uselist[j];
        useCtrl(ndx);
      }
      for (k = 0, len1 = controllers.length; k < len1; k++) {
        ctrl = controllers[k];
        ctrl(ndx);
      }
      ndx.UNAUTHORIZED = {
        status: 401,
        message: 'Not authorized'
      };
      setImmediate(function() {
        return ndx.app.use(function(err, req, res, next) {
          var message;
          message = err.message || err.toString();
          return res.status(err.status || 500).send(message);
        });
      });
      ndx.server.listen(ndx.port, function() {
        return console.log(chalk.yellow("ndx server v" + (chalk.cyan.bold(version)) + " listening on " + (chalk.cyan.bold(ndx.port))));
      });
      if (settings.SSL_PORT) {
        ndx.sslserver.listen(ndx.ssl_port, function() {
          return console.log(chalk.yellow("ndx ssl server v" + (chalk.cyan.bold(version)) + " listening on " + (chalk.cyan.bold(ndx.ssl_port))));
        });
      }
      if (global.gc) {
        return setInterval(function() {
          return typeof global.gc === "function" ? global.gc() : void 0;
        }, 2 * 60 * 1000);
      }
    }
  };

}).call(this);

//# sourceMappingURL=index.js.map
