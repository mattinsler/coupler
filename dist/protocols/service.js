(function() {
  var ProtocolStack, ServiceProtocol, ServiceProtocolStack, rpc, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  _ = require('underscore');

  rpc = require('./rpc');

  ProtocolStack = require('../protocol_stack');

  ServiceProtocolStack = (function(_super) {

    __extends(ServiceProtocolStack, _super);

    function ServiceProtocolStack(name) {
      var _this = this;
      this.name = name;
      ServiceProtocolStack.__super__.constructor.apply(this, arguments);
      this.use({
        recv: function(data, next) {
          next.data.service = data.$s;
          delete data.$s;
          return next(null, data);
        },
        send: function(data, next) {
          var _ref;
          if ((_ref = data.$s) == null) {
            data.$s = next.data.service || _this.name;
          }
          return next(null, data);
        }
      });
    }

    return ServiceProtocolStack;

  })(ProtocolStack);

  ServiceProtocol = (function() {

    function ServiceProtocol() {
      this.services = {};
      this.consumed_services = {};
    }

    ServiceProtocol.prototype.initialize = function() {
      var _this = this;
      return ['connecting', 'connected', 'disconnected', 'reconnected', 'reconnecting'].forEach(function(evt) {
        return _this.remote.on(evt, function() {
          var args, next, s, _i, _len, _ref, _ref1;
          next = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          _ref = _(_this.services).values().concat(_(_this.consumed_services).values());
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            s = _ref[_i];
            (_ref1 = s.stack).emit.apply(_ref1, [evt].concat(__slice.call(args)));
          }
          return next();
        });
      });
    };

    ServiceProtocol.prototype.provide = function(opts) {
      var k, service, v, _results,
        _this = this;
      _results = [];
      for (k in opts) {
        v = opts[k];
        if (this.services[k] != null) {
          throw new Error("There is already a Service being provided at " + k);
        }
        service = {
          stack: new ServiceProtocolStack("s:" + k),
          rpc: rpc(k, v)
        };
        Object.defineProperty(service.stack, 'transport', {
          get: function() {
            return _this.remote.protocol_stack.transport;
          }
        });
        service.stack.use(service.rpc);
        service.stack.on('send', function(data) {
          return _this.remote.send(data);
        });
        _results.push(this.services[k] = service);
      }
      return _results;
    };

    ServiceProtocol.prototype.consume = function(name) {
      var service,
        _this = this;
      if (this.consumed_services[name] != null) {
        return this.consumed_services[name];
      }
      service = {
        stack: new ServiceProtocolStack("c:" + name),
        rpc: rpc(name)
      };
      Object.defineProperty(service.stack, 'transport', {
        get: function() {
          return _this.remote.protocol_stack.transport;
        }
      });
      service.stack.use(service.rpc);
      service.stack.on('send', function(data) {
        return _this.remote.send(data);
      });
      this.consumed_services[name] = service;
      return service.rpc.client;
    };

    ServiceProtocol.prototype.recv = function(data, next) {
      var service, service_name, type, _ref;
      if (data.$s == null) {
        return;
      }
      if (data.$s === 0) {
        if (data.$m === 0) {
          return next.send({
            $r: 0,
            $a: _(this.services).keys()
          });
        }
        if (data.$r === 0) {
          this.remote_services = data.$a;
          return next.emit('connected');
        }
      }
      _ref = data.$s.split(':'), type = _ref[0], service_name = _ref[1];
      if (data.$m != null) {
        service = (function() {
          switch (type) {
            case 'c':
              return this.services[service_name];
            case 's':
              return this.consumed_services[service_name];
          }
        }).call(this);
      } else if (data.$r != null) {
        service = (function() {
          switch (type) {
            case 'c':
              return this.consumed_services[service_name];
            case 's':
              return this.services[service_name];
          }
        }).call(this);
      }
      if (service == null) {
        return next();
      }
      return next.pipe(service.stack);
    };

    ServiceProtocol.prototype.send = function(data, next) {
      return next();
    };

    return ServiceProtocol;

  })();

  module.exports = function() {
    return new ServiceProtocol();
  };

}).call(this);
