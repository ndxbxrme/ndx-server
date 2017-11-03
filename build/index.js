(function() {
  'use strict';
  var chalk, cluster, configured, controllers, cryptojs, fs, glob, middleware, rfs, settings, underscored, uselist;

  settings = require('./settings.js');

  chalk = require('chalk');

  underscored = require('underscore.string').underscored;

  glob = require('glob');

  fs = require('fs');

  rfs = require('rotating-file-stream');

  cluster = require('cluster');

  cryptojs = require('crypto-js');

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
      var MemoryStore, accessLogStream, bodyParser, compression, cookieParser, ctrl, express, folder, helmet, http, https, i, j, k, l, len, len1, len2, len3, len4, len5, len6, m, maintenance, module, moduleName, modulePackage, modulesToLoad, morgan, n, ndx, o, p, r, ref, session, useCtrl, w;
      if (cluster.isMaster) {
        i = 0;
        while (i++ < 1) {
          cluster.fork();
        }
        return cluster.on('exit', function(worker) {
          console.log("Worker " + worker.id + " died..");
          if (settings.AUTO_RESTART && settings.AUTO_RESTART.toString().toLowerCase() !== 'false') {
            return cluster.fork();
          } else {
            return process.exit(1);
          }
        });
      } else {
        console.log("\nndx server starting");
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
        })).use(session({
          name: 'NDXSESSION',
          secret: ndx.settings.SESSION_SECRET,
          saveUninitialized: true,
          resave: true,
          store: new MemoryStore({
            expires: 5
          })
        })).use(cookieParser(ndx.settings.SESSION_SECRET));
        if (ndx.settings.E2E_ENCRYPTION) {
          ndx.app.use(bodyParser.text({
            type: '*/*',
            limit: '50mb'
          })).use(function(req, res, next) {
            req.rawBody = req.body;
            if (req.body && req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') === 0) {
              req.body = JSON.parse(JSON.parse(cryptojs.AES.decrypt(req.body, req.cookies.token || 'nothing').toString(cryptojs.enc.Utf8)));
            }
            return next();
          }).use(function(req, res, next) {
            var _json;
            _json = res.json;
            res.json = function(data) {
              return res.end(cryptojs.AES.encrypt(JSON.stringify(data), '123').toString());
            };
            return next();
          });
        } else {
          ndx.app.use(bodyParser.json({
            limit: '50mb'
          }));
        }
        ndx.server = http.createServer(ndx.app);
        if (settings.SSL_PORT) {
          ndx.sslserver = https.createServer({
            key: fs.readFileSync('key.pem'),
            cert: fs.readFileSync('cert.pem')
          }, ndx.app);
        }
        require('./controllers/token')(ndx);
        modulesToLoad = [];
        if (settings.AUTO_LOAD_MODULES) {
          r = glob.sync("server/startup/**/*.js");
          r.reverse();
          for (j = 0, len = r.length; j < len; j++) {
            module = r[j];
            require((process.cwd()) + "/" + module)(ndx);
          }
          r = glob.sync('node_modules/*');
          for (k = 0, len1 = r.length; k < len1; k++) {
            module = r[k];
            moduleName = module.replace('node_modules/', '');
            modulePackage = require((process.cwd()) + "/node_modules/" + moduleName + "/package.json");
            if (moduleName.indexOf('ndx-') === 0 || modulePackage.ndx) {
              if (moduleName !== 'ndx-server' && modulePackage.loadOrder !== 'ignore') {
                modulesToLoad.push({
                  name: moduleName,
                  loadOrder: Object.prototype.toString.call(modulePackage.loadOrder) === '[object Number]' ? modulePackage.loadOrder : 5,
                  version: modulePackage.version
                });
              }
            }
            modulePackage = null;
          }
          modulesToLoad.sort(function(a, b) {
            return a.loadOrder - b.loadOrder;
          });
          console.log('');
          w = function(text) {
            i = text.length;
            while (i++ < 20) {
              text += ' ';
            }
            return text;
          };
          for (l = 0, len2 = modulesToLoad.length; l < len2; l++) {
            module = modulesToLoad[l];
            require("../../" + module.name)(ndx);
            console.log((w(module.name)) + "\t" + module.version);
          }
          ref = ['services', 'controllers'];
          for (m = 0, len3 = ref.length; m < len3; m++) {
            folder = ref[m];
            r = glob.sync("server/" + folder + "/**/*.js");
            r.reverse();
            for (n = 0, len4 = r.length; n < len4; n++) {
              module = r[n];
              require((process.cwd()) + "/" + module)(ndx);
            }
          }
        }
        for (o = 0, len5 = uselist.length; o < len5; o++) {
          useCtrl = uselist[o];
          useCtrl(ndx);
        }
        for (p = 0, len6 = controllers.length; p < len6; p++) {
          ctrl = controllers[p];
          ctrl(ndx);
        }
        ndx.UNAUTHORIZED = {
          status: 401,
          message: 'Not authorized'
        };
        setImmediate(function() {
          return ndx.app.use(function(err, req, res, next) {
            var message;
            message = '';
            if (err.hasOwnProperty('message')) {
              message = err.message;
            } else {
              message = err.toString();
            }
            if (Object.prototype.toString.call(message === '[object Object]')) {
              return res.status(err.status || 500).json(message);
            } else {
              return res.status(err.status || 500).send(message);
            }
          });
        });

        /*  
        process.on 'uncaughtException', (err) ->
          console.log 'uncaughtException'
          console.log err
          process.exit 1
         */
        ndx.server.listen(ndx.port, function() {
          console.log(chalk.yellow(ndx.logo + "ndx server v" + (chalk.cyan.bold(ndx.version)) + " listening on " + (chalk.cyan.bold(ndx.port))));
          return console.log(chalk.yellow("started: " + (new Date().toLocaleString())));
        });
        if (settings.SSL_PORT) {
          return ndx.sslserver.listen(ndx.ssl_port, function() {
            return console.log(chalk.yellow("ndx ssl server v" + (chalk.cyan.bold(ndx.version)) + " listening on " + (chalk.cyan.bold(ndx.ssl_port))));
          });
        }
      }
    }
  };

  if (global.gc) {
    setInterval(function() {
      return typeof global.gc === "function" ? global.gc() : void 0;
    }, 2 * 60 * 1000);
  }

}).call(this);

//# sourceMappingURL=index.js.map
