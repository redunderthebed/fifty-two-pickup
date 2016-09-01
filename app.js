var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');
var cors = require('cors');
var jwt = require('jsonwebtoken');
var config = require('./config');

/*process.on('unhandledRejection', function(reason, promise){
  console.log("Possibly unhandled rejection " + reason);
})*/



app.set('superSecret', 'myCoolSecret');
app.use(cors());
//app.use(expressSession({secret: 'hello'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// Add headers
app.use(function (req, res, next) {
  req.startTime = new Date();
  var timeStamp = req.startTime.toString();
  timeStamp = timeStamp.substr(0, timeStamp.indexOf('GMT'));
  console.log('+++' + timeStamp + ' ' + req.method + ' ' + req.url);

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:63342');
  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);
  // Pass to next layer of middleware
  next();
});

var users = require("./users");

var instances = require("./instances");
var games = require("./games");
app.use("/user/", users.openRouter);

app.use("/game/", games.openRouter);

app.use(function(req, res, next) {

  if(res.headersSent == false) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {

      // verifies secret and checks exp
      jwt.verify(token, app.get(config.secret), function (err, decoded) {
        if (err) {
          return res.json({success: false, message: 'Failed to authenticate token.'});
        } else {
          // if everything is good, save to request for use in other routes
          req.tokenData = decoded;
          next();
        }
      });

    } else {
      console.log("No token provided");
      var duration = ((new Date()).getTime() - req.startTime.getTime());
      var resp = 403;
      console.log("Resp: " + resp + " - " + duration + "ms");

      // if there is no token
      // return an error
      return res.status(403).send({
        success: false,
        message: 'No token provided.'
      });
    }
  }
  else{
    next();
  }
});

app.use("/user/", users.secureRouter(app));
app.use("/game/", games.secureRouter(app));
app.use("/instance/", instances.secureRouter);
app.use(function(req, res, next){
  var duration = ((new Date()).getTime() - req.startTime.getTime());
  var resp = res._headerSent?res.statusCode:"NONE";
  console.log("--- Resp: " + resp + " - " + duration + "ms");
});
var port = 3000;
app.listen(port, function(){
  console.log("Login server listening on PORT " + port);
});

module.exports = {
  app: app
};