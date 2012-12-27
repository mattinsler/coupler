module.exports = ->
  {
    recv: (data, next) -> next(null, JSON.parse(data.toString()))
    send: (data, next) -> next(null, JSON.stringify(data))
  }
