# ndx-server 
A lightweight, robust, modular server built on [Express](http://expressjs.com/) and [Alasql](https://github.com/agershun/alasql)  

`npm install --save ndx-server`
```javascript
var ndx = require('ndx-server');
```
### Example

```javascript
  var ndx = require('ndx-server')
  .config({
    database: 'rb',
    tables: ['users', 'tasks'],
    port: 23000
  })
  .controller(function(ndx) {
    ndx.app.get('/api/thing', function(req, res) {
      res.json({
        hey: 'yo'
      });
    });
  })
  .start();
```
### Methods
<a name="methods"></a>
#### `ndx.config(object args) -> ndx`

Configure the server

#### `ndx.controller(function controller) -> ndx`

Register a controller
```javascript
ndx.controller(function(ndx) {
  //use the ndx controller
  //register some routes etc
});
```
```javascript
ndx.controller(require('./controllers/my-controller'));
```
```javascript
ndx.controller('npm-module');
```

#### `ndx.use(function controller) -> ndx`

Register a service
```javascript
ndx.use(function(ndx) {
  //use the ndx service
  //register some routes etc
});
```
```javascript
ndx.use(require('./services/my-service'));
```
```javascript
ndx.use('npm-module');
```

#### `ndx.start()`

Start the server

## the ndx object

The `ndx` object gets passed to each controller and service

### Properties

- `ndx.app` - The express app
- `ndx.server` - The express server
- `ndx.database` - The database
- `ndx.settings` - Server settings
- `ndx.host` - Server host
- `ndx.port` - Server port

### Methods

- `ndx.generateHash(string) -> hashed string`
- `ndx.validPassword(password, hashedPassword) -> bool`
- `ndx.postAuthenticate(req, res, next)` used internally
- `ndx.generateToken(string userId, string ip) -> new user token`
- `ndx.setAuthCookie(req, res)` used internally

other modules can add extra properties and methods to the `ndx` object, eg `ndx-passport` which adds `ndx.passport` for the other passport modules to use.