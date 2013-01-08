_ = require 'underscore'
rpc = require './rpc'
ProtocolStack = require '../protocol_stack'
ConnectionEmitter = require '../connection_emitter'

class ServiceProtocolStack extends ProtocolStack
  constructor: (@name) ->
    super()
    ConnectionEmitter.inject_into(@)
    
    @use(
      recv: (data, next) =>
        # console.log 'ServiceProtocolStack:recv] ' + require('util').inspect(data)
        next.data.service = data.$s
        delete data.$s
        next(null, data)
      send: (data, next) =>
        # console.log 'ServiceProtocolStack:send] ' + require('util').inspect(data)
        data.$s ?= next.data.service or @name
        next(null, data)
    )

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
  
  # set_transport: (transport) ->
  #   @transport = transport
  #   console.log 'ServiceProtocolStack: set_transport'
  #   @stack.each (module) => ConnectionEmitter.follow(@transport, module.remote.__emitter__)
  # 
  # build_remote: (module) ->
  #   ProtocolStack::build_remote.call(@, module)
  #   module.remote.__emitter__ = new ConnectionEmitter(@transport)


class RootService
  constructor: (@service_container) ->
  list: (callback) ->
    callback?(@service_container.provided_services())

root_service = (service_container) ->
  -> new RootService(service_container)

class ServiceContainer
  constructor: ->
    @services = {}
    @provide(0: root_service(@))
  
  provide: (opts) ->
    for k, v of opts
      throw new Error("There is already a Service being provided at #{k}") if @services[k]?
      @services[k] = v
  
  provided_services: ->
    _.chain(@services).keys().without('0').value()

class ServiceProtocol
  constructor: (@service_container) ->
    @services = {}
    @consumed_services = {}
  
  initialize: ->
    # Created a service protocol stack without a transport...  need to set the transport when parent stack's transport is set...
    # @remote.on 'transport', (next, transport) =>
    #   console.log 'ServiceProtocol: GOT A NEW TRANSPORT'
    #   for s in _(@services).values().concat(_(@consumed_services).values())
    #     console.log 'ServiceProtocol: Setting transport for service ' + s.stack.name
    #     s.stack.set_transport(transport)
    #   next()
    
    ['connecting', 'connected', 'disconnected', 'reconnected', 'reconnecting'].forEach (evt) =>
      @remote.on evt, (next, args...) =>
        # console.log 'ServiceProtocol] emit ' + evt
        s.stack.emit?(evt, args...) for s in _(@services).values().concat(_(@consumed_services).values())
        next()
  
  get_service: (service_name) ->
    service = @services[service_name]
    
    unless service?
      svc = @service_container.services[service_name]
      return null unless svc?
      
      service = {
        stack: new ServiceProtocolStack("s:#{service_name}")
        rpc: rpc(service_name, svc)
      }
      Object.defineProperty service.stack, 'connection', {
        get: => @remote.protocol_stack.connection
      }
            
      service.stack.use(service.rpc)
      service.stack.on 'send', (data) => @remote.send(data)
      
      service.stack.emit('connected') if ConnectionEmitter.is_connected(@remote.__emitter__)
      service.stack.emit('disconnected') if ConnectionEmitter.is_disconnected(@remote.__emitter__)
      
      @services[service_name] = service
    
    service
  
  consume: (name) ->
    return @consumed_services[name] if @consumed_services[name]?
    
    service = {
      stack: new ServiceProtocolStack("c:#{name}")
      rpc: rpc(name)
    }
    Object.defineProperty service.stack, 'connection', {
      get: => @remote.protocol_stack.connection
    }
    
    service.stack.use(service.rpc)
    service.stack.on 'send', (data) => @remote.send(data)
    
    service.stack.emit('connected') if @remote?.__emitter__? and ConnectionEmitter.is_connected(@remote.__emitter__)
    service.stack.emit('disconnected') if @remote?.__emitter__? and ConnectionEmitter.is_disconnected(@remote.__emitter__)
    
    @consumed_services[name] = service
    service.rpc.client
  
  recv: (data, next) ->
    # console.log 'ServiceProtocol:recv] ' + require('util').inspect(data)
    
    return unless data.$s?
    
    [type, service_name] = data.$s.split(':')
    
    if data.$m?
      service = switch type
        when 'c' then @get_service(service_name)
        when 's' then @consumed_services[service_name]
    else if data.$r?
      service = switch type
        when 'c' then @consumed_services[service_name]
        when 's' then @get_service(service_name)
    
    return next() unless service?
    
    next.pipe(service.stack)
  
  send: (data, next) ->
    # console.log 'ServiceProtocol:send] ' + require('util').inspect(data)
    next()

module.exports = (service_container) ->
  return new ServiceContainer() unless service_container?
  new ServiceProtocol(service_container)
