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

        })

        it('lists the old instances a user was involved in', function(done){
            expect(implementation).to.exist;
            done();
        })

        it('sets the creator player as the host', function(done){
            expect(implementation).to.exist;
            done();
        })

        it('records the leader board of an instance after game is finished', function(done){
            expect(implementation).to.exist;
            done();
        });

        it('deactivates the instance when it is completed', function(done){
            expect(implementation).to.exist;
            done();
        });
    });
});