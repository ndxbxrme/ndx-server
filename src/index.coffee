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
    ndx.database = require('ndxdb')
    .config config
    .start()
    express = require 'express'
    compression = require 'compression'
    bodyParser = require 'body-parser'
    session = require 'express-session'
    MemoryStore = session.MemoryStore
    cookieParser = require 'cookie-parser'
    http = require 'http'
    helmet = require 'helmet'
    maintenance = require './maintenance.js'
    ndx.app = express()
    ndx.static = express.static
    ndx.port = settings.PORT or config.port
    ndx.host = settings.HOST or config.host
    ndx.settings = settings
    ndx.app.use compression()
    .use helmet()
    .use maintenance
      database: ndx.database
    .use bodyParser.json()
    .use cookieParser ndx.settings.SESSION_SECRET
    .use session
      secret: ndx.settings.SESSION_SECRET
      saveUninitialized: true
      resave: true
      store: new MemoryStore()
      key: 'authorization.sid'

    ndx.server = http.createServer ndx.app
    
    for useCtrl in uselist
      useCtrl ndx
    for ctrl in controllers
      ctrl ndx


    ndx.server.listen ndx.port, ->
      console.log chalk.yellow "ndx server v#{chalk.cyan.bold(version)} listening on #{chalk.cyan.bold(ndx.port)}"