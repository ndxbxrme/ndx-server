(function() {
  'use strict';
  var ObjectID, s, version;

  version = require('../../package').version;

  ObjectID = require('bson-objectid');

  s = require('underscore.string');

  module.exports = {
    id: ObjectID.generate(),
    generateID: function() {
      return ObjectID.generate();
    },
    extend: function(dest, source) {
      return Object.assign(dest, source);

      /*
      if not dest
        dest = {}
      if not source
        source = {}
      for i of source
        if source.hasOwnProperty(i)
          if dest.hasOwnProperty(i) and Object.prototype.toString.call(dest[i]) is '[object Object]'
            @extend dest[i], source[i]
          else
            dest[i] = source[i]
       */
    },
    fillTemplate: function(template, data) {
      return template.replace(/\{\{(.+?)\}\}/g, function(all, match) {
        var evalInContext;
        evalInContext = function(str, context) {
          return (new Function("with(this) {return " + str + "}")).call(context);
        };
        return evalInContext(match, data);
      });
    },
    startTime: new Date().valueOf(),
    transforms: {},
    version: version
  };

}).call(this);

//# sourceMappingURL=ndx.js.map
