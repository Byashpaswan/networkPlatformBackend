const { compareSync } = require('bcryptjs');
const Mongoose = require('mongoose');
const { OfferApiStats } = require("../Model");
const moment = require('moment');

OfferApiStats.statics.getOneOfferApiStats = async function (search, projection, options) {
  return await this.findOne(search, projection, options).lean();
}
OfferApiStats.statics.getCompleteOfferApiStats = async function (search, projection, limit) {
  return await this.find(search, projection).sort({ _id: -1 }).limit(limit).lean();
}
OfferApiStats.statics.updateSingleOfferStatsApi = async function (search, refflect) {
  return await this.findOneAndUpdate(search, { $set: refflect })
}


OfferApiStats.statics.getallstatsoffer = async function (filter, group, sort, limit) {
  return await this.aggregate([
    { $match: filter },
    { $sort: sort },
    { $group: group },
    { $sort: { _id: 1 } },
    { $limit: limit },

  ])
};

OfferApiStats.statics.getStatsOffers = async function (filter, groupProjection, options) {
  return await this.aggregate([
    { $match: filter },
    { $group: groupProjection },
    { $addFields: { advertiser_platform_id: "$_id" } },
    { $project: { id: 0 } },
    { $unwind: { path: "$latestDate" } },
    { $replaceRoot: { newRoot: "$latestDate" } },
    { $sort: options['sort'] },
    { $skip: options['skip'] },
    { $limit: options['limit'] }
  ]).allowDiskUse(true);
}

OfferApiStats.statics.countStatsOffers = async function (filter, groupProjection) {
  return await this.aggregate([
    { $match: filter },
    { $group: groupProjection },
    { $addFields: { advertiser_platform_id: "$_id" } },
    { $project: { id: 0 } },
    { $unwind: { path: "$latestDate" } },
    { $replaceRoot: { newRoot: "$latestDate" } },
    { $count: "count" }
  ]);
}

OfferApiStats.statics.getOfferApiStats = async function (search, projection, options) {
  return await this.find(search, projection, options).lean();
}

module.exports = Mongoose.model('offerApiStats', OfferApiStats);
