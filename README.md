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

## modules

- [ndx-auth](https://github.com/ndxbxrme/ndx-auth) - oauth2 style authentication endpoints for ndx-server
- [ndx-connect](https://github.com/ndxbxrme/ndx-connect) - external database connection for superadmin users
- [ndx-database-backup](https://github.com/ndxbxrme/ndx-database-backup) - regularly backs up the database
- [ndx-keep-awake](https://github.com/ndxbxrme/ndx-keep-awake) - keeps the server alive (useful for free hosts, eg heroku)
- [ndx-passport](https://github.com/ndxbxrme/ndx-passport) - local login
- [ndx-passport-facebook](https://github.com/ndxbxrme/ndx-passport-facebook) - facebook login
- [ndx-passport-github](https://github.com/ndxbxrme/ndx-passport-github) - github login
- [ndx-passport-twitter](https://github.com/ndxbxrme/ndx-passport-twitter) - twitter login
- [ndx-publish](https://github.com/ndxbxrme/ndx-publish) - pub/sub with sockets
- [ndx-socket](https://github.com/ndxbxrme/ndx-socket) - sockets
- [ndx-static-routes](https://github.com/ndxbxrme/ndx-static-routes) - clientside routing
- [ndx-superadmin](https://github.com/ndxbxrme/ndx-superadmin) - creates a default superadmin user then bugs you about updating the password
- [ndx-sync](https://github.com/ndxbxrme/ndx-sync) - synchronize multiple instances of ndx-server using sockets, scale gracefully
- [ndx-user-roles](https://github.com/ndxbxrme/ndx-user-roles) - user roles

## ndx-framework

Use the [ndx-framework](https://github.com/ndxbxrme/ndx-framework) app to quickly create and connect to ndx-server apps
