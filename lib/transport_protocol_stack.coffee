ProtocolStack = require './protocol_stack'

class TransportProtocolStack extends ProtocolStack
  constructor: (transport) ->
    super
    
    Object.defineProperty @, 'transport', {
      set: (value) -> @set_transport(value)
      get: -> @_transport
    }
    
    @use(
      recv: (data, next) =>
        # console.log 'TransportProtocolStack:recv] ' + require('util').inspect(data.packet.toString())
        next(null, data.packet)
      send: (data, next) =>
        # console.log 'TransportProtocolStack:send] ' + require('util').inspect(data)
        @transport.write_packet(data)
    )
    
    @transport = transport
  
  set_transport: (transport) ->
    if @_transport?
      @_transport.close()
    
    @_transport = transport
    
    return unless transport?
    
    ['connecting', 'connected', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach (evt) =>
      # transport.on evt, -> console.log 'Transport: ' + evt
      transport.on(evt, @emit.bind(@, evt))
      # transport.on evt, => @emit(evt, arguments...)
    
    transport.on 'packet', (buffer) => @recv(buffer)

module.exports = TransportProtocolStack
