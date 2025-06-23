const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const handlingDomain = Mongoose.Schema({
  N_id: {
    type: objectIdType
  },
  type: {
    type: String
  },
  domain: {
    type: String
  },
  N_u_id: {
    type: String,
  },
  nid: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["pending",'approved','rejected'],
    default: "pending"
  }
  

}, { timestamps: true });
module.exports = handlingDomain;
