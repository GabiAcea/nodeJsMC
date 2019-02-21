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

//Create o string of random alphanumeric characters of a given length

helpers.createRandomString = (strLength) => {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

    if (strLength) {
        const possibleChar = 'abcdefghijklmnopqrstuvxyz0123456789';

        // Start the final string
        let str = '';

        for (let i = 1; i <= strLength; i++) {
            // Get a random char from the possibleChar string
            let randomChar = possibleChar.charAt(Math.floor(Math.random() * possibleChar.length));
            // Append this char to the final string
            str+=randomChar;
        }

        return str;

    } else {
        return false;
    }
}

//export module
module.exports = helpers;