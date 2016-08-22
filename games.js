/**
 * Created by redun on 24/07/2016.
 */
var config = require('./config');
var express = require('express');
var qr = require('./response');
var couchHost = config.couchdbHost;
var nano = require("nano-blue")(couchHost);
var jwt = require("jsonwebtoken");
var openRouter = express.Router();
var secureRouter = express.Router();



var TicTacToe = require('./TicTacToe');

var games = {"12345": TicTacToe};

var db = nano.use(config.dbName);

/*
Gets the specified game template
@returns {Promise} with gameTemplate object
 */
function getGame(id) {
    //console.log("Games", games);
    return new Promise(function(resolve, reject){

        var gameId = Object.keys(games).find(function(key){
            return id == key;
        });

        if(gameId) {
            resolve(games[gameId]);
        }
        else{
            reject(new Error("No game with that ID exists"));
        }
    })
}

/**
 * Returns a list of available games
 * @return Array of game template stubs
 */
secureRouter.get('/', function(req, res, next){
    console.log('received game list request');
    getGames().then(function(list){
        console.log("Number of games: " + list.length);
        qr.ok(res, next, list);
    }).catch(function(err){
        qr.failed(res, next, "Can't retrieve game list because: " + err);
    });
});

/**
 * Retrieves a full list of game template stubs (meta information, no methods)
 * @returns {Promise}
 */
function getGames(){
    return new Promise(function(resolve, reject){
        
        var stubs = Object.keys(games).map(function(id){
            var game = new games[id]();
            

            return {
                _id: game._id,
                _rev: game._rev,
                gameName: game.gameName,
                minPlayers: game.minPlayers,
                maxPlayers: game.maxPlayers
            }
        });
        
        resolve(stubs);
    })
}

module.exports = {
    getGame: getGame,
    getGames: getGames,
    secureRouter: function(theApp) {
        app = theApp;
        return secureRouter;
    }
};