const Mongoose = require('mongoose');
const { ClickLog, Conversion } = require('../Model');

ClickLog.statics.getReportSummary = async function (search) {
  return await this.aggregate([{ $match: search },
  { $group: { _id: null, count: { $sum: 1 }, total_payout: { $sum: "$payout" }, total_revenue: { $sum: "$revenue" }, conversion: { $sum: "$conversion" } } }]);
}

ClickLog.statics.findClickandupdateConversion = async function (search, reflect) {
  return await this.findOneAndUpdate(search, { $set: reflect }, { new: false });
}
ClickLog.statics.clicks = async function (filter, projection, options = {}) {
  return await this.find(filter, projection, options).lean()
}

ClickLog.statics.getClicksByCursor = async function (filter, projection, options) {
  return await this.find(filter, projection, options).read('secondary').cursor({ batchSize: 1000 });
}
ClickLog.statics.getClickLog = async function (filter, projection, options) {
  return await this.find(filter, projection, options).cursor();
}
ClickLog.statics.updateOneClick = async function (filter, update, options) {
  return await this.updateOne(filter, update, options);
}

ClickLog.statics.updateClicks = async function (filter, update, options) {
  return await this.updateMany(filter, update, options);
}

ClickLog.statics.getDailySummary = async function (filter, group_by, limit, skip, sort) {
  return await this.aggregate([{ $match: filter },
  { $group: { _id: group_by, count: { $sum: 1 }, total_payout: { $sum: "$payout" }, total_revenue: { $sum: "$revenue" }, conversion: { $sum: "$conversion" } } }, { $sort: sort }, { $skip: skip }, { $limit: limit }]);
}
ClickLog.statics.getSummaryCount = async function (filter, projection) {
  return await this.aggregate([{ $match: filter },
  { $group: { _id: projection } }, { $count: 'total' }]);
  // return await this.findOneAndUpdate(filter,insert,);
}
Conversion.statics.getLogConversion = async function (search, projection, options) {
  return await this.find(search, projection, options).lean();
}
Conversion.statics.getTotalPagesCount = async function (search) {
  return await this.find(search).count();
}

ClickLog.statics.getLogClick = async function (search, projection, options) {
  return await this.find(search, projection, options).lean();
}

ClickLog.statics.getTotalPagesCount = async function (search) {
  return await this.find(search).count();
}

ClickLog.statics.getFacetSummary = async function (filter, projection, limit, skip, sort) {
  return await this.aggregate([{
    $facet: {
      "data": [{ $match: filter },
      { $group: { _id: projection, count: { $sum: 1 }, total_payout: { $sum: "$payout" }, total_revenue: { $sum: "$revenue" }, conversion: { $sum: "$conversion" } } }, { $sort: sort }, { $skip: skip }, { $limit: limit }],
      "sum": [{ $match: filter },
      { $group: { _id: null, count: { $sum: 1 }, total_payout: { $sum: "$payout" }, total_revenue: { $sum: "$revenue" }, conversion: { $sum: "$conversion" } } }],
      "total": [{ $match: filter },
      { $group: { _id: projection } }, { $count: 'total' }]
    }
  }]);
}

ClickLog.statics.fetchDailySummary = async function (filter, group_by) {
  return await this.aggregate(
    [
      { $match: filter },
      {
        $group: {
          _id: group_by,
          count: { $sum: 1 },
          total_payout: { $sum: "$payout" },
          total_revenue: { $sum: "$revenue" },
          conversion: { $sum: "$conversion" }
        }
      }
    ]
  );
}
Conversion.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: group_by,
        conversion: { $sum: 1 },
        total_payout: { $sum: "$final_payout" },
        total_revenue: { $sum: "$revenue_click" },
        total_hold_revenue: { $sum: "$hold_revenue" },
        offer_name: { $last: "$offer_name" },
        publisher_name: { $last: "$publisher_name" },
        advertiser_name: { $last: "$advertiser_name" },
        pid: { $last: "$pid" },
        aid: { $last: "$aid" },
        nid: { $last: "$nid" },
        advertiser_offer_id: { $last: "$advertiser_offer_id" },
        //pre_conversion: { $sum: "$pre_conversion" }
        publisher_conversion: { $sum: "$publisher_conversion" },
        publisher_payout: { $sum: "$publisher_payout" }
      }
    }
  ]).read('secondary')
  // .cursor({ batchSize: 1000 })
  // .exec();
};

Conversion.statics.fetchAggregateResult = async function (filter, group_byProjection) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: group_byProjection
    }
  ]).read('secondary');
};

ClickLog.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: group_by,
        count: { $sum: 1 },
        total_payout: { $sum: "$payout" },
        total_revenue: { $sum: "$revenue" },
        conversion: { $sum: "$conversion" },
        offer_name: { $last: "$offer_name" },
        publisher_name: { $last: "$publisher_name" },
        advertiser_name: { $last: "$advertiser_name" },
        pid: { $last: "$pid" },
        aid: { $last: "$aid" },
        nid: { $last: "$nid" },
        advertiser_offer_id: { $last: "$advertiser_offer_id" },
        pre_conversion: { $sum: "$pre_conversion" },
        currency: { $last: "$currency" }
      }
    }
  ]).read('secondary')
    .cursor({ batchSize: 1000 })
    .exec();
};
Conversion.statics.countConversion = async function (filter) {
  return await this.find(filter).count();
}
Conversion.statics.getStatsCount = async function (filter, groupBy, sortBy, limit) {
  return await this.aggregate([{ $match: filter }, { $group: { _id: groupBy, app_id: { $first: '$app_id' }, offer_name: { $last: '$offer_name' }, 'conversion': { $sum: 1 } } }]).sort(sortBy).limit(limit);
}
Conversion.statics.getPubStatsCount = async function (filter, groupBy, sortBy, limit) {
  return await this.aggregate([{ $match: filter }, { $group: { _id: groupBy, app_id: { $first: '$app_id' }, offer_name: { $last: '$offer_name' }, 'conversion': { $sum: '$publisher_conversion' } } }]).sort(sortBy).limit(limit);
}
Conversion.statics.updateConversion = async function (search, update) {
  return await this.updateMany(search, { $set: update });
}

Conversion.statics.getConversionsByCursor = async function (filter, projection, options) {
  return await this.find(filter, projection, options).read('secondary').cursor({ batchSize: 1000 });
}

Conversion.statics.updateOneConversion = async function (filter, update, options) {
  return await this.updateOne(filter, update, options);
}

Conversion.statics.updateConversions = async function (filter, update, options) {
  return await this.updateMany(filter, update, options);
}

module.exports.ConversionModel = Mongoose.model('conversion', Conversion);
module.exports.ClickLogModel = Mongoose.model('click_log', ClickLog);

