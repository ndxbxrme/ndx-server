(function() {
  'use strict';
  var chalk, configured, controllers, fs, glob, middleware, rfs, settings, underscored, uselist;

  settings = require('./settings.js');

  chalk = require('chalk');

  underscored = require('underscore.string').underscored;

  glob = require('glob');

  fs = require('fs');

  rfs = require('rotating-file-stream');

  configured = false;

  controllers = [];

  uselist = [];

  middleware = [];

  module.exports = {
    config: function(config) {
      var key, keyU;
      for (key in config) {
        keyU = underscored(key).toUpperCase();
        if (Object.prototype.toString.call(config[key]) === '[object Boolean]') {
          settings[keyU] = config[key];
        } else {
          settings[keyU] = settings[keyU] || config[key];
        }
      }
      if (!settings.DB_ENGINE) {
        settings.DB_ENGINE = require('ndxdb');
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
      var MemoryStore, accessLogStream, bodyParser, compression, cookieParser, ctrl, express, folder, helmet, http, https, i, j, k, l, len, len1, len2, len3, len4, len5, len6, m, maintenance, module, moduleName, modulePackage, modulesToLoad, morgan, n, ndx, o, r, ref, session, useCtrl;
      console.log("ndx server starting");
      if (!configured) {
        this.config();
      }
      ndx = require('./services/ndx');
      ndx.database = settings.DB_ENGINE.config(settings).setNdx(ndx).start();
      express = require('express');
      compression = require('compression');
      bodyParser = require('body-parser');
      cookieParser = require('cookie-parser');
      session = require('express-session');
      MemoryStore = require('session-memory-store')(session);
      http = require('http');
      if (settings.SSL_PORT) {
        https = require('https');
      }
      helmet = require('helmet');
      morgan = require('morgan');
      maintenance = require('./maintenance.js');
      ndx.app = express();
      ndx["static"] = express["static"];
      ndx.port = settings.PORT;
      ndx.ssl_port = settings.SSL_PORT;
      ndx.host = settings.HOST;
      ndx.settings = settings;
      ndx.app.use(compression()).use(helmet());
      if (!ndx.settings.DO_NOT_LOG) {
        if (ndx.settings.LOG_TO_SCREEN) {
          ndx.app.use(morgan(ndx.settings.LOG_LEVEL));
        } else {
          fs.existsSync(ndx.settings.LOG_DIR) || fs.mkdirSync(ndx.settings.LOG_DIR);
          accessLogStream = rfs('access.log', {
            interval: '1d',
            path: ndx.settings.LOG_DIR
          });
          ndx.app.use(morgan(ndx.settings.LOG_LEVEL, {
            stream: accessLogStream
          }));
        }
      }
      ndx.app.use(maintenance({
        database: ndx.database
      })).use(bodyParser.json({
        limit: '50mb'
      })).use(cookieParser(ndx.settings.SESSION_SECRET)).use(session({
        name: 'NDXSESSION',
        secret: ndx.settings.SESSION_SECRET,
        saveUninitialized: true,
        resave: true,
        store: new MemoryStore({
          expires: 5
        })
      }));
      ndx.server = http.createServer(ndx.app);
      if (settings.SSL_PORT) {
        ndx.sslserver = https.createServer({
          key: fs.readFileSync('key.pem'),
          cert: fs.readFileSync('cert.pem')
        }, ndx.app);
      }
      require('./controllers/token')(ndx);
      if (settings.AUTO_LOAD_MODULES) {
        r = glob.sync("server/startup/**/*.js");
        r.reverse();
        for (i = 0, len = r.length; i < len; i++) {
          module = r[i];
          require((process.cwd()) + "/" + module)(ndx);
        }
        modulesToLoad = [];
        r = glob.sync('node_modules/*');
        for (j = 0, len1 = r.length; j < len1; j++) {
          module = r[j];
          moduleName = module.replace('node_modules/', '');
          modulePackage = require((process.cwd()) + "/node_modules/" + moduleName + "/package.json");
          if (moduleName.indexOf('ndx-') === 0 || modulePackage.ndx) {
            if (moduleName !== 'ndx-server') {
              modulesToLoad.push({
                name: moduleName,
                loadOrder: Object.prototype.toString.call(modulePackage.loadOrder) === '[object Number]' ? modulePackage.loadOrder : 5
              });
            }
          }
          modulePackage = null;
        }
        modulesToLoad.sort(function(a, b) {
          return a.loadOrder - b.loadOrder;
        });
        for (k = 0, len2 = modulesToLoad.length; k < len2; k++) {
          module = modulesToLoad[k];
          require("../../" + module.name)(ndx);
        }
        ref = ['services', 'controllers'];
        for (l = 0, len3 = ref.length; l < len3; l++) {
          folder = ref[l];
          r = glob.sync("server/" + folder + "/**/*.js");
          r.reverse();
          for (m = 0, len4 = r.length; m < len4; m++) {
            module = r[m];
            require((process.cwd()) + "/" + module)(ndx);
          }
        }
      }
      for (n = 0, len5 = uselist.length; n < len5; n++) {
        useCtrl = uselist[n];
        useCtrl(ndx);
      }
      for (o = 0, len6 = controllers.length; o < len6; o++) {
        ctrl = controllers[o];
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
          if (Object.prototype.toString.call(message === '[object Object]')) {
            return res.status(err.status || 500).json(message);
          } else {
            return res.status(err.status || 500).send(message);
          }
        });
      });
      ndx.server.listen(ndx.port, function() {
        return console.log(chalk.yellow("ndx server v" + (chalk.cyan.bold(ndx.version)) + " listening on " + (chalk.cyan.bold(ndx.port))));
      });
      if (settings.SSL_PORT) {
        ndx.sslserver.listen(ndx.ssl_port, function() {
          return console.log(chalk.yellow("ndx ssl server v" + (chalk.cyan.bold(ndx.version)) + " listening on " + (chalk.cyan.bold(ndx.ssl_port))));
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
