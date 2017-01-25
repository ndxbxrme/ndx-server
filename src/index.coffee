'use strict'
settings = require './settings.js'
ObjectID = require 'bson-objectid'

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
    console.log 'ndx server starting'
    if not config
      @config()
    require('memory-tick').start 60 * 10, (mem) ->
      console.log 'memory:', mem
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

    #require('./passport.js') ndx
    #require('./keep-awake.js') ndx
    ndx.server = http.createServer ndx.app
    
    ndx.app.get '/api/db', (req, res) ->
      res.json ndx.database.getDb()
    
    for useCtrl in uselist
      useCtrl ndx
    for ctrl in controllers
      ctrl ndx


    ndx.server.listen ndx.port, ->
      console.log 'ndx server listening on', ndx.port