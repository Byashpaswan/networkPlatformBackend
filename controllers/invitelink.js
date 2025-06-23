const crypto = require("crypto");
const { payloadType } = require('../constants/config');
const InviteLinkModel = require('../db/Invite/InviteLink');
const { urlencoded } = require('body-parser');
const Response = require('../helpers/Response');


exports.inviteLink = async (req, res) => {

  try {
    let tokenData = {
      network_id: req.user.userDetail.network[0],
      time: +new Date()
    }

    let hash = crypto.createHash("md5").update(JSON.stringify(tokenData)).digest("hex")
    let dbResult = await InviteLinkModel.saveDetails(
      { hash: encodeURIComponent(hash), network_id: req.user.userDetail.network[0] }
    );
    if (dbResult) {
      let response = Response.success();
      response['payload'] = encodeURIComponent(hash)
      return res.status(200).json(response);
    } else {
      let response = Response.success();
      response.msg = "Token Valid!"
      return res.status(200).json(response);
    }
  } catch (err) {
    console.log(err);
    let response = Response.error();
    response.msg = "Server internal error!"
    return res.status(200).json(response);
  }
}

exports.validateToken = async (req, res) => {

  try {
    if (!req.query.token) {
      let response = Response.error();
      response.msg = "Send valid token!"
      return res.status(400).json(response);
    }

    let dbResult = await InviteLinkModel.matchHash(
      { "hash": encodeURIComponent(req.query.token) }
    );
    if (!dbResult) {
      let response = Response.error();
      response.msg = "Invalid Token!"
      return res.status(200).json(response);
    } else {
      let response = Response.success();
      response.msg = "Token Valid!"
      return res.status(200).json(response);
    }
  } catch (error) {
    console.log(error)
    let response = Response.error();
    response.msg = "Internal server error!"
    return res.status(200).json(response);
  }
}
