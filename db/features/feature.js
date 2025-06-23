const Mongoose = require('mongoose');
// const MongooseAutoIncrement = require('mongoose-auto-increment');
const { Features } = require("../Model");

Features.statics.getAllFeatures = async function ( filter , projection ) {
    return await this.find( filter , projection );
}
Features.statics.getFeatures = async function ( filter , projection ) {
    return await this.find( filter , projection );
}
Features.statics.isFeaturesExist = async function( filter, projection ){
    return await this.find(filter, projection)//.lean();
  }

Features.statics.updateFeatures = async function ( filter , reflect  ) {
    return await this.updateOne( filter , { $set : reflect } );
}

module.exports = Mongoose.model('features', Features);
