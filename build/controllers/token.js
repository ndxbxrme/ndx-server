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
        if (req.user) {
          return next();
        } else {
          throw ndx.UNAUTHORIZED;
        }
      };
    };
    ndx.generateToken = function(userId, ip) {
      var text;
      text = userId + '||' + new Date().toString();
      text = crypto.Rabbit.encrypt(text, ip).toString();
      text = crypto.Rabbit.encrypt(text, ndx.settings.SESSION_SECRET).toString();
      return text;
    };
    ndx.setAuthCookie = function(req, res) {
      var cookieText;
      if (req.user) {
        cookieText = ndx.generateToken(req.user._id, req.ip);
        return res.cookie('token', cookieText, {
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }
    };
    return ndx.app.use('/api/*', function(req, res, next) {
      var bits, credentials, d, decrypted, isCookie, parts, scheme, token, users;
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
          if (decrypted) {
            decrypted = crypto.Rabbit.decrypt(decrypted, req.ip).toString(crypto.enc.Utf8);
          }
        } catch (undefined) {}
        if (decrypted.indexOf('||') !== -1) {
          bits = decrypted.split('||');
          if (bits.length === 2) {
            d = new Date(bits[1]);
            if (d.toString() !== 'Invalid Date') {
              users = ndx.database.exec('SELECT * FROM ' + ndx.settings.USER_TABLE + ' WHERE _id=?', [bits[0]]);
              if (users && users.length) {
                if (!req.user) {
                  req.user = {};
                }
                if (Object.prototype.toString.call(req.user) === '[object Object]') {
                  ndx.extend(req.user, users[0]);
                } else {
                  req.user = users[0];
                }
                if (isCookie) {
                  ndx.setAuthCookie(req, res);
                }
              }
            }
          }
        }
      }
      return next();
    });
  };

}).call(this);

//# sourceMappingURL=token.js.map
