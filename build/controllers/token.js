(function() {
  'use strict';
  var bcrypt, crypto;

  crypto = require('crypto-js');

  bcrypt = require('bcrypt-nodejs');

  module.exports = function(ndx) {
    var publicRoutes;
    publicRoutes = ['/api/login', '/api/signup', '/api/logout', '/api/download'];
    ndx.addPublicRoute = function(route) {
      return publicRoutes.push(route);
    };
    ndx.generateHash = function(password) {
      return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    };
    ndx.validPassword = function(password, localPassword) {
      return bcrypt.compareSync(password, localPassword);
    };
    ndx.postAuthenticate = function(req, res, next) {
      ndx.setAuthCookie(req, res);
      return res.send(req.user._id);
    };
    ndx.authenticate = function() {
      return function(req, res, next) {
        if (ndx.user) {
          return next();
        } else {
          throw ndx.UNAUTHORIZED;
        }
      };
    };
    ndx.generateToken = function(userId, ip, expiresHours, skipIp) {
      var text;
      expiresHours = expiresHours || 5;
      text = userId + '||' + new Date(new Date().setHours(new Date().getHours() + expiresHours)).toString();
      if (ndx.settings.IP_ENCRYPT && !skipIp) {
        text = crypto.Rabbit.encrypt(text, ip).toString();
      }
      text = crypto.Rabbit.encrypt(text, ndx.settings.SESSION_SECRET).toString();
      return text;
    };
    ndx.parseToken = function(token, skipIp) {
      var bits, d, decrypted, e;
      if (!token) {
        return null;
      }
      decrypted = '';
      try {
        decrypted = crypto.Rabbit.decrypt(token, ndx.settings.SESSION_SECRET).toString(crypto.enc.Utf8);
        if (decrypted && ndx.settings.IP_ENCRYPT && !skipIp) {
          decrypted = crypto.Rabbit.decrypt(decrypted, req.ip).toString(crypto.enc.Utf8);
        }
      } catch (error) {
        e = error;
      }
      if (decrypted.indexOf('||') !== -1) {
        bits = decrypted.split('||');
        if (bits.length === 2) {
          d = new Date(bits[1]);
          if (d.toString() !== 'Invalid Date') {
            if (d.valueOf() > new Date().valueOf()) {
              return bits[0];
            }
          }
        }
      }
      return null;
    };
    ndx.setAuthCookie = function(req, res) {
      var cookieText;
      if (ndx.user) {
        cookieText = ndx.generateToken(ndx.user[ndx.settings.AUTO_ID], req.ip);
        res.encToken = cookieText;
        res.cookie(ndx.cookieName, cookieText, {
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }
    };
    ndx.app.use('/*', function(req, res, next) {
      if (req.headers.ndxhost) {
        ndx.host = req.headers.ndxhost;
      } else {
        ndx.host = ndx.host || process.env.HOST || ndx.settings.HOST || `${req.protocol}://${req.hostname}`;
      }
      res.set('Server-Id', ndx.id);
      return next();
    });
    return ndx.app.use('/api/*', async function(req, res, next) {
      var credentials, i, impersonating, isCookie, len, parts, route, scheme, token, user, userId, where;
      ndx.user = null;
      if (req.method === 'OPTIONS') {
        return next();
      }
      if (!ndx.database.maintenance()) {
        isCookie = false;
        token = '';
        impersonating = null;
        if (req.cookies && req.cookies[ndx.cookieName]) {
          token = req.cookies[ndx.cookieName];
          isCookie = true;
        } else if (req.headers && req.headers.authorization) {
          parts = req.headers.authorization.split(' ');
          if (parts.length === 2) {
            scheme = parts[0];
            credentials = parts[1];
            if (/^Bearer$/i.test(scheme)) {
              token = credentials;
            }
          }
        }
        if (req.cookies.impersonate) {
          impersonating = (crypto.Rabbit.decrypt(req.cookies.impersonate, ndx.settings.SESSION_SECRET).toString(crypto.enc.Utf8) || '').split('||')[0];
        }
        userId = ndx.parseToken(token);
        if (userId) {
          where = {};
          where[ndx.settings.AUTO_ID] = userId;
          return ndx.database.select(ndx.settings.USER_TABLE, where, function(users) {
            if (users && users.length) {
              if (!ndx.user) {
                ndx.user = {};
              }
              if (Object.prototype.toString.call(ndx.user) === '[object Object]') {
                ndx.extend(ndx.user, users[0]);
              } else {
                ndx.user = users[0];
              }
              ndx.user.ip = req.ip;
              if (impersonating) {
                ndx.user.impersonatedBy = impersonating;
              }
              req.user = ndx.user;
              if (isCookie) {
                ndx.setAuthCookie(req, res);
              }
              users = null;
            }
            return next();
          }, true);
        } else {
          if (ndx.settings.ANONYMOUS_USER && req.headers['anon-id']) {
            user = (await ndx.database.selectOne(ndx.settings.USER_TABLE, {
              _id: req.headers['anon-id']
            }));
            if (!user) {
              user = {
                email: 'anon@user.com',
                local: {
                  email: 'anon@user.com'
                },
                roles: {
                  anon: true
                },
                type: 'anon',
                _id: req.headers['anon-id']
              };
            }
            ndx.user = user;
            ndx.user.ip = req.ip;
            if (impersonating) {
              ndx.user.impersonatedBy = impersonating;
            }
            req.user = ndx.user;
            return next();
          }
          for (i = 0, len = publicRoutes.length; i < len; i++) {
            route = publicRoutes[i];
            if (new RegExp(route).test(req.originalUrl)) {
              return next();
            }
          }
          return res.status(ndx.UNAUTHORIZED.status).json(ndx.UNAUTHORIZED.message);
        }
      }
    });
  };

}).call(this);

//# sourceMappingURL=token.js.map
