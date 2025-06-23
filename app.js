const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const cors = require('cors');
const compression = require('compression');
const csurf = require('csurf');
const helmet = require('helmet');
const { Server } = require('socket.io');
require('dotenv').config({
  path: '.env'
});
require('./db/connection');

// const csrfMiddleware = csurf({
//   cookie: true
// });

const routes = require('./routes');
// const index = require('./routes/index');
// const users = require('./routes/users');

const app = express();
app.use(helmet({
  dnsPrefetchControl: {
    allow: true
  }
}));
app.use(cors());
app.use(compression());


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '5mb' }));
//app.use(expressValidator());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(csrfMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

app.use(routes);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

app.use(function (err, req, res, next) {
  if (process.env.NODE_ENV === 'dev') {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'dev' ? err : {};
    res.status(err.status || 500);
    res.render('error');
  } else {
    res.status(err.status || 500).json({
      error: true,
      status: err.status || 500,
    });
  }
});


module.exports = app;
