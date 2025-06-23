const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Publisher");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { config } = require('../../constants/index');
const Address = require("../Address");
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { getConstLabel, getConstValue } = require('../../helper/Util');


const Manager = Mongoose.Schema({
  name: {
    type: String,
    require: false,
  },
  email: {
    type: String,
    required: false,
  },

  //Todo: have clarity: manager is register user or not
  userId: {
    type: objectIdType,
    required: false,
  },
  phone: {
    type: String,
    required: false,
  },
  skypeId: {
    type: String,
    required: false
  }
}, {
  _id: false
})

const apiDetails = Mongoose.Schema({
  api_key: {
    type: String,
    require: true,
  },
  secret_key: {
    type: String,
    required: true,
  },

}, {
  _id: false
})

const FinanceDetails = Mongoose.Schema({
  aN: {
    type: String,
    require: false
  },
  aNumber:{
     type:String
  },
  bN: {
    type: String,
    require:false
  },
  ifcs: {
    type: String,
    required: false
  },
  mob: {
    type: String,
    required: false
  },
  addr: {
    type: String,
    required: false
  },
  ppId: {
    type: String,
    required: false
  },
  payoneerId: {
    type: String,
    required: false
  },
  wc: {
    type: String,
    required: false
  },
  rT:{
    type:String
  },
  aType: {
    type: String,
    required: false
  }
},{_id:false});

const Publisher = Mongoose.Schema({
  network_id: {
    type: objectIdType,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  company_logo: {
    type: String,
    required: false,
  },
  address: {
    type: Address,
  },
  phone: {
    type: String,
    required: false
  },
  skype_id: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['InActive', 'Active'],
    default: 'InActive'
  },
  website: {
    type: String
  },
  account_manager: {
    type: Manager,
    required: false,
    default: {}
  },
  api_details: {
    type: apiDetails,
    required: false
  },
  cut_percentage: {
    type: Number,
    default: 0,
    description: "How many percentage need to cut from total publisher conversion. (cut percentage applicable on same offer)"
  },
  appr_adv: {
    type: [mongooseObjectId],
    default: []
  },
  appr_adv_opt: {
    type: Number,
    enum: Object.keys(config.APPROVE_ADVERTISER_OPTIONS).map(Number),
    default: 100
  },
  payCal : {
    type : String 
  }, 
  pol :{
    type : Number
  },
  Apistatus: {
    type: Boolean
  },
  ofr_type : {
    type : String ,
    enum : [ 'all' , 'active' ],
    default : 'active' 
  },
  fD:{
    type:FinanceDetails,
    require:false,
    default:{}
  }
}, {
  timestamps: true,
});
Publisher.index({ company: 1, network_id: 1 }, { unique: true });
Publisher.index({ network_id: 1, status: 1, });
Publisher.index({ "api_details.api_key": 1, "api_details.secret_key": 1 });
// Mongoose.plugin(MongooseAutoIncrement.plugin,
//   {
//     model: 'publishers',
//     field: 'publisher_id',
//     startAt: 1
//   });

//module.exports = Mongoose.model('publishers', Publisher);
module.exports = Publisher;
