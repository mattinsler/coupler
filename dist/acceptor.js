(function() {
  var Acceptor, events,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  events = require('events');

  Acceptor = (function(_super) {

    __extends(Acceptor, _super);

    function Acceptor() {
      return Acceptor.__super__.constructor.apply(this, arguments);
    }

    Acceptor.RequiredMethods = ['close', 'open'];

    Acceptor.types = {};

    Acceptor.register = function(type, acceptor_class) {
      var m, _i, _len, _ref;
      if (this.types[type] != null) {
        throw new Error("Acceptor type " + type + " is already registered");
      }
      _ref = Acceptor.RequiredMethods;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        m = _ref[_i];
        if (!((acceptor_class.prototype[m] != null) && typeof acceptor_class.prototype[m] === 'function')) {
          throw new Error(type + ': Acceptors must define ' + Acceptor.RequiredMethods.join(', '));
        }
      }
      this.types[type] = acceptor_class;
      return this;
    };

    Acceptor.accept = function(type, config) {
      if (this.types[type] == null) {
        throw new Error("Unknown Acceptor type: " + type);
      }
      return new this.types[type](config);
    };

    Acceptor.prototype.accept_transport = function(transport) {
      this.emit('connection', transport);
      return transport.emit('connected');
    };

    return Acceptor;

  })(events.EventEmitter);

  module.exports = Acceptor;

}).call(this);
