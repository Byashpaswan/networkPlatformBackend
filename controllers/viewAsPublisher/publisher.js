const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Publisher");
const mongooseObjectId = Mongoose.Types.ObjectId;
const PublisherModel = require('../../db/publisher/Publisher');
const Response = require('../../helpers/Response');
const Function = require('../../helpers/Functions');
const { payloadType } = require('../../constants/config');
const rolesObj = require('../../db/Roles');


exports.roles = async () => {
  query = { name: 'affiliate_admin' };
  data = {};
  roles = await rolesObj.isRoleExists(query, data);
  if (roles) {
    return roles;
  } else {
    return null;
  }
}

exports.createCredentials = (req, res) => {
  let filter = {};
  if (req.params.id && req.params.id != 'undefined') {
    id = req.params.id;
  } else {
    id = req.loginId;
  }
  if (id && mongooseObjectId.isValid(id.trim())) {

    filter = { _id: mongooseObjectId(id) }
    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);

    projection = { name: 1, company: 1, api_details: 1 };

    PublisherModel.findPublisher(filter, projection).then(result => {
      if (!result[0]) {
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.msg = "no publisher found";
        return res.status(200).send(response)
      }
      if (!result[0].api_details || !result[0].api_details.secret_key) {
        apiKey = Function.Salt(40);
        secreatKey = Function.hashFunction(req.user.userDetail.id);
        query = {
          "api_details": {
            api_key: apiKey,
            secret_key: secreatKey
          }
        }
        PublisherModel.updateCredentials(filter, query).then(data => {
          let response = Response.success();
          response.payloadType = payloadType.object;
          response.payload = {};
          response.payload = data;
          response.msg = "successfully updated publisher";
          return res.status(200).send(response)
        }).catch(err => {
          let response = Response.error();
          response.error = [err.message];
          response.msg = "error while updating publisher "
          return res.status(400).json(response);
        })
      } else {
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.payload = result[0];
        response.msg = "successfully find publisher";
        return res.status(200).send(response)
      }
    }).catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "error while getting publisher "
      return res.status(400).json(response);
    })
  } else {
    let response = Response.error();
    response.error = [];
    response.msg = "Invalid Request"
    return res.status(400).json(response);
  }
}


exports.updateCredentials = (req, res) => {
  let filter = {};
  if (req.params.id && mongooseObjectId.isValid(req.params.id.trim())) {
    filter = {
      _id: req.params.id
    };
    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    apiKey = Function.Salt(40);
    query = {
      "api_details.api_key": apiKey
    }
    PublisherModel.findAndUpdatePublisher(filter, query).then(data => {
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.payload = {};
      data.api_details['api_key'] = apiKey;
      response.payload = data;
      response.msg = "successfully updated credentials";
      return res.status(200).send(response)
    }).catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "error while updating publisher "
      return res.status(400).json(response);
    })
  } else {
    let response = Response.error();
    response.error = [];
    response.msg = "Invalid Request"
    return res.status(400).json(response);
  }
}

exports.getPublisherDetails = async (req, res) => {
  let publisherDetails = await PublisherModel.searchOnePublisher({
    _id: req.body.pubObjId
  }, {})
  let response = Response.success();
  response.payloadType = payloadType.object;
  response.payload = {};
  response.payload = publisherDetails;
  response.msg = "data fetched";
  return res.status(200).send(response)
}


