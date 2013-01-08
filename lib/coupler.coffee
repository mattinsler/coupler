_ = require 'underscore'
events = require 'events'
utils = require './utils'
protocols = require './protocols'
Acceptor = require './acceptor'
Connector = require './connector'
Connection = require './connection'
TransportProtocolStack = require './transport_protocol_stack'

class Coupler extends events.EventEmitter
  constructor: ->
    @connections = []
    @services = protocols.service()
    @options = {
      reconnection_interval: 1000
    }
  
  accept: (opts = {}) ->
    for k, v of opts
      acceptor = Acceptor.accept(k, v)
      
      acceptor.on 'connection', (transport) =>
        conn = new Connection(@, stack)
        conn.service_protocol = protocols.service(@services)
        
        stack = new TransportProtocolStack(transport)
        stack.initiator = acceptor
        stack.connection = conn
        @configure_protocol_stack(stack)
        stack.emit('connected')
        
        @connections.push(conn)
      
      acceptor.open()
    @
        
      
    #   super()
    #   @has_been_connected = false
    # 
    #   @stack = new TransportProtocolStack()
    #   @stack.connection = @
    #   utils.intercept_events @stack, (emitter, args...) => @emit(args...)
    # 
    #   @coupler.configure_protocol_stack(@stack)
    #   @stack.on 'disconnected', => @reconnect()
    # 
    #   @initiator.on 'connection', (transport) =>
    #     @transport = transport
    #     @transport.connection = @
    #     @stack.transport = @transport
    # 
    #     @stack.emit('connected', @has_been_connected)
    #     @stack.emit('reconnected') if @has_been_connected
    # 
    #     @has_been_connected = true
    # 
    #   @initiator.on 'error', (err) =>
    #     return @reconnect() if err.code is 'ECONNREFUSED'
    #     console.log err.code
    #   
    #   
    #   
    #   connection = new Connection(@, Acceptor.accept(k, v))
    #   # utils.intercept_events connection, (emitter, args...) => @emit(args..., emitter)
    #   # connection.on 'disconnected', =>
    #   #   @connections = @connections.filter (c) -> c isnt connection
    #   @connections.push(connection)
    #   
    #   connection.start()
    # @
  
  connect: (opts = {}) ->
    keys = _(opts).keys()
    throw new Error('Can only connect to one endpoint at a time') unless keys.length is 1
    
    type = keys[0]
    connector = Connector.connector(type, opts[type])
    conn = new Connection(@)
    conn.service_protocol = protocols.service(@services)
    
    reconnect = =>
      if connector.supports_reconnect
        setTimeout ->
          connector.open()
        , @options.reconnection_interval
      else
        conn.emit('disconnected')
    
    connector.on 'connection', (transport) =>
      stack = new TransportProtocolStack(transport)
      stack.initiator = connector
      stack.connection = conn
      @configure_protocol_stack(stack)
      
      stack.on 'disconnected', -> reconnect()
      
      conn.stack = stack
      
      stack.emit('connected', conn.has_been_connected)
      stack.emit('reconnected') if conn.has_been_connected
      
      conn.has_been_connected = true
    
    connector.on 'error', (err) ->
      return reconnect() if err.code is 'ECONNREFUSED'
      console.log err.code
    
    connector.open()
    
    @connections.push(conn)
    conn
    
    # connection = new Connection(@, )
    # # connection.on 'disconnected', =>
    # #   @connections = @connections.filter (c) -> c isnt connection
    # @connections.push(connection)
    # 
    # connection.start()
    # connection
  
  provide: (opts) ->
    @services.provide(opts)
    @
  
  disconnect: ->
    c.stop() for c in @connections
  
  configure_protocol_stack: (stack) ->
    # stack.use(protocols.json())
    stack.use(protocols.msgpack())
    stack.use(stack.connection.service_protocol)


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

coupler.Acceptor = Acceptor
coupler.Connector = Connector
coupler.Coupler = Coupler
coupler.Connection = Connection
coupler.ConnectionEmitter = require './connection_emitter'
coupler.ProtocolStack = require './protocol_stack'
coupler.Sanitizer = require './sanitizer'
coupler.Transport = require './transport'
coupler.TransportProtocolStack = require './transport_protocol_stack'

fs = require 'fs'

for file in fs.readdirSync(__dirname + '/transports')
  require(__dirname + '/transports/' + file) if /\.(js|coffee)$/.test(file)
