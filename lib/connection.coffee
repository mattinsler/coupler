utils = require './utils'
ConnectionEmitter = require './connection_emitter'

class Connection extends ConnectionEmitter
  constructor: (@coupler, stack) ->
    super()
    
    Object.defineProperty @, 'stack', {
      get: -> @__stack__
      set: (v) ->
        @__stack__ = v
        if v?
          v.connection = @
          utils.intercept_events v, (emitter, args...) => @emit(args...)
    }
    
    @stack = stack
      
    
  # start: ->
  #   if @has_been_connected
  #     @stack.emit('reconnecting')
  #   else
  #     @stack.emit('connecting')
  #   @initiator.open()
  # 
  # stop: ->
  #   @initiator.close()
  #   @transport.close()
  # 
  # reconnect: ->
  #   if @initiator.supports_reconnect
  #     # console.log 'Reconnecting in ' + @coupler.options.reconnection_interval + 'ms...'
  #     setTimeout =>
  #       @start()
  #     , @coupler.options.reconnection_interval
  #   else
  #     # @stack.emit('disconnected')
  #     @emit('disconnected')
  
  consume: (service_name) ->
    @service_protocol.consume(service_name)

module.exports = Connection
