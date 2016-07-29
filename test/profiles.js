/**
 * Created by redun on 24/07/2016.
 */
var expect = require('chai').expect;
var supertest = require('supertest');
var nano = require("nano-blue")("http://localhost:5984");

var tools = require('./testFunctions');
var api = tools.api;

describe('Profiles', function(){
    it('allows profile fields to be retrieved', function(done){
       expect(implementation).to.exist;
    });

    it('allows profile fields to be updated', function(done){
        expect(implementation).to.exist;
    });

    it('provides overall win/loss ratio', function(done){
        expect(implementation).to.exist;
    })

    it('provides game specific win/loss ratio', function(done){
        expect(implementation).to.exist;
    })


})