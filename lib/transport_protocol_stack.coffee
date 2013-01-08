ProtocolStack = require './protocol_stack'
ConnectionEmitter = require './connection_emitter'

class TransportProtocolStack extends ProtocolStack
  constructor: (transport) ->
    super()
    ConnectionEmitter.inject_into(@)
    
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
    
    if transport?
      @_transport = transport
      @attach_to_transport(@_transport)
  
  attach_to_transport: (transport) ->
    return if transport.protocol_stack?
    
    transport.protocol_stack = @
    ['connecting', 'connected', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach (evt) =>
      transport.on evt, =>
        # console.log 'TransportProtocolStack.attach_to_transport emit ' + evt
        @emit(evt, arguments...)
      # transport.on(evt, @emit.bind(@, evt))
    
    transport.on 'packet', (buffer) => @recv(buffer)
    
    # @stack.each (module) => ConnectionEmitter.follow(transport, module.remote.__emitter__)
  
  set_transport: (transport) ->
    @_transport.close() if @_transport?
    @_transport = transport
    
    return unless transport?
    
    @attach_to_transport(transport)
    # @emit('transport', transport)
  
  build_remote: (module, node) ->
    module.remote = {
      protocol_stack: @
      __emitter__: new ConnectionEmitter()
      send: (data) =>
        @send_step(node, data)
    }
    module.remote.on = module.remote.__emitter__.on.bind(module.remote.__emitter__)
    module.remote.once = module.remote.__emitter__.once.bind(module.remote.__emitter__)
    module.remote.addListener = module.remote.__emitter__.addListener.bind(module.remote.__emitter__)
    module.remote.removeListener = module.remote.__emitter__.removeListener.bind(module.remote.__emitter__)
    module.remote.removeAllListeners = module.remote.__emitter__.removeAllListeners.bind(module.remote.__emitter__)
    module.remote.listeners = module.remote.__emitter__.listeners.bind(module.remote.__emitter__)
    module.remote.emit = module.remote.__emitter__.emit.bind(module.remote.__emitter__)
  
  # build_remote: (module) ->
  #   ProtocolStack::build_remote.call(@, module)
  #   ConnectionEmitter.inject_into(module.remote.__emitter__)
  
  emit: (event) ->
    # console.log 'TransportProtocolStack.emit ' + event
    ProtocolStack::emit.apply(@, arguments)

module.exports = TransportProtocolStack
