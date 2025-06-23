const Mongoose = require('mongoose');
const { ConversionFailed } = require('../Model');

ConversionFailed.statics.getConversionFailedLog = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean()
}

ConversionFailed.statics.statsCount = async function (filter, group, sort) {
    return await this.aggregate([{ $match: filter }, { $group: group }]).sort(sort);
}

ConversionFailed.statics.countConversionFailed = async function (filter) {
    return await this.find(filter).countDocuments();
}
ConversionFailed.statics.countfailedConversion = async function (filter ){
    return await this.countDocuments(filter); 
}

module.exports.ConversionFailed = Mongoose.model('conversionfaileds', ConversionFailed);

