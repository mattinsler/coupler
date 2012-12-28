coupler = require 'coupler'

echo_protocol = {
  echo: (message, callback) ->
    console.log message
    callback? null, 'PING: ' + message, (err, message) ->
      console.log message
}

coupler.accept(tcp: 7070).provide(echo: echo_protocol)


# container = coupler.accept(http: 3000, tcp: 7000, ssl: 7080)
#   .provide(users_service, at: 'users')
#   .provide(pages_service, at: 'pages')
