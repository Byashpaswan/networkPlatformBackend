const express = require('express');
const route = express.Router();
const debug = require('debug')('darwin:router:publisherRouter');
const advertiser = require('../../controllers/advertiser/Advertiser');
const advertiserValidator = require('../../validations/advertiserValidation');
const inviteLink = require('../../controllers/invitelink');



const Functions = require("../../helpers/Functions");

route.post('/add', Functions.upload.array('file', 2), advertiser.saveExternalAdvertiser);

route.post('/valid_token', inviteLink.validateToken)


module.exports = route;
