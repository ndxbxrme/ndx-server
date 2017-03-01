'use strict'

ndx = require '../index.js'
.config
  database: 'rb'
  tables: ['users', 'tasks']
  port: 23000
.controller (ndx) ->
  ndx.database.on 'ready', ->
    console.log ndx.database.getDb().users.data.length
.start()
