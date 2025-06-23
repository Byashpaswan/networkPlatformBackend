const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { ApplicationDetails } = require("../Model");
MongooseAutoIncrement.initialize(Mongoose.connection);

ApplicationDetails.statics.getApplicationDetailsByBatch = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean().cursor();
}
ApplicationDetails.statics.getApplicationDetail = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean().cursor();
}
ApplicationDetails.statics.updateCount = async function( filter , reflect ) {
    return await this.findByIdAndUpdate(filter , reflect) ;
}
ApplicationDetails.statics.getApplicationDetails = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean();
}

ApplicationDetails.statics.getTotalPagesCount = async function (filter) {
    return await this.countDocuments(filter);
}

ApplicationDetails.statics.getApplicationDistinctField = async function (filter, distinctBy) {
    return await this.find(filter).distinct(distinctBy);
}

ApplicationDetails.statics.saveApplicationDetailsByBatch = async function (data, options) {
    return await this.insertMany(data, options);
}

ApplicationDetails.statics.updateApplicationDetailsByBatch = async function (filter, update) {
    return await this.updateMany(filter, update);
}

ApplicationDetails.statics.updateApplicationDetails = async function (filter, data) {
    return await this.findOneAndUpdate(filter, data);
}

ApplicationDetails.statics.findOneApp_id = async function (filter) {
    return await this.findOne(filter);
}

ApplicationDetails.statics.findOneAndUpdateApplication=async function(filter,update,option){
    return await this.findOneAndUpdate(filter,update,option);
}

module.exports = Mongoose.model('applicationDetails', ApplicationDetails);