const Mongoose = require('mongoose');
const ObjectId = Mongoose.Schema.Types.ObjectId;
 
const InvoiceDroft = Mongoose.Schema({
    N_id: {
        type: ObjectId,
        required: true,
      },
      aid: {
        type: Number,
        required: true,
      },
      oId: {
        type: ObjectId,
        required: true,
      },
      oName: {
        type: String,
      },
      AdOId: {
        type: String,
      },
    
      tconv: {
        type: Number,
      },
      tAmount: {
        type: Number,
      },
      pendingConv: {
        type: Number,
      },
      pendingAmount: {
        type: Number,
      },
      dDconv: {
        type: Number,
      },
      dDAmount: {
        type: Number,
      },
      approvedConv: {
        type: Number,
      },
      approvedAmount: {
        type: Number,
      },
      slot:{
        type:Date,
        required: true
      },
      comment: {
        type: [String],
        default: [],
      },
    confirm:{
      type:Boolean,
      default:false
    }
 
}, { timestamps: true });
 
module.exports=InvoiceDroft