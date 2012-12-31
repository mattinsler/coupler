net = require 'net'
Acceptor = require '../acceptor'
Connector = require '../connector'
Transport = require '../transport'

class TcpTransport extends Transport
  @Events = ['data', 'end', 'error', 'close', 'drain', 'pipe']
  
  constructor: (@socket) ->
    super
    @buffer = new Buffer(0)
    @_connect_events(@socket)
  
  close: ->
    @removeAllListeners()
    @socket.destroy()
  
  _connect_events: (socket) ->
    TcpTransport.Events.forEach (evt) =>
      socket.on(evt, @['handle_' + evt].bind(@, socket)) if @['handle_' + evt]?
  
  handle_data: (socket, buffer) ->
    @buffer = Buffer.concat([@buffer, buffer])
    
    read_packet_from_buffer = =>
      return false if @buffer.length < 4
      
      length = @buffer.readUInt32BE(0)
      return false if @buffer.length < (4 + length)
      
      packet_buffer = @buffer.slice(0, 4 + length)
      packet = packet_buffer.slice(4)
      
      @buffer = @buffer.slice(4 + length)
      @emit('packet', {buffer: packet_buffer, packet: packet})
      
      # console.log 'TcpTransport:READ_PACKET) ' + require('util').inspect(packet_buffer.toString())
      
      true
    
    true while read_packet_from_buffer()
  
  handle_error: (socket, err) ->
    @emit('error', err)
  
  handle_end: ->
    @emit('end')
  
  handle_close: ->
    @emit('disconnected')
  
  write_packet: (data) ->
    # console.log 'TcpTransport:WRITE_PACKET) ' + require('util').inspect(data)
    
    is_buffer = Buffer.isBuffer(data)
    data = data.toString() unless is_buffer
    
    buffer = new Buffer(4 + data.length)
    
    buffer.writeUInt32BE(data.length, 0)
    if is_buffer
      data.copy(buffer, 4)
    else
      buffer.write(data, 4)
    
    @socket.write(buffer)


class TcpAcceptor extends Acceptor
  constructor: (port) ->
    throw new Error('TcpAcceptor must be passed a port') unless port?
    
    @server_opts = {port: port}
    @server = net.createServer()
    
    ['listening', 'connection', 'close', 'error'].forEach (evt) =>
      @server.on(evt, => @['handle_' + evt]?(arguments...))
  
  open: ->
    @server.listen(@server_opts.port)
  
  close: ->
    @server.destroy()
  
  handle_error: (err) ->
    @emit('error', err)
  
  handle_connection: (socket) ->
    transport = new TcpTransport(socket)
    @accept_transport(transport)

Acceptor.register('tcp', TcpAcceptor)


parse_connection_string = (connection_string) ->
  if typeof connection_string is 'number'
    return {port: connection_string}
  
  else if typeof connection_string is 'string'
    [host, port] = connection_string.split(':')
    
    if port?
      return {host: host, port: parseInt(port)}
    
    if parseInt(host).toString() is host.toString()
      return {port: parseInt(host)}
    
    {path: connection_string}

class TcpConnector extends Connector
  @Events: ['connect', 'data', 'end', 'timeout', 'drain', 'error', 'close']
  
  supports_reconnect: true
  
  constructor: (connection_string) ->
    throw new Error('TcpConnector must be passed a connection string') unless connection_string?
    
    @sockets = []
    @connection_opts = parse_connection_string(connection_string)
  
  _connect_events: (socket) ->
    TcpConnector.Events.forEach (evt) =>
      socket.on(evt, @['handle_' + evt].bind(@, socket)) if @['handle_' + evt]?
  
  open: ->
    socket = net.connect(@connection_opts)
    @_connect_events(socket)
    @sockets.push(socket)
  
  close: ->
    s.destroy() for s in @sockets
  
  handle_error: (socket, err) ->
    @emit('error', err)
  
  handle_close: (socket) ->
    @sockets = @sockets.filter (s) ->
      s isnt socket
  
  handle_connect: (socket) ->
    transport = new TcpTransport(socket)
    @connect_transport(transport)

Connector.register('tcp', TcpConnector)
