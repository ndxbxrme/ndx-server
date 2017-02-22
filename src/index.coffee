'use strict'
settings = require './settings.js'
ObjectID = require 'bson-objectid'
chalk = require 'chalk'
version = require '../package'
.version

config = null
controllers = []
uselist = []
middleware = []
module.exports =
  config: (args) ->
    config = args or {}
    config.database = config.database or settings.DATABASE or 'db'
    config.autoId = '_id'
    config.awsBucket = settings.AWS_BUCKET
    config.awsRegion = settings.AWS_REGION or 'us-east-1'
    config.awsId = settings.AWS_ID
    config.awsKey = settings.AWS_KEY
    settings.USER_TABLE = settings.USER_TABLE or config.userTable or 'users'
    settings.publicUser = settings.PUBLIC_USER or config.publicUser
    if config.tables and config.tables.length
      if config.tables.indexOf(settings.USER_TABLE) is -1
        config.tables.push settings.USER_TABLE
    else
      config.tables = [settings.USER_TABLE]
    @
  controller: (ctrl) ->
    type = Object.prototype.toString.call ctrl
    if type is '[object Function]'
      controllers.push ctrl
    else
      controllers.push require('../../' + ctrl)
    @
  use: (ctrl) ->
    type = Object.prototype.toString.call ctrl
    if type is '[object Function]'
      uselist.push ctrl
    else
      uselist.push require('../../' + ctrl)
    @
  start: ->
    console.log "ndx server starting"
    if not config
      @config()
    ndx =
      id: ObjectID.generate()
      extend: (dest, source) ->
        if not dest
          dest = {}
        if not source
          source = {}
        for i of source
          if source.hasOwnProperty(i)
            dest[i] = source[i]
      startTime: new Date().valueOf()
    ndx.database = require('ndxdb')
    .config config
    .start()
    express = require 'express'
    compression = require 'compression'
    bodyParser = require 'body-parser'
    session = require 'express-session'
    MemoryStore = require('session-memory-store') session
    cookieParser = require 'cookie-parser'
    flash = require 'connect-flash'
    http = require 'http'
    if settings.SSL_PORT
      https = require 'https'
      fs = require 'fs'
    helmet = require 'helmet'
    #morgan = require 'morgan'
    maintenance = require './maintenance.js'
    ndx.app = express()
    ndx.static = express.static
    ndx.port = settings.PORT or config.port
    ndx.ssl_port = settings.SSL_PORT
    ndx.host = settings.HOST or config.host
    ndx.settings = settings
    ndx.app.use compression()
    .use helmet()
    #.use morgan 'tiny'
    .use maintenance
      database: ndx.database
    .use bodyParser.json()
    .use cookieParser ndx.settings.SESSION_SECRET
    .use session
      name: 'NDXSESSION'
      secret: ndx.settings.SESSION_SECRET
      saveUninitialized: true
      resave: true
      store: new MemoryStore
        expires: 60
    .use flash()
    ndx.server = http.createServer ndx.app
    if settings.SSL_PORT
      ndx.sslserver = https.createServer 
        key: fs.readFileSync 'key.pem'
        cert: fs.readFileSync 'cert.pem'
      , ndx.app
    
    require('./controllers/token') ndx
    for useCtrl in uselist
      useCtrl ndx
    for ctrl in controllers
      ctrl ndx
      
    ndx.UNAUTHORIZED =
      status: 401
      message: 'Not authorized'
      
    setImmediate ->
      ndx.app.use (err, req, res, next) ->
        message = err.message or err.toString()
        res.status(err.status or 500).send message


    ndx.server.listen ndx.port, ->
      console.log chalk.yellow "ndx server v#{chalk.cyan.bold(version)} listening on #{chalk.cyan.bold(ndx.port)}"
    if settings.SSL_PORT
      ndx.sslserver.listen ndx.ssl_port, ->
        console.log chalk.yellow "ndx ssl server v#{chalk.cyan.bold(version)} listening on #{chalk.cyan.bold(ndx.ssl_port)}"
      
    if global.gc
      setInterval ->
        console.log 'cleaning', new Date().toLocaleString()
        global.gc?()
      , 2 * 60 * 1000