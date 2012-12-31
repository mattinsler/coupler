coupler = require 'coupler'

echo_service = coupler.service(
  echo: (message, callback) ->
    console.log message
    console.log @
    callback? null, 'PING: ' + message, (err, message) ->
      console.log message
)

connected_count = 0

echo_service.on 'connected', (instance) ->
  ++connected_count
  console.log 'CONNECTED ' + connected_count
  instance.id = connected_count

echo_service.on 'disconnected', (instance) ->
  console.log 'DISCONNECTED'
  console.log arguments


c = coupler.accept(tcp: 7070).provide(echo: echo_service)

# container = coupler.accept(http: 3000, tcp: 7000, ssl: 7080)
#   .provide(users_service, at: 'users')
#   .provide(pages_service, at: 'pages')
