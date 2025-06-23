const express = require('express');
const route = express.Router();
const PublisherApi = require("../../publisherApi/v0/api");
const CheckCredentials = require("../../helpers/checkApiCredentials");

route.get('/offers/v2', CheckCredentials.checkCredentials, PublisherApi.getAffOffers);
route.get('/offers/:offerType', CheckCredentials.checkCredentials, PublisherApi.getPublisherOffers);

module.exports = route;