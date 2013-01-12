(function() {
  var REPL, coupler, repl, _,
    __slice = [].slice;

  _ = require('underscore');

  repl = require('repl');

  coupler = require('./coupler');

  REPL = (function() {

    function REPL() {
      var _this = this;
      this.connection = null;
      this.consumed_service = null;
      this.methods = {
        exit: function(callback) {
          return process.exit();
        },
        connect: function(callback, address) {
          var consumed_service;
          consumed_service = null;
          _this.connection = coupler.connect({
            tcp: address
          });
          _this.connection.on('error', function(err) {
            return callback(err.stack);
          });
          return _this.connection.on('connected', function() {
            return callback(null, 'Connected!');
          });
        },
        list: function(callback, type) {
          var s;
          if (_this.connection == null) {
            return callback('Must be connected first');
          }
          if (type == null) {
            type = _this.consumed_service != null ? 'commands' : 'services';
          }
          switch (type) {
            case 'services':
              s = _this.connection.consume(0);
              return s.on('coupler:connected', function() {
                return s.list(function(list) {
                  return callback(null, list.join('\n'));
                });
              });
            case 'commands':
              return callback(null, _this.consumed_service.__methods__.join(', '));
            default:
              return help(callback, list);
          }
        },
        consume: function(callback, service_name) {
          if (_this.connection == null) {
            return callback('Must be connected first');
          }
          _this.consumed_service = _this.connection.consume(service_name);
          return _this.consumed_service.on('coupler:connected', function() {
            return callback(null, 'Consuming ' + service_name);
          });
        },
        call: function() {
          var args, callback, has_callback, method, result, _ref;
          callback = arguments[0], method = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
          if (_this.connection == null) {
            return callback('Must be connected first');
          }
          if (_this.consumed_service == null) {
            return callback('Must consume a service first');
          }
          has_callback = false;
          args = args.map(function(a) {
            if (a === '$_') {
              has_callback = true;
              return callback;
            }
            return a;
          });
          result = (_ref = _this.consumed_service)[method].apply(_ref, args);
          if (!has_callback) {
            return callback(null, result);
          }
        },
        help: function(callback, command) {
          var COMMANDS;
          COMMANDS = {
            call: 'call service-method arguments...',
            connect: 'connect address',
            consume: 'consume service',
            exit: 'exit',
            list: 'list [services|commands]'
          };
          if (command == null) {
            return callback(null, _(COMMANDS).keys().join(', '));
          }
          if (COMMANDS[command] != null) {
            return callback(null, COMMANDS[command]);
          }
          return callback('Unknown command: ' + command);
        }
      };
    }

    REPL.prototype.start = function() {
      var _this = this;
      if (this.repl != null) {
        return;
      }
      this.repl = repl.start({
        prompt: '$ ',
        terminal: true,
        "eval": function(command, context, filename, callback) {
          var args, cmd, _ref;
          command = command.slice(1, command.length - 2).trim();
          args = command.split(new RegExp(' +'));
          cmd = args[0];
          args.shift();
          if (cmd === '' && args.length === 0) {
            return callback();
          }
          if (_this.methods[cmd] == null) {
            return callback(null, 'Unknown Command ' + cmd);
          }
          return (_ref = _this.methods)[cmd].apply(_ref, [callback].concat(__slice.call(args)));
        }
      });
      return this.repl.on('exit', function() {
        return this.methods.exit();
      });
    };

    return REPL;

  })();

  module.exports = REPL;

}).call(this);
