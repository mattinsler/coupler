events = require 'events'

class Acceptor extends events.EventEmitter
  @RequiredMethods = ['close', 'open']
  
  @types: {}
  
  @register: (type, acceptor_class) ->
    throw new Error("Acceptor type #{type} is already registered") if @types[type]?
    for m in Acceptor.RequiredMethods
      throw new Error(type + ': Acceptors must define ' + Acceptor.RequiredMethods.join(', ')) unless acceptor_class::[m]? and typeof acceptor_class::[m] is 'function'
    
    @types[type] = acceptor_class
    @
  
  @accept: (type, config) ->
    throw new Error("Unknown Acceptor type: #{type}") unless @types[type]?
    new @types[type](config)
  
  accept_transport: (transport) ->
    @emit('connection', transport)

module.exports = Acceptor
