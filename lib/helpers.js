/**
 * Helpers for various tasks
 */

 //Dependencies
 const crypto = require('crypto');
 const config = require('../lib/config');

 // Container for all helpers
let helpers = {};

//create a SHA256 hash
helpers.hash = (str) => {
    if (typeof str === 'string' && str.length) {
        return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    } else {
        return false;
    }
};

//Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
    try {
        let obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
}

//export module
module.exports = helpers;