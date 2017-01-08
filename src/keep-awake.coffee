'use strict'

http = require 'http'

module.exports = (app, host) ->
  if host
    app.get '/api/keep-awake', (req, res) ->
      res.end 'i\'m real'
    setInterval ->
      http.get 'http://' + host + '/api/keep-awake'
    , 5 * 60 * 1000