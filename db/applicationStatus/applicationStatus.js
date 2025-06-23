const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { ApplicationStatus } = require("../Model");
MongooseAutoIncrement.initialize(Mongoose.connection);



ApplicationStatus.statics.saveApplicationStatusByBatch = async function (data, options) {
    return await this.insertMany(data, options);
}

ApplicationStatus.statics.getApplicationDetails = async function (filter  , projections ){
    return await this.find(); 
}

module.exports = Mongoose.model('applicationStatus', ApplicationStatus);