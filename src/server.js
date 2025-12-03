require('dotenv').config();
const express = require('express');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mysql = require("mysql2");
let ejs = require('ejs');
const path = require('path');

// MySQL Server Authentication guides. Please acquire a .env from server.
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
        rejectUnauthorized: false // Because I can't find the CA File to embed. Crazy hack indeed
    }
}).promise();


// Create Express app
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));
// Set EJS as the view engine
app.set('view engine', 'ejs');


// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Middleware to check if user is NOT authenticated (for login/register pages)
const isNotAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return next();
    }
    res.redirect('/summary');
};


// Serve assets
app.use('/assets', express.static('assets'));
app.get("/style/main.css", function(req, res){
    res.sendFile(__dirname + "/style/main.css");
})
// Serve Bootstrap CSS
app.use('/dist/bootstrap/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')));
app.use('/dist/bootstrap/js', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/js')));
app.use('/dist/bootstrap-icons/fonts', express.static(path.join(__dirname, '../node_modules/bootstrap-icons/font/')));

// Specify the directory where your EJS template files are located
app.set('views', path.join(__dirname, 'views'));

// Helper function to pass authentication data to baseof template
const renderPage = (req, res, viewName, pageTitle, pageData = {}) => {
    res.render(viewName, { title: pageTitle, data: pageData }, (err, pageContent) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error rendering page');
        }
        res.render('baseof', { 
            title: pageTitle, 
            body: pageContent,
            isAuthenticated: !!req.session.userId,
            username: req.session.username
        });
    });
};


// Home page route. will show summary if authenticated, 
// will show default home when not authenticated. 
app.get('/', (req, res) => {
    const pageTitle = 'Home';
    const pageData = {
        username: req.session.username
    };
    renderPage(req, res, 'index', pageTitle, pageData);
});

// Routes to render /login page
app.get('/login', isNotAuthenticated, (req, res) => {
    const pageTitle = 'Login';
    const pageData = {
        errorMessage: null,
        successMessage: null
    }
    renderPage(req, res, 'login', pageTitle, pageData);
});

// Routes to render /register page
app.get('/register', isNotAuthenticated, (req, res) => {
    const pageTitle = 'Register';
    const pageData = {
        errorMessage: null,
        successMessage: null
    }
    renderPage(req, res, 'register', pageTitle, pageData);
});


// POST route for login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const pageTitle = 'Login';
    const pageData = {
        errorMessage: null,
        successMessage: null
    };

    try {
        // Query database for user with matching credentials
        const [users] = await db.query(
            `SELECT * FROM user WHERE username = ? AND password = ?`,
            [username, password]
        );

        if (users.length === 0) {
            pageData.errorMessage = "Invalid username or password!";
            return renderPage(req, res, 'login', pageTitle, pageData);
        }

        // User found - store user info in session
        req.session.userId = users[0].uid;
        req.session.username = users[0].username;
        
        // Redirect to summary page
        return res.redirect('/');

    } catch (err) {
        console.error("Database error:", err);
        pageData.errorMessage = "Database error!";
        return renderPage(req, res, 'login', pageTitle, pageData);
    }
});


app.post('/register', async (req, res) => {
    const { username, name, email, password } = req.body;

    const pageTitle = 'Register';
    const pageData = {
        errorMessage: null,
        successMessage: null
    };

    try {
        // Insert into correct columns (uid auto-incremented)
        await db.query(
            `INSERT INTO user (username, name, email, password)
             VALUES (?, ?, ?, ?)`,
            [username, name, email, password]
        );

        pageData.successMessage = "User registered successfully!";

        return renderPage(req, res, 'register', pageTitle, pageData);

    } catch (err) {
        console.error("Database error:", err);

        if (err.code === "ER_DUP_ENTRY") {
            pageData.errorMessage = "Username or email is already registered!";
            return renderPage(req, res, 'register', pageTitle, pageData);
        }

        pageData.errorMessage = "Database error!";
        return renderPage(req, res, 'register', pageTitle, pageData);
    }
});


// Summary page (protected - requires authentication)
app.get('/summary', isAuthenticated, (req, res) => {
    const pageTitle = 'Summary';
    const pageData = {
        username: req.session.username
    };
    
    renderPage(req, res, 'summary', pageTitle, pageData);
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login');
    });
});











// Run server
app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});