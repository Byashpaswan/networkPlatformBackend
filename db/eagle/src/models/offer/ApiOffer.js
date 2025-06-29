const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
// require("mongoose-double")(Mongoose);
const DoubleType = Mongoose.Schema.Types.Decimal128;
const { config } = require("../../constants/index");
const OfferCapping = require("./Capping");
const Goal = require("./Goals");
const { DeviceTargeting, GeoTargeting } = require("./Targeting");
const Creative = require("./Creative");
const { getConstLabel, getConstValue } = require("../../helper/Util");

const NESTED_ENUM_TYPE = Mongoose.Schema({
  enum_type: {
    type: String,
    enum: config.OFFERS_REVENUE_TYPE,
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
});

const ApiOffers = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
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
      required: true
    },
    platform_name: {
      type: String,
      required: true
    },
    advertiser_id: {
      type: objectIdType,
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
      required: true
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
      enum: config.REDIRECT_METHOD
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
      enum: getConstLabel(config.OFFER_VISIBILITY),
      required: true
    },
    status_label: {
      type: String,
      default: config.OFFERS_STATUS.no_link.label,
      enum: getConstLabel(config.OFFERS_STATUS),
      required: true
    },
    status: {
      type: Number,
      default: config.OFFERS_STATUS.no_link.value,
      enum: getConstValue(config.OFFERS_STATUS),
      required: true
    },
    offer_hash: {
      type: String,
      required: true
    },
    isLive: {
      type: Boolean,
      default: false,
      required: true
    },
    // LiveOfferId: {
    //   type: objectIdType,
    //   default: null
    // },
    advertiser_platform_id:{
        type: objectIdType,
        default:null
    },
    app_id: {
        type: String,
        default:''
    },
    isMyOffer:{
        type: Boolean,
        default: false,
    },
    isPublic:{
        type: Boolean,
        default: false,
    }
  },
  {
    timestamps: true
  }
);

//ApiOffers.index({ network_id: 1, advertiser_id:1, status: 1 });
ApiOffers.index({ advertiser_offer_id: 1 });
ApiOffers.index({ platform_id: 1 });
ApiOffers.index({ offer_name: "text" });
ApiOffers.index({ revenue_type: 1 });
ApiOffers.index({ offer_visible: 1 });
//ApiOffers.index({ network_id: 1, updatedAt: -1});
ApiOffers.index({ "network_id": 1, "updatedAt": -1, "status": 1, "advertiser_offer_id": 1, "platform_id": 1, "advertiser_id": 1, "isMyOffer": 1, "offer_visible": 1 });

//module.exports= Mongoose.model('apioffers', ApiOffers);
module.exports = ApiOffers;
