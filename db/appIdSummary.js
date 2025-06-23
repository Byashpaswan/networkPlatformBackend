const Mongoose = require('mongoose');
const { AppIdSummary } = require("./Model");

AppIdSummary.statics.updateSummary = async function (search, reflect) {
    return await this.updateOne(search, { $set: reflect });
}
AppIdSummary.statics.searchSummaryByAppId = async function (filter, projection, options) {
    return await this.find(filter, projection, options);
}
AppIdSummary.statics.bulkInsertSummary = async function (summary_arr) {
    return await this.insertMany(summary_arr, { ordered: false });
}
AppIdSummary.statics.searchSummaryByDate = async function (filter, limit, skpage) {
    return await this.aggregate([{ $match: filter }, { $group: { _id: "$app_id", ofr_summary: { $sum: "$ofr_summary" }, adv_summary: { $sum: "$adv_summary" }, usd_ofr_summary: { $sum: "$usd_ofr_summary" }, adv_summary: { $sum: "$adv_summary" }, offers_avg_payout: { $first: "$offers_avg_payout" }, remarks: { $first: "$remarks" } } }, { $sort: { ofr_summary: -1 } }, { $skip: skpage }, { $limit: limit },
    { $lookup: { from: "applicationdetails", localField: "_id", foreignField: "app_id", as: "common" } }
    ]);
}

AppIdSummary.statics.getTotalPagesCount = async function (filter) {
    return await this.aggregate([{ $match: filter }, { $group: { _id: "$app_id" } }, { $count: 'total' }]);
}

AppIdSummary.statics.getExternalPackageSummary = async function (filter, options) {
    let query = [
        { $match: filter },
        { $group: { _id: "$app_id", ofr_summary: { $sum: "$ofr_summary" }, adv_summary: { $sum: "$adv_summary" }, usd_ofr_summary: { $sum: "$usd_ofr_summary" }, offers_avg_payout: { $first: "$offers_avg_payout" }, remarks: { $first: "$remarks" } } },
        { $sort: { ofr_summary: -1 } },
        { $skip: options['skip'] },
        { $limit: options['limit'] }
    ];
    if (options['lookup']) {
        if (options['description']) {
            query.push({ $lookup: { from: "applicationdetails", localField: "_id", foreignField: "app_id", as: "common" } });
        } else {
            query.push({ $lookup: { from: "applicationdetails", localField: "_id", foreignField: "app_id", as: "common" } });
            query.push({ $project: { "common.description": 0 } });
        }
    }
    return await this.aggregate(query);
}

module.exports = Mongoose.model('app_id_summary', AppIdSummary);
