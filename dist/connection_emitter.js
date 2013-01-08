(function() {
  var ConnectionEmitter, EventEmitter,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  EventEmitter = require('events').EventEmitter;

  ConnectionEmitter = (function(_super) {

    __extends(ConnectionEmitter, _super);

    ConnectionEmitter.is_connected = function(emitter) {
      var _ref;
      return ((_ref = emitter._emitter_state) != null ? _ref.connected : void 0) === true;
    };

    ConnectionEmitter.is_disconnected = function(emitter) {
      var _ref;
      return ((_ref = emitter._emitter_state) != null ? _ref.connected : void 0) === false;
    };

    ConnectionEmitter.follow = function(dest, src) {
      return Object.defineProperty(src, '_emitter_state', {
        get: function() {
          return dest._emitter_state;
        },
        enumerable: true
      });
    };

    ConnectionEmitter.inject_into = function(emitter) {
      var c;
      if (emitter instanceof ConnectionEmitter) {
        return emitter;
      }
      c = emitter;
      while (c.__proto__ !== EventEmitter.prototype) {
        c = c.__proto__;
      }
      c.__proto__ = new ConnectionEmitter();
      emitter._emitter_state = {
        emitted: {}
      };
      return emitter;
    };

    function ConnectionEmitter(opts) {
      if (opts == null) {
        opts = {};
      }
      ConnectionEmitter.__super__.constructor.call(this);
      this.__options__ = {
        events: {
          connected: opts.connected || 'connected',
          disconnected: opts.disconnected || 'disconnected'
        }
      };
      this._emitter_state = {
        emitted: {}
      };
    }

    ConnectionEmitter.prototype._handle_add_listener = function(event, handler) {
      var _this = this;
      if (event === this.__options__.events.connected && ConnectionEmitter.is_connected(this)) {
        return process.nextTick(function() {
          return handler.apply(null, _this._emitter_state.emitted[_this.__options__.events.connected]);
        });
      }
      if (event === this.__options__.events.disconnected && ConnectionEmitter.is_disconnected(this)) {
        return process.nextTick(function() {
          return handler.apply(null, _this._emitter_state.emitted[_this.__options__.events.disconnected]);
        });
      }
      return false;
    };

    ConnectionEmitter.prototype.on = function(event, handler) {
      this._handle_add_listener(event, handler);
      return EventEmitter.prototype.on.apply(this, arguments);
    };

    ConnectionEmitter.prototype.addListener = function(event, handler) {
      this._handle_add_listener(event, handler);
      return EventEmitter.prototype.addListener.apply(this, arguments);
    };

    ConnectionEmitter.prototype.once = function(event, handler) {
      if (this._handle_add_listener(event, handler)) {
        return;
      }
      return EventEmitter.prototype.once.apply(this, arguments);
    };

    ConnectionEmitter.prototype.emit = function() {
      var args, event;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (Object.getOwnPropertyDescriptor(this, '_emitter_state').get == null) {
        switch (event) {
          case this.__options__.events.connected:
            this._emitter_state.connected = true;
            break;
          case this.__options__.events.disconnected:
            this._emitter_state.connected = false;
        }
        this._emitter_state.emitted[event] = args;
      }
      return EventEmitter.prototype.emit.apply(this, arguments);
    };

    return ConnectionEmitter;

  })(EventEmitter);

  module.exports = ConnectionEmitter;

}).call(this);
