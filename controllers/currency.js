const axios = require('axios');
const Mongoose = require('mongoose');
const { Currency } = require("../db/Model");
CurrencyModel = Mongoose.model('currency', Currency);
const Response = require('../helpers/Response');
const debug = require("debug")("darwin:Controller:Publisher");
const { payloadType } = require('../constants/config');



exports.ShowCurrency = (req, res) => {
  filter = {};
  projection = { currency: 1 };
    CurrencyModel.find(filter, projection)
      .then(result => {
        let response = Response.success();
        response.msg = "successfully got currencies";
        response.payloadType = payloadType.array;
        response.payload = result;
        return res.status(200).send( response )
      }).catch(err => {
        let response = Response.error();
          response.error = [err.message];
        response.msg = " error while getting currencies"
    return res.status(200).json(response);
        });
  };