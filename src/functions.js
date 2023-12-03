const { finnhubClient, db } = require('./setup');

// List of API routes and descriptions
function describeAPI(req, res) {
    const api_description = "Dive into the world of fantasy investing with FantasyInvestor. Hone your financial skills, explore diverse investment strategies, and make decisions without the risk of real money. Whether you're a seasoned investor or just starting, join us for a risk-free journey to elevate your investing game.";
    const routes = [
        { path: '/stock', method: 'GET', description: 'Displays stock information. The endpoint takes a query parameter symbol. For example: /stock?symbol=AAPL' },
        { path: '/buy', method: 'POST', description: 'Allows user to buy stock. The endpoint takes body parameters stock_symbol and quantity' },
        { path: '/sell', method: 'POST', description: 'Allows user to sell stock. The endpoint takes body parameters stock_symbol and quantity' },
        { path: '/register', method: 'POST', description: 'Registers a new user. The endpoint takes body parameters username and password' },
        { path: '/login', method: 'POST', description: 'Logs in user. The endpoint takes body parameters username and password' },
        { path: '/logout', method: 'POST', description: 'Logs out a user' },
        { path: '/status', method: 'GET', description: 'Checks users login status' },
        { path: '/user/balance', method: 'GET', description: 'Displays users balance' },
        { path: '/user/deposit', method: 'POST', description: 'Deposits funds to user account. The endpoint takes body parameter deposit' },
        { path: '/user/portfolio', method: 'GET', description: 'Displays users portfolio' },
        { path: '/user/transactions', method: 'GET', description: 'Displays user transactions. Optionally takes a query parameter transaction_type' },
        { path: '/user/profit', method: 'GET', description: 'Calculates users percentage gain' },
    ];

    res.status(200).json({ api_description, routes });
}

// Display stock information
function displayStock(req, res) {
    // Get query parameters
    const symbol = req.query.symbol;

    // Check if symbol is provided
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required in the query parameters' });
    }

    // Fetch stock information
    finnhubClient.quote(symbol, (error, data, response) => {
        if (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Construct JSON response
        const stockInfo = {
            "Symbol": symbol,
            "Current Price": data.c,
            "High price of the day": data.h,
            "Low price of the day": data.l,
            "Open price of the day": data.o,
            "Previous close price": data.pc
        };

        // Return JSON response
        res.status(200).json(stockInfo);
    });
}

// Allow user to buy stock
function buyStock(req, res) {
    // Get parameters
    const symbol = req.body.stock_symbol
    const quantity = req.body.quantity

    // Fetch current price of stock
    finnhubClient.quote(symbol, (err, data, response) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({error: 'Internal Server Error'});
        }

        const currentPrice = data.c;

        // Check if stock exists
        if (currentPrice === 0) {
            return res.status(400).json({message: 'Stock does not exist'});
        }

        // Total price of users purchase
        const totalPrice = parseFloat(quantity) * parseFloat(currentPrice);

        // Get the current date to store in db
        const currentDate = new Date().toISOString().split('T')[0];

        // Get users current balance
        db.query('SELECT balance FROM users WHERE username = ?', [req.session.user], (err, results) => {
            if (err) {
                console.error('Error getting users balance:', err);
                return res.status(500).json({error: 'Internal Server Error'});
            }
            else {
                const currentBalance = parseFloat(results[0].balance);

                // Check if user can afford to buy
                if (currentBalance >= totalPrice) {

                    // Subtract from users balance
                    db.query('UPDATE users SET balance = ? WHERE username = ?', [currentBalance - totalPrice, req.session.user], (err, updateResults) => {
                        if (err) {
                            console.error('Error subtracting from users account when buying stock:', err);
                            return res.status(500).json({error: 'Internal Server Error'});
                        }
                        else {

                            // Insert stock into users portfolio
                            db.query('INSERT INTO portfolios (user_id, stock_symbol, quantity, price, transaction_type, transaction_date) VALUES (?, ?, ?, ?, ?, ?)',
                                [req.session.userID, symbol, quantity, currentPrice, 'bought', currentDate], (error, results) => {
                                    if (error) {
                                        console.error('Error inserting bought stock to users account:', err);
                                        return res.status(500).json({error: 'Internal Server Error'});
                                    }
                                    else {
                                        return res.status(200).json({ message: 'Stock bought successfully' });
                                    }
                                })
                        }
                    })
                }
                else {
                    return res.status(500).json({error: 'User cannot afford to buy'});
                }
            }
        });
    })
}

// Allow user to sell stock
function sellStock(req, res) {
    // Get parameters
    const symbol = req.body.stock_symbol;
    const quantity = req.body.quantity;

    // Check if the user owns enough of the stock
    db.query('SELECT stock_symbol, SUM(quantity) as totalQuantity FROM portfolios WHERE user_id = ? GROUP BY stock_symbol HAVING stock_symbol = ? AND SUM(quantity) >= ?', [req.session.userID, symbol, quantity], (err, results) => {
        if (err) {
            console.error('Error checking if user owns stock:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Check if the user owns enough stock
        if (results.length > 0) {

            // Fetch current price of the stock
            finnhubClient.quote(symbol, (err, data, response) => {
                if (err) {
                    console.error('Error fetching stock price:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                const currentPrice = data.c;

                // Total price to deposit back to users account
                const totalPrice = parseFloat(quantity) * parseFloat(currentPrice);

                // Get the current date to store in db
                const currentDate = new Date().toISOString().split('T')[0];

                // Get user's current balance
                db.query('SELECT balance FROM users WHERE username = ?', [req.session.user], (err, results) => {
                    if (err) {
                        console.error('Error getting user balance:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }

                    const currentBalance = parseFloat(results[0].balance);

                    // Add to user's balance
                    db.query('UPDATE users SET balance = ? WHERE username = ?', [currentBalance + totalPrice, req.session.user], (err, updateResults) => {
                        if (err) {
                            console.error('Error updating user balance:', err);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }

                        // Remove stock from user's portfolio with a negative quantity
                        db.query('INSERT INTO portfolios (user_id, stock_symbol, quantity, price, transaction_type, transaction_date) VALUES (?, ?, ?, ?, ?, ?)',
                            [req.session.userID, symbol, -quantity, currentPrice, 'sold', currentDate], (error, results) => {
                                if (error) {
                                    console.error('Error updating portfolio:', error);
                                    return res.status(500).json({ error: 'Internal Server Error' });
                                }

                                return res.status(200).json({ message: 'Stock sold successfully' });
                            });
                    });
                });
            });
        } else {
            return res.status(400).json({ message: `User does not own ${quantity} shares of ${symbol}` });
        }
    });
}


// Register user
function registerUser(req, res) {
    // Get body parameters
    const username = req.body.username;
    const password = req.body.password;

    // Insert user into the database
    db.query('INSERT INTO users (username, password, balance) VALUES (?, ?, ?)', [username, password, 10000], (err, results) => {
        if (err) {
            console.error('Error registering user:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(200).json({ message: 'User registered successfully' });
    });
}

// Log user in (https://expressjs.com/en/resources/middleware/session.html)
function logInUser(req, res) {
    // Get body parameters
    const username = req.body.username;
    const password = req.body.password;

    // Check user credentials
    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) {
            console.error('Error logging in user:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // If user exists
        if (results.length > 0) {

            // Regenerate the session to guard against session fixation
            req.session.regenerate(function (err) {
                if (err) return next(err);

                // Store user information in the session
                req.session.user = results[0].username;
                req.session.userID = results[0].id;

                // Save the session before redirection
                req.session.save(function (err) {
                    if (err) return next(err);
                    res.status(200).json({ message: 'User logged in successfully' });
                })
            })
        }
    })
}

// Log user out (https://expressjs.com/en/resources/middleware/session.html)
function logOutUser(req, res) {
    // logout logic

    // clear the user from the session object and save.
    // this will ensure that re-using the old session id
    // does not have a logged in user
    req.session.user = null
    req.session.save(function (err) {
        if (err) next(err)

        // regenerate the session, which is good practice to help
        // guard against forms of session fixation
        req.session.regenerate(function (err) {
            if (err) next(err)
            res.status(200).json({ message: 'User logged out successfully' });
        })
    })
}

// Check user status
function checkUserStatus(req, res) {
    if (!req.session.user) {
        res.status(200).json({ message: 'User is not logged in' });
    }
    else {
        res.status(200).json({ message: `User logged in as ${req.session.user}` });
    }
}

// Check users balance
function checkUserBalance(req, res) {
    db.query('SELECT balance FROM users WHERE username = ?', [req.session.user], (err, results) => {
        if (err) {
            console.error('Error getting users balance:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.status(200).json({"Current balance": parseFloat(results[0].balance)});
    })
}

// Allow user to deposit money
function deposit(req, res) {
    // Get parameter
    const addedAmount = parseFloat(req.body.deposit);

    // Get users current balance
    db.query('SELECT balance FROM users WHERE username = ?', [req.session.user], (err, results) => {
        if (err) {
            console.error('Error getting users balance:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        else {
            const currentBalance = parseFloat(results[0].balance);

            // Update users balance
            db.query('UPDATE users SET balance = ? WHERE username = ?', [currentBalance + addedAmount, req.session.user], (err, updateResults) => {
                if (err) {
                    console.error('Error:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
                else {
                    res.status(200).json({message: 'Deposit successful'});
                }
            })
        }
    })
}

// Display users portfolio
function displayPortfolio(req, res) {
    db.query('SELECT stock_symbol, SUM(quantity) AS quantity FROM portfolios WHERE user_id = ? GROUP BY stock_symbol HAVING SUM(quantity) > 0', [req.session.userID], (err, results) => {
        if (err) {
            console.error('Error displaying users portfolio:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.length < 1) {
            return res.status(200).json({ message: 'User does not own any stocks' });
        }

        // Construct array of objects iterating over users stocks
        const portfolio = results.map(row => ({
            symbol: row.stock_symbol,
            quantity: row.quantity
        }))

        // Send the array of objects in the JSON response
        res.status(200).json(portfolio);
    })
}

// Display users transactions
function displayTransactions(req, res) {
    // Get query parameter
    let transactionType = req.query.transaction_type;

    // Query if parameter is not provided
    let query = 'SELECT stock_symbol, quantity, price, transaction_type, transaction_date FROM portfolios WHERE user_id = ?';

    // If parameter is provided display only provided transaction type
    if (transactionType) {
        query += ' AND transaction_type = ?';
    }

    db.query(query, [req.session.userID, transactionType], (err, results) => {
        if (err) {
            console.error('Error displaying users transactions:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Construct array of objects iterating over users stocks
            const transactions = results.map(row => ({
                symbol: row.stock_symbol,
                quantity: row.quantity,
                price: row.price,
                "Transaction type": row.transaction_type,
                "Transaction date": row.transaction_date
            }))

        // Send the array of objects in the JSON response
        res.status(200).json(transactions);
    })
}

// Calculate users percentage gain
function calculatePercentageGain(req, res) {

    // Calculate purchase price
    db.query('SELECT SUM(price * quantity) AS purchasePrice FROM portfolios WHERE user_id = ? AND transaction_type = "bought"', [req.session.userID], (err, results) => {
        if (err) {
            console.error('Error calculating purchase price:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        const purchasePrice = parseFloat(results[0].purchasePrice);

        // Calculate selling price
        db.query('SELECT SUM(price * -quantity) AS sellingPrice FROM portfolios WHERE user_id = ? AND transaction_type = "sold"', [req.session.userID], (err, results) => {
            if (err) {
                console.error('Error calculating selling price:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const sellingPrice = parseFloat(results[0].sellingPrice);

            // Calculate percentage gain
            const percentageGain = ((sellingPrice - purchasePrice) / purchasePrice) * 100;

            res.status(200).json({ percentageGain });
        });
    });
}
module.exports = { buyStock, sellStock, displayStock, registerUser, logInUser, logOutUser, checkUserStatus, checkUserBalance, deposit, displayPortfolio, displayTransactions, calculatePercentageGain, describeAPI };