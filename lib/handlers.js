/**
 * Request handlers
 */

//Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

//define the handlers
const handlers = {};

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
handlers._users.get = (data, callback) => {
    //Check that the pone number is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        //Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        //Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                // Lookup for user
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
                callback(403, {'Error': 'Missing required token in header, or token is invalid'})
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

//Users - put
//Required data: phone
//Optional data: firstName, lastName, password (at least one must be specified)
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
            //Get the token from the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            //Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
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
                    callback(403, {'Error': 'Missing required token in headr, or token is invalid'})
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
handlers._users.delete = (data, callback) => {
    //Check that the pone number is valid
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    // Get the token form the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    if (phone) {
        //Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                _data.read('users', phone, (err, userData) => {
                    if (!err && data) {
                        _data.delete('users', phone, () => {
                            if (!err) {
                                // Delete each of the checks associated with the user
                                const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                const checksToDelete = userChecks.length;

                                if (checksToDelete > 0) {
                                    let checksToDeleted = 0;
                                    let deletionErrors = false;

                                    //Loop through the checks
                                    userChecks.forEach((checkId) => {
                                        _data.delete('checks', checkId, (err) => {
                                            if (err) {
                                                deletionErrors = true;
                                            }

                                            checksToDeleted++;

                                            if (checksToDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                } else {
                                                    callback(500, {'Error': 'Errors ecountered while attempting to delete all of the users checks. All checks may ot have been deleted from the system succesfully'});
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    callback(200);
                                }
                            } else {
                                callback(500, {'Error': 'Could not delete the specified user'});
                            }
                        });
                    } else {
                        callback(400, {'Error': 'Could not find the specified user'});
                    }
                });
            } else {
                callback(403, {'Error': 'Missing required token in headr, or token is invalid'}) 
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

//tokens handler
handlers.tokens = (data, callback) => {
    const acceptableMethods = ['post', 'put', 'get', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

//Container for all tokens methods
handlers._tokens = {};

//Tokens post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length ? data.payload.password.trim() : false;

    if (phone && password) {
        //Lookup the user who matches that phone number
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                // Hash the sent password, and compare it to the password stored in the user
                const hashedPassword = helpers.hash(password);

                if (hashedPassword == userData.hashedPassword) {
                    // If valid create a new token with a random name. Set expiration date 1 hour.
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        'id': tokenId,
                        'phone': phone,
                        'expires': expires
                    };

                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, {'Error': 'Could not create the new token'});
                        }
                    });

                } else {
                    callback(400, {'Error': 'Password did not match the specified user\'s stored password'})
                }
            } else {
                callback(400, {'Error': 'Could not find the specified user'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field(s)'});
    }
}

//Tokens get
//Required data: id
//Optional data: none
handlers._tokens.get = (data, callback) => {
    //Check the id sent is valid
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
}

//Tokens put
// Required data: id, extend
//Optional data: none
handlers._tokens.put = (data, callback) => {
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend === true ? true : false;

    if (id && extend) {
        //Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                // Check to make sure the token isn;t already expired
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    _data.update('tokens', id, tokenData, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, {'Error': 'Could not update the token\'s expiration'});
                        }
                    });
                } else {
                    callback(400, {'Error': 'The token has already expired, and cannot be extended'});
                }
            } else {
                callback(400, {'Error': 'Specified token does not exist'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field(s) or field(s) not valid'})
    }
}

//Tokens delete
//Required data: id
//Optional data: none
handlers._tokens.delete = (data, callback) => {
     //Check that the id is valid
     let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

     if (id) {
         _data.read('tokens', id, (err, data) => {
             if (!err && data) {
                 _data.delete('tokens', id, () => {
                     if (!err) {
                         callback(200);
                     } else {
                         callback(500, {'Error': 'Could not delete the specified tokens'});
                     }
                 });
             } else {
                 callback(400, {'Error': 'Could not find the specified tokens'});
             }
         });
     } else {
         callback(400, {'Error': 'Missing required field'});
     }
}

// Verify if a given token is currently valid for a given user
handlers._tokens.verifyToken = (id, phoneNumber, callback) => {
    //Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            // Check that the token is for the given user and has not expired
            if (tokenData.phone === phoneNumber && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

// Container for all the cheks methods
handlers._checks = {};

// Checks
//Checks handler
handlers.checks = (data, callback) => {
    const acceptableMethods = ['post', 'put', 'get', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Checks -post
//Required data: protocol, url, method, succesCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
    // Validate input
    const protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol : false;
    const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].includes(data.payload.method) ? data.payload.method : false;
    const succesCodes = typeof(data.payload.succesCodes) == 'object' && data.payload.succesCodes instanceof Array && data.payload.succesCodes.length > 0 ? data.payload.succesCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && succesCodes && timeoutSeconds) {
        // Get the token form the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        //Lookup the user by reading the token
        _data.read('tokens', token, (err, tokenData) => {
            if (!err) {
                const userPhone = tokenData.phone;

                _data.read('users', userPhone, (err, userData) => {
                    if (!err && userData) {
                        const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify that the user has  less than the number of max-checks-per-user
                        if (userChecks.length < config.maxChecks) {
                            //Create a random id for the check
                            const checkId = helpers.createRandomString(20);

                            // Create the check object, and include the user's phone
                            const checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url': url,
                                'method': method,
                                'succesCodes': succesCodes,
                                'timeoutSeconds': timeoutSeconds,
                            };

                            // Save the object
                            _data.create('checks', checkId, checkObject, (err) => {
                                if (!err) {
                                    // Add the check id to the user's object
                                    userData.checks = userChecks
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, (err) => {
                                        if (!err) {
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, {'Error': 'Could not update the user with the new check'});
                                        }
                                    })
                                } else {
                                    callback(500, {'Error': 'Could not create the new check'});
                                }
                            });
                        } else {
                            callback(400, {'Error': `The user already has the maximum numbers of checks ${config.maxChecks}`});
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400, {'Error': 'Missing required inputs, or inputs are invalid!'});
    }
};

// Checks - get
// Required data : id
// Optional data: none
handlers._checks.get = (data, callback) => {
    //Check that the id is valid
    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                //Get the token from the headers
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                //Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        // Return the check data
                        callback(200, checkData);
                    } else {
                        callback(403)
                    }
                });
            } else {
                callback(404);
            }
        });

    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, succesCodes, timeoutSeconds (one must be sent)

handlers._checks.put = (data, callback) => {
    // Check for the required field
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

    // Check for the optional fields
    const protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol : false;
    const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].includes(data.payload.method) ? data.payload.method : false;
    const succesCodes = typeof(data.payload.succesCodes) == 'object' && data.payload.succesCodes instanceof Array && data.payload.succesCodes.length > 0 ? data.payload.succesCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    // Check to mae sure id is valid
    if (id) {
        // Check to make sure one or more optional fields has been sent
        if (protocol || url || method || succesCodes || timeoutSeconds) {
            _data.read('checks', id, (err, checkData) => {
                if (!err && checkData) {
                    //Get the token from the headers
                    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    //Verify that the given token is valid and belongs to the user who created the check
                    handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            // Update the check where necessary
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (succesCodes) {
                                checkData.succesCodes = succesCodes;
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            //Store  the new updates
                            _data.update('checks', id, checkData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, {'Error': 'Could not update the check'});
                                }
                            });
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(400, {'Error': 'Check ID did not exist'});
                }
            });
        } else {

        }
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
    //Check that the id is valid
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        //Lookup mthe check
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                //Get the token from the headers
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                 //Verify that the given token is valid for the id
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        // Delete the check data
                        _data.delete('checks', id, (err) => {
                            if (!err) {
                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if (!err && userData) {
                                        const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        //Remove the delete check form their list of checks
                                        const checkPosition = userChecks.includes(id)
                                        if (checkPosition) {
                                            userChecks.splice(checkPosition, 1);
                                            //Re-save the user`s data
                                            _data.update('users', checkData.userPhone, userData, (err) => {
                                                if (!err) {
                                                    callback(200);
                                                } else {
                                                    callback(500, {'Error': 'Could not update the user'});
                                                }
                                            });
                                        } else {
                                            callback(500, {'Error': 'Could not find the check of the user object, so could not remove'})
                                        }

                                        
                                    } else {
                                        callback(500, {'Error': 'Could not find the user who created the check, so could not remove the check from the list of checks from the user blablabla'});
                                    }
                                });
                            } else {
                                callback(500, {'Error': 'Could not delete the check data'}); 
                            }
                        });
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(400, {'Error': 'The specified check ID does not exist'})
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};


//ping handler
handlers.ping = (data, callback) => {
    //Callback a http status code, and a payload object
    callback(200);
};

//not found handler
handlers.notfound = (data, callback) => {
    callback(404);
};

//Export the module
module.exports = handlers;