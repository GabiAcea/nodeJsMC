/*
  Primary file for the API
*/

//Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const _data = require('./lib/data');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// TESTING
// @TODO CRUD
// _data.create('test', 'newFile', {'foo': 'bar'}, (err) => {
// _data.read('test', 'newFile', (err, data) => {
// _data.update('test', 'newFile', {'fizz': 'buzz'}, (err) => {
// _data.delete('test', 'newFile', (err) => {
    // console.log('Error:', err);
// });

// instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

// Start the server
httpServer.listen(config.httpPort, () => {
   console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
});

// Instantiate the HTTPS server
const httpsServerOptions = {
    'key': fs.readFileSync('https/key.pem'),
    'cert': fs.readFileSync('https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

//Start the https server
// Start the server
httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
});

//All the server logic for both the http and https server
let unifiedServer = ((req, res) => {
    //Get url and parse it
    const parsedUrl = url.parse(req.url, true);

    let buffer = '';
    const decoder = new StringDecoder('utf-8');

    //Get the path from the url
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+%/g, '');

    //get the query string object
    const queryStringObject = parsedUrl.query;

    //get the http method
    const method = req.method.toLowerCase();

    //get the query params
    const queryParams = parsedUrl.query;

    //get the request headers
    const headers = req.headers;

    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();

        //choose the handler this request should go to. If not choose notFound handler
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notfound;

        let data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'trimmedPath': trimmedPath,
            'method': method,
            'payload': helpers.parseJsonToObject(buffer),
        }; 

        //Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) => {
            //use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            //use the payload called back by the handler, or default to empty object
            payload = typeof(payload) == 'object' ? payload : {};

            //convert the payload to a stirng
            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            //Send the response
            res.end(payloadString);

            //Log the request path
            console.log('Returning response: ', statusCode, payloadString);
        });
    });
});

//router
const router = {
    'ping': handlers.ping,
    'users': handlers.users
};