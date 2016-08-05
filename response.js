/**
 * Created by redun on 21/07/2016.
 * Convenience class to reduce code to make proper REST responses.
 */

/**
 * Accepts an array of data as data, checks that it only has one value and returns said value.
 * This is useful when retrieving a single piece of data from couchdb from a view. If any other number
 * of items is found it responds with an appropriate error
 * @param res
 * @param next
 * @param data
 * @param type
 */
function returnSingle(res, next, data, type){
    //Check data is an array of rows
    if(data && data.rows) {
        //And that there is only one row
        if (data.rows.length == 1) {
            ok(res, next, data.rows[0]);
        }
        else if (data.rows.length > 1) {
            notFound(res, next, "duplicate " + (type ? type : "Item") + " found, expected single");
        }
        else {
            notFound(res, next, (type ? type : "Item") + " not found");
        }
    }
    //if data exists but has no rows property, must just be data, send ok
    else if(data){
        ok(res, next, data);
    }
    //No data, fail
    else{
        notFound(res, next, (type ? type : "Item") + " not found");
    }
}

/**
 * Resource not found
 * @param res       express response object
 * @param next      next middleware (always called)
 * @param reason    Error message to be reported in response
 */
var notFound = function (res, next, reason){
    res.status(404).send({ok: false, error: reason});
    if(next){
        next();
    }
};

/**
 * Internal server error
 * @param res       express response object
 * @param next      next middleware (always called)
 * @param reason    Error message to be reported in response
 */
var failed = function (res, next, reason){
    res.status(500).send({ok: false, error: reason});
    if(next){
        next();
    }
};

/**
 * Created OK
 * @param res       express response object
 * @param next      next middleware (always called)
 * @param data      The information for the object created (usually _id and _rev)
 */
var created = function(res, next, data){
    res.status(201).send({ok: true, data:data});
    if(next){
        next();
    }
};


/**
 * HTTP OK response, retrieval successful
 * @param res       express response object
 * @param next      next middleware (always called)
 * @param data      Response data for request
 */
var ok = function(res, next, data){
    res.status(200).send({ok: true, data:data});
    if(next){
        next();
    }
};

/**
 * Resource creation conflict (already exists)
 * @param res       express response object
 * @param next      next middleware (always called)
 * @param reason    Response data for request
 */
var conflict = function (res, next, reason) {
    res.status(409).send({ok: true, error: reason});
    if (next) {
        next();
    }
};

var forbidden = function (res, next, reason){
    res.status(403).send({ok: false, error: reason});
    if(next){
        next();
    }
};

module.exports = {
    returnSingle: returnSingle,
    notFound: notFound,
    failed: failed,
    created: created,
    ok: ok,
    conflict: conflict,
    forbidden: forbidden
};