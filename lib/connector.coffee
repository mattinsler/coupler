events = require 'events'

class Connector extends events.EventEmitter
  @RequiredMethods = ['close', 'open']
  
  @types: {}
  
  @register: (type, connector_class) ->
    throw new Error("Connector type #{type} is already registered") if @types[type]?
    for m in Connector.RequiredMethods
      throw new Error(type + ': Connectors must define ' + Connector.RequiredMethods.join(', ')) unless connector_class::[m]? and typeof connector_class::[m] is 'function'
    
    @types[type] = connector_class
    @
  
  @connector: (type, config) ->
    throw new Error("Unknown Connector type: #{type}") unless @types[type]?
    new @types[type](config)
  
  connect_transport: (transport) ->
    @emit('connection', transport)
    transport.emit('connected')

module.exports = Connector
