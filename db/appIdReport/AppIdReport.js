const Mongoose = require('mongoose');
const { AppSummary, Conversion } = require("../Model");

AppSummary.statics.getAppSummary = async function (filter, groupProjection, option) {
    return await this.aggregate([{ $match: filter },
    { $group: groupProjection }, { $sort: option['sort'] }, { $skip: option['skip'] }, { $limit: option['limit'] }]).allowDiskUse(true);
}

AppSummary.statics.countAppSummary = async function (filter, groupBy) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy } },
    {
        $count: "count"
    }]);
}

AppSummary.statics.totalAppSummary = async function (filter, totalGroupProjection) {
    return await this.aggregate([{ $match: filter },
    { $group: totalGroupProjection }]);
}

Conversion.statics.getConversionSummary = async function (filter, groupProjection, option) {
    if (!option['skip'] && !option['limit']) {
        return await this.aggregate([{ $match: filter }, { $group: groupProjection }, { $sort: option['sort'] }]).allowDiskUse(true);
    } else {
        return await this.aggregate([{ $match: filter }, { $group: groupProjection }, { $sort: option['sort'] }, { $skip: option['skip'] }, { $limit: option['limit'] }]).allowDiskUse(true);
    }
}

Conversion.statics.getAllConversion = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean();
}

Conversion.statics.countConversionSummary = async function (filter, groupBy) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy } },
    {
        $count: "count"
    }]).allowDiskUse(true);
}
Conversion.statics.findCountByAppId = async function ( filter  , groupBy ){
        return await this.aggregate([
            { $match: filter },
            { $group: groupBy }
        ]);
}

Conversion.statics.findCountByApId = async function( filter ){
    return await this.find(filter).count();
}
Conversion.statics.findOfferCountByAppId = async function(filter){
    return await this.find(filter).count() ; 
}
Conversion.statics.totalConversionSummary = async function (filter, totalGroupProjection) {
    return await this.aggregate([{ $match: filter },
    { $group: totalGroupProjection }]).allowDiskUse(true) ;
}

module.exports.AppSummaryModel = Mongoose.model('app_summary', AppSummary);
module.exports.ConversionModel = Mongoose.model('Conversion', Conversion);