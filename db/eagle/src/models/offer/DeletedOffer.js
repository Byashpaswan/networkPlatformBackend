const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Decimal128;
const OfferCapping = require("./Capping");
const Goal = require("./Goals");
const Creative = require("./Creative");
const { config } = require("../../constants/index");
const { DeviceTargeting, GeoTargeting } = require("./Targeting");
const { getConstLabel, getConstValue } = require("../../helper/Util");

const isValidPlatform = function () {
  return typeof this.advertiser_platform_id === null || Mongoose.Types.ObjectId.isValid(this.advertiser_platform_id) ? true : false;
};

const PUBLISHER_OFFER_TYPE = Mongoose.Schema({
  publisher_id: {
    type: Number
  },
  publisher_offer_status_label: {
    type: String,
    enum: getConstLabel(config.OFFERS_STATUS),
  },
  publisher_offer_status: {
    type: Number,
    enum: getConstValue(config.OFFERS_STATUS),
  },
  publisher_payout_percent: {
    type: Number,
  }
});

const NESTED_ENUM_TYPE = Mongoose.Schema({
  enum_type: {
    type: String,
    enum: config.OFFERS_REVENUE_TYPE,
    description: "type from our list"
  },
  offer_type: {
    type: String,
    default: "",
    description: "type from offer(network)"
  }
});

const DeletedOffers = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true
    },
    nid: {
      type: Number
    },
    category: {
      type: [String],
    },
    advertiser_offer_id: {
      type: String,
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
    },
    thumbnail: {
      type: String,
    },
    offer_name: {
      type: String,
    },
    description: {
      type: String,
    },
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
    },
    start_date: {
      type: Date
    },
    end_date: {
      type: Date
    },
    currency: {
      type: String,
    },
    revenue: {
      type: DoubleType,
    },
    revenue_type: {
      type: NESTED_ENUM_TYPE
    },
    payout: {
      type: DoubleType,
    },
    payout_type: {
      type: NESTED_ENUM_TYPE
    },
    approvalRequired: {
      type: Boolean,
    },
    isCapEnabled: {
      type: Boolean,
    },
    offer_capping: {
      type: OfferCapping
    },
    isTargeting: {
      type: Boolean,
    },
    isgoalEnabled: {
      type: Boolean,
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
    offer_visible: {
      type: String,
      enum: getConstLabel(config.OFFER_VISIBILITY),
    },
    status_label: {
      type: String,
      enum: getConstLabel(config.OFFERS_STATUS),
    },
    status: {
      type: Number,
      enum: getConstValue(config.OFFERS_STATUS),
    },
    publisher_offers: {
      type: [PUBLISHER_OFFER_TYPE],
    },
    offer_hash: {
      type: String,
      required: true
    },
    version: {
      type: Number,
    },
    isApiOffer: {
      type: Boolean,
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
      description: '{1:apiOfferLive, 0: frontEndOfferLive}'
    },
    app_id: {
      type: String,
      default: ''
    },
    isMyOffer: {
      type: Boolean,
    },
    isPublic: {
      type: Boolean,
    },
    adv_platform_payout_percent: {
      type: Number,
    },
    isScraped: {
      type: Boolean,
    },
    isBlacklist: {
      type: Number,
    }
  },
  {
    timestamps: true
  }
);

//module.exports= Mongoose.model('offers', Offers);
module.exports = DeletedOffers;
