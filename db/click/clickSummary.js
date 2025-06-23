const Mongoose = require('mongoose');
const { ClickSummary } = require('../Model');

ClickSummary.statics.getReportSummary = async function (search ) {
    return await this.aggregate([{$match:search},
      { $group: { _id: null,count: { $sum: "$click" }, conversion: { $sum: "$conversion" }, payout: { $sum: {$cond:[ { $gt: [  "$conversion", 0] },"$payout",0]}}, revenue: { $sum: {$cond:[ { $gt: [  "$conversion", 0] },"$revenue",0]}}}}]);
  }

ClickSummary.statics.getSummaryYearly = async function (search)
{
    return await this.aggregate([{ $match: search }, { $group: { _id: { year: { $year: "$TimeSlot" } }, count: { $sum: 1 }, total_conversion: { $sum: "$conversion" }, total_click: { $sum: "$click" }, total_unique_click: { $sum: "$unique_click" }, total_unique_conversion: { $sum: "$unique_conversion" }, total_payout: { $sum: "$payout" }, total_revenue: { $sum: "$revenue" } }  }]);    
}
ClickSummary.statics.getSummaryMonthly = async function (search) {
    return await this.aggregate([{ $match: search }, { $group: { _id: { year: { $year: "$TimeSlot" }, month: { $month: "$TimeSlot" } }, count: { $sum: 1 }, total_click: { $sum: "$click" }, total_unique_click: { $sum: "$unique_click" }, total_unique_conversion: { $sum: "$unique_conversion" }, total_conversion: { $sum: "$conversion" }, total_payout: { $sum: "$payout" }, total_revenue: { $sum: "$revenue" } } }]);
}
ClickSummary.statics.getSummaryDaily = async function (search, groupProjection, limit, skip, sort) {

    return await this.aggregate([{ $match: search }, { $group: groupProjection }, { $sort: sort }, { $skip: skip }, { $limit: limit } ]);
}
ClickSummary.statics.getSummaryCount = async function (search, groupProjection) {

    return await this.aggregate([{ $match: search }, { $group: groupProjection }, { $count: 'total' }]);
}
ClickSummary.statics.updateSummary = async function (search, reflectUpdate, reflectInsert, options)
{
    return await this.updateOne(search, { $setOnInsert: reflectInsert, $inc: reflectUpdate,} , options);
}

ClickSummary.statics.getFacetSummary = async function (filter, projection, limit, skip, sort) {
    return await this.aggregate([{
        $facet: {
            "data": [{ $match: filter }, { $group: projection },{ $sort: sort }, { $skip: skip }, { $limit: limit } ],
            "sum": [{ $match: filter },
            { $group: { _id: null, count: { $sum: "$click" }, conversion: { $sum: "$conversion" }, payout: { $sum: { $cond: [{ $gt: ["$conversion", 0] }, "$payout", 0] } }, revenue: { $sum: { $cond: [{ $gt: ["$conversion", 0] }, "$revenue", 0] } } } }],
            "total": [{ $match: filter }, { $group: { _id: projection['_id']} }, { $count: 'total' }]
        }
    }]);
}
module.exports = Mongoose.model('click_summary', ClickSummary);
