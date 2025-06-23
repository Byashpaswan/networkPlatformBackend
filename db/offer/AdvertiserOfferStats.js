const Mongoose = require('mongoose')
const { AdvertiserOfferStats } = require('../Model')

AdvertiserOfferStats.statics.getAllAdvData = async function (search, projection,options) {
    return await this.find(search, projection,options).lean();
}
AdvertiserOfferStats.statics.insertManyOffers = async function (offerdata) {
    return await this.insertMany(offerdata);
}

AdvertiserOfferStats.statics.getStatsOffers = async function (filter, groupProjection, options) {
    return await this.aggregate([
      { $match: filter },
      { $group: groupProjection },
      { $addFields: { advertiser_id: "$_id" } },
      { $project: { id: 0 } },
      { $unwind: { path: "$latestDate" } },
      { $replaceRoot: { newRoot: "$latestDate" } },
      { $sort: options['sort'] },
      { $skip: options['skip'] },
      { $limit: options['limit'] }
    ]).allowDiskUse(true);
  }

  AdvertiserOfferStats.statics.countStatsOffers = async function (filter, groupProjection) {
    return await this.aggregate([
      { $match: filter },
      { $group: groupProjection },
      { $addFields: { advertiser_id: "$_id" } },
      { $project: { id: 0 } },
      { $unwind: { path: "$latestDate" } },
      { $replaceRoot: { newRoot: "$latestDate" } },
      { $count: "count" }
    ]);
  }

module.exports = Mongoose.model('advertiser_Offer_Stats', AdvertiserOfferStats)
