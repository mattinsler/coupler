(function() {
  var ConnectionEmitter, Transport,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ConnectionEmitter = require('./connection_emitter');

  Transport = (function(_super) {

    __extends(Transport, _super);

    function Transport() {
      Transport.__super__.constructor.apply(this, arguments);
      Object.defineProperty(this, 'connected', {
        get: function() {
          return ConnectionEmitter.is_connected(this);
        }
      });
    }

    return Transport;

  })(ConnectionEmitter);

  module.exports = Transport;

}).call(this);
