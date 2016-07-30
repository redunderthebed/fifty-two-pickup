/**
 * Created by redun on 21/07/2016.
 */
var config = require('../config');
var expect = require('chai').expect;
var supertest = require('supertest');
var nano = require("nano-blue")(config.couchdbHost);

var tools = require('./testFunctions');
var api = tools.api;
var dummyDetails = tools.dummyDetails;
var dummyConfirmed = tools.dummyConfirmed;

describe('User', function() {
    beforeEach(function(done){
        tools.deleteUser(dummyDetails).catch(function(err){
            return [];
        }).spread(function(data){
            return tools.deleteUser(dummyConfirmed).spread(function (data) {

                done();
            }).catch(function (error) {
                console.log(error);
                return [{error: error}];
                done();
            });
        });
    });
    afterEach(function(done){
        tools.clean('users', 'all').spread(function(body){
            done();
        });
    })
    describe('Basic Create', function () {
        it('accepts valid request', function (done) {
            api.post('/user/')
                .send(dummyDetails)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    expect(res.statusCode).to.equal(201);
                    done();
                })
        });
        it('rejects duplicate requests', function (done) {

            api.post('/user/')
                .send(dummyDetails)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    expect(res.statusCode).to.equal(201);
                    api.post('/user/')
                        .send(dummyDetails)
                        .expect('Content-Type', /json/)
                        .end(function (err, res) {
                            expect(res.statusCode).to.equal(409);
                            expect(res.body.error).to.equal('User already exists');
                            done();
                        })
                })
        });
        it('rejects missing password confirmation', function (done) {
            var failDetails = {
                username: 'failDummy',
                password: 'failDummy',
                email: 'failDummy'
            };
            api.post('/user/')
                .send(failDetails)
                .end(function (err, res) {

                    expect(res.statusCode).to.equal(404);
                    expect(res.body.ok).to.equal(false);
                    expect(res.body.error).to.equal("Registration information invalid");
                    done();
                });
        })
        it('succeeds in validating and logging into new registration', function(done){
            var testUser = {
                username: "test",
                password: "test",
                email: "test@test.com",
                confirm: "test"
            };
            tools.deleteUser(testUser).spread(function(deleteOutput){
                api.post('/user/')
                    .send(testUser)
                    .end(function (err, res) {
                        nano.use(config.dbName).view('users', 'usersByName', {key: testUser.username}).spread(function (body) {
                            console.log(body.rows[0].value);
                            var code = body.rows[0].value.confirmCode;
                            var id = body.rows[0].value._id;
                            api.patch("/user/" + id + "/confirmed/" + code)
                                .end(function (err, res) {
                                    expect(res.statusCode).to.equal(200);
                                    api.post('/user/login')
                                        .send({username: testUser.username, password: testUser.password})
                                        .end(function (err, res) {
                                            var authToken = res.body.data.authToken;
                                            expect(authToken).to.be.ok;
                                            api.get('/user/')
                                                .set({"x-access-token": authToken})
                                                .end(function (err, res) {
                                                    expect(res.body.ok).to.be.ok;
                                                    done();
                                                });
                                        });
                                });
                        });
                    });
            });
        });
    });
    describe('Get', function(){
        it('returns no security information', function(done){
            tools.createUser(dummyConfirmed).spread(function (data) {
                tools.loginAs(dummyConfirmed.username, dummyConfirmed.password, function (authToken) {
                    api.get('/User/')
                        .set({"x-access-token": authToken})
                        .end(function (err, res) {

                            var user = res.body.data;
                            expect(res.status).to.equal(200);
                            expect(user.password || user.confirm || user.confirmCode).to.be.not.ok;
                            done();
                        });
                });
            });

        });
    });
    describe('BasicAuthentication', function () {
        it('rejects incorrect credentials', function (done) {
            api.post('/user/login', {username: "username", password: "password"})
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
        it('accepts login if valid', function (done) {
            tools.createUser(dummyConfirmed).spread(function(user)
            {
                api.post('/user/login')
                    .send({username: dummyConfirmed.username, password: dummyConfirmed.password})
                    .end(function (err, res) {
                        expect(res.body.ok).to.be.ok;
                        done();
                    });
            });
        });
        it("rejects unconfirmed user", function (done) {
            tools.createUser(dummyDetails);

            return api.post('/user/login')
                .send(dummyDetails)
                .expect('Content-Type', /json/)
                .expect(404)
                .end(function (err, res) {
                    expect(res.body.ok).not.to.be.ok;
                    expect(res.body.error).to.equal("User not confirmed");
                    done();
                })

        });
    });
    describe('Delete', function (done) {
        it("Accepts valid delete request", function (done) {
            tools.createUser(dummyConfirmed).spread(function(user){

                tools.loginAs(dummyConfirmed.username, dummyConfirmed.password, function(authToken){

                    api.delete('/user/')
                        .set({"x-access-token": authToken})
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            expect(res.statusCode).to.equal(200);
                            expect(res.body.ok).to.be.ok;
                            done();
                        });
                });
            });
        });
    });
    describe("Confirm", function(){
       it("Confirms user with valid code", function(done){
           tools.createUser(dummyConfirmed).spread(function(user){

               nano.use('login').view('users', 'usersByName', {key:dummyConfirmed.username}).spread(function(body){
                   var code = body.rows[0].value.confirmCode;

                   api
                       .patch('/user/' + user.data.id + '/confirmed/' + code)
                       .expect(200)
                       .end(function(err, res){
                           
                           expect(res.body.ok).to.be.ok;
                           done();
                   });
               });
           });
        });
        it("Rejects user with invalid code", function(done){
            tools.createUser(dummyDetails).spread(function(body){
                api
                    .put('/user/' + body.data.id + '/confirmed/' + "notacode")
                    .expect(404)
                    .end(function(err, res){
                        expect(res.body.ok).to.not.be.ok;
                        done();
                    });

            });
        });
        it("receives confirm code for user through dev api", function (done) {
            tools.createUser(dummyConfirmed).spread(function(user){
                tools.loginAs(dummyConfirmed.username, dummyConfirmed.password, function(authToken){
                    api.get('/user/dev/confirm/')
                        .set({"x-access-token":authToken})
                        .end(function (err, res) {
                            expect(res.body.data).to.equal(dummyDetails.confirmCode);
                            done();
                        });
                });
            });



        });
    });
    describe("Session", function(){
        it("returns authToken with successful login", function(done){
            tools.createUser(dummyConfirmed);
            api.post('/user/login')
                .send({username: dummyConfirmed.username, password: dummyConfirmed.password})
                .end(function (err, res) {
                    if(err){
                        console.log(err);
                    }
                    expect(res.body.ok).to.be.ok;
                    expect(res.body.data.authToken).to.be.ok;
                    done();
                });
        })
    })
});
