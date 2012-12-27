events = require 'events'

class Connector extends events.EventEmitter
  @types: {}
  
  @register: (type, connector_class) ->
    throw new Error("Connector type #{type} is already registered") if @types[type]?
    @types[type] = connector_class
    @
  
  @connector: (type, config) ->
    throw new Error("Unknown Connector type: #{type}") unless @types[type]?
    new @types[type](config)
  
  connect_transport: (transport) ->
    transport.container = @container
    @emit('connection', transport)

module.exports = Connector
