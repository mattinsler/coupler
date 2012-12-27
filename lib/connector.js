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

    Connector.types = {};

    Connector.register = function(type, connector_class) {
      if (this.types[type] != null) {
        throw new Error("Connector type " + type + " is already registered");
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
      transport.container = this.container;
      return this.emit('connection', transport);
    };

    return Connector;

  })(events.EventEmitter);

  module.exports = Connector;

}).call(this);
