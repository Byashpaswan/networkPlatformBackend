const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Advertiser");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Double;
const mongooseObjectId = Mongoose.Types.ObjectId;
// const OfferCapping = require('./Capping');
// const { getConstLabel, getConstValue } = require('../helper/Util');
const Goal = Mongoose.Schema({
  // network_id: {
  //   type: objectIdType,
  //   required:true,
  // },
  goal_id:{
        type: String,
      default:''
  },
  name:{
    type:String,
      default: '',
  },
  type:{
      type: String,
      default: '',
  },
  description:{
      type: String,
      default: '',
  },
  tracking_link:{
    type:String,
      default: '',
  },
  // advertiser_id:{
  //   type:String,
  //   required: true,
  // },
  status:{
    type:String,
      default: '',
  },
  tracking_method:{
    type:String,
      default: '',
  },
  payout_type:{
    type:String,
      default: '',
  },
  payout:{
    type:DoubleType,
      default: 0,
  },
  revenue:{
    type: DoubleType,
      default: 0,
  },
  // is_cap_enabled:{
  //   type: DoubleType,
  // },
  // capping:{
  //   type: OfferCapping
  // }

})

module.exports = Goal;
