const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:PlatformAccount");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const KeyValuePair = Mongoose.Schema(
  {
    key: {
      type: String
    },
    val: {
      type: String
    },
    used_at: {
      type: String
    }
  },
  {
    _id: false
  }
);

// const ParametersPairs = Mongoose.Schema({
//   parameter:{
//     type:String,
//   },
//   val:{
//     type:String,
//   },
// },{
//   _id:false,
// });

const PlatformAccount = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true
    },
    nid: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    platform_name: {
      type: String
    },
    platform_id: {
      type: objectIdType
    },
    plty: {
      type: Number
    },
    login_link: {
      type: String
    },
    email: {
      type: String
    },
    status: {
      type: String,
      description: 'status of platform account '
    },
    credentials: {
      type: [KeyValuePair]
    },
    parameters: {
      type: String
    },
    advertiser_id: {
      type: objectIdType,
      required: true
    },
    advertiser_name: {
      type: String,
      required: true
    },
    aid: {
      type: Number,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    apiStatus: {
      type: String,
      required: true,
      description: 'status of api and its credentials, (for example: if apikey key expires, the apistatus will be inactive)'
    },
    payout_percent: {
      type: String,
      required: true,
      description: 'this percentage of offer payout will be available for publisher'
    },
    // offer_live_type:{
    //   type:String,
    //   required: true,
    //   enum: ['manual_offer_live', 'all_offer_live','working_offer_live'],
    //   description: 'auto setting by which offer will be live for publisher'
    // },
    sample_tracking: {
      type: String,
      required: true,
      description: 'sample tracking link to validate the api credentials(by matching tracking link to the api response)'
    },
    offer_visibility_status: {
      type: String,
      enum: ['approval_required', 'private', 'public'],
      description: 'auto visibility status of offer for the publisher'
    },
    visibilityUpdate: {
      type: Boolean,
      default: false
    },
    publishers: {
      type: [],
      description: 'list of the publisher for which auto live offer setting is to be used (either all or list of pub_id)'
    },
    domain: {
      type: [],
      default: []
    },
    autoFetch: {
      type: Boolean,
      default: true
    },
    autoApply: {
      type: Boolean,
      default: true
    },
    payCal:{
      type : String
    },
    comments : {
      type : String
    }
  },
  {
    timestamps: true
  }
);

PlatformAccount.index({ network_id: 1, advertiser_id: 1, status: 1 });
PlatformAccount.index({ platform_id: 1 });

module.exports = PlatformAccount;
