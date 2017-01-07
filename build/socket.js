(function() {
  'use strict';
  var async, emitToAll, emitToUsers, io, socketio, sockets;

  socketio = require('socket.io');

  async = require('async');

  io = null;

  sockets = [];

  emitToAll = function(message, data) {
    return async.each(sockets, function(socket, callback) {
      socket.emit(message, data);
      return callback();
    });
  };

  emitToUsers = function(users, message, data) {
    return users.forEach(function(user) {
      return sockets.forEach(function(socket) {
        if (socket.user && socket.user === user._id) {
          return socket.emit(message, data);
        }
      });
    });
  };

  module.exports = {
    setup: function(server) {
      io = socketio.listen(server);
      return io.on('connection', function(socket) {
        sockets.push(socket);
        socket.on('disconnect', function() {
          return sockets.splice(sockets.indexOf(socket, 1));
        });
        return socket.on('user', function(user) {
          console.log('got user', user);
          return socket.user = user;
        });
      });
    },
    emitToAll: function(message, data) {
      return emitToAll(message, data);
    },
    emitToUsers: function(users, message, data) {
      return emitToUsers(users, message, data);
    }
  };

}).call(this);

//# sourceMappingURL=socket.js.map
