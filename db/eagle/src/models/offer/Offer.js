const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Advertiser");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const mongooseAutoIncrement = require("mongoose-auto-increment");
// require("mongoose-double")(Mongoose);
const DoubleType = Mongoose.Schema.Types.Decimal128;
const Config = require("../../constants/Config");
const OfferCapping = require("./Capping");
const Goal = require("./Goals");
const { DeviceTargeting, GeoTargeting } = require("./Targeting");
const Creative = require("./Creative");
const { getConstLabel, getConstValue } = require("../../helper/Util");

const isValidPlatform = function () {
  return typeof this.advertiser_platform_id === null || Mongoose.Types.ObjectId.isValid(this.advertiser_platform_id) ? true : false;
};

//test
const PUBLISHER_OFFER = Mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  pay: {
    type: Number,
    // required: true
  },
  pubOffSt: {
    type: Number,
    enum: getConstValue(Config.PUBLISHER_OFFERS_STATUS),
  }
}, {
  _id: false
});

const PUBLISHER_OFFER_TYPE = Mongoose.Schema({
  publisher_id: {
    type: Number
  },
  publisher_offer_status_label: {
    type: String,
    default: Config.OFFERS_STATUS.no_link.label,
    enum: getConstLabel(Config.OFFERS_STATUS),
    required: true
  },
  publisher_offer_status: {
    type: Number,
    default: Config.OFFERS_STATUS.no_link.value,
    enum: getConstValue(Config.OFFERS_STATUS),
    required: true
  },
  publisher_payout_percent: {
    type: Number,
    required: true
  }
}, {
  _id: false
});

const NESTED_ENUM_TYPE = Mongoose.Schema({
  enum_type: {
    type: String,
    enum: Config.OFFERS_REVENUE_TYPE,
    required: true,
    default: "unknown",
    description: "type from our list"
  },
  offer_type: {
    type: String,
    required: false,
    default: "",
    description: "type from offer(network)"
  }
}, {
  _id: false
});

const Offers = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true
    },
    nid: {
      type: Number,
      required: true
    },
    category: {
      type: [String],
      required: false,
      default: null
    },
    advertiser_offer_id: {
      type: String,
      required: false,
      default: null
    },
    platform_id: {
      type: objectIdType,
      required: isValidPlatform
    },
    plty: {
      type: Number
    },
    platform_name: {
      type: String,
      required: isValidPlatform
    },
    advertiser_id: {
      type: objectIdType,
      required: true
    },
    aid: {
      type: Number,
      required: true
    },
    advertiser_name: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String
    },
    offer_name: {
      type: String,
      required: false
    },
    //Todo : html content may come
    description: {
      type: String
    },
    //Todo : html content may come
    kpi: {
      type: String
    },
    preview_url: {
      type: String
    },
    tracking_link: {
      type: String
    },
    expired_url: {
      type: String
    },
    redirection_method: {
      type: String,
      enum: Config.REDIRECT_METHOD,
      default: 'javascript_redirect'
    },
    //Todo: redirection in case of invalid click
    //redirect_offer:{
    //  type :
    //},
    start_date: {
      type: Date
    },
    end_date: {
      type: Date
    },
    currency: {
      type: String,
      required: true
    },
    revenue: {
      type: DoubleType,
      default: 0
    },
    revenue_type: {
      type: NESTED_ENUM_TYPE
    },
    payout: {
      type: DoubleType,
      default: 0
    },
    payout_type: {
      type: NESTED_ENUM_TYPE
    },
    approvalRequired: {
      type: Boolean,
      default: false
    },
    isCapEnabled: {
      type: Boolean,
      required: true,
      default: false
    },
    offer_capping: {
      type: OfferCapping
    },

    isTargeting: {
      type: Boolean,
      required: true,
      default: false
    },
    isgoalEnabled: {
      type: Boolean,
      required: true,
      default: false
    },
    geo_targeting: {
      type: GeoTargeting
    },
    device_targeting: {
      type: DeviceTargeting
    },
    creative: {
      type: [Creative]
    },
    goal: {
      type: [Goal]
    },
    //Todo: private
    offer_visible: {
      type: String,
      enum: getConstLabel(Config.OFFER_VISIBILITY),
      required: true
    },
    status_label: {
      type: String,
      default: Config.OFFERS_STATUS.no_link.label,
      enum: getConstLabel(Config.OFFERS_STATUS),
      required: true
    },
    status: {
      type: Number,
      default: Config.OFFERS_STATUS.no_link.value,
      enum: getConstValue(Config.OFFERS_STATUS),
      required: true
    },
    // pubOff :- offers assign to publisher
    pubOff: {
      type: [PUBLISHER_OFFER],
      default: []
    },
    publisher_offers: {
      type: [PUBLISHER_OFFER_TYPE],
      default: []
    },
    offer_hash: {
      type: String,
      required: true
    },
    version: {
      type: Number,
      required: true,
      default: 0
    },
    // apiLiveId: {
    //   type: objectIdType,
    //   default: null
    // },
    isApiOffer: {
      type: Boolean,
      required: true,
      default: false
    },
    advertiser_platform_id: {
      type: objectIdType,
      default: null
    },
    plid: {
      type: Number
    },
    liveType: {
      type: Number,
      default: 0,
      description: '{1:apiOfferLive, 0: frontEndOfferLive}'
    },
    app_id: {
      type: String,
      default: ''
    },
    isMyOffer: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    adv_platform_payout_percent: {
      type: Number,
      default: 100
    },
    isScraped: {
      type: Boolean,
      default: false,
    },
    isBlacklist: {
      type: Number,
      default: 0
    },
    adv_off_hash: {
      type: String,
    },
    wTime: {
      type: Date,
      description: "Working time of offer"
    },
    ewt: {
      type: Number,
      description: "Expexted Working Time"
    },
    jumps: {
      type: Number,
      description: "redirection count of offer"
    },
    comments : {
      type : String,
    },
    adv_status : {
      type : Number, // update advertisers offer status.
      default: Config.ADVERTISER_OFFER_STATUS.no_link.value,
      enum: getConstValue(Config.ADVERTISER_OFFER_STATUS),
    },
    syncTime:{
      type : Date,
  },
  appliedTime : {
    type : Date,
  }
},
  {
    timestamps: true
  }
);

//Offers.index({ network_id: 1, advertiser_id:1, status: 1 });
Offers.index({ advertiser_offer_id: 1 });
Offers.index({ platform_id: 1 });
Offers.index({ offer_name: "text" });
Offers.index({ revenue_type: 1 });
Offers.index({ offer_visible: 1 });
Offers.index({ "network_id": 1, "updatedAt": -1, "status": 1, "advertiser_offer_id": 1, "platform_id": 1, "advertiser_id": 1, "isMyOffer": 1, "offer_visible": 1 });

//module.exports= Mongoose.model('offers', Offers);
module.exports = Offers;
