const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Organization");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const Address = require("./Address");
const Finance = require("./finance");

const NetworkOwner = Mongoose.Schema({
  first_name: {
    type: String,
    required : true,
  },
  last_name: {
    type: String,
    required: false,
  },
  phone : {
    type :String,
    required: true
  },
  alternate_phone: {
    type: String,
    required: false,
  },
  email : {
    type:String,
    required: true,
  },
  designation :{
    type : String,
    default:"",
  }
},{
  _id: false
});

const theme = Mongoose.Schema({
  theme: {
    type: String,
  },
  dir: {
    type: String,
  },
  boxed: {
    type: String,
  },
  navbarbg: {
    type: String,
  },
  sidebarbg: {
    type: String,
  },
  logobg: {
    type: String,
  },
  layout: {
    type: String,
  },
  headerpos: {
    type: String,
  },
  sidebartype: {
    type: String,
  },
  sidebarpos: {
    type: String,
  },
  colorTheme:{
    type:String,
  }
},{
  _id: false
});

const themeM = Mongoose.Schema({
  theme: {
    type: String,
  },
  dir: {
    type: String,
  },
  boxed: {
    type: String,
  },
  navbarbg: {
    type: String,
  },
  sidebarbg: {
    type: String,
  },
  logobg: {
    type: String,
  },
  layout: {
    type: String,
  },
  headerpos: {
    type: String,
  },
  sidebartype: {
    type: String,
  },
  sidebarpos: {
    type: String,
  },
  colorTheme:{
    type:String,
  }
},{
  _id: false
});

const publisherSetting = Mongoose.Schema({
  aff_sub1:{
    trype:Array,
    required:false
  },
  aff_sub2:{
    trype:Array,
    required:false
  },
  aff_sub3:{
    trype:Array,
    required:false
  },
  aff_sub4:{
    trype:Array,
    required:false
  },
  aff_sub5:{
    trype:Array,
    required:false
  },
  aff_sub6:{
    trype:Array,
    required:false
  },
  aff_sub7:{
    trype:Array,
    required:false
  },
  payout:{
    trype:Array,
    required:false
  },
  source:{
    trype:Array,
    required:false
  }
},{
  _id: false
})

const postbackForwardingSetting = Mongoose.Schema({
  endpoint: {
    type: String,
    default:''
  },
  params: {
    type: String,
    default: ''
  },
  status : {
    type : Number ,
    default : 0 
  },
  forwarding_setting: {
    type: String,
    default: 'no_forwarding'
  }
})
// const Billing = Mongoose.Schema({

// });

const Domain = Mongoose.Schema({
  dashboard:{
    type:String,
    required:true
  },
  tracker:{
    type:String,
    required:true
  },
  api:{
    type:String,
    required:true
  }
},{
  _id:false
}
);

const Network = Mongoose.Schema({
  company_name: {
    type: String,
    required: true,
  },
  networklogo_Url: {
    type: String,
    required: false
  },
  owner:{
    type: NetworkOwner,
    required:true,
  },
  website:{
    type : String,
    default:"",
  },
  address : {
    type: Address,
  },
  fD:{
    type:[Finance],
  },
  country:{
    type: String,
  },
  network_unique_id:{
    type:String,
    required:true
  },
  network_publisher_setting:{
    type:publisherSetting,
    required:false,
  },
  network_publisher_setting_string:{
    type:String,
    required:false,
  },
  status:{
    type :String,
    enum:[ "pending", "active","blocked", "deleted"],
    default :"pending"
  },
  postback_forwarding_setting: {
    type: [postbackForwardingSetting]
  },
  domain:{
    type:Domain,
    require:true,

  },
  offer_export_setting:{
    type:Array,
    required:false
  },
  report_export_setting:{
    type:Array,
    required:false
  },
  current_timezone: {
    type: String,
    required: true
  },
  theme:{
    type:theme,
  },
  payCal:{
    type:String
  },
  publishers : [{   // to assign self publisher details. 
    pid : { type : Number } , 
    company : { type : String }  
  }],
  ip_block_without_test_click : {
    type : Number , 
    default:0
  },
  ip_block_with_test_click : {
    type : Number ,
    default:0
  },
  themeM : {
    type : themeM
  },
  pubLink:{
    type:Boolean,
    default:false
  },
  advLink:{
    type:Boolean,
    default:false
  },
  cpp:{
    type : String,
    default : 'pub_offer_adv'
  },
  ppId:{
    type:String
  },
  sac:{
    type:String
  },
  gstin:{
      type:String
  },
  wc:{
    type:String
  },
  payoneerId:{
    type:String
  },
  rT:{
    type:String
  },
  features :[{
    id: {
      type : objectIdType
    },
    name : {
      type : String
    }
  }]
},{
  timestamps: true
})


Network.index({ network_unique_id :1  },{ unique : true});
Network.index({ status :1 });

//module.exports = Mongoose.model('network', Network);
module.exports = Network;

