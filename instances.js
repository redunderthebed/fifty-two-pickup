/**
 * Created by redun on 24/07/2016.
 */

var express = require('express');

var config = require('./config'); //config file
var db = require('nano-blue')(config.couchdbHost).use(config.dbName); //shortcut variable to use the main db from couch
var qr = require("./response"); //response helper

//establish routers
var secureRouter = express.Router();
var openRouter = express.Router();

//load related modules
var Core = require('./Core');
var games = require('./games');

//in memory instance cache
var instances = {};

/**
 * Create a new instance of the given gameTemplate
 * @param gameTemplate
 * @returns {Promise}
 */
function newInstance(gameTemplate){
    return new Promise(function(resolve, reject){
        //Create new instance of gameTemplate
        var game = new gameTemplate();
        //Create a new Core
        var core = new Core();

        console.log("Creating new instance of " + game.gameName);

        //Create a stub with only states and gameId for the database
        var stub = {
            gameId: gameTemplate._id,
            gameState: game.getState(),
            coreState: core.getState()
        };

        db.insert(stub).spread(function(body){
            //insert the core into the game
            game.core = core;

            //Build an instance object to be kept in memory
            var instance = {
                _id: body.id,
                _rev: body.rev,
                game: game
            }
            
            //Resolve promise with instance object
            resolve(instance);
        }).catch(function(err){
            reject(err);
        });
    })
}

/**
 * Retrieve game instance from in-memory cache or database if not found
 * @param id Instance ID to find
 * @returns {Promise} with instance data
 */
function getInstance(id){
    return new Promise(function (resolve, reject) {
        //Check for instance in memory
        var inst = instances[id];
        //Return if found
        if (inst) {
            resolve(inst);
        }
        else {
            console.log("Instance not in memory");
            //Retrieve from database if not
            db.get(id).spread(function(data){
                if(data.gameId) {
                    //TODO: THIS WILL NOT WORK, NEED TO CONSTRUCT INSTANCE OBJECT FROM DATABASE INFO
                    resolve(data);
                }
                else{
                    reject("No game with id of " + id + " found");
                }
            }).catch(function(err){
                reject("No game with id of " + id + " found");
            });
        }
    });
}


/**
 * Create a new instance of a specified game
 * @POST gameId The id of the game template to instance
 */
secureRouter.post('/', function(req, res, next){
    console.log("received instance create request", req.body);
    //Get game template
    games.getGame(req.body.gameId).then(function(template){
        newInstance(template).then(function(instance){
            instances[instance._id] = instance;
            qr.created(res, next, {_id: instance._id, _rev: instance._rev});
        })
    }).catch(function(err){
        qr.notFound(res, next, err);
    });
});

/**
 * fetches the coreState and gameState for testing purposes
 */
secureRouter.get('/dev/:instId', function(req, res, next){
    getInstance(req.params.instId).then(function(instance){
        qr.ok(res, next, {coreState: instance.game.core.getState(), gameState: instance.game.getState()});
    })
})

/**
 * Adds a new player to the specified (by authToken) to the instance specified (by req.params)
 */
secureRouter.patch('/:instId/addPlayer', function(req, res, next){
    getInstance(req.params.instId).then(function(instance){
        console.log(req.tokenData);
        //get userId from auth token
        db.get(req.tokenData.id).spread(function(user){
            console.log("user retrieved from auth token");
            instance.game.core.addPlayer({_id: req.tokenData.id, username: user.username});
            qr.ok(res, next);
        }).catch(function(err){
            qr.forbidden(res, next, "user does not exist");
        })
        
    })
})

secureRouter.get('/active', function(req, res, next){
    console.log("request for active instances recieved");
    db.view('instances', 'byPlayerActive', {key: req.tokenData.id}).spread(function(body){
        qr.ok(res, next, body.rows);
    }).catch(function(err){
        qr.failed(res, next, err);
    });
})
module.exports = {
    newInstance: newInstance,
    getInstance: getInstance,
    openRouter: openRouter,
    secureRouter: secureRouter
};