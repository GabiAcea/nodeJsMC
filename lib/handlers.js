/**
 * Request handlers
 */

//Dependencies
const _data = require('./data');
const helpers = require('./helpers');

//define the handlers
const handlers = {};

//ping handler
handlers.ping = (data, callback) => {
    //Callback a http status code, and a payload object
    callback(200);
};

//homepage handler
handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'put', 'get', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for the users submethods
handlers._users = {};

//Users - post
//Required data: firstName, lastName, phone, password, tosAgreement
//Optional data: none
handlers._users.post = (data, callback) => {
    //Check that all required fields ar filled out
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        //Make sure that the user doesnt already exist
        _data.read('users', phone, (err, data) => {
            if (err) {
                //Hash the password
                const hashedPassword = helpers.hash(password);

                //Create the user object
                if (hashedPassword) {
                    let userObject = {
                        'firstName': firstName,
                        'lastname': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                    };
    
                    // Store the user
                    _data.create('users', phone, userObject, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'Could not create the new user!'});
                        }
                    });
                } else {
                    callback(500, {'Error': 'Could not hash the user password!'})
                }
            } else {
                // User already exists
                callback(400, {'Error': 'A user with this phone number already exists!'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

//Users - get
//Required data: phone
//Optional data: none
// @TODO Only let an authenticated user access their object. Don;t let them access anyone else's
handlers._users.get = (data, callback) => {
    //Check that the pone number is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        _data.read('users', phone, (err, data) => {
            if (!err && data) {
                // Remove the hashed password from the returned user data
                delete data.hashedPassword;
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

//Users - put
//Required data: phone
//Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only update an authenticated user update their own object. Don't let them update other's data
handlers._users.put = (data, callback) => {
    // Check for the required field
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length? data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length ? data.payload.password.trim() : false;

    // Error if phone is invalid
    if (phone) {
        if (firstName || lastName || password) {
            // Lookup the user
            _data.read('users', phone, (err, userData) => {
                if (!err && userData) {
                    // Update the necessary fields
                    if (firstName) {
                        userData.firstName = firstName;
                    }

                    if (lastName) {
                        userData.lastName = lastName;
                    }

                    if (password) {
                        userData.hashedPassword = helpers.hash(password);
                    }

                    // Store the new updates
                    _data.update('users', phone, userData, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error': 'Could not update the user'});
                        }
                    });
                } else {
                    callback(400, {'Error': 'The specified user does not exist'});
                }
            });
        } else {
            callback(400, {'Error': 'Missing data to update'});
        }

    } else {
        callback(400, {'Error': 'Missing required field'});
    }
}

//Users - delete
//Required field: phone
// @TODO Only let an authenticated user delete their object. don't let anyone else to delete it.
// @TODO Cleanup (delete) any other data files assoiciated with this user
handlers._users.delete = (data, callback) => {
    //Check that the pone number is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        _data.read('users', phone, (err, data) => {
            if (!err && data) {
                _data.delete('users', phone, () => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {'Error': 'Could not delete the specified user'});
                    }
                });
            } else {
                callback(400, {'Error': 'Could not find the specified user'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

//not found handler
handlers.notfound = (data, callback) => {
    callback(404);
};

//Export the module
module.exports = handlers;