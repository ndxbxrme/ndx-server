'use strict'
settings = require './settings.js'
ObjectID = require 'bson-objectid'
chalk = require 'chalk'
underscored = require 'underscore.string'
.underscored
glob = require 'glob'
pack = require '../package'
version = pack.version

configured = false
controllers = []
uselist = []
middleware = []
module.exports =
  config: (config) ->
    for key of config
      keyU = underscored(key).toUpperCase()
      if Object.prototype.toString.call(config[key]) is '[object Boolean]'
        settings[keyU] = config[key]
      else
        settings[keyU] =  settings[keyU] or config[key]
    if not settings.DB_ENGINE
      settings.DB_ENGINE = require 'ndxdb'
    if settings.TABLES and settings.TABLES.length
      if settings.TABLES.indexOf(settings.USER_TABLE) is -1
        settings.TABLES.push settings.USER_TABLE
    else
      settings.TABLES = [settings.USER_TABLE]
    configured = true
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
    if not configured
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
      transforms: {}
      version: version
    ndx.database = settings.DB_ENGINE
    .config settings
    .start()
    express = require 'express'
    compression = require 'compression'
    bodyParser = require 'body-parser'
    cookieParser = require 'cookie-parser'
    session = require 'express-session'
    MemoryStore = require('session-memory-store') session
    http = require 'http'
    if settings.SSL_PORT
      https = require 'https'
      fs = require 'fs'
    helmet = require 'helmet'
    #morgan = require 'morgan'
    maintenance = require './maintenance.js'
    ndx.app = express()
    ndx.static = express.static
    ndx.port = settings.PORT
    ndx.ssl_port = settings.SSL_PORT
    ndx.host = settings.HOST
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
        expires: 5
    ndx.server = http.createServer ndx.app
    if settings.SSL_PORT
      ndx.sslserver = https.createServer 
        key: fs.readFileSync 'key.pem'
        cert: fs.readFileSync 'cert.pem'
      , ndx.app
    
    require('./controllers/token') ndx
    if settings.AUTO_LOAD_MODULES
      r = glob.sync "server/startup/**/*.js"
      for module in r
        require("#{process.cwd()}/#{module}") ndx
      modulesToLoad = []
      r = glob.sync 'node_modules/*'
      for module in r
        moduleName = module.replace('node_modules/', '')
        modulePackage = require("../../#{moduleName}/package.json")
        if moduleName.indexOf('ndx-') is 0 or modulePackage.ndx
          if moduleName isnt 'ndx-server'
            modulesToLoad.push
              name: moduleName
              loadOrder: modulePackage.loadOrder or 5
        modulePackage = null
      modulesToLoad.sort (a, b) ->
        a.loadOrder - b.loadOrder
      for module in modulesToLoad
        require("../../#{module.name}") ndx
      for folder in ['services', 'controllers']
        r = glob.sync "server/#{folder}/**/*.js"
        for module in r
          require("#{process.cwd()}/#{module}") ndx
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
        global.gc?()
      , 2 * 60 * 1000