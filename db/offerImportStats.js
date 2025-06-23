const { filter } = require('lodash');
const Mongoose = require('mongoose');
const { offerImportStat } = require("../db/Model");

offerImportStat.statics.InsertData = async function (filter) {
    return await this.insertMany(filter);
}
offerImportStat.statics.FindData = async function (filter) {
    return await this.find(filter);
}
offerImportStat.statics.findDistinctData = async function (filter) {
    return await this.aggregate([{$match:filter},{$group:{"_id":{userName:"$userName" ,userId:"$userId"}}}]);
}
offerImportStat.statics.GroupByData = async function (filter, groupBy) {
    return await this.aggregate([{$match:filter},{$group: {_id:groupBy, userName:{$first:"$userName"},advertiser_name:{$first:"$advertiser_name"},"invalid_offers_count":{$sum : '$invalid_offers_count'},'valid_offers_count':{$sum : '$valid_offers_count'}} }]);
}
module.exports = Mongoose.model('offerImportStat',offerImportStat);