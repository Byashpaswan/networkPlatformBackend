const express = require('express');
const indexRouter = express.Router();
const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const debug = require('debug')('darwin:routers:Index');
const apiRouter = require('./api/ApiRouter');
const authRouter = require('./auth/AuthRouter');
const UserRouter = require('./user/Users');
const NetworkRouter = require('./network/apiRoutes');
const PublisherRouter = require('./publisher/publisherRoute');
const IntegrationRouter = require('./integration/IntegrationRouter');
const publisher = require('../routes/publisherRoute/publisherRoute');
const Advertiser = require('../routes/advertiserRoute/advertiserRoute');
const AllAppIdReportRouter = require('../routes/allAppIdReport/AllAppIdReportRouter');
// script for storing currencies
// var curr = require("../scripts/currency");
// indexRouter.get('/setCurr',curr.saveCurrency);
const chatRouter=require('./chatSupports/chatSupport')


indexRouter.use('/user', UserRouter);
indexRouter.use('/network', NetworkRouter);
indexRouter.use('/publisher', PublisherRouter);
indexRouter.use('/api', apiRouter);
indexRouter.use('/integration', IntegrationRouter);
indexRouter.use('/report', AllAppIdReportRouter);
indexRouter.use('/chat', chatRouter);

// **external page link for registerPublisher
indexRouter.use('/registerPublisher', publisher)

// **external page link for registerAdvertiser
indexRouter.use('/registerAdvertiser', Advertiser)

apiRouter.all('/*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Method', 'GET,POST,PUT,OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  next();
})
indexRouter.use('/auth', authRouter);
// (req,res)=>{
//   // console.log('abc');
//   // res.send('hello');
///network/v1/publisher/get-offers

indexRouter.get("/", (req, res) => {
  let response = Response.success();
  response.payloadType = payloadType.boolean
  debug(response);
  return res.status(200).json(response);
});

indexRouter.get("/health-check", (req, res) => {
  // let response = Response.success();
  // response.payloadType = payloadType.boolean
  // debug(response);
  return res.status(200).send("ok");
});



module.exports = indexRouter;



