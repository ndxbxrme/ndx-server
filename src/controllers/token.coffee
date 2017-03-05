'use strict'

crypto = require 'crypto-js'
bcrypt = require 'bcrypt-nodejs'

module.exports = (ndx) ->
  ndx.generateHash = (password) ->
    bcrypt.hashSync password, bcrypt.genSaltSync(8), null
  ndx.validPassword = (password, localPassword) ->
    bcrypt.compareSync password, localPassword
  ndx.postAuthenticate = (req, res, next) ->
    ndx.setAuthCookie req, res
    res.redirect '/'
  ndx.authenticate = () ->
    (req, res, next) ->
      if req.user
        return next()
      else
        throw ndx.UNAUTHORIZED
      return
  ndx.generateToken = (userId, ip, expiresHours) ->
    expiresHours = expiresHours or 5
    text = userId + '||' + new Date(new Date().setHours(new Date().getHours() + expiresHours)).toString()
    if not ndx.settings.SKIP_IP_ENCRYPT
      text = crypto.Rabbit.encrypt(text, ip).toString()
    text = crypto.Rabbit.encrypt(text, ndx.settings.SESSION_SECRET).toString()
    text
  ndx.setAuthCookie = (req, res) ->
    if req.user
      cookieText = ndx.generateToken req.user._id, req.ip
      res.cookie 'token', cookieText, maxAge: 7 * 24 * 60 * 60 * 1000  
    return
  ndx.app.use '/api/*', (req, res, next) ->
    if not ndx.database.maintenance()
      isCookie = false
      token = ''
      if req.cookies and req.cookies.token
        token = req.cookies.token
        isCookie = true
      else if req.headers and req.headers.authorization
        parts = req.headers.authorization.split ' '
        if parts.length is 2
          scheme = parts[0]
          credentials = parts[1]
          if /^Bearer$/i.test scheme
            token = credentials
      decrypted = ''
      try
        decrypted = crypto.Rabbit.decrypt(token, ndx.settings.SESSION_SECRET).toString(crypto.enc.Utf8)
        if decrypted and not ndx.settings.SKIP_IP_ENCRYPT
          decrypted = crypto.Rabbit.decrypt(decrypted, req.ip).toString(crypto.enc.Utf8)
      if decrypted.indexOf('||') isnt -1
        bits = decrypted.split '||'
        if bits.length is 2
          d = new Date bits[1]
          if d.toString() isnt 'Invalid Date'
            if d.valueOf() > new Date().valueOf()
              users = ndx.database.select ndx.settings.USER_TABLE, _id: bits[0]
              if users and users.length
                if not req.user
                  req.user = {}
                if Object.prototype.toString.call(req.user) is '[object Object]'
                  ndx.extend req.user, users[0]
                else
                  req.user = users[0]
                if isCookie
                  ndx.setAuthCookie req, res
                users = null
    next()