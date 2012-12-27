fs = require 'fs'
_ = require 'underscore'

module.exports = _(fs.readdirSync(__dirname)).inject (o, filename) ->
  return o unless /\.js$/.test(filename)
  name = filename.replace(/\.(js)$/, '')
  o[name] = require(__dirname + '/' + filename) if name isnt 'index'
  o
, {}
