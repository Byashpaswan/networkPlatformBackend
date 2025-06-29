const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:OffersAuditLog");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const mongooseAutoIncrement = require('mongoose-auto-increment');
// require('mongoose-double')(Mongoose);
const DoubleType = Mongoose.Schema.Types.Decimal128;
const { config } = require('../../constants/index');

const OffersAuditLog = Mongoose.Schema({

  network_id: {
    type: objectIdType,
    required: true,
  },
  offer_id:{
    type: objectIdType,
    required: true,
  },
  offer_change:{
    type: Mongoose.Schema.Types.Mixed,
    required: true,
  },
  updated_by:{
    type:String,
    enum:[ 'script', 'ui' ],
    required:true,
  },
  username:{
    type:String,
    },
  user_id: {
      type: String,
  },
  version:{
    type:Number,
  }

}, {
  timestamps: true
    });

OffersAuditLog.index({ network_id: 1, offer_id :1,  })

module.exports = OffersAuditLog;

