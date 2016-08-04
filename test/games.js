/**
 * Created by redun on 25/07/2016.
 */
var config = require('../config');
var expect = require('chai').expect;
var supertest = require('supertest');
var nano = require("nano-blue")(config.couchdbHost);

var tools = require('./testFunctions');
var api = tools.api;
var dummyDetails = tools.dummyDetails;
var dummyConfirmed = tools.dummyConfirmed;
var authToken = null;
var userId = null;
var db = nano.use(config.dbName);
var instances = require('../instances');

function createInstanceOf(gameId, authToken) {
    return new Promise(function(resolve, reject)
    {
        //Create new instance of TicTacToe
        api.post('/instance/')
            .send({
                gameId: gameId //Send id of game template to be instantiated
            })
            .set('x-access-token', authToken) //Send authToken
            .end(function (err, res) {
                if(err){
                    reject(err);
                }
                //Check created ok and id and rev number returned
                expect(res.statusCode).to.equal(201);
                expect(res.body.ok).to.be.ok;
                expect(res.body.data._id).to.be.ok;
                expect(res.body.data._rev).to.be.ok;

                var instId = res.body.data._id;

                resolve(instId);
            })
    })
}

function addPlayerTo(instanceId, authToken){
    return new Promise(function(resolve, reject) {
        api.patch('/instance/' + instanceId + '/addPlayer')
            .set('x-access-token', authToken)
            .end(function (err, res) {
                if(err){
                    reject(err);
                }
                //Check for ok response
                expect(res.body.ok).to.be.ok;
                expect(res.statusCode).to.equal(200);
                resolve({ok: true});
            });
    });
}

function callPostAction(instanceId, action, args, authToken){
    return new Promise(function(resolve, reject){
        api.post('/instance/' + instanceId + '/action/' + action)
            .set('x-access-token', authToken)
            .send(args)
            .end(function(err, res){
                if(err){
                    reject(err);
                }
                expect(res.body.ok).to.be.ok;
                expect(res.statusCode).to.equal(201);
                resolve(res.body.data);
            });
    });
}

describe('Games', function(){
    afterEach(function(done){
        tools.clean('instances', 'all').spread(function(body){

            tools.clean('users', 'all').spread(function(body){
                authToken = null;
                done();

            });
        })
    })
    beforeEach(function(done){

        tools.createUser(dummyConfirmed).spread(function(user){
            console.log("Logged in as", user.data.id);
            userId = user.data.id;
            
            tools.loginAs(dummyConfirmed.username, dummyConfirmed.password, function(token){

                authToken = token;


                done();
            });
        }).catch(function(err){
            console.log("User creation failed because " + err);
        });
    });

    it('list games', function(done){
        api.get('/game/')
            .set({"x-access-token": authToken})
            .end(function(err, res){
                console.log(res.body);
                expect(res.statusCode).to.equal(200);
                res.body.data.forEach(function(game){
                    expect(game.gameName).to.exist;
                });
                done();
            });
    });

    it('loads actions for each game', function(done){
        //Send post request to instance that doesn't exist, just to confirm route is responding
        api.post('/instance/123/action/placeSymbol')
            .set('x-access-token', authToken)
            .send({
                row: 1,
                col: 1,
                symbol: 'x'
            })
            .end(function(err, res){
                //Expect graceful failure

                expect(res.body.ok).to.equal(false);
                expect(res.body.error).to.equal("Instance doesn't exist");
                expect(res.statusCode).to.equal(404);
                done();
            })
    });

    describe('Instance', function() {

        it('adds a player to a game', function(done){
            //Create new instance of TicTacToe
            api.post('/instance/')
                .send({
                    gameId: "12345" //Send id of game template to be instantiated
                })
                .set('x-access-token', authToken) //Send authToken
                .end(function(err, res){

                    //Check created ok and id and rev number returned
                    expect(res.statusCode).to.equal(201);
                    expect(res.body.ok).to.be.ok;
                    expect(res.body.data._id).to.be.ok;
                    expect(res.body.data._rev).to.be.ok;

                    var instId = res.body.data._id;
                    console.log(instId);
                    //Add player to instance
                    api.patch('/instance/' + instId + '/addPlayer')
                        .set('x-access-token', authToken)
                        .end(function(err, res) {

                            //Check for ok response
                            expect(res.body.ok).to.be.ok;
                            expect(res.statusCode).to.equal(200);

                            //Access dev route for instance to check player added to coreState
                            api.get('/instance/dev/' + instId)
                                .set('x-access-token', authToken)
                                .end(function (err, res) {
                                    console.log('Instance get response', res.body);
                                    var players = res.body.data.coreState.players;

                                    //Find userId matching dummyConfirmed username
                                    var userId = Object.keys(players).find(function (key) {
                                        return players[key].username == dummyConfirmed.username;
                                    });
                                    expect(userId).to.be.ok;
                                    expect(players[userId]).to.be.ok;
                                    done();
                                });
                        });
                });

        });
        it('creates a new instance of a game', function (done) {
            console.log("sending post");
            api.post('/instance/')
                .send({
                    gameId: "12345"
                })
                .set('x-access-token', authToken)
                .end(function(err, res){
                    expect(res.statusCode).to.equal(201);
                    expect(res.body.ok).to.be.ok;
                    expect(res.body.data).to.be.ok;
                    done();

                })
        });
        
        it('lists the active instances a user is involved in', function (done) {
            var instIds = [];
            var players = {};
            players[userId] = {_id: userId, username: dummyConfirmed.username};
            var wrongPlayers = {"123": {id: '123', username: 'wrong guy'}};

            //define base instance
            var dummyGame = {
                gameState:{},
                coreState:{
                    players: {},
                    boards: {},
                    cards: {},
                    active: true,
                    open: true
                }
            }
            //Build four instances from base
            var dummyGameActive = JSON.parse(JSON.stringify(dummyGame)); //active and contains only dummyConfirmed OK
            dummyGameActive.coreState.players = players;
            var dummyGameInactive = JSON.parse(JSON.stringify(dummyGame)); //Inactive and contains only dummyConfirmed
            dummyGameInactive.coreState.players = players;
            dummyGameInactive.coreState.active = false;
            var dummyGameWrong = JSON.parse(JSON.stringify(dummyGame)); //Active but contains wrong guy
            dummyGameWrong.coreState.players = wrongPlayers;
            var dummyGameMultiple = JSON.parse(JSON.stringify(dummyGame)); //Active and contains both players OK
            dummyGameMultiple.coreState.players = JSON.parse(JSON.stringify(players));
            dummyGameMultiple.coreState.players['123'] = {_id: '123', username: 'wrong guy'};

            //Compile into docs object for couchDB
            var docs = {
                docs: [dummyGameActive, dummyGameInactive, dummyGameWrong, dummyGameMultiple]
            };

            //Bulk insert directly into database
            db.bulk(docs).spread(function(body){
                //Remember inserted instance details
                instIds = (body);

                //request user instances
                api.get('/instance/active')
                    .set('x-access-token', authToken) //specifies user for request
                    .end(function (err, res) {
                        //Expect ok response overall
                        expect(res.body.ok).to.be.ok;

                        //Get returned instance stubs
                        var instances = res.body.data;

                        //Expect 2 instances (the first and last to be inserted)
                        expect(instances.length == 2);
                        expect(instances[0].id).to.equal(instIds[0].id);
                        expect(instances[1].id).to.equal(instIds[3].id);

                        done();
                    });
                });
        });

        it('successfully calls post actions for instance', function(done){
            api.post('/instance/')
                .send({
                    gameId: "12345" //Send id of game template to be instantiated
                })
                .set('x-access-token', authToken) //Send authToken
                .end(function(err, res) {

                    //Check created ok and id and rev number returned
                    expect(res.statusCode).to.equal(201);
                    expect(res.body.ok).to.be.ok;
                    expect(res.body.data._id).to.be.ok;
                    expect(res.body.data._rev).to.be.ok;

                    var instId = res.body.data._id;
                    console.log("Instance ID:", instId);
                    api.post('/instance/' + instId + '/action/placeSymbol')
                        .send({
                            row: 1,
                            col: 2,
                            symbol: 'x'
                        })
                        .set('x-access-token', authToken)
                        .end(function(err, res){
                            console.log(res.body);
                            expect(res.statusCode).to.equal(201);
                            expect(res.body.ok).to.be.ok;
                            expect(res.body.data.ok).to.be.ok;
                            done();
                        })
                });
        })

        it('lists the old instances a user was involved in', function(done){
            var players = {};
            players[userId] = {_id: userId, username: dummyConfirmed.username};
            db.insert({
                gameState:{},
                coreState:{
                    players: players,
                    boards: {},
                    cards: {},
                    active: false,
                    open: true
                }
            }).then(function(body){
                console.log(body);
                var createdInstId = body[0].id;
                api.get('/instance/inactive')
                    .set('x-access-token', authToken)
                    .end(function(err, res){
                        console.log(res.body);
                        expect(res.body.ok).to.be.ok;
                        expect(res.statusCode).to.equal(200);
                        expect(res.body.data[0].id).to.equal(createdInstId);

                        done();
                    });
            })
        });

        it('sets the creator player as the host', function(done){
            api.post('/instance/')
                .send({
                    gameId: "12345"
                })
                .set('x-access-token', authToken)
                .end(function(err, res){

                    expect(res.statusCode).to.equal(201);
                    expect(res.body.ok).to.be.ok;
                    expect(res.body.data).to.be.ok;

                    api.get('/instance/dev/' + res.body.data._id)
                        .set('x-access-token', authToken)
                        .end(function(err, res){
                            expect(res.body.ok).to.be.ok;
                            expect(res.body.data.coreState.host).to.equal(userId);
                            done();
                        })

                })
        })


        it('records the leader board of an instance after game is finished', function(done){
            createInstanceOf("12345", authToken).then(function(instId){
                console.log('Created instance', instId);
                return addPlayerTo(instId, authToken).then(function(body){
                    console.log('Added player', body);
                    return tools.createAndLoginAs(tools.otherUser).then(function(otherUser){
                        console.log('Created other user', otherUser);
                        return addPlayerTo(instId, otherUser.token).then(function(body){
                            console.log('Added other player', body);
                            return callPostAction(instId, "setLoser", {}, otherUser.token).then(function(result){
                                return callPostAction(instId, "setWinner", {}, authToken).then(function(result){
                                    console.log('Set winner', result);
                                    api.get('/instance/' + instId)
                                        .set('x-access-token', authToken)
                                        .end(function(req, res){
                                            console.log(res.body.data.leaderBoard);
                                            var leaderBoard = res.body.data.leaderBoard;
                                            expect(res.body.ok).to.be.ok;
                                            expect(leaderBoard.first.username).to.equal(dummyConfirmed.username);
                                            expect(leaderBoard.second.username).to.equal(tools.otherUser.username);
                                            expect(leaderBoard.first._id).to.equal(userId);
                                            expect(leaderBoard.second._id).to.equal(otherUser.id);
                                            done();
                                        });
                                })
                            })
                        })
                    }).catch(function(err){
                        console.log(err);
                    })
                });
            });

        });

        it('deactivates the instance when it is completed', function(done){
            createInstanceOf("12345", authToken).then(function(instId){
                console.log('Created instance', instId);
                return addPlayerTo(instId, authToken).then(function(body){
                    console.log('Added player', body);
                    return tools.createAndLoginAs(tools.otherUser).then(function(otherUser){
                        console.log('Created other user', otherUser);
                        return addPlayerTo(instId, otherUser.token).then(function(body){
                            console.log('Added other player', body);
                            return callPostAction(instId, "setLoser", {}, otherUser.token).then(function(result){
                                return callPostAction(instId, "setWinner", {}, authToken).then(function(result){
                                    console.log('Set winner', result);
                                    api.get('/instance/' + instId)
                                        .set('x-access-token', authToken)
                                        .end(function(req, res){
                                            console.log(res.body.data.leaderBoard);
                                            var leaderBoard = res.body.data.leaderBoard;
                                            expect(res.body.ok).to.be.ok;
                                            expect(res.body.data.active).to.equal(false);
                                            done();
                                        });
                                })
                            })
                        })
                    }).catch(function(err){
                        console.log(err);
                    })
                });
            });
        });

        it('handles erroneous action call gracefully', function(done){
            expect(implementation).to.exist;
            done();
        })
    });
});