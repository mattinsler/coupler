(function() {

  module.exports = function() {
    return {
      recv: function(data, next) {
        return next(null, JSON.parse(data.toString()));
      },
      send: function(data, next) {
        return next(null, JSON.stringify(data));
      }
    };
  };

}).call(this);
