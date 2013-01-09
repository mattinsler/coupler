# coupler = require 'coupler'
coupler = require '../lib/coupler'

c = coupler.accept(tcp: 7070)

echo_service = coupler.service(
  echo: (message, callback) ->
    console.log message
    console.log @
    callback? null, 'PING: ' + message, (err, message) ->
      console.log message
)

# class EchoService
#   constructor: (conn) ->
#     conn.on 'connected', ->
#       
#     conn.on 'disconnected', ->
#       
# 
# echo_service = (conn) ->
#   new EchoService(conn)

connected_count = 0

echo_service.on 'coupler:connected', (instance) ->
  ++connected_count
  console.log 'CONNECTED ' + connected_count
  instance.id = connected_count

echo_service.on 'coupler:disconnected', (instance) ->
  console.log 'DISCONNECTED'
  console.log arguments

c.provide(echo: echo_service)

# container = coupler.accept(http: 3000, tcp: 7000, ssl: 7080)
#   .provide(users_service, at: 'users')
#   .provide(pages_service, at: 'pages')
