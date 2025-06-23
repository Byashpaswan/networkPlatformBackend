const express = require('express');
const route = express.Router();
const debug = require('debug')('darwin:router:AllAppIdReportRouter');

const authentication = require('../../helpers/Auth');
const applyAppidsByJumbo = require("../../scripts/applyAppidsByJumbo")
const AppIdReport = require('../../controllers/allAppIdReport');
const PublisherController = require('../../controllers/publisher/Publisher');
const ApplicationStatus = require('../../controllers/applicationStatus/applicationStatus') ;
route.use(authentication.authenticationApiToken);

route.post('/get/all/app_ids/', AppIdReport.getAppIdReport);
route.post('/get/all/conversions/', AppIdReport.getConversions);

// For jumbo
route.post('/get/all/appids/', AppIdReport.getAppIdPublisherReport);
route.post('/get/all/appids/gross', AppIdReport.getAppIdPublisherGrossReport);
route.post('/get/all/conversions/jumbo', AppIdReport.getConversionsForJumbo);
route.post('/get/all/conversions/jumbo/dashboard', AppIdReport.getConversionsForJumboDashboard);
route.post('/get/all/publisher/', PublisherController.getAllPublisherByNetwork);
route.get('/get/webhook/count', AppIdReport.webhookPushedOfferCount);
route.post('/get/app/sources', AppIdReport.getAppSources);
route.get('/get/app-details', AppIdReport.getAppDetails);
route.post('/get/all/conversions/jumbos', AppIdReport.getAppIdPublisher);
route.get('/get/applicationstatus' , ApplicationStatus.getAppDetails ) ;
 
// for apply and pushToWebhook selected aap_ids and network from  jumbo.
route.post('/applyAndPushToWebhook/AllAppids/jumbo' , applyAppidsByJumbo.applyAndPushToWebhookFromJumbo );

module.exports = route;