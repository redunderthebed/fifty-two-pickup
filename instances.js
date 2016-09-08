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
var state = require('./state');

function getPostRoute(action, route){
    return function(req, res, next){
        console.log("Route called", route, "for instance", req.params.instId);
        console.log(req.body);
        var args = req.body;
        //console.log(instances);
        getInstance(req.params.instId).then(function(instance){
            if(instance){
                args.playerId = req.tokenData.id;
                var result;
                var error;
                if(instance.game.core.getState().started) {
                    try {
                        result = action.apply(instance.game, [args]);
                    }
                    catch (err) {
                        error = err;
                    }
                }
                else{
                    error = new Error('Game has not started yet');
                }
                if(result) {
                    console.log("not an error");
                    qr.created(res, next, result);
                }
                else{
                    console.log("is an error");
                    console.log(error.stack);
                    qr.failed(res, next, error.message);
                }
            }
            else{
                qr.notFound(res, next, "Instance doesn't exist");
            }
        }).catch(function(err){
            console.log(err);
            qr.notFound(res, next, "Instance doesn't exist");
        });
    }
}

//Get game stub list
games.getGames().then(function(gameStubList){
    //Go through each stub
    gameStubList.forEach(function(stub){
        console.log('Loading', stub.gameName);
        //Get the full game
        games.getGame(stub._id).then(function(game){
            //Instantiate it so we can access the actions
            game = new game();
            console.log('\tPost Actions:');
            //iterate the actions
            Object.keys(game.actions.post).forEach(function(key){
                //Create route from action name (args as post data)
                var action = game.actions.post[key];
                var route = "/:instId/action/" + key;
                console.log('\t\tRoute:', "instance" + route);
                secureRouter.post(route, getPostRoute(action, route));
            });
        })
    });
})

function saveInstance(instance){
    var stub = makeInstanceStubFromInstance(instance);


    return saveInstanceStub(stub).then(function(response){

        //Update the revision number of the instance object that was passed in
        instance._rev = response[0].rev;
    });
}

function makeInstanceStubFromInstance(instance){
    var stub = makeInstanceStub(instance.game._id, instance.game, instance.game.core);
    stub._id = instance._id;
    stub._rev = instance._rev;
    return stub;
}

function makeInstanceStub(gameId, game, core){
    var stub = {
        gameId: gameId,
        gameState: JSON.parse(state.stringify(game)),
        coreState: JSON.parse(state.stringify(core))
    }
    return stub;
}

function saveInstanceStub(stub){
    return db.insert(stub);
}

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

        try {

            //Create a stub with only states and gameId for the database
            var stub = makeInstanceStub(gameTemplate._id, game, core);

            saveInstanceStub(stub).spread(function(body){
                //insert the core into the game
                game.core = core;

                //Build an instance object to be kept in memory
                var instance = {
                    _id: body.id,
                    _rev: body.rev,
                    game: game
                };

                console.log("Instance created");

                //Resolve promise with instance object
                resolve(instance);
            }).catch(function(err){
                reject(err);
            });
        }
        catch(err){
            console.log('Instance Stub Error: ', err.message);
            reject(err);
        }
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
            console.log('retrieved instance', id, 'from memory');
            console.log(inst.game.core.getPlayers());
            resolve(inst);
        }
        else {
            console.log("Instance", id, " not in memory");
            //Retrieve from database if not
            db.get(id).spread(function(data){
                console.log("retrieved instance", id, "from db");
                console.log(data);
                if(data.gameId) {
                    var template = games.getGame(data.gameId).then(function(template){
                        var game = new template();
                        console.log("Game template instantiated");

                        game.core = (state.parse(JSON.stringify(data.coreState)));
                        console.log("done", JSON.stringify(data.gameState));
                        var g = (state.parse(JSON.stringify(data.gameState)));
                        game.setState(g.getState());
                        console.log("game and core states loaded");
                        var instance = {
                            _id: data._id,
                            _rev: data._rev,
                            game: game
                        }
                        resolve(instance);
                    });
                }
                else{
                    reject("No instance with id of " + id + " found");
                }
            }).catch(function(err){
                console.log("Instance could not be retrieved because: " + err.message);
                reject("No instance with id of " + id + " found");
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
        return newInstance(template).then(function(instance){
            instances[instance._id] = instance;
            instance.game.core.setGame(instance.game);
            instance.game.core.setHost(req.tokenData.id);
            instance.game.init();
            console.log("new instance id", instance._id);
            saveInstance(instance).then(function(response){

                qr.created(res, next, {_id: instance._id, _rev: instance._rev});
            });
        }).catch(function(err){
            qr.failed(res, next, err);
        })
    }).catch(function(err){
        qr.notFound(res, next, err);
    });
});

secureRouter.get('/active', function(req, res, next){
    console.log("request for active instances received from user", req.tokenData.id);
    db.view('instances', 'byPlayerActive', {key: req.tokenData.id}).spread(function(body){
        var insts = [];
        var promises = [];

        body.rows.forEach(function(v, i, a){
            console.log(i);
            var p =
                getInstance(v.id).then(function(inst) {
                    console.log("Got that game you asked for");


                    var stub = {
                        _id: inst._id,
                        _rev: inst._rev,
                        gameName: inst.game.gameName,
                        open: inst.game.core.getState().open,
                        started: inst.game.core.getState().started,
                        playerCount: inst.game.core.getNumPlayers(),
                        maxPlayers: inst.game.maxPlayers,
                        minPlayers: inst.game.minPlayers
                    };
                    insts.push(stub);
                }).catch(function(err){
                    console.log("had a problem: ", err);
                });
            promises.push(p);
        });
        Promise.all(promises).then(function(){
            qr.ok(res, next, insts);
        });

    }).catch(function(err){
        console.log("Error:", err);
        qr.failed(res, next, err);
    });
})

secureRouter.get('/inactive', function(req, res, next){
    console.log("request for inactive instances recieved");
    db.view('instances', 'byPlayerInactive', {key: req.tokenData.id}).spread(function(body){
        qr.ok(res, next, body.rows);
    }).catch(function(err){
        qr.failed(res, next, err);
    });
})

secureRouter.get('/:instId', function(req, res, next){
    getInstance(req.params.instId).then(function(instance){
        var state = instance.game.core.getState();
        var host = instance.game.core.getHost();

        var stub = {
            _id: instance._id,
            _rev: instance._rev,
            active: state.active,
            open: state.open,
            host: host.username,
            started: state.started,
            leaderBoard: state.leaderBoard
        }
        qr.ok(res, next, stub);
    }).catch(function(err){
        qr.notFound(res, next, err);
    })
})

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
            try {
                instance.game.core.addPlayer({_id: req.tokenData.id, username: user.username});
                qr.ok(res, next);
            }
            catch(err){
                qr.failed(res, next, "Failed to add player: " + err.message);
            }
        }).catch(function(err){
            qr.forbidden(res, next, "user does not exist: " + err.message);
        })
    })
})

secureRouter.patch('/:instId/ready', function(req, res, next){
    getInstance(req.params.instId).then(function(instance){
        var inst = instances[req.params.instId];
        inst.game.core.setPlayerReady(req.tokenData.id, true);
        qr.ok(res, next, {ready:true});
    }).catch(function(err){
        console.log(err);
        qr.notFound(res, next, err.message);
    });
});

secureRouter.patch('/:instId/start', function(req, res, next){
    getInstance(req.params.instId).then(function(instance){
        var inst = instances[req.params.instId];
        if(inst.game.core.hasEnoughPlayers()){
            inst.game.core.start();
        }
        else{
            throw new Error("Not enough players to start");
        }
        qr.ok(res, next, {started:true});
    }).catch(function(err){
        console.log(err);
        qr.notFound(res, next, err.message);
    });
});

secureRouter.patch('/:instId/dev/start', function(req, res, next){
    getInstance(req.params.instId).then(function(instance){
        instance.game.core.getState().started = true;
        qr.ok(res, next, {started:true});
    }).catch(function(err){
        qr.notFound(res, next, err.message);
    });
});

secureRouter.delete('/:instId/', function(req, res, next){
    return getInstance(req.params.instId).then(function(instance){
        console.log(instance);
        return db.destroy(instance._id, instance._rev).then(function(response) {
            delete instances[req.params.instId];
            qr.ok(res, next);
        }).catch(function(error){
            qr.failed(res, next, error.message);
        });
    });
});
module.exports = {
    newInstance: newInstance,
    getInstance: getInstance,
    openRouter: openRouter,
    secureRouter: secureRouter
};