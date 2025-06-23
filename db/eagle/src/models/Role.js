const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Role");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { getConstLabel, getConstValue } = require('../helper/Util');

const  isValidNetworkId = function () {
  return typeof this.network_id === null ||  Mongoose.Types.ObjectId.isValid(this.network_id) ?  true : false;
};

const Permissions = Mongoose.Schema({
  id: {
    type: objectIdType,
  },
  name: { type: String, }

}, {
  _id: false
});

const Role = Mongoose.Schema({
  network_id:{
    type:objectIdType,
    // required:true,
    required: isValidNetworkId
  },
  name:{
    type: String,
    required: true,
  },
  permissions:{
    type:[ Permissions ]
  },
  is_custom_role:{
    type:Boolean,
    require:true,
    default:false
  },
  description:{
    type:String,
    required:true,
  },
  status:{
    type:Boolean,
    required:true,
    default: true
  },
  category:{
    type:String,
    require:true,
  }
  

}, {
  timestamps: true
});



Role.index({ name :1 },{ unique: true});
Role.index({ network_id: 1, status :1 });
//module.exports = Mongoose.model('roles', Role);
module.exports = Role;
