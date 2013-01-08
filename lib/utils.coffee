exports.intercept_events = (emitter, callback) ->
  _emit = emitter.emit
  emitter.emit = ->
    callback?(emitter, arguments...)
    _emit.apply(emitter, arguments)
