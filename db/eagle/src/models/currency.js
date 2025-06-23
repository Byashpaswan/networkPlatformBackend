const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Organization");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const Currency = Mongoose.Schema({
    currency:{
        type:String,
        required:true
    },
    currency_value:{
        type:Number,
        required:true
    },
    base_currency:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        required:true
    }

},{
  timestamps: false
})

Currency.index({ currency :1} );
//module.exports = Mongoose.model('network', Network);
module.exports = Currency;
