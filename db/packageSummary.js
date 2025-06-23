const Mongoose = require('mongoose');
const { PackageSummary } = require("./Model");


PackageSummary.statics.getAllRecord = async function (filter) {
    return await this.find(filter);
}

PackageSummary.statics.updateOneDoc = async function (filter, reflect, options) {
    return await this.updateOne(filter, reflect, options);
}

PackageSummary.statics.getAllSearchRecord = async function (filter, limit, skipPage) {
    return await this.aggregate(
        [
            { $match: filter },
            { $group: { _id: { app_id: "$app_id" }, advIdSet: { $addToSet: "$advId" }, ofr_summary: { $sum: "$ofr_summary" } } },
            { $project: { _id: "$_id.app_id", adv_summary: { $size: "$advIdSet" }, ofr_summary: "$ofr_summary" } },
            { $sort: { ofr_summary: -1 } },
            { $skip: skipPage },
            { $limit: limit },
            { $lookup: { from: "applicationdetails", localField: "_id", foreignField: "app_id", as: "common" } }
        ]
    );
}

PackageSummary.statics.getTotalPagesCount = async function (filter) {
    return await this.countDocuments(filter);
}

PackageSummary.statics.insertAllRecord = async function (data) {
    return await this.insertMany(data);
}

PackageSummary.statics.deleteTable = async function () {
    return await this.deleteMany();
}

module.exports = Mongoose.model('package_summary', PackageSummary);