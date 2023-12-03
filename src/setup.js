// Import libraries
const finnhub = require('finnhub');
const mysql = require('mysql2');

// Set up the Finnhub API key (https://finnhub.io/docs/api/quote)
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = "";
const finnhubClient = new finnhub.DefaultApi();

// Set up MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fantasy_investor',
});

// Export the setup function along with any necessary variables
module.exports = { finnhubClient, db };