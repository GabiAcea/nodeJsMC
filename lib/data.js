/*
* Library for storing and editing data
*/

//Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

//Container for the module 
let lib = {};

//Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

//Write data to a file
lib.create = (dir, file, data, callback) => {
    //Open the file for writing (wx flag it's used to open file for writing and fail if the pathfile exists)
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            //Convert data to string
            let stringData = JSON.stringify(data);

            //Write to file and close it
            fs.writeFile(fileDescriptor, stringData, () => {
                if (!err) {
                    fs.close(fileDescriptor, () => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file!');
                        }
                    })
                } else {
                    callback('Error writing to new file!');
                }
            });
        } else {
            callback('Could not create new file, it may already exist!');
        }
    });
};

//Read data from file
lib.read = (dir, file, callback) => {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
        if (!err && data) {
            let parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    })
};

//Update data from file (r+ flag it's used to open file for reading and fail if the file does not exist)
lib.update = (dir, file, data, callback) => {
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            let stringData = JSON.stringify(data);

            //Truncate the file
            fs.truncate(fileDescriptor, () => {
                if (!err) {
                    //Write to file and close it
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, () => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the file!');
                                }
                            });
                        } else {
                            callback('Error writing to existing file!');
                        }
                    });
                } else {
                    callback('Error truncating file!');
                }
            });
        } else {
            callback('Error, could not open the file for updating, it may not exist yet!');
        }
    })
};

//Delete data from file
lib.delete = (dir, file, callback) => {
    //Unlink the file
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', (err) => {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting the file!');
        }
    })
};

//Export module
module.exports = lib;