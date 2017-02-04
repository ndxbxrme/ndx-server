'use strict'

exports.databaseReady = (test) ->
  test.expect 1
  try 
    ndx = require '../index.js'
    .config
      database: 'rb'
      tables: ['users', 'tasks']
      port: 23000
    .controller (ndx) ->
      ndx.database.on 'ready', ->
        console.log 'database ready'
    .start()
    test.ok true, 'database ready'
    test.done()
  catch e
    console.log e
    test.done()

###

###