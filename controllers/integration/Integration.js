const Mongoose = require('mongoose');
const IntegrationModel = require('../../db/integration/Integration');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const mongooseObjectId = Mongoose.Types.ObjectId;
const jwt = require('jsonwebtoken');

exports.getIntegrations = (req, res) => {
    let filter = { "network_id": mongooseObjectId(req.user.userDetail.network[0]) };
    let projection = {};
    let options = {};
    IntegrationModel.getIntegrations(filter, projection, options)
        .then(async result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = result;
            response.msg = "Tokens fetched successfully!";
            return res.status(200).json(response);
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}

exports.getIntegrationByName = (req, res) => {
    let filter = {
        "network_id": mongooseObjectId(req.user.userDetail.network[0]),
        "integration_name": req.params.name
    };
    let projection = { "integration_name": 1 };
    IntegrationModel.getIntegrations(filter, projection)
        .then(async result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = result;
            response.msg = "Tokens fetched successfully!";
            return res.status(200).json(response);
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}

function parseDate(str) {
    var mdy = str.split('-');
    return new Date(mdy[0], mdy[1] - 1, mdy[2]);
}

function datediff(first, second) {
    return Math.round((first - second) / (1000 * 60 * 60 * 24));
}

exports.saveIntegration = (req, res) => {
    let tokenData = {
        "network_id": mongooseObjectId(req.user.userDetail.network[0]),
        "integration_name": req.body.integration_name
    };

    let expiry_date;
    let token;

    if (req.body.expiry_date) {
        let tokenLife = datediff(parseDate(req.body.expiry_date), new Date()) + "d";
        expiry_date = req.body.expiry_date;
        token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: tokenLife });
    } else {
        expiry_date = null;
        token = jwt.sign(tokenData, process.env.SECREAT_KEY, {});
    }

    let integration = {
        "network_id": mongooseObjectId(req.user.userDetail.network[0]),
        'integration_name': req.body.integration_name,
        'token': token,
        'status': req.body.status,
        'expiry_date': expiry_date
    }
    IntegrationModel.saveIntegration(integration)
        .then(async result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = result;
            response.msg = "Token created successfully!";
            return res.status(200).json(response);
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}

exports.updateIntegration = (req, res) => {
    let tokenData = {
        "network_id": mongooseObjectId(req.user.userDetail.network[0]),
        "integration_name": req.body.integration_name
    };

    let expiry_date;
    let token;

    if (req.body.expiry_date) {
        let tokenLife = datediff(parseDate(req.body.expiry_date), new Date()) + "d";
        expiry_date = req.body.expiry_date;
        token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: tokenLife });
    } else {
        expiry_date = null;
        token = jwt.sign(tokenData, process.env.SECREAT_KEY, {});
    }

    let filter = {
        "network_id": mongooseObjectId(req.user.userDetail.network[0]),
        "_id": req.body._id
    };

    let integration = {
        'integration_name': req.body.integration_name,
        'token': token,
        'status': req.body.status,
        'expiry_date': expiry_date
    }

    IntegrationModel.updateIntegration(filter, integration)
        .then(async result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = integration;
            response.msg = "Token updated successfully!";
            return res.status(200).json(response);
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}

exports.deleteIntegration = (req, res) => {
    let filter = {
        "network_id": mongooseObjectId(req.user.userDetail.network[0]),
        "_id": req.params._id
    };

    IntegrationModel.deleteIntegration(filter)
        .then(async result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = result;
            response.msg = "Token deleted successfully!";
            return res.status(200).json(response);
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}