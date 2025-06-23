const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Targeting");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { config } = require('../../constants/index');
const { getConstValue } = require('../../helper/Util');
const OS_VERSION_TYPE = Mongoose.Schema({
  os: {
    type: String,
    enum: config.OS,
    default: 'unknown',
    required: true
  },
  version: {
    type: String,
    required: true
  },
  version_condition: {
    type: String,
    enum: getConstValue(config.VERSION_CONDITION),
    required: true
  }
}, {
  _id: false
});

exports.KEY_VALUE_TYPE = Mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  }
})

exports.GeoTargeting = Mongoose.Schema({
  country_allow: {
    type: [this.KEY_VALUE_TYPE],
  },
  country_deny: {
    type: [this.KEY_VALUE_TYPE],
  },
  city_allow: {
    type: [this.KEY_VALUE_TYPE],
  },
  city_deny: {
    type: [this.KEY_VALUE_TYPE],
  },
}, {
  _id: false
});

exports.DeviceTargeting = Mongoose.Schema({
  device: {
    type: [String],
    enum: config.DEVICE,
    default: 'unknown'
  },
  os: {
    type: [String],
    enum: config.OS,
    default: 'unknown'
  },
  os_version: {
    type: [OS_VERSION_TYPE],
  }

}, {
  _id: false,
});
