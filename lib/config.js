/*
* Create and export configuration variables
*/
const environments = {};

//Staging
environments.staging = {
    'httpPort': 3030,
    'httpsPort': 3031,
    'envName': 'staging',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5
};

//Development
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisIsAlsoASecret',
    'maxChecks': 5
};

//Determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

//Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;