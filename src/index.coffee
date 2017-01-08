'use strict'
settings = require './settings.js'

config = null
controllers = []
middleware = []
module.exports =
  config: (args) ->
    config = args
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
      controllers.push require(ctrl)
    @
  use: (ctrl) ->
  start: ->
    console.log 'ndx server starting'
    database = require('ndxdb') config
    require('memory-tick').start 60, (mem) ->
      console.log 'memory', mem
    express = require 'express'
    compression = require 'compression'
    bodyParser = require 'body-parser'
    http = require 'http'
    socket = require './socket.js'
    maintenance = require './maintenance.js'
    app = express()
    port = config.port or settings.PORT
    app.use compression()
    .use maintenance
      database: database

    .use bodyParser.json()

    require('./passport.js') app, database, config
    require('./keep-awake.js') app, config.host
    for ctrl in controllers
      ctrl app, database
    
    require('./static_routes.js') app

    server = http.createServer app
    socket.setup server

    server.listen port, ->
      console.log 'ndx server listening on', port