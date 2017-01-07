(function() {
  'use strict';
  var FacebookStrategy, GithubStrategy, LocalStrategy, ObjectID, TwitterStrategy, bcrypt, cookieParser, crypto, flash, passport, session, settings;

  passport = require('passport');

  flash = require('connect-flash');

  LocalStrategy = require('passport-local').Strategy;

  TwitterStrategy = require('passport-twitter').Strategy;

  FacebookStrategy = require('passport-facebook').Strategy;

  GithubStrategy = require('passport-github').Strategy;

  ObjectID = require('bson-objectid');

  bcrypt = require('bcrypt-nodejs');

  crypto = require('crypto-js');

  session = require('express-session');

  cookieParser = require('cookie-parser');

  settings = require('./settings.js');

  module.exports = function(app, database) {
    var generateHash, postAuthenticate, setCookie, validPassword;
    setCookie = function(req, res) {
      var cookieText;
      if (req.user) {
        cookieText = req.user._id + '||' + new Date().toString();
        cookieText = crypto.Rabbit.encrypt(cookieText, settings.SESSION_SECRET).toString();
        return res.cookie('token', cookieText, {
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }
    };
    generateHash = function(password) {
      return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    };
    validPassword = function(password, localPassword) {
      return bcrypt.compareSync(password, localPassword);
    };
    postAuthenticate = function(req, res, next) {
      setCookie(req, res);
      return res.redirect('/');
    };
    passport.serializeUser(function(user, done) {
      return done(null, user._id);
    });
    passport.deserializeUser(function(id, done) {
      return done(null, id);
    });
    app.use(cookieParser(settings.SESSION_SECRET)).use(session({
      secret: settings.SESSION_SECRET,
      saveUninitialized: true,
      resave: true
    })).use(flash()).use(passport.initialize()).use(passport.session()).use(function(req, res, next) {
      var bits, d, decrypted, users;
      req.user = null;
      if (req.cookies.token && !database.maintenance()) {
        decrypted = '';
        try {
          decrypted = crypto.Rabbit.decrypt(req.cookies.token, settings.SESSION_SECRET).toString(crypto.enc.Utf8);
        } catch (undefined) {}
        if (decrypted.indexOf('||') !== -1) {
          bits = decrypted.split('||');
          if (bits.length === 2) {
            d = new Date(bits[1]);
            if (d.toString() !== 'Invalid Date') {
              users = database.exec('SELECT * FROM users WHERE _id=?', [bits[0]]);
              if (users && users.length) {
                req.user = users[0];
                setCookie(req, res);
              }
            }
          }
        }
      }
      return next();
    });
    app.post('/api/refresh-login', function(req, res) {
      if (req.user) {
        return res.end(JSON.stringify(req.user));
      } else {
        return res.end('error');
      }
    });
    app.get('/api/logout', function(req, res) {
      res.clearCookie('token');
      res.redirect('/');
    });
    passport.use('local-signup', new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    }, function(req, email, password, done) {
      var newUser, users;
      users = database.exec('SELECT * FROM users WHERE local->email=?', [email]);
      if (users && users.length) {
        return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
      } else {
        newUser = {
          _id: ObjectID.generate(),
          local: {
            email: email,
            password: generateHash(password)
          }
        };
        database.exec('INSERT INTO users VALUES ?', [newUser]);
        return done(null, newUser);
      }
    }));
    passport.use('local-login', new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    }, function(req, email, password, done) {
      var users;
      users = database.exec('SELECT * FROM users WHERE local->email=?', [email]);
      if (users && users.length) {
        if (!validPassword(password, users[0].local.password)) {
          return done(null, false, req.flash('loginMessage', 'Wrong password'));
        }
        return done(null, users[0]);
      } else {
        return done(null, false, req.flash('loginMessage', 'No user found'));
      }
    }));
    module.exports = function(app, passport) {
      app.post('/api/signup', passport.authenticate('local-signup'), postAuthenticate);
      app.post('/api/login', passport.authenticate('local-login'), postAuthenticate);
      app.get('/api/connect/local', function(req, res) {});
      app.post('/api/connect/local', passport.authorize('local-signup'));
      return app.get('/api/unlink/local', function(req, res) {
        var user;
        user = req.user;
        user.local.email = void 0;
        user.local.password = void 0;
        user.save(function(err) {
          res.redirect('/profile');
        });
      });
    };
    if (settings.TWITTER_KEY) {
      passport.use(new TwitterStrategy({
        consumerKey: settings.TWITTER_KEY,
        consumerSecret: settings.TWITTER_SECRET,
        callbackURL: settings.TWITTER_CALLBACK,
        passReqToCallback: true
      }, function(req, token, tokenSecret, profile, done) {
        return process.nextTick(function() {
          var newUser, users;
          if (!req.user) {
            users = database.exec('SELECT * FROM users WHERE twitter->id=?', [profile.id]);
            if (users && users.length) {
              if (!users[0].twitter.token) {
                database.exec('UPDATE users SET twitter=? WHERE _id=?', [
                  {
                    id: profile.id,
                    token: token,
                    username: profile.username,
                    displayName: profile.displayName
                  }, users[0]._id
                ]);
                return done(null, users[0]);
              }
              return done(null, users[0]);
            } else {
              newUser = {
                _id: ObjectID.generate(),
                twitter: {
                  id: profile.id,
                  token: token,
                  username: profile.username,
                  displayName: profile.displayName
                }
              };
              database.exec('INSERT INTO users VALUES ?', [newUser]);
              return done(null, newUser);
            }
          } else {
            database.exec('UPDATE users SET twitter=? WHERE _id=?', [
              {
                id: profile.id,
                token: token,
                username: profile.username,
                displayName: profile.displayName
              }, req.user._id
            ]);
            return done(null, req.user);
          }
        });
      }));
      app.get('/api/twitter', passport.authenticate('twitter', {
        scope: 'email'
      }), postAuthenticate);
      app.get('/api/twitter/callback', passport.authenticate('twitter'), postAuthenticate);
      app.get('/api/connect/twitter', passport.authorize('twitter', {
        scope: 'email'
      }));
      app.get('/api/unlink/twitter', function(req, res) {
        var user;
        user = req.user;
        user.twitter.token = void 0;
        user.save(function(err) {
          res.redirect('/profile');
        });
      });
    }
    if (settings.FACEBOOK_KEY) {
      passport.use(new FacebookStrategy({
        clientID: settings.FACEBOOK_KEY,
        clientSecret: settings.FACEBOOK_SECRET,
        callbackURL: settings.FACEBOOK_CALLBACK,
        passReqToCallback: true
      }, function(req, token, refreshToken, profile, done) {
        var newUser, users;
        if (!req(user)) {
          users = database.exec('SELECT * FROM users WHERE facebook->id=?', [profile.id]);
          if (users && users.length) {
            if (!users[0].facebook.token) {
              database.exec('UPDATE users SET facebook=? WHERE _id=?', [
                {
                  token: token,
                  name: profile.name.givenName + ' ' + profile.name.familyName,
                  email: profile.emails[0].value
                }, req.user._id
              ]);
              return done(null, users[0]);
            }
            return done(null, users[0]);
          } else {
            newUser = {
              _id: ObjectID.generate(),
              facebook: {
                id: profile.id,
                token: token,
                name: profile.name.givenName + ' ' + profile.name.familyName,
                email: profile.emails[0].value
              }
            };
            database.exec('INSERT INTO users VALUES ?', [newUser]);
            return done(null, newUser);
          }
        } else {
          database.exec('UPDATE users SET facebook=? WHERE _id=?', [
            {
              id: profile.id,
              token: token,
              name: profile.name.givenName + ' ' + profile.name.familyName,
              email: profile.emails[0].value
            }, req.user._id
          ]);
          return done(null, req.user);
        }
      }));
      app.get('/api/facebook', passport.authenticate('facebook', {
        scope: 'email'
      }), postAuthenticate);
      app.get('/api/facebook/callback', passport.authenticate('facebook'), postAuthenticate);
      app.get('/api/connect/facebook', passport.authorize('facebook', {
        scope: 'email'
      }));
      app.get('/api/unlink/facebook', function(req, res) {
        var user;
        user = req.user;
        user.facebook.token = void 0;
        user.save(function(err) {
          res.redirect('/profile');
        });
      });
    }
    if (settings.GITHUB_KEY) {
      passport.use(new GithubStrategy({
        clientID: settings.GITHUB_KEY,
        clientSecret: settings.GITHUB_SECRET,
        callbackURL: settings.GITHUB_CALLBACK,
        passReqToCallback: true
      }, function(req, token, refreshToken, profile, done) {
        var newUser, users;
        if (!req(user)) {
          users = database.exec('SELECT * FROM users WHERE github->id=?', [profile.id]);
          if (users && users.length) {
            if (!users[0].github.token) {
              database.exec('UPDATE users SET github=? WHERE _id=?', [
                {
                  token: token,
                  name: profile.displayName,
                  email: profile.emails[0].value
                }, req.user._id
              ]);
              return done(null, users[0]);
            }
            return done(null, users[0]);
          } else {
            newUser = {
              _id: ObjectID.generate(),
              github: {
                id: profile.id,
                token: token,
                name: profile.displayName,
                email: profile.emails[0].value
              }
            };
            database.exec('INSERT INTO users VALUES ?', [newUser]);
            return done(null, newUser);
          }
        } else {
          database.exec('UPDATE users SET github=? WHERE _id=?', [
            {
              id: profile.id,
              token: token,
              name: profile.displayName,
              email: profile.emails[0].value
            }, req.user._id
          ]);
          return done(null, req.user);
        }
      }));
      app.get('/api/github', passport.authenticate('github', {
        scope: ['user', 'user:email']
      }), postAuthenticate);
      app.get('/api/github/callback', passport.authenticate('github'), postAuthenticate);
      app.get('/api/connect/github', passport.authorize('github', {
        scope: ['user', 'user:email'],
        successRedirect: '/profile'
      }));
      return app.get('/api/unlink/github', function(req, res) {
        var user;
        user = req.user;
        user.github.token = void 0;
        user.save(function(err) {
          res.redirect('/profile');
        });
      });
    }
  };

}).call(this);

//# sourceMappingURL=passport.js.map
