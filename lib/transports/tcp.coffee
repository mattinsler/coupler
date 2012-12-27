net = require 'net'
Acceptor = require '../acceptor'
Connector = require '../connector'
Transport = require '../transport'

class TcpTransport extends Transport
  constructor: (@socket) ->
    @buffer = new Buffer(0)
    
    ['data', 'end', 'error', 'close', 'drain', 'pipe'].forEach (evt) =>
      @socket.on(evt, => @['handle_' + evt]?(arguments...))
  
  handle_data: (buffer) ->
    @buffer = Buffer.concat([@buffer, buffer])
    
    read_packet_from_buffer = =>
      return false if @buffer.length < 4
      
      length = @buffer.readUInt32BE(0)
      return false if @buffer.length < (4 + length)
      
      packet_buffer = @buffer.slice(0, 4 + length)
      packet = packet_buffer.slice(4)
      
      @buffer = @buffer.slice(4 + length)
      @emit('packet', {buffer: packet_buffer, packet: packet})
      true
    
    true while read_packet_from_buffer()
  
  handle_error: (err) ->
    @emit('error', err)
  
  handle_end: ->
    @emit('end')
  
  handle_close: ->
    @emit('disconnected')
  
  write_packet: (data) ->
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
    @server = net.createServer => @on_connection(arguments...)
  
  open: ->
    @server.listen(@server_opts.port)
  
  on_connection: (socket) ->
    transport = new TcpTransport(socket)
    @accept_transport(transport)
    transport.emit('connected')

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
  constructor: (connection_string) ->
    throw new Error('TcpConnector must be passed a connection string') unless connection_string?
    
    @connection_opts = parse_connection_string(connection_string)
  
  open: ->
    connection = net.connect(@connection_opts)
    connection.on 'connect', => @on_connection(connection)
  
  on_connection: (socket) ->
    transport = new TcpTransport(socket)
    @connect_transport(transport)
    transport.emit('connected')

Connector.register('tcp', TcpConnector)
