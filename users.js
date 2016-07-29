/**
 * Created by redun on 21/07/2016.
 */
var config = require('./config');
var express = require('express');
var secureRouter = express.Router();
var openRouter = express.Router();
var qr = require('./response');
var couchHost = "http://localhost:5984";
var nano = require("nano-blue")(couchHost);
var jwt = require("jsonwebtoken");
var ms = require("ms");
var app = null;
var guid = require('./guid');
nano.use(config.dbName).list().catch(function(err){
  if(err.reason == "no_db_file"){
      console.log("Database file not found, creating now");
      nano.db.create("login").spread(function(data){
        nano.use(config.dbName).insert({
          language: "javascript",
          views: {
            usersByName: {
              map: "function(doc) {\n  if(doc.username){\n  \temit(doc.username, doc);\n  }\n}"
            },
            all: {
              map: "function(doc) {\n  if(doc.username){\n  \temit(doc._id, doc);\n  }\n}"
            }
          }
        }, "_design/users");
        nano.use(config.dbName).insert({
          language: "javascript",
          views: {
            all: {
              map: "function(doc) {\n  if(doc.coreState){\n    emit(doc._id, doc);\n  }\n}"
            }
          }
        }, "_design/instances");
      }).spread(function(body){
        console.log("Database created ok");
      }).catch(function(err){
        console.log("Creation failed, this isn't going to go well");
        console.log(err);
      });
  }
});

var db = nano.use(config.dbName);

db.update = function(obj, key, callback) {
  var db = this;
  db.get(key, function (error, existing) {
    if(!error) obj._rev = existing._rev;
    db.insert(obj, key, callback);
  });
}

//User create
openRouter.post('/', function(req, res, next){
  var u = req.body;
  
  if(u.username && u.password && u.email && u.confirm){
    db.view('users', 'usersByName', {key: u.username}).spread(function(body){
      if(body.rows.length == 0){
        u.confirmCode = guid.guid();
        db.insert(u).spread(function(body) {
          console.log('User Registration Success');
          qr.created(res, next);
        }).catch(function(err){
            console.log("Error: " + err);
          qr.notFound(res, next, "creation failed: " + err.message);
        });
      }
      else{
        qr.conflict(res, next, "User already exists");
      }
    }).error(function(err, response){
      console.log(err);
    });
  }
  else{
    qr.notFound(res, next, "Registration information invalid");
  }
});

//User identify by username - not necessary
secureRouter.get('/:username/id', function(req, res, next){
  if(req.params.username){
    db.view('users', 'usersByName', {key: req.params.username}).spread(function(data){
      qr.ok(res, next, data.rows[0].value._id);
    });
  }
  else{
    qr.notFound(res, next, 'no user specified');
  }
});

//User read
secureRouter.get('/', function(req, res, next){
  if(req.tokenData){
    db.get(req.tokenData.id).spread(function(body){
      delete body.password;
      delete body.confirm;
      delete body.confirmCode;
      qr.returnSingle(res, next, body, "User");
    }).catch(function(err){
      qr.failed(res, next, err);
    });
  }
  else{
    qr.notFound(res, next, 'no token provided');
  }
})

//User delete
secureRouter.delete('/', function(req, res, next){
  console.log("delete request received");
  db.get(req.tokenData.id).spread(function(body){
    return db.destroy(body._id, body._rev).spread(function(body){
      qr.ok(res, next);
    }).catch(function(err){
      qr.notFound(res, next, err.message);
    });
  });
});

//User dev : get confirm code
secureRouter.get('/dev/confirm', function(req, res, next){
  console.log('requesting confirm code');
  if(req.tokenData) {
    db.get(req.tokenData.id).spread(function (data) {
      console.log("Confirm code requested " + data.confirmCode);
      qr.ok(res, next, data.confirmCode);
    }).catch(function (err) {
      qr.failed(res, next, err.message);
    });
  }
  else{
    console.log("SOMETHING VERY WRONG HAPPENED");
    qr.failed(res, next, "You shouldn't have got this far");
  }
});

//User update confirmation
openRouter.patch('/:id/confirmed/:confirmCode', function(req, res, next){
  console.log("Received confirmation request");
  db.get(req.params.id).spread(function(user){
    if(user.confirmCode == req.params.confirmCode){
      user.confirmed = true;
      return db.insert(user).spread(function(data){
        if(data.ok){
          qr.ok(res, next, data);
        }
        else{
          qr.failed(res, next, "Update failed");
        }
      })
    }
    else{
      qr.notFound(res, next, "User not found or confirm code does not match");
    }
  })
});

//Login create
openRouter.post('/login', function(req, res, next){
  var username = req.body.username;
  var password = req.body.password;
  console.log(req.body);
  //Check for username
  if(username) {

    //Look up username
    nano.use(config.dbName).view('users', 'usersByName', {key: username}).spread(function (body) {

      //Check users found
      if(body.rows.length > 0){
        //Should be only 1
        var matchedUser = body.rows[0].value;

        //Check password
        if(matchedUser.password == password){
            if(matchedUser.confirmed) {
              console.log(matchedUser.username + " logged in");
              var token = jwt.sign({id: matchedUser._id}, app.get('superSecret'),{
                expiresIn: "1d"
              });
              qr.created(res, next, {authToken: token});
            }
            else{
              qr.notFound(res, next, 'User not confirmed');
            }
        }
        else{
          qr.notFound(res, next, "User credentials invalid")
        }
      }
      else{
        qr.notFound(res, next, "User credentials invalid");
      }
    }).catch(function (err) {
      console.log("Error: " + err);
      qr.failed(res, next, err.reason);
    });
  }
  else{
    qr.notFound(res, next, "No username specified")
  }
});


module.exports = {
  secureRouter: function(theApp) {
    app = theApp;
    return secureRouter;
  },
  openRouter: openRouter
};