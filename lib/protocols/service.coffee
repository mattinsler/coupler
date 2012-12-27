_ = require 'underscore'
rpc = require './rpc'
ProtocolStack = require '../protocol_stack'

class ServiceProtocolStack extends ProtocolStack
  constructor: (@name) ->
    super
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

class ServiceProtocol
  constructor: ->
    @services = {}
    @consumed_services = {}
  
  initialize: ->
    @remote.on 'connected', (next) =>
      service.stack.emit('connected') for service in _(@services).values()
      service.stack.emit('connected') for service in _(@consumed_services).values()
      next()
  
  provide: (opts) ->
    for k, v of opts
      throw new Error("There is already a Service being provided at #{k}") if @services[k]?
      
      service = {
        stack: new ServiceProtocolStack("s:#{k}")
        rpc: rpc(k, v)
      }
      service.stack.use(service.rpc)
      service.stack.on 'send', (data) => @remote.send(data)
      
      @services[k] = service

  consume: (name) ->
    return @consumed_services[name] if @consumed_services[name]?
    
    service = {
      stack: new ServiceProtocolStack("c:#{name}")
      rpc: rpc(name)
    }
    service.stack.use(service.rpc)
    service.stack.on 'send', (data) => @remote.send(data)
    
    @consumed_services[name] = service
    service.rpc.client
  
  recv: (data, next) ->
    # console.log 'ServiceProtocol:recv] ' + require('util').inspect(data)
    
    return unless data.$s?
    
    if data.$s is 0
      if data.$m is 0
        return next.send($r: 0, $a: _(@services).keys())
      if data.$r is 0
        @remote_services = data.$a
        return next.emit('connected')
    
    [type, service_name] = data.$s.split(':')
    
    if data.$m?
      service = switch type
        when 'c' then @services[service_name]
        when 's' then @consumed_services[service_name]
    else if data.$r?
      service = switch type
        when 'c' then @consumed_services[service_name]
        when 's' then @services[service_name]
    
    return next() unless service?
    
    next.pipe(service.stack)
  
  send: (data, next) ->
    # console.log 'ServiceProtocol:send] ' + require('util').inspect(data)
    next()

module.exports = -> new ServiceProtocol()
