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
      var i, results1;
      if (!dest) {
        dest = {};
      }
      if (!source) {
        source = {};
      }
      results1 = [];
      for (i in source) {
        if (source.hasOwnProperty(i)) {
          if (dest.hasOwnProperty(i) && Object.prototype.toString.call(dest[i]) === '[object Object]') {
            results1.push(this.extend(dest[i], source[i]));
          } else {
            results1.push(dest[i] = source[i]);
          }
        } else {
          results1.push(void 0);
        }
      }
      return results1;
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
    makeSlug: function(table, template, data, cb) {
      var slug;
      slug = s(this.fillTemplate(template, data)).prune(30, '').slugify().value();
      return this.database.select(table, {
        slug: slug
      }, function(results) {
        if (results.length) {
          slug = slug + Math.floor(Math.random() * 9999);
        }
        data.slug = slug;
        return typeof cb === "function" ? cb() : void 0;
      });
    },
    startTime: new Date().valueOf(),
    transforms: {},
    version: version
  };

}).call(this);

//# sourceMappingURL=ndx.js.map
