'use strict'
passport = require 'passport'
flash = require 'connect-flash'
LocalStrategy = require('passport-local').Strategy
TwitterStrategy = require('passport-twitter').Strategy
FacebookStrategy = require('passport-facebook').Strategy
GithubStrategy = require('passport-github').Strategy
ObjectID = require 'bson-objectid'
bcrypt = require 'bcrypt-nodejs'
crypto = require 'crypto-js'
session = require 'express-session'
cookieParser = require 'cookie-parser'
settings = require './settings.js'

module.exports = (app, database) ->
  setCookie = (req, res) ->
    if req.user
      cookieText = req.user._id + '||' + new Date().toString()
      cookieText = crypto.Rabbit.encrypt(cookieText, settings.SESSION_SECRET).toString()
      res.cookie 'token', cookieText, maxAge: 7 * 24 * 60 * 60 * 1000  
  generateHash = (password) ->
    bcrypt.hashSync password, bcrypt.genSaltSync(8), null
  validPassword = (password, localPassword) ->
    bcrypt.compareSync password, localPassword
  postAuthenticate = (req, res, next) ->
    setCookie req, res
    res.redirect '/'
  passport.serializeUser (user, done) ->
    done null, user._id
  passport.deserializeUser (id, done) ->
    done null, id
  
  app.use cookieParser settings.SESSION_SECRET
  .use session
    secret: settings.SESSION_SECRET
    saveUninitialized: true
    resave: true
  .use flash()
  .use passport.initialize()
  .use passport.session()
  .use (req, res, next) ->
    req.user = null
    if req.cookies.token and not database.maintenance()
      decrypted = ''
      try
        decrypted = crypto.Rabbit.decrypt(req.cookies.token, settings.SESSION_SECRET).toString(crypto.enc.Utf8)
      if decrypted.indexOf('||') isnt -1
        bits = decrypted.split '||'
        if bits.length is 2
          d = new Date bits[1]
          if d.toString() isnt 'Invalid Date'
            users = database.exec 'SELECT * FROM ' + settings.USER_TABLE + ' WHERE _id=?', [bits[0]]
            if users and users.length
              req.user = users[0]
              setCookie req, res
    next()

  app.post '/api/refresh-login', (req, res) ->
    if req.user
      res.end JSON.stringify req.user
    else
      res.end 'error'    
  app.get '/api/logout', (req, res) ->
    res.clearCookie 'token'
    res.redirect '/'
    return
    
  passport.use 'local-signup', new LocalStrategy
    usernameField: 'email'
    passwordField: 'password'
    passReqToCallback: true
  , (req, email, password, done) ->
    users = database.exec 'SELECT * FROM ' + settings.USER_TABLE + ' WHERE local->email=?', [email]
    if users and users.length
      return done(null, false, req.flash('signupMessage', 'That email is already taken.'))
    else
      newUser = 
        _id: ObjectID.generate()
        local:
          email: email
          password: generateHash password
      database.exec 'INSERT INTO ' + settings.USER_TABLE + ' VALUES ?', [newUser]
      done null, newUser
  passport.use 'local-login', new LocalStrategy
    usernameField: 'email'
    passwordField: 'password'
    passReqToCallback: true
  , (req, email, password, done) ->
    users = database.exec 'SELECT * FROM ' + settings.USER_TABLE + ' WHERE local->email=?', [email]
    if users and users.length
      if not validPassword password, users[0].local.password
        return done(null, false, req.flash('loginMessage', 'Wrong password'))
      return done(null, users[0])
    else
      return done(null, false, req.flash('loginMessage', 'No user found'))
  module.exports = (app, passport) ->
    app.post '/api/signup', passport.authenticate('local-signup')
    , postAuthenticate
    app.post '/api/login', passport.authenticate('local-login')
    , postAuthenticate
    app.get '/api/connect/local', (req, res) ->
      #send flash message
      return
    app.post '/api/connect/local', passport.authorize('local-signup')
    app.get '/api/unlink/local', (req, res) ->
      user = req.user
      user.local.email = undefined
      user.local.password = undefined
      user.save (err) ->
        res.redirect '/profile'
        return
      return
  
  if settings.TWITTER_KEY
    passport.use new TwitterStrategy
      consumerKey: settings.TWITTER_KEY
      consumerSecret: settings.TWITTER_SECRET
      callbackURL: settings.TWITTER_CALLBACK
      passReqToCallback: true
    , (req, token, tokenSecret, profile, done) ->
      process.nextTick ->
        if not req.user
          users = database.exec 'SELECT * FROM ' + settings.USER_TABLE + ' WHERE twitter->id=?', [profile.id]
          if users and users.length
            if not users[0].twitter.token
              database.exec 'UPDATE ' + settings.USER_TABLE + ' SET twitter=? WHERE _id=?', [
                {
                  id: profile.id
                  token: token
                  username: profile.username
                  displayName: profile.displayName
                },
                users[0]._id
              ]
              return done null, users[0]
            return done null, users[0]
          else
            newUser =
              _id: ObjectID.generate()
              twitter:
                id: profile.id
                token: token
                username: profile.username
                displayName: profile.displayName
            database.exec 'INSERT INTO ' + settings.USER_TABLE + ' VALUES ?', [newUser]
            return done null, newUser
        else
          database.exec 'UPDATE ' + settings.USER_TABLE + ' SET twitter=? WHERE _id=?', [
            {
              id: profile.id
              token: token
              username: profile.username
              displayName: profile.displayName
            },
            req.user._id
          ]
          return done null, req.user
    app.get '/api/twitter', passport.authenticate('twitter', scope: 'email')
    , postAuthenticate
    app.get '/api/twitter/callback', passport.authenticate('twitter')
    , postAuthenticate
    app.get '/api/connect/twitter', passport.authorize('twitter',
      scope: 'email')
    app.get '/api/unlink/twitter', (req, res) ->
      user = req.user
      user.twitter.token = undefined
      user.save (err) ->
        res.redirect '/profile'
        return
      return
    
  if settings.FACEBOOK_KEY
    passport.use new FacebookStrategy
      clientID: settings.FACEBOOK_KEY
      clientSecret: settings.FACEBOOK_SECRET
      callbackURL: settings.FACEBOOK_CALLBACK
      passReqToCallback: true
    , (req, token, refreshToken, profile, done) ->
      if not req user
        users = database.exec 'SELECT * FROM ' + settings.USER_TABLE + ' WHERE facebook->id=?', [profile.id]
        if users and users.length
          if not users[0].facebook.token
            database.exec 'UPDATE ' + settings.USER_TABLE + ' SET facebook=? WHERE _id=?', [
              {
                token: token
                name: profile.name.givenName + ' ' + profile.name.familyName
                email: profile.emails[0].value
              },
              req.user._id
            ]
            return done null, users[0]
          return done null, users[0]
        else
          newUser = 
            _id: ObjectID.generate()
            facebook:
              id: profile.id
              token: token
              name: profile.name.givenName + ' ' + profile.name.familyName
              email: profile.emails[0].value
          database.exec 'INSERT INTO ' + settings.USER_TABLE + ' VALUES ?', [newUser]
          return done null, newUser
      else
        database.exec 'UPDATE ' + settings.USER_TABLE + ' SET facebook=? WHERE _id=?', [
          {
            id: profile.id
            token: token
            name: profile.name.givenName + ' ' + profile.name.familyName
            email: profile.emails[0].value
          },
          req.user._id
        ]
        return done null, req.user
    app.get '/api/facebook', passport.authenticate('facebook', scope: 'email')
    , postAuthenticate
    app.get '/api/facebook/callback', passport.authenticate('facebook')
    , postAuthenticate
    app.get '/api/connect/facebook', passport.authorize('facebook',
      scope: 'email')
    app.get '/api/unlink/facebook', (req, res) ->
      user = req.user
      user.facebook.token = undefined
      user.save (err) ->
        res.redirect '/profile'
        return
      return
     
  if settings.GITHUB_KEY
    passport.use new GithubStrategy
      clientID: settings.GITHUB_KEY
      clientSecret: settings.GITHUB_SECRET
      callbackURL: settings.GITHUB_CALLBACK
      passReqToCallback: true
    , (req, token, refreshToken, profile, done) ->
      if not req user
        users = database.exec 'SELECT * FROM ' + settings.USER_TABLE + ' WHERE github->id=?', [profile.id]
        if users and users.length
          if not users[0].github.token
            database.exec 'UPDATE ' + settings.USER_TABLE + ' SET github=? WHERE _id=?', [
              {
                token: token
                name: profile.displayName
                email: profile.emails[0].value
              },
              req.user._id
            ]
            return done null, users[0]
          return done null, users[0]
        else
          newUser = 
            _id: ObjectID.generate()
            github:
              id: profile.id
              token: token
              name: profile.displayName
              email: profile.emails[0].value
          database.exec 'INSERT INTO ' + settings.USER_TABLE + ' VALUES ?', [newUser]
          return done null, newUser
      else
        database.exec 'UPDATE ' + settings.USER_TABLE + ' SET github=? WHERE _id=?', [
          {
            id: profile.id
            token: token
            name: profile.displayName
            email: profile.emails[0].value
          },
          req.user._id
        ]
        return done null, req.user
    app.get '/api/github', passport.authenticate('github', scope: [
      'user'
      'user:email'
    ])
    , postAuthenticate
    app.get '/api/github/callback', passport.authenticate('github')
    , postAuthenticate
    app.get '/api/connect/github', passport.authorize('github',
      scope: [
        'user'
        'user:email'
      ]
      successRedirect: '/profile')
    app.get '/api/unlink/github', (req, res) ->
      user = req.user
      user.github.token = undefined
      user.save (err) ->
        res.redirect '/profile'
        return
      return