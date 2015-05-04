// server.js
// set up ======================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');

//var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var cors = require('cors');
var http = require('http').Server(app);
var Q = require('q');
var async = require('async');

var configDB = require('./config/database.js');
// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// set up our express application
//app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Access-Control-Allow-Origin');
    res.header("Access-Control-Max-Age", "86400"); // 24 hours

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {res.send(200);
    }
    else {
        next();
    }
};

app.use(allowCrossDomain);
app.use(cors());
app.use(express.static('../client/www'));

require('./app/socketApi.js')(http);
require('./app/routes.js')(app);

http.listen(port, function(){
    console.log('listening on *:8080');
});

console.log('The magic happens on port ' + port);