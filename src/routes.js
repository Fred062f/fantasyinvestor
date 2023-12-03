const express = require('express');
const { displayStock, buyStock, sellStock, registerUser, logInUser, logOutUser, checkUserStatus, checkUserBalance, deposit, displayPortfolio, displayTransactions, calculatePercentageGain,
    describeAPI
} = require('./functions');

const router = express.Router();

// Define API routes
router.get('/', describeAPI);
router.get('/stock', displayStock);
router.post('/buy', buyStock);
router.post('/sell', sellStock);
router.post('/register', registerUser);
router.post('/login', logInUser);
router.post('/logout', logOutUser);
router.get('/status', checkUserStatus);
router.get('/user/balance', checkUserBalance)
router.post('/user/deposit', deposit);
router.get('/user/portfolio', displayPortfolio);
router.get('/user/transactions', displayTransactions);
router.get('/user/profit', calculatePercentageGain);

module.exports = router;