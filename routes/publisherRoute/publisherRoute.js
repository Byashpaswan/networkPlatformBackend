const express = require('express');
const route = express.Router();
const debug = require('debug')('darwin:router:publisherRouter');
const Publisher = require('../../controllers/publisher/Publisher');
const publisherValidator = require('../../validations/publisherValidation');
const inviteLink = require('../../controllers/invitelink');
const Functions=require('../../helpers/Functions')


route.post('/add', Publisher.saveExternalPublisher);
route.get('/valid_token', inviteLink.validateToken)
route.post('/save', Functions.upload.array('file', 2) ,Publisher.register);

module.exports = route;