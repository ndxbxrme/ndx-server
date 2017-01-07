'use strict'

http = require 'http'
ip = require 'ip'

module.exports = (app, port) ->
  app.get '/api/keep-awake', (req, res) ->
    res.end 'i\'m real'
  setInterval ->
    http.get 'http://' + ip.address() + ':' + port + '/api/keep-awake'
  , 5 * 60 * 1000