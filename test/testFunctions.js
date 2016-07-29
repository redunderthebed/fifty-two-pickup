/**
 * Created by redun on 24/07/2016.
 */
var config = require('../config');
var expect = require('chai').expect;
var supertest = require('supertest');
var api = supertest('http://localhost:3000');
var nano = require("nano-blue")("http://localhost:5984");
var db = nano.use(config.dbName);
var dummyDetails = {
    username: 'dummy',
    password: 'dummy',
    confirm:'dummy',
    email:'test@test.com',
    confirmed: false,
    confirmCode: "123abc"
};
var dummyConfirmed = {
    username: 'dummy',
    password: 'dummy',
    confirm:'dummy',
    email:'test@test.com',
    confirmed: true,
    confirmCode: "123abc"
};
function deleteUser(details) {
    return nano.use(config.dbName).view('users', 'usersByName', {key: details.username}).spread(function (data) {
        if(data.rows.length > 0) {
            var id = data.rows[0].value._id;
            var rev = data.rows[0].value._rev;
            return nano.use(config.dbName).destroy(id, rev).spread(function (/*data*/) {
                return [{ok: true, message: "User removed"}];
            }).catch(function (err) {
                return [{ok: false, message: "Removal failed"}];
            })
        }
        else{
            return [{ok: true, message: "User never existed"}];
        }
    }).catch(function (err) {
        console.log(err);
        return [{ok: true, message: "User never existed"}];
    });
};
function createUser(details){
    return nano.use(config.dbName).insert(details).spread(function(data){
        //console.log(data);
        return [{ok: true, data: data}];
    })
};
function loginAs(user, pass, callback){

    api.post('/user/login').
    send({username: user, password: pass}).
    end(function(err, res){
        if(err){
            console.log("User login failed because " + err);
        }
        else{
            
            callback(res.body.data.authToken);
        }
    });
};
function clean(designDoc, viewName){
    return db.view(designDoc, viewName).spread(function(body){
        var instances = {docs:[]};
        body.rows.forEach(function(row){
            var doc = {_id: row.value._id, _rev: row.value._rev, _deleted: true};
            instances.docs.push(doc);
        });

        return db.bulk(instances).spread(function(body){
            return body;
        })
    })
}
module.exports = {
    dummyDetails: dummyDetails,
    dummyConfirmed: dummyConfirmed,
    deleteUser: deleteUser,
    createUser: createUser,
    loginAs: loginAs,
    clean: clean,
    api: api
};