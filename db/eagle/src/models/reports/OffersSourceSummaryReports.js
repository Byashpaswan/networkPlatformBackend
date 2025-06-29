const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:SourceAdvAffSummary");
const objectIdType = Mongoose.Schema.Types.ObjectId;
// require("mongoose-double")(Mongoose);
const DoubleType = Mongoose.Schema.Types.Decimal128;
 
const OffersSourceSummaryReports = Mongoose.Schema(
  {
    N_id: {
      type: objectIdType,
      required: true,
    },
    nid: {
      type: Number
    },
    oName: {
      type: String,
    },
    app : {
      type : String,
    },
    lead : {
      type : Number,
    },
    oId: {
      type: objectIdType,
      required: true,
    },
    AdOId: {
      type: String,
    },
    source: { // optional
      type: String,
      // required: true,
    },
    // A_id: { // optional
    //   type: objectIdType,
    //   required: true,
    // },
    aid: {
      type: Number
    },
    pid: {
      type: Number
    },
    click: {
      type: Number,
      default: 0,
    },
    conv: {
      type: Number,
      default: 0,
    },
    pConv: {
      type: Number,
      default: 0,
    },
    hConv : {
      type : Number,
      default : 0
    },
    rev: {
      type: DoubleType,
      default: 0,
    },
    hRev: {
      type: DoubleType,
      default: 0,
    },
    pay: {
      type: DoubleType,
      default: 0,
    },
    hpay: {
      type: DoubleType,
      default: 0,
    },
    coin: {
      type: String
    },
    pPay: {
      type: DoubleType,
      default: 0,
    },
    slot: {
      type: Date,
    },
    dDConv:{
      type:Number
    },
    dDAmt:{
      type:Number
    },
    pAmt:{
      type:Number,
    },
    // pConv:{
    //   type:Number
    // },
    // aConv:{
    //  type:Number
    // },
    // aPmt:{
    //   type:Number
    // },
    // conf:{
    //   type:Boolean
    // }
  },
  {
    timestamps: true,
  }
);
 
OffersSourceSummaryReports.index(
  {
    network_id: 1,
    timeSlot: 1,
    offer_id: 1,
    advertiser_id: 1,
    publisher_id: 1,
    source: 1,
  },
  { unique: true }
);
module.exports = OffersSourceSummaryReports;