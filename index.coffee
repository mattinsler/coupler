# fs = require 'fs'
# Coupler = require './lib/coupler'
# 
# coupler = module.exports = -> new Coupler()
# coupler.connect = -> new Coupler().connect(arguments...)
# coupler.accept = -> new Coupler().accept(arguments...)
# 
# for file in fs.readdirSync('./lib/transports')
#   require('./lib/transports/' + file)
