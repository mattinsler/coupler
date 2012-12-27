(function() {
  var Transport, events,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  events = require('events');

  Transport = (function(_super) {

    __extends(Transport, _super);

    function Transport() {
      Object.defineProperty(this, 'connected', {
        get: function() {
          return this._connected;
        },
        set: function(value) {
          if (this._connected !== value) {
            this._connected = value;
            return this.emit(this._connected ? 'connected' : 'disconnected');
          }
        }
      });
      this._connected = false;
    }

    Transport.prototype.on = function(event, handler) {
      var _this = this;
      if (event === 'connected' && this.connected) {
        process.nextTick(function() {
          return handler.call(_this, 'connected');
        });
      }
      return events.EventEmitter.prototype.on.call(this, event, handler);
    };

    Transport.prototype.once = function(event, handler, context) {
      if (event === 'connected' && this.connected) {
        process.nextTick(function() {
          return handler.call(context, 'connected');
        });
      }
      return events.EventEmitter.prototype.once.call(this, event, handler);
    };

    return Transport;

  })(events.EventEmitter);

  module.exports = Transport;

}).call(this);
