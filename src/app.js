const express = require('express');
const cors = require('cors');
const session = require('express-session');
const routes = require('./routes');

const app = express();

// Set up middleware
app.use(cors());
app.use(express.json());

// Set up session middleware (https://expressjs.com/en/resources/middleware/session.html)
app.set('trust proxy', 1);
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

// Use your API routes
app.use('/fantasyInvestorAPI', routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/*
// Export the app
module.exports = app;

 */