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
      var i, results;
      if (!dest) {
        dest = {};
      }
      if (!source) {
        source = {};
      }
      results = [];
      for (i in source) {
        if (source.hasOwnProperty(i)) {
          if (dest.hasOwnProperty(i) && Object.prototype.toString.call(dest[i]) === '[object Object]') {
            results.push(this.extend(dest[i], source[i]));
          } else {
            results.push(dest[i] = source[i]);
          }
        } else {
          results.push(void 0);
        }
      }
      return results;
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
    logo: "       _                                \n ___ _| |_ _    ___ ___ ___ _ _ ___ ___ \n|   | . |_'_|  |_ -| -_|  _| | | -_|  _|\n|_|_|___|_,_|  |___|___|_|  \\_/|___|_|  \n                                        \n",
    version: version,
    vars: {}
  };

}).call(this);

//# sourceMappingURL=ndx.js.map
