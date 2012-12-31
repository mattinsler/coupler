(function() {
  var ConnectionEmitter, List, ProtocolStack, events,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  events = require('events');

  ConnectionEmitter = require('./connection_emitter');

  List = (function() {
    var Node;

    List.copy = function(other) {
      var list, node;
      list = new List();
      node = other.head;
      while (node != null) {
        list.append(node.data);
        node = node.next;
      }
      return list;
    };

    Node = (function() {

      function Node(data) {
        this.data = data;
        this.length = 0;
      }

      Node.prototype.insert_after = function(node) {
        var _ref,
          _this = this;
        if (node instanceof List) {
          node = node.each_r(function(data) {
            return _this.insert_after(data);
          });
        } else {
          if (!(node instanceof Node)) {
            node = new Node(node);
          }
          node.list = this.list;
          node.next = this.next;
          node.prev = this;
          if ((_ref = this.next) != null) {
            _ref.prev = node;
          }
          this.next = node;
          ++this.list.length;
        }
        return node;
      };

      Node.prototype.insert_before = function(node) {
        var _ref,
          _this = this;
        if (node instanceof List) {
          node = node.each(function(data) {
            return _this.insert_before(data);
          });
        } else {
          if (!(node instanceof Node)) {
            node = new Node(node);
          }
          node.list = this.list;
          node.prev = this.prev;
          node.next = this;
          if ((_ref = this.prev) != null) {
            _ref.next = node;
          }
          this.prev = node;
          ++this.list.length;
        }
        return node;
      };

      return Node;

    })();

    function List() {
      this.head = null;
      this.tail = null;
    }

    List.prototype.copy = function() {
      return List.copy(this);
    };

    List.prototype.append = function(data) {
      var node;
      node = new Node(data);
      node.list = this;
      if (this.tail == null) {
        this.head = this.tail = node;
        this.length = 1;
      } else {
        this.tail.insert_after(node);
        this.tail = node;
      }
      return node;
    };

    List.prototype.prepend = function(data) {
      var node;
      node = new Node(data);
      node.list = this;
      if (this.head == null) {
        this.head = this.tail = node;
        this.length = 1;
      } else {
        this.head.insert_before(node);
        this.head = node;
      }
      return node;
    };

    List.prototype.each = function(func) {
      var current, _results;
      current = this.head;
      _results = [];
      while (current != null) {
        func(current.data, current);
        _results.push(current = current.next);
      }
      return _results;
    };

    List.prototype.each_r = function(func) {
      var current, _results;
      current = this.tail;
      _results = [];
      while (current != null) {
        func(current.data, current);
        _results.push(current = current.prev);
      }
      return _results;
    };

    return List;

  })();

  ProtocolStack = (function(_super) {

    __extends(ProtocolStack, _super);

    function ProtocolStack() {
      this.stack = new List();
    }

    ProtocolStack.prototype.use = function(module) {
      var emitter, node,
        _this = this;
      node = this.stack.append(module);
      emitter = new ConnectionEmitter();
      module.remote = {
        protocol_stack: this,
        __emitter__: emitter,
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        addListener: emitter.addListener.bind(emitter),
        removeListener: emitter.removeListener.bind(emitter),
        removeAllListeners: emitter.removeAllListeners.bind(emitter),
        listeners: emitter.listeners.bind(emitter),
        emit: emitter.emit.bind(emitter),
        send: function(data) {
          return _this.send_step(node, data);
        }
      };
      return typeof module.initialize === "function" ? module.initialize() : void 0;
    };

    ProtocolStack.prototype._add_next_methods = function(node, next, pipe_direction) {
      var _base, _ref,
        _this = this;
      next.send = function(data) {
        return _this.send_step(node, data);
      };
      next.recv = function(data) {
        return _this.recv_step(node, data);
      };
      next.emit = function() {
        var args, event;
        event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return _this.emit_step.apply(_this, [node, event].concat(__slice.call(args)));
      };
      next.pipe = function(modules) {
        var current, m, _i, _len;
        if (!Array.isArray(modules)) {
          modules = [modules];
        }
        current = node;
        for (_i = 0, _len = modules.length; _i < _len; _i++) {
          m = modules[_i];
          if (m instanceof ProtocolStack) {
            m = m.stack;
          }
          current = current['insert_' + pipe_direction](m);
        }
        return next();
      };
      next.protocol_stack = this;
      return next.data = (_ref = (_base = node.list).data) != null ? _ref : _base.data = {};
    };

    ProtocolStack.prototype.recv_step = function(node, buffer, callback) {
      var next,
        _this = this;
      if (node == null) {
        this.emit('recv', buffer);
        return typeof callback === "function" ? callback(null, buffer) : void 0;
      }
      next = function(err, new_buffer) {
        if (err != null) {
          _this.emit('error', err);
          return typeof callback === "function" ? callback(err) : void 0;
        }
        if (new_buffer != null) {
          buffer = new_buffer;
        }
        return _this.recv_step(node.next, buffer, callback);
      };
      this._add_next_methods(node, next, 'after');
      if (node.data.recv != null) {
        return node.data.recv(buffer, next);
      } else {
        return next();
      }
    };

    ProtocolStack.prototype.recv = function(buffer, callback) {
      var list;
      list = this.stack.copy();
      return this.recv_step(list.head, buffer, callback);
    };

    ProtocolStack.prototype.send_step = function(node, buffer, callback) {
      var next,
        _this = this;
      if (node == null) {
        this.emit('send', buffer);
        return typeof callback === "function" ? callback(null, buffer) : void 0;
      }
      next = function(err, new_buffer) {
        if (err != null) {
          _this.emit('error', err);
          return typeof callback === "function" ? callback(err) : void 0;
        }
        if (new_buffer != null) {
          buffer = new_buffer;
        }
        return _this.send_step(node.prev, buffer, callback);
      };
      this._add_next_methods(node, next, 'before');
      if (node.data.send != null) {
        return node.data.send(buffer, next);
      } else {
        return next();
      }
    };

    ProtocolStack.prototype.send = function(buffer, callback) {
      var list;
      list = this.stack.copy();
      return this.send_step(list.tail, buffer, callback);
    };

    ProtocolStack.prototype.emit_step = function() {
      var args, event, next, node, _ref,
        _this = this;
      node = arguments[0], event = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      if (node == null) {
        return events.EventEmitter.prototype.emit.apply(this, [event].concat(args));
      }
      next = function() {
        var err, new_args, new_event;
        err = arguments[0], new_event = arguments[1], new_args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        if (err != null) {
          return console.error(err.stack);
        }
        if (new_event != null) {
          return _this.emit_step.apply(_this, [node.next, new_event].concat(__slice.call(new_args)));
        } else {
          return _this.emit_step.apply(_this, [node.next, event].concat(__slice.call(args)));
        }
      };
      this._add_next_methods(node, next, 'before');
      if (node.data.remote.listeners(event).length > 0) {
        return (_ref = node.data.remote).emit.apply(_ref, [event, next].concat(__slice.call(args)));
      } else {
        return next();
      }
    };

    ProtocolStack.prototype.emit = function() {
      var args, event, list;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      list = this.stack.copy();
      return this.emit_step.apply(this, [list.head, event].concat(__slice.call(args)));
    };

    return ProtocolStack;

  })(events.EventEmitter);

  module.exports = ProtocolStack;

}).call(this);
