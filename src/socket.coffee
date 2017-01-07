'use strict'

socketio = require 'socket.io'
async = require 'async'

io = null
sockets = []
emitToAll = (message, data) ->
  async.each sockets, (socket, callback) ->
    socket.emit message, data
    callback()
emitToUsers = (users, message, data) ->
  users.forEach (user) ->
    sockets.forEach (socket) ->
      if socket.user and socket.user is user._id
        socket.emit message, data

module.exports =
  setup: (server) ->
    io = socketio.listen server
    
    io.on 'connection', (socket) ->
      sockets.push socket
      socket.on 'disconnect', ->
        sockets.splice sockets.indexOf(socket, 1)
      socket.on 'user', (user) ->
        console.log 'got user', user
        socket.user = user
  emitToAll: (message, data) ->
    emitToAll message, data
  emitToUsers: (users, message, data) ->
    emitToUsers users, message, data