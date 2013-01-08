(function() {
  var Connection, ConnectionEmitter, utils,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  utils = require('./utils');

  ConnectionEmitter = require('./connection_emitter');

  Connection = (function(_super) {

    __extends(Connection, _super);

    function Connection(coupler, stack) {
      this.coupler = coupler;
      Connection.__super__.constructor.call(this);
      Object.defineProperty(this, 'stack', {
        get: function() {
          return this.__stack__;
        },
        set: function(v) {
          var _this = this;
          this.__stack__ = v;
          if (v != null) {
            v.connection = this;
            return utils.intercept_events(v, function() {
              var args, emitter;
              emitter = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
              return _this.emit.apply(_this, args);
            });
          }
        }
      });
      this.stack = stack;
    }

    Connection.prototype.consume = function(service_name) {
      return this.service_protocol.consume(service_name);
    };

    return Connection;

  })(ConnectionEmitter);

  module.exports = Connection;

}).call(this);
