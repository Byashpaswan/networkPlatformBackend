const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Double;

const ConversionFailedLog = Mongoose.Schema(
  {
    network_id: {
      type: String
    },
    click_id: {
      type: String
    },
    request_ip: {
      type: String
    },
    useragent: {
      type: String
    },
    requested_url: {
      type: String
    },
    referral_url: {
      type: String
    },
    offer_id: {
      type: String
    },
    publisher_id: {
      type: String
    },
    advertiser_id: {
      type: objectIdType
    },
    advertiser_name: {
      type: String,
    },
    remarks: {
      type: String
    },
    status: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

ConversionFailedLog.index({ network_id: 1, offer_id: 1, publisher_id: 1, click_id: 1 });

module.exports = ConversionFailedLog;
