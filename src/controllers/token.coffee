'use strict'

crypto = require 'crypto-js'
bcrypt = require 'bcrypt-nodejs'

module.exports = (ndx) ->
  publicRoutes = ['/api/login', '/api/signup']
  ndx.addPublicRoute = (route) ->
    publicRoutes.push route
  ndx.generateHash = (password) ->
    bcrypt.hashSync password, bcrypt.genSaltSync(8), null
  ndx.validPassword = (password, localPassword) ->
    bcrypt.compareSync password, localPassword
  ndx.postAuthenticate = (req, res, next) ->
    ndx.setAuthCookie req, res
    res.redirect '/'
  ndx.authenticate = () ->
    (req, res, next) ->
      if ndx.user
        return next()
      else
        throw ndx.UNAUTHORIZED
      return
  ndx.generateToken = (userId, ip, expiresHours, skipIp) ->
    expiresHours = expiresHours or 5
    text = userId + '||' + new Date(new Date().setHours(new Date().getHours() + expiresHours)).toString()
    if ndx.settings.IP_ENCRYPT and not skipIp
      text = crypto.Rabbit.encrypt(text, ip).toString()
    text = crypto.Rabbit.encrypt(text, ndx.settings.SESSION_SECRET).toString()
    text
  ndx.parseToken = (token, skipIp) ->
    decrypted = ''
    try
      decrypted = crypto.Rabbit.decrypt(token, ndx.settings.SESSION_SECRET).toString(crypto.enc.Utf8)
      if decrypted and ndx.settings.IP_ENCRYPT and not skipIp
        decrypted = crypto.Rabbit.decrypt(decrypted, req.ip).toString(crypto.enc.Utf8)
    catch e
    if decrypted.indexOf('||') isnt -1
      bits = decrypted.split '||'
      if bits.length is 2
        d = new Date bits[1]
        if d.toString() isnt 'Invalid Date'
          if d.valueOf() > new Date().valueOf()
            return bits[0]
          else
            throw ndx.UNAUTHORIZED
        else
          throw ndx.UNAUTHORIZED
      else
        throw ndx.UNAUTHORIZED
    else
      ndx.user = null
      throw
        status: 200
        message: ''
  ndx.setAuthCookie = (req, res) ->
    if ndx.user
      cookieText = ndx.generateToken ndx.user[ndx.settings.AUTO_ID], req.ip
      res.cookie 'token', cookieText, maxAge: 7 * 24 * 60 * 60 * 1000  
    return
  ndx.app.use '/api/*', (req, res, next) ->
    ndx.user = null
    if req.method is 'OPTIONS'
      return next()
    for route in publicRoutes
      if new RegExp(route).test req.originalUrl
        if ndx.settings.ANONYMOUS_USER
          user =
            roles:
              anon: true
          user[ndx.settings.AUTO_ID] = 'anonymous'
          ndx.user = user
        return next()
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
      userId = ndx.parseToken token
      where = {}
      where[ndx.settings.AUTO_ID] = userId
      ndx.database.select ndx.settings.USER_TABLE, where, (users) ->
        if users and users.length
          if not ndx.user
            ndx.user = {}
          if Object.prototype.toString.call(ndx.user) is '[object Object]'
            ndx.extend ndx.user, users[0]
          else
            ndx.user = users[0]
          if isCookie
            ndx.setAuthCookie req, res
          users = null
        next()
      , true