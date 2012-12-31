(function() {
  var Connector, events,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  events = require('events');

  Connector = (function(_super) {

    __extends(Connector, _super);

    function Connector() {
      return Connector.__super__.constructor.apply(this, arguments);
    }

    Connector.RequiredMethods = ['close', 'open'];

    Connector.types = {};

    Connector.register = function(type, connector_class) {
      var m, _i, _len, _ref;
      if (this.types[type] != null) {
        throw new Error("Connector type " + type + " is already registered");
      }
      _ref = Connector.RequiredMethods;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        m = _ref[_i];
        if (!((connector_class.prototype[m] != null) && typeof connector_class.prototype[m] === 'function')) {
          throw new Error(type + ': Connectors must define ' + Connector.RequiredMethods.join(', '));
        }
      }
      this.types[type] = connector_class;
      return this;
    };

    Connector.connector = function(type, config) {
      if (this.types[type] == null) {
        throw new Error("Unknown Connector type: " + type);
      }
      return new this.types[type](config);
    };

    Connector.prototype.connect_transport = function(transport) {
      this.emit('connection', transport);
      return transport.emit('connected');
    };

    return Connector;

  })(events.EventEmitter);

  module.exports = Connector;

}).call(this);
