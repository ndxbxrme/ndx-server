(function() {
  'use strict';
  var chalk, cluster, configured, controllers, cryptojs, express, fs, glob, http, middleware, rfs, settings, underscored, uselist;

  console.log('hiya ****************');

  settings = require('./settings.js');

  express = require('express');

  http = require('http');

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
      var MemoryStore, accessLogStream, app, bodyParser, compression, cookieParser, ctrl, e, error, factory, farmhash, folder, helmet, https, i, io, j, k, l, len1, len2, len3, len4, len5, len6, len7, m, maintenance, module, moduleName, modulePackage, modulesToLoad, morgan, n, ndx, numProcesses, o, options, p, port, r, ref, server, session, sio, socketServer, sockets, spawn, useCtrl, w, workerIndex, workers;
      if (cluster.isMaster) {
        ndx = require('./services/ndx');
        numProcesses = settings.CLUSTER ? +settings.CLUSTER_MAX : 1;
        workers = [];
        spawn = function(i) {
          console.log('SPAWNING', i, settings.CLUSTER_MAX);
          workers[i] = cluster.fork();
          return workers[i].on('exit', function(code, signal) {
            if (settings.AUTO_RESTART && settings.AUTO_RESTART.toString().toLowerCase() !== 'false') {
              console.log('respawning worker', i);
              return spawn(i);
            } else {
              return process.exit(1);
            }
          });
        };
        i = 0;
        while (i < numProcesses) {
          spawn(i++);
        }
        farmhash = require('farmhash');
        factory = null;
        options = {};
        port = null;
        if (settings.SSL_PORT) {
          factory = require('tls');
          options = {
            pauseOnConnect: true,
            key: fs.readFileSync('key.pem'),
            cert: fs.readFileSync('cert.pem')
          };
          port = +settings.SSL_PORT;
        } else {
          factory = require('net');
          options = {
            pauseOnConnect: true
          };
          port = +settings.PORT;
        }
        workerIndex = function(ip, len) {
          return farmhash.fingerprint32(ip) % len;
        };
        server = factory.createServer(options, function(connection) {
          var address, worker;
          address = connection.remoteAddress;
          if (address === '::ffff:127.0.0.1') {
            address = '::1';
          }
          worker = workers[workerIndex(address, numProcesses)];
          return worker.send('sticky-session:connection', connection);
        }).listen(port, function() {
          console.log(chalk.yellow(ndx.logo + "ndx " + (process.env.SSL_PORT ? 'ssl ' : '') + "server v" + (chalk.cyan.bold(ndx.version)) + " listening on " + (chalk.cyan.bold(port))));
          return console.log(chalk.yellow("started: " + (new Date().toLocaleString())));
        });
        if (settings.CLUSTER) {
          sio = require('socket.io');
          sockets = [];
          app = new express();
          socketServer = http.createServer(app);
          io = sio(socketServer);
          io.on('connection', function(socket) {
            sockets.push(socket);
            socket.on('disconnect', function() {
              return sockets.splice(sockets.indexOf(socket), 1);
            });
            socket.on('call', function(args) {
              var j, len1, mysocket, results;
              results = [];
              for (j = 0, len1 = sockets.length; j < len1; j++) {
                mysocket = sockets[j];
                results.push(mysocket.emit('call', args));
              }
              return results;
            });
            return console.log('connection to master', socket.id);
          });
          return socketServer.listen(+settings.CLUSTER_PORT, function() {
            return console.log('cluster server listening');
          });
        }
      } else {
        console.log("\nndx server starting");
        if (!configured) {
          this.config();
        }
        ndx = require('./services/ndx');
        ndx.database = settings.DB_ENGINE.config(settings).setNdx(ndx).start();
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
        ndx.app = new express();
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
          ndx.app.use(function(req, res, next) {
            if (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') === 0) {
              return bodyParser.text({
                type: '*/*',
                limit: '50mb'
              })(req, res, next);
            } else {
              return bodyParser.json({
                limit: '50mb'
              })(req, res, next);
            }
          }).use(function(req, res, next) {
            if (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') === 0) {
              if (ndx.crypto) {
                ndx.crypto.decrypt(req);
              }
            }
            return next();
          });
          ndx.app.use(function(req, res, next) {
            if (ndx.crypto) {
              ndx.crypto.encrypt(res);
            }
            return next();
          });
        } else {
          ndx.app.use(bodyParser.json({
            limit: '50mb'
          }));
        }
        ndx.server = ndx.app.listen(0, 'localhost');
        require('./controllers/token')(ndx);
        modulesToLoad = [];
        if (settings.AUTO_LOAD_MODULES) {
          r = glob.sync("server/startup/**/*.js");
          r.reverse();
          for (j = 0, len1 = r.length; j < len1; j++) {
            module = r[j];
            require((process.cwd()) + "/" + module)(ndx);
          }
          r = glob.sync('node_modules/*');
          for (k = 0, len2 = r.length; k < len2; k++) {
            module = r[k];
            moduleName = module.replace('node_modules/', '');
            modulePackage = {};
            try {
              modulePackage = require((process.cwd()) + "/node_modules/" + moduleName + "/package.json");
            } catch (error) {
              e = error;
            }
            if ((moduleName.indexOf('ndx-') === 0 || modulePackage.ndx) && !modulePackage.ndxIgnore) {
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
          for (l = 0, len3 = modulesToLoad.length; l < len3; l++) {
            module = modulesToLoad[l];
            require("../../" + module.name)(ndx);
            console.log((w(module.name)) + "\t" + module.version);
          }
          ref = ['services', 'controllers'];
          for (m = 0, len4 = ref.length; m < len4; m++) {
            folder = ref[m];
            r = glob.sync("server/" + folder + "/**/*.js");
            r.reverse();
            for (n = 0, len5 = r.length; n < len5; n++) {
              module = r[n];
              require((process.cwd()) + "/" + module)(ndx);
            }
          }
        }
        for (o = 0, len6 = uselist.length; o < len6; o++) {
          useCtrl = uselist[o];
          useCtrl(ndx);
        }
        for (p = 0, len7 = controllers.length; p < len7; p++) {
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
        return process.on('message', function(message, connection) {
          if (message !== 'sticky-session:connection') {
            return;
          }
          ndx.server.emit('connection', connection);
          return connection.resume();
        });
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
