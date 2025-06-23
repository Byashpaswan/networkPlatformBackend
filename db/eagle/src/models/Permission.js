const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:permissions");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;

const Permissions = Mongoose.Schema({
  // network_id:{     //modified
  //   type:objectIdType,
  //   //required: true,
  // },
  name: {
     type: String,
     //require:true,
  },
  description :{
    type:String,
    //required:true,
  },
  //Todo: Make category required true once permission
  // structure ready
  category:{
    type:String,
    required:true,
  },
  status:{
    type:Boolean,
    //required:true,
    default:true,
  }

}, {
  timestamps: true
});

Permissions.index({ name :1 },{ unique: true });
Permissions.index({ status :1 });

//module.exports = Mongoose.model('permissions', Permissions);
module.exports = Permissions;
