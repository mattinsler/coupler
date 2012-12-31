fs = require 'fs'

_ = require 'underscore'
events = require 'events'
protocols = require './protocols'
Acceptor = require './acceptor'
Connector = require './connector'
TransportProtocolStack = require './transport_protocol_stack'

intercept_events = (emitter, callback) ->
  _emit = emitter.emit
  emitter.emit = ->
    callback?(emitter, arguments...)
    _emit.apply(emitter, arguments)

class Connection extends events.EventEmitter
  constructor: (@coupler, @initiator) ->
    @has_been_connected = false
    
    @stack = new TransportProtocolStack()
    @coupler.configure_protocol_stack(@stack)
    
    @stack.on 'disconnected', => @reconnect()
    intercept_events @stack, (emitter, args...) => @emit(args...)
    
    @initiator.on 'connection', (transport) =>
      @transport = transport
      @transport.connection = @
      @stack.transport = @transport
      
      @stack.emit('reconnected') if @has_been_connected
      
      @has_been_connected = true
    
    @initiator.on 'error', (err) =>
      return @reconnect() if err.code is 'ECONNREFUSED'
      console.log err.code
  
  start: ->
    if @has_been_connected
      @stack.emit('reconnecting')
    else
      @stack.emit('connecting')
    @initiator.open()
  
  stop: ->
    @initiator.close()
    @transport.close()
  
  reconnect: ->
    if @initiator.supports_reconnect
      # console.log 'Reconnecting in ' + @coupler.options.reconnection_interval + 'ms...'
      setTimeout =>
        @start()
      , @coupler.options.reconnection_interval
    else
      # @stack.emit('disconnected')
      @emit('disconnected')
  
  consume: (service_name) ->
    @coupler.services.consume(service_name)

class Coupler extends events.EventEmitter
  constructor: ->
    @connections = []
    @services = protocols.service()
    @options = {
      reconnection_interval: 1000
    }
  
  accept: (opts = {}) ->
    for k, v of opts
      connection = new Connection(@, Acceptor.accept(k, v))
      intercept_events connection, (emitter, args...) => @emit(args..., emitter)
      # connection.on 'disconnected', =>
      #   @connections = @connections.filter (c) -> c isnt connection
      @connections.push(connection)
      
      connection.start()
    @
  
  connect: (opts = {}) ->
    keys = _(opts).keys()
    throw new Error('Can only connect to one endpoint at a time') unless keys.length is 1
    
    type = keys[0]
    connection = new Connection(@, Connector.connector(type, opts[type]))
    connection.on 'disconnected', =>
      @connections = @connections.filter (c) -> c isnt connection
    @connections.push(connection)
    
    connection.start()
    connection
  
  provide: (opts) ->
    @services.provide(opts)
    @
  
  disconnect: ->
    c.stop() for c in @connections
  
  configure_protocol_stack: (stack) ->
    # stack.use(protocols.json())
    stack.use(protocols.msgpack())
    stack.use(@services)


coupler = module.exports = -> new Coupler()
coupler.connect = -> new Coupler().connect(arguments...)
coupler.accept = -> new Coupler().accept(arguments...)
coupler.service = (v) ->
  throw new Error('Services must be an instance') unless _(v).isObject()
  return v if v instanceof events.EventEmitter
  c = v
  c = c.__proto__ while c.__proto__ isnt Object.prototype
  c.__proto__ = new events.EventEmitter()
  v


coupler.version = require('../package').version

coupler.Acceptor = require './acceptor'
coupler.Connector = require './connector'
coupler.Coupler = Coupler
coupler.Connection = Connection
coupler.ConnectionEmitter = require './connection_emitter'
coupler.ProtocolStack = require './protocol_stack'
coupler.Sanitizer = require './sanitizer'
coupler.Transport = require './transport'
coupler.TransportProtocolStack = require './transport_protocol_stack'

for file in fs.readdirSync(__dirname + '/transports')
  require(__dirname + '/transports/' + file) if /\.js$/.test(file)
