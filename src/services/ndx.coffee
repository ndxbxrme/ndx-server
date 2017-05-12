'use strict'
version = require('../../package').version
ObjectID = require 'bson-objectid'
s = require 'underscore.string'

module.exports =
  id: ObjectID.generate()
  generateID: ->
    ObjectID.generate()
  extend: (dest, source) ->
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
  fillTemplate: (template, data) -> 
    template.replace /\{\{(.+?)\}\}/g, (all, match) ->
      evalInContext = (str, context) ->
        (new Function("with(this) {return #{str}}"))
        .call context
      evalInContext match, data
  makeSlug: (table, template, data, cb) ->
    slug = s(@fillTemplate(template, data)).prune(30, '').slugify().value()
    @database.select table,
      slug: slug
    , (results) ->
      if results.length
        slug = slug + Math.floor(Math.random() * 9999)
      data.slug = slug
      cb?()
  startTime: new Date().valueOf()
  transforms: {}
  version: version