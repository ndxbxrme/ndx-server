'use strict'

ndx = require './index.js'
.config
  database: 'rb'
  tables: ['users', 'tasks']
  port: 23000
.controller (ndx) ->
  ndx.app.get '/api/thing', (req, res) ->
    res.json
      hey: 'yo'
.start()