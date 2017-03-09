(function() {
  'use strict';
  var bcrypt, crypto;

  crypto = require('crypto-js');

  bcrypt = require('bcrypt-nodejs');

  module.exports = function(ndx) {
    ndx.generateHash = function(password) {
      return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    };
    ndx.validPassword = function(password, localPassword) {
      return bcrypt.compareSync(password, localPassword);
    };
    ndx.postAuthenticate = function(req, res, next) {
      ndx.setAuthCookie(req, res);
      return res.redirect('/');
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
    ndx.generateToken = function(userId, ip, expiresHours) {
      var text;
      expiresHours = expiresHours || 5;
      text = userId + '||' + new Date(new Date().setHours(new Date().getHours() + expiresHours)).toString();
      if (!ndx.settings.SKIP_IP_ENCRYPT) {
        text = crypto.Rabbit.encrypt(text, ip).toString();
      }
      text = crypto.Rabbit.encrypt(text, ndx.settings.SESSION_SECRET).toString();
      return text;
    };
    ndx.setAuthCookie = function(req, res) {
      var cookieText;
      if (ndx.user) {
        cookieText = ndx.generateToken(ndx.user[ndx.settings.AUTO_ID], req.ip);
        res.cookie('token', cookieText, {
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }
    };
    return ndx.app.use('/api/*', function(req, res, next) {
      var bits, credentials, d, decrypted, isCookie, parts, scheme, token, where;
      if (!ndx.database.maintenance()) {
        isCookie = false;
        token = '';
        if (req.cookies && req.cookies.token) {
          token = req.cookies.token;
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
        decrypted = '';
        try {
          decrypted = crypto.Rabbit.decrypt(token, ndx.settings.SESSION_SECRET).toString(crypto.enc.Utf8);
          if (decrypted && !ndx.settings.IP_ENCRYPT) {
            decrypted = crypto.Rabbit.decrypt(decrypted, req.ip).toString(crypto.enc.Utf8);
          }
        } catch (undefined) {}
        if (decrypted.indexOf('||') !== -1) {
          bits = decrypted.split('||');
          if (bits.length === 2) {
            d = new Date(bits[1]);
            if (d.toString() !== 'Invalid Date') {
              if (d.valueOf() > new Date().valueOf()) {
                where = {};
                where[ndx.settings.AUTO_ID] = bits[0];
                ndx.database.select(ndx.settings.USER_TABLE, where, function(users) {
                  if (users && users.length) {
                    if (!ndx.user) {
                      ndx.user = {};
                    }
                    if (Object.prototype.toString.call(ndx.user) === '[object Object]') {
                      ndx.extend(ndx.user, users[0]);
                    } else {
                      ndx.user = users[0];
                    }
                    if (isCookie) {
                      ndx.setAuthCookie(req, res);
                    }
                    return users = null;
                  }
                }, true);
              }
            }
          }
        } else {
          false;
        }
      }
      return next();
    });
  };

}).call(this);

//# sourceMappingURL=token.js.map
