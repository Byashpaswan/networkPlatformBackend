const Mongoose = require("mongoose");
const config = require("../../constants/Config");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const ClickFailed = Mongoose.Schema(
  {
    link: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      required: true,
      default: 1
    },
    status: {
      type: Number,
      enum: config.INVALID_CLICK_STATUS
    },
    remark: {
      type: String,
      required: true
    },
    network_id: {
      type: objectIdType,
      required: true
    },
    nid: {
      type: Number,
    },
    user_agent: {
      type: String,
      default: ''
    },
    ip_address: {
      type: String,
      default: ''

    },
    advertiser_id: {
      type: objectIdType,

    },
    aid: {
      type: Number
    },
    advertiser_name: {
      type: String,
      default: ''

    },
    pid: {
      type: Number,

    },
    publisher_name: {
      type: String,
      default: ''

    },
    offer_id: {
      type: String,
      default:''
    },
  },
  {
    timestamps: true
  }
);

ClickFailed.index({ status: 1 });
ClickFailed.index({ link: 1, status: 1 });
module.exports = ClickFailed;
