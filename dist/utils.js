(function() {
  var __slice = [].slice;

  exports.intercept_events = function(emitter, callback) {
    var _emit;
    _emit = emitter.emit;
    return emitter.emit = function() {
      if (typeof callback === "function") {
        callback.apply(null, [emitter].concat(__slice.call(arguments)));
      }
      return _emit.apply(emitter, arguments);
    };
  };

}).call(this);
