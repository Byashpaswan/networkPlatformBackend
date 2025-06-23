const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Platform");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { config } = require('../constants/index');
const { getConstLabel, getConstValue } = require('../helper/Util');

const Attribute = Mongoose.Schema({
  attr_name: {
    type: String,
    required: true,
  },
  attr_used_at: {
    type: String,
    enum: ['header', "query", "body", "host", "parm", 'not_required'],
    required: true,
  },
  attr_description: {
    type: String,
    required: true,
  }

}, {
  _id: false
});

const extraPara = Mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  val: {
    type: String,
    required: true,
  }
}, {
  _id: false
});

const Parameter = Mongoose.Schema({
  para_name: {
    type: String,
    required: true,
  },
}, {
  _id: false
});
const Platforms = Mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
  },
  endpoint: {
    type: String,
    required: true,
  },
  attribute: {
    type: [Attribute],
    required: true,
  },
  parameter: {
    type: [String],
    required: true,
  },
  extraPara: {
    type: [extraPara]
  },
  type: {
    type: String,
    required: true,
    enum: ['custom', 'standard']
  },
  refresh_time: {
    type: Number,
    required: true,
  },
  api_version: {
    type: String,
  },
  offer_id_type: {
    type: String,
    enum: ['integer', 'alphanumeric', 'unknown']
  },
  payCal : {
    type : String 
  } ,

}, {
  timestamps: true,
});

Platforms.index({ name: 1 }, { unique: true })

module.exports = Platforms;
