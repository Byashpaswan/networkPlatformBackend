const Mongoose = require('mongoose');
const { AppidPublisherSummary } = require('./Model');

AppidPublisherSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}

AppidPublisherSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}

AppidPublisherSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}

AppidPublisherSummary.statics.exportAppidPublisherSummary = async function (filter, groupBy, option) {
    return await this.aggregate([
        {
            $match: filter
        },
        {
            $group: {
                _id: groupBy,
                click: { $sum: "$click" },
                conversion: { $sum: "$conversion" },
                pre_conversion: { $sum: "$pre_conversion" },
                revenue: { $sum: "$revenue" },
                payout: { $sum: "$payout" }
            }
        },
        {
            $sort: option['sort']
        }
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}

AppidPublisherSummary.statics.getAppidPublisherSummary = async function (filter, project, groupBy, options) {
    if (options['limit'] > 0 && options['skip'] >= 0) {
        return await this.aggregate([
            { $match: filter },
            { $project: project },
            { $group: groupBy },
            { $sort: { app_id: 1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $sort: options['sort'] }, { $skip: options['skip'] }, { $limit: options['limit'] }]
                }
            }
        ]).allowDiskUse(true);
    }
    return await this.aggregate([
        { $match: filter },
        { $project: project },
        { $group: groupBy },
        { $sort: { app_id: 1 } },
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $sort: options['sort'] }]
            }
        }
    ]).allowDiskUse(true);
}

AppidPublisherSummary.statics.countAppidPublisherSummary = async function (filter, groupBy) {
    return await this.aggregate([
        { $match: filter },
        { $group: { _id: groupBy } },
        { $count: "count" }
    ]).allowDiskUse(true);
}

AppidPublisherSummary.statics.totalAppidPublisherSummary = async function (filter, grossTotalProjection) {
    return await this.aggregate([
        { $match: filter },
        { $group: grossTotalProjection }
    ]).allowDiskUse(true);
}

module.exports.AppidPublisherSummaryModel = Mongoose.model('Appid_Publisher_Summary', AppidPublisherSummary);