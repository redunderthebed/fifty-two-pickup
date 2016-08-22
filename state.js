/**
 * Created by redun on 9/08/2016.
 */
/**
 * Created by redun on 7/08/2016.
 */

var rootDir = module.filename.substring(0, module.filename.lastIndexOf('\\'));
var constructors = {};

function addConstructor(con){
    if(!constructors[con.name]){
        constructors[con.name] = con;
    }
}

function StatefulObject() {
    this._state = {};
}
StatefulObject.prototype.getState = function () {
    return this._state;
};
StatefulObject.prototype.setState = function (inState) {
    _state = inState;
};



function replacer(key, value) {
    //console.log("Replacer:", value);
    if (value.getState) {
        var state = value.getState();
        //console.log('Reading Stateful Object:', ['@' + value.constructor, state]);

        constructors[value.constructor.name] = value.constructor;
        return ['@' + value.constructor.name, state];

    }
    else {
        //console.log('Reading value of', key, ':', value);
        return value;
    }
}


function reviver(key, value) {
    try {
        if (typeof(value) == 'object' && value[0] && value[1]
            && typeof(value[0]) == 'string'
            && value[0].length > 0
            && value[0].charAt(0) == '@') {
            //console.log("+++++Object", key, value);
            //console.log('Constructors:', constructors);
            var con = constructors[value[0].substring(1)];
            //console.log(con.toString());

            var obj = new con();
            //console.log('Object', obj);
            //var obj = eval('new ' + value[0].substring(1) + '()');
            obj.setState(value[1]);
            return obj;
        }
        else {
            return value;
        }
    }
    catch(err){
        console.log(err);
    }
}

function stringify(obj){
    return JSON.stringify(obj, replacer);
}

function parse(obj){
    return JSON.parse(obj, reviver);
}

module.exports = {
    StatefulObject: StatefulObject,
    reviver: reviver,
    replacer: replacer,
    stringify: stringify,
    parse: parse,
    addConstructor: addConstructor,
    getConstructors: function(){return constructors;},
    setRootDir: function(dir){
        rootDir = dir;
    }
}
