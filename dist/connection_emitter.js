(function() {
  var ConnectionEmitter, events,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  events = require('events');

  ConnectionEmitter = (function(_super) {

    __extends(ConnectionEmitter, _super);

    ConnectionEmitter.is_connected = function(emitter) {
      return emitter._emitter_state.connected === true;
    };

    function ConnectionEmitter() {
      ConnectionEmitter.__super__.constructor.apply(this, arguments);
      this._emitter_state = {
        emitted: {}
      };
    }

    ConnectionEmitter.prototype._handle_add_listener = function(event, handler) {
      var _this = this;
      if (event === 'connected' && this._emitter_state.connected === true) {
        return process.nextTick(function() {
          return handler.apply(null, _this._emitter_state.emitted['connected']);
        });
      }
      if (event === 'disconnected' && this._emitter_state.connected === false) {
        return process.nextTick(function() {
          return handler.apply(null, _this._emitter_state.emitted['disconnected']);
        });
      }
      return false;
    };

    ConnectionEmitter.prototype.on = function(event, handler) {
      this._handle_add_listener(event, handler);
      return events.EventEmitter.prototype.on.apply(this, arguments);
    };

    ConnectionEmitter.prototype.addListener = function(event, handler) {
      this._handle_add_listener(event, handler);
      return events.EventEmitter.prototype.addListener.apply(this, arguments);
    };

    ConnectionEmitter.prototype.once = function(event, handler) {
      if (this._handle_add_listener(event, handler)) {
        return;
      }
      return events.EventEmitter.prototype.once.apply(this, arguments);
    };

    ConnectionEmitter.prototype.emit = function() {
      var args, event;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      switch (event) {
        case 'connected':
          this._emitter_state.connected = true;
          break;
        case 'disconnected':
          this._emitter_state.connected = false;
      }
      this._emitter_state.emitted[event] = args;
      return events.EventEmitter.prototype.emit.apply(this, arguments);
    };

    return ConnectionEmitter;

  })(events.EventEmitter);

  module.exports = ConnectionEmitter;

}).call(this);
