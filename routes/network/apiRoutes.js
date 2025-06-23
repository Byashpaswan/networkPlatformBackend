const express = require('express');
const route = express.Router();
const PublisherApi = require("../../publisherApi/v0/api");
const PublisherApplyApi = require("../../publisherApi/v0/apply");
const CheckCredentials = require("../../helpers/checkApiCredentials");
const conversionApi = require('../../conversionApi/api');
route.get('/v1/publisher/:offerType',CheckCredentials.checkCredentials,PublisherApi.getPublisherOffer);
route.get('/v1/publisher/apply/offers', CheckCredentials.checkCredentials, PublisherApplyApi.applyPublisherOffer);
route.get('/agent/conversion-pullback/date-wise', conversionApi.getDateWiseSourceReport);
route.post('/agent/conversion-pullback', conversionApi.getClickWiseSourceReport);
route.get('/v2/offers',CheckCredentials.checkCredentials,PublisherApi.fetchPublisherOffer);

module.exports = route;