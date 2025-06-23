const Mongoose = require("mongoose");
//const MongooseAutoIncrement = require('mongoose-auto-increment');
//MongooseAutoIncrement.initialize(Mongoose.connection);
//const debug = require("debug")("eagle:models:test");
//const objectIdType = Mongoose.Schema.Types.ObjectId;
//const mongooseObjectId = Mongoose.Types.ObjectId;
//const { config } = require('../constants/index');
const Test = Mongoose.Schema({
  name: {
    type :String,

  },
  value:{
    type:String,
  }

});



//module.exports = Mongoose.model('test', Test);
module.exports =  Test;
