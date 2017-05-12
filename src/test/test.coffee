'use strict'

ndx = require '../index.js'
.config
  database: 'rb'
  tables: ['users', 'tasks']
  port: 23000
  logToScreen: true
.controller (ndx) ->
  ndx.database.on 'ready', ->
    console.log ndx.database.getDb().users.data.length
.use (ndx) ->
  data =
    name: 'bobby'
    age: 23
  console.log data
  ndx.makeSlug 'users', '{{name.toUpperCase()}} {{age}}', data, ->
    console.log data
.start()
