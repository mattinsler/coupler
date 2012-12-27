ProtocolStack = require './protocol_stack'

class TransportProtocolStack extends ProtocolStack
  constructor: (@transport) ->
    super
    @use(
      recv: (data, next) =>
        # console.log 'TransportProtocolStack:recv] ' + require('util').inspect(data.packet.toString())
        next(null, data.packet)
      send: (data, next) =>
        # console.log 'TransportProtocolStack:send] ' + require('util').inspect(data)
        @transport.write_packet(data)
    )
    
    # ['connect', 'data', 'error', 'close', 'end', 'timeout'].forEach (evt) =>
    #   @socket.on evt, => @emit("socket:#{evt}", @)
    
    @transport.on 'packet', (buffer) => @recv(buffer)
    @transport.on 'connected', => @emit('connected', @)
    @transport.on 'close', => @emit('disconnected', @)
    @transport.on 'error', (err) =>
      console.log err.stack
      @emit('error', err)

module.exports = TransportProtocolStack
