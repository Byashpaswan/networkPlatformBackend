const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
const objectIdType = Mongoose.Schema.Types.ObjectId;
const { config } = require("../../constants/index");
const Address = require("../Address");


const publisherV_2 = Mongoose.Schema(
  {
    network_id: {
        type: objectIdType,
        required: true,
    },
    name: {
      type: String,
      require: true
    },
    email: {
      type: String,
      require: true
    },
    phone: {
      type: Number
    },
    company: {
      type: String,
      require: true
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
    address: {
      type: Address
    },
    website: {
      type: String
    },
    country:{
      type:String
    }
  },
  {
    timestamps: true
  }
);

module.exports = publisherV_2;