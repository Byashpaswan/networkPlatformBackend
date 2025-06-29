const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:sendbox_clicklogs");
// require('mongoose-double')(Mongoose);
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Decimal128;
// const { config } = require("../constants/constants/index");
const Creative = require("./offer/Creative");
// const { getConstLabel, getConstValue } = require("../helpers/\");

const sendbox_clicklogs = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType
    },
    advertiser_id: {
      type: objectIdType,
      // required: true
    },
    link: {
      type: String
    },
    offer_id: {
      type: objectIdType,
      required: true
    },
    offer_name: {
      type: String,
      required: true
    },
    advertiser_name: {
      type: String,
      default: ''
    },
    publisher_name: {
      type: String,
      default: ''
    },
    publisher_id: {
      type: Number,
      required: true
    },
    // click_id: {
    //   type: String,
    //   // required: true
    // },
    // referer: {
    //   type: String
    // },
    user_agent: {
      type: String
    },
    ip: {
      type: String
    },
    source: {
      type: String
    },
    goal_id: {
      type: Number
    },
    creative_id: {
      type: String
    },
    aff_sub1: {
      type: String
    },
    aff_sub2: {
      type: String
    },
    aff_sub3: {
      type: String
    },
    aff_sub4: {
      type: String
    },
    aff_sub5: {
      type: String
    },
    aff_sub6: {
      type: String
    },
    aff_sub7: {
      type: String
    },
    // is_conversion: {
    //   type: Boolean,
    //   default: false,
    //   // required: true
    // },
    // is_mobile: {
    //   type: Boolean
    // },
    // is_bot: {
    //   type: Boolean
    // },
    // browser: {
    //   type: String
    // },
    // browser_version: {
    //   type: String
    // },
    // device_id: {
    //   type: String
    // },
    // device_version: {
    //   type: String
    // },
    // os: {
    //   type: String
    // },
    // platform: {
    //   type: String
    // },
    // is_duplicate: {
    //   type: Boolean
    // },
    payout: {
      type: DoubleType,
      default: 0
    },
    // revenue: {
    //   type: DoubleType,
    //   default: 0
    // },
    // advertiser_click_url: {
    //   type: String
    // },
    // conversion: {
    //   type: Number,
    //   default: 0
    // },
    // conv_payout: {
    //   type: DoubleType,
    //   default: 0
    // },
    // conv_revenue: {
    //   type: DoubleType,
    //   default: 0
    // },
    // pre_conversion: {
    //   type: Number,
    //   default: 0
    // },
    // app_id: {
    //   type: String,
    //   default: ""
    // }
  },
  {
    timestamps: true
  }
);

//sendbox_clicklogs.index({ click_id: 1 });
//sendbox_clicklogs.index({ network_id: 1, offer_id: 1, publisher_id: 1, click_id: 1, goal_id: 1, creative_id :1   })
sendbox_clicklogs.index({ network_id: 1, createdAt: -1, source: 1, is_conversion: 1, advertiser_id: 1, publisher_id: 1, aff_sub1: 1, aff_sub2: 1, aff_sub3: 1, aff_sub4: 1, aff_sub5: 1, aff_sub6: 1, aff_sub7: 1, offer_id: 1, click_id: 1 });
module.exports = sendbox_clicklogs;
