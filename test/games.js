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
var db = nano.use(config.dbName);
var instances = require('../instances');

describe('Games', function(){
    afterEach(function(done){
        console.log("starting deletes");
        tools.clean('instances', 'all').spread(function(body){

            tools.clean('users', 'all').spread(function(body){
                console.log("Finished deletes");
                authToken = null;
                done();

            });
        })
    })
    beforeEach(function(done){
        console.log("Starting login");
        tools.createUser(dummyConfirmed).spread(function(user){
            console.log(user);
            tools.loginAs(dummyConfirmed.username, dummyConfirmed.password, function(token){
                authToken = token;

                console.log("finished login", token);
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
        expect(implementation).to.exist;
        done();
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
            api.get('/instance/' + userId)
                .set('x-access-token', authToken)
                .end(function(err, res){
                    console.log("Player instances response", res.body);
                    expect(res.body.ok).to.be.ok;
                });
            expect(implementation).to.exist;
            done();
        });

        it('successfully calls actions for instance', function(done){
            expect(implementation).to.exist;
            done();
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