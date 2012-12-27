# coupler

Acceptor-Connector Multi-Transport Services

## Installation
```
npm install coupler
```

## Usage

##### Server
```javascript
var coupler = require('coupler');

var echo_protocol = {
  echo: function(message, callback) {
    callback(null, 'PING! ' + message);
  }
};

coupler.accept(tcp: 7070).provide(echo: echo_protocol);
```

##### Client
```javascript
var coupler = require('coupler')
  , echo_service = coupler.connect(tcp: 7070).consume('echo');

echo_service.on('connected', function() {
  echo_service.echo('Hello World!', function(err, message) {
    if (err) { return console.log(err.stack); }
    console.log(message);
  });
});
```

## Methods

### coupler.accept(protocol_config)

### coupler.connect(protocol_config)

### coupler.provide(service_config)

### coupler.consume(service_name)

## License
Copyright (c) 2012 Matt Insler  
Licensed under the MIT license.
