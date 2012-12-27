events = require 'events'

class Acceptor extends events.EventEmitter
  @types: {}
  
  @register: (type, acceptor_class) ->
    throw new Error("Acceptor type #{type} is already registered") if @types[type]?
    @types[type] = acceptor_class
    @
  
  @accept: (type, config) ->
    throw new Error("Unknown Acceptor type: #{type}") unless @types[type]?
    new @types[type](config)
  
  accept_transport: (transport) ->
    transport.container = @container
    @emit('connection', transport)

module.exports = Acceptor
