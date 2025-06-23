const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Conversion");
const objectIdType = Mongoose.Schema.Types.ObjectId;
require("mongoose-double")(Mongoose);
const mongooseObjectId = Mongoose.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Double;

const NESTED_GOALS = Mongoose.Schema({
goal: {
type: String,
required: true,
description: "goal name or goal id received from postback"
},
offer_goal_id: {
type: String,
required: true,
description: "goal id in offer goal"
},
offer_goal_name: {
type: String,
required: true,
description: "goal name in offer goal"
},
goal_data: {
type: String,
required: false,
default: "",
description: "goal value"
},
goal_url: {
type: String,
required: true,
description: "goal postback url"
},
conv_goal_payout: {
type: Number,
default: 0,
description: "goal payout received during goal postback"
},
offer_goal_payout: {
type: Number,
default: 0,
description: "goal payout received during offer goals"
}
});

const Conversion = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true
    },
    nid: {
      type: Number,
    },
    offer_id: {
      type: objectIdType,
      required: true
    },
    offer_name: {
      type: String,
      required: true
    },
    app_id: {
      type: String,
      default: ''
    },
    publisher_id: {
      type: Number,
      required: true
    },
    pid: {
      type: Number
    },
    goal_id: {
      type: Number
    },
    advertiser_id: {
      type: objectIdType,
      required: true
    },
    aid: {
      type: Number
    },
    advertiser_name: {
      type: String,
      default: ''
    },
    advertiser_offer_id: {
      type: String,
    },
    publisher_name: {
      type: String,
      default: ''
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
    aff_source: {
      type: String
    },
    payout_click: {
    type: DoubleType
    },
    revenue_click: {
      type: DoubleType
    },
    click_time: {
      type: Date
    },
    click_ip: {
      type: String
    },
    click_id: {
      type: String,
      required: true
    },
    click_user_agent: {
      type: String
    },
    click_referrer: {
      type: String
    },
    click_url: {
      type: String
    },
    browser_name: {
      type: String
    },
    browser_version: {
      type: String
    },
    device_type: {
      type: String
    },
    device_id: {
      type: String
    },
    device_os: {
      type: String
    },
    device_os_version: {
      type: String
    },
    gaid: {
      type: String
    },
    ifa: {
      type: String
    },
    conv_ip: {
      type: String
    },
    conv_user_agent: {
      type: String
    },
    conv_referrer: {
      type: String
    },
    payout_conv: {
    type: DoubleType
    },
    revenue_conv: {
    type: DoubleType
    },
    ad_sub1: {
      type: String
    },
    ad_sub1: {
      type: String
    },
    ad_sub2: {
      type: String
    },
    ad_sub3: {
      type: String
    },
    ad_sub4: {
      type: String
    },
    ad_sub5: {
      type: String
    },
    ad_sub6: {
      type: String
    },
    ad_sub7: {
      type: String
    },
    status: {
      type: Number
    },
    status_remark: {
      type: String,
      description: 'response of postback url of publisher'
    },
    isValidCap: {
      type: String,     // important 
      required: true
    },
    conversion_url: {
      type: String
    },
    postback_url: {
      type: String,
      default: ''
    },
    ad_source: {
      type: String,
      // default:''
    },
    ad_ip: {
      type: String,
      // default: ''
    },
    ad_ins_time: {
      type: String,
      // default: ''
    },
    ad_currency: {
      type: String,
      // default: ''
    },
    goals_count: {
    type: Number,
    default: 0
    },
    goals: {
    type: [NESTED_GOALS],
    // default:[]
    },
    final_payout: {
      type: Number,
      default: 0,
      description: 'total payout including goal payouts and offer payout'
    },
    is_install: {
      type: Boolean,
      required: true,
      description: 'true if install postback is received, false if direct goal postback is received'
    },
    publisher_conversion: {
      type: Number,
      default: 0,
      enum: [0, 1]
    },
    pre_conversion: {
      type: Number,
      default: 0
    },
    publisher_payout: {
      type: Number,
      default: 0,
    },
    hold_revenue: {
      type: DoubleType,
      default: 0.0,
    },
    report: {
      type: Boolean,
      default: false
    },
    plid:{
      type:Number,
    },
    aPlId:{
      type:objectIdType
    },
    ad_payout: {
      type : Number , 

    }
  },
  {
    timestamps: true
  }
);



Conversion.index({
  network_id: 1,
  offer_id: 1,
  publisher_id: 1,
  creative_id: 1,
  goal_id: 1
});
Conversion.index({ status: 1 });
module.exports = Conversion;
