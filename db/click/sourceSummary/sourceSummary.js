const Mongoose = require('mongoose');
const { OffersSourceAdvAffSummary, SourceSummary, SourceAdvertiserAffiliateSummary, SourceAdvertiserSummary, SourceAffiliateSummary, AdvertiserSummary, PublisherSummary, DailySummary, SummaryLogSchema, AppSummary, SourceOfferPublisherSummary, AdvertiserOfferPublisherSummary, MonthlyAdvertiserOfferPublisherSummary, AdvertiserOfferPublisherSourceSummary,LiveDaily_AdvertiserOfferPublisherSourceSummary } = require('../../Model');

SourceSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}

SourceSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
SourceSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}

SourceAdvertiserAffiliateSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}

SourceAdvertiserAffiliateSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
SourceAdvertiserAffiliateSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
SourceAdvertiserAffiliateSummary.statics.exportAdvertiserAffiliateSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();;
}
SourceAdvertiserAffiliateSummary.statics.fetchDailySummary = async function (match, group) {
    return await this.aggregate([{ $match: match }, { $group: group }]).allowDiskUse(true);
};
SourceAdvertiserAffiliateSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
SourceAdvertiserAffiliateSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}

SourceAdvertiserSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}
SourceAdvertiserSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
SourceAdvertiserSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
SourceAdvertiserSummary.statics.exportAdvSourceSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}
SourceAdvertiserSummary.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: group_by,
                count: { $sum: 1 },
                click: { $sum: "$click" },
                unique_click: { $sum: "$unique_click" },
                conversion: { $sum: "$conversion" },
                pre_conversion: { $sum: "$pre_conversion" },
                unique_conversion: { $sum: "$unique_conversion" },
                revenue: { $sum: "$revenue" },
                payout: { $sum: "$payout" },
                network_id: { $last: "$network_id" },
                nid: { $last: "$nid" },
                source: { $last: "$source" },
                advertiser_name: { $last: "$advertiser_name" },
                advertiser_id: { $last: "$advertiser_id" },
                aid: { $last: "$aid" },
            }
        }
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
};
SourceAdvertiserSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
SourceAdvertiserSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}

SourceAffiliateSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}

SourceAffiliateSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
SourceAffiliateSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
SourceAffiliateSummary.statics.exportSourceSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}

SourceAffiliateSummary.statics.exportSourceAffiliateSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}
SourceAffiliateSummary.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: group_by,
                count: { $sum: 1 },
                click: { $sum: "$click" },
                unique_click: { $sum: "$unique_click" },
                conversion: { $sum: "$conversion" },
                pre_conversion: { $sum: "$pre_conversion" },
                unique_conversion: { $sum: "$unique_conversion" },
                revenue: { $sum: "$revenue" },
                payout: { $sum: "$payout" },
                network_id: { $last: "$network_id" },
                nid: { $last: "$nid" },
                source: { $last: "$source" },
                publisher_id: { $last: "$publisher_id" },
                publisher_id: { $last: "$publisher_id" },
                publisher_name: { $last: "$publisher_name" },
            }
        }
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
};
SourceAffiliateSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
SourceAffiliateSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}

OffersSourceAdvAffSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false })
};

OffersSourceAdvAffSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
OffersSourceAdvAffSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect }, { upsert: true });
}
OffersSourceAdvAffSummary.statics.findBulkOffers = async function (filter, projection) {
    return await this.find(filter, projection);
}
OffersSourceAdvAffSummary.statics.exportOffersSourceAdvAffSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, offer_name: { $first: "$offer_name" }, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } },
    {
        $lookup:
        {
            from: "offers",
            localField: "_id.offer_id",
            foreignField: "_id",
            as: "status"
        }
    }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}
OffersSourceAdvAffSummary.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: group_by,
                count: { $sum: 1 },
                click: { $sum: "$click" },
                unique_click: { $sum: "$unique_click" },
                conversion: { $sum: "$conversion" },
                publisher_conversion: { $sum: "$publisher_conversion" },
                pre_conversion: { $sum: "$pre_conversion" },
                unique_conversion: { $sum: "$unique_conversion" },
                revenue: { $sum: "$revenue" },
                hold_revenue: { $sum: "$hold_revenue" },
                payout: { $sum: "$payout" },
                publisher_payout: { $sum: "$publisher_payout" },
                network_id: { $last: "$network_id" },
                nid: { $last: "$nid" },
                source: { $last: "$source" },
                publisher_id: { $last: "$publisher_id" },
                pid: { $last: "$pid" },
                publisher_name: { $last: "$publisher_name" },
                advertiser_name: { $last: "$advertiser_name" },
                advertiser_id: { $last: "$advertiser_id" },
                aid: { $last: "$aid" },
                advertiser_offer_id: { $last: "$advertiser_offer_id" },
                offer_name: { $last: "$offer_name" },
                offer_id: { $last: "$offer_id" },
                currency: { $last: "$currency" }
            }
        }
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
};
OffersSourceAdvAffSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
OffersSourceAdvAffSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}

AdvertiserOfferPublisherSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false })
};

AdvertiserOfferPublisherSummary.statics.findSlotDoc = async function (filter, projection, options) {
    return await this.findOne(filter, projection, options);
}
AdvertiserOfferPublisherSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect }, { upsert: true });
}
AdvertiserOfferPublisherSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
AdvertiserOfferPublisherSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}
AdvertiserOfferPublisherSummary.statics.findBulkOffers = async function (filter, projection) {
    return await this.find(filter, projection);
}
AdvertiserOfferPublisherSummary.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: group_by,
                count: { $sum: 1 },
                click: { $sum: "$click" },
                unique_click: { $sum: "$unique_click" },
                conversion: { $sum: "$conversion" },
                publisher_conversion: { $sum: "$publisher_conversion" },
                pre_conversion: { $sum: "$pre_conversion" },
                unique_conversion: { $sum: "$unique_conversion" },
                revenue: { $sum: "$revenue" },
                hold_revenue: { $sum: "$hold_revenue" },
                payout: { $sum: "$payout" },
                network_id: { $last: "$network_id" },
                nid: { $last: "$nid" },
                publisher_id: { $last: "$publisher_id" },
                pid: { $last: "$pid" },
                publisher_name: { $last: "$publisher_name" },
                advertiser_name: { $last: "$advertiser_name" },
                advertiser_id: { $last: "$advertiser_id" },
                aid: { $last: "$aid" },
                advertiser_offer_id: { $last: "$advertiser_offer_id" },
                offer_name: { $last: "$offer_name" },
                offer_id: { $last: "$offer_id" },
                publisher_payout: { $sum: "$publisher_payout" },
                currency: { $last: "$currency" }
            }
        }
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
};

MonthlyAdvertiserOfferPublisherSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false })
};

////////////////////////////////////////////billing start
MonthlyAdvertiserOfferPublisherSummary.statics.getMonthlyAdvertiserOfferPublisherSummary = async function (filter, groupProjection, option) {
    return await this.aggregate([{ $match: filter }, { $group: groupProjection }, { $sort: option['sort'] }, { $skip: option['skip'] }, { $limit: option['limit'] }]).allowDiskUse(true);
};

MonthlyAdvertiserOfferPublisherSummary.statics.countMonthlyAdvertiserOfferPublisherSummary = async function (filter, groupBy) {
    return await this.aggregate([{ $match: filter }, { $group: { _id: groupBy } }, { $count: "count" }]).allowDiskUse(true);
}

MonthlyAdvertiserOfferPublisherSummary.statics.totalMonthlyAdvertiserOfferPublisherSummary = async function (filter, totalGroupProjection) {
    return await this.aggregate([{ $match: filter }, { $group: totalGroupProjection }]).allowDiskUse(true);
}

OffersSourceAdvAffSummary.statics.totalMonthlyAdvertiserOfferPublisherSummary = async function (filter, totalGroupProjection) {
    return await this.aggregate([{ $match: filter }, { $group: totalGroupProjection }]).allowDiskUse(true);
}
OffersSourceAdvAffSummary.statics.countMonthlyAdvertiserOfferPublisherSummary = async function (filter, groupBy) {
    return await this.aggregate([{ $match: filter }, { $group: { _id: groupBy } }, { $count: "count" }]).allowDiskUse(true);
}

OffersSourceAdvAffSummary.statics.getMonthlyAdvertiserOfferPublisherSummaryByLookup2 = async function (filter, groupProjection, projection, option) {
    projection['offerData.advertiser_offer_id'] = 1;
    return await this.aggregate([{ $match: filter }, { $group: groupProjection }, {
        $lookup:
        {
            from: "offers",
            localField: "_id.oId",
            foreignField: "_id",
            as: "offerData"
        }
    }, { $project: projection }, { $sort: option['sort'] }, { $skip: option['skip'] }, { $limit: option['limit'] }]).allowDiskUse(true);
}
MonthlyAdvertiserOfferPublisherSummary.statics.updateMonthlyAdvertiserOfferPublisherSummary = async function (filter, update) {
    return await this.updateMany(filter, { $set: update });
}
MonthlyAdvertiserOfferPublisherSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
MonthlyAdvertiserOfferPublisherSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}
MonthlyAdvertiserOfferPublisherSummary.statics.getMonthlyAdvertiserOfferPublisherSummaryByLookup = async function (filter, groupProjection, projection, option) {
    projection['offerData.advertiser_offer_id'] = 1;
    return await this.aggregate([{ $match: filter }, { $group: groupProjection }, {
        $lookup:
        {
            from: "offers",
            localField: "_id.offer_id",
            foreignField: "_id",
            as: "offerData"
        }
    }, { $project: projection }, { $sort: option['sort'] }, { $skip: option['skip'] }, { $limit: option['limit'] }]).allowDiskUse(true);
}

////////////////////////////////////////////billing end

DailySummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}
DailySummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
DailySummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
DailySummary.statics.exportDailySummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}
DailySummary.statics.countStats = async function (filter, groupBy, sortBy) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, payout: { $sum: "$payout" }, revenue: { $sum: "$revenue" } } }]).sort(sortBy).allowDiskUse(true);
}
DailySummary.statics.countTotalStats = async function (filter, group) {
    return await this.aggregate([{ $match: filter }, { $group: group }]).allowDiskUse(true);
}
LiveDaily_AdvertiserOfferPublisherSourceSummary.statics.countTotalStats = async function( filter , group ){
    return await this.aggregate([{ $match: filter }, { $group: group }]).allowDiskUse(true);
}
DailySummary.statics.countStatsLastNDays = async function (filter) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: null, click: { $sum: "$click" }, conversion: { $sum: "$conversion" } } }]).allowDiskUse(true);
}
DailySummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
DailySummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}
AdvertiserSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}
AdvertiserSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
AdvertiserSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}
AdvertiserSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
AdvertiserSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
AdvertiserSummary.statics.exportAdvertiserSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}
AdvertiserSummary.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: group_by,
                count: { $sum: 1 },
                click: { $sum: "$click" },
                unique_click: { $sum: "$unique_click" },
                conversion: { $sum: "$conversion" },
                pre_conversion: { $sum: "$pre_conversion" },
                unique_conversion: { $sum: "$unique_conversion" },
                revenue: { $sum: "$revenue" },
                payout: { $sum: "$payout" },
                network_id: { $last: "$network_id" },
                nid: { $last: "$nid" },
                advertiser_name: { $last: "$advertiser_name" },
                advertiser_id: { $last: "$advertiser_id" },
                aid: { $last: "$aid" },
            }
        }
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
};
AdvertiserSummary.statics.getAdvertiserStat = async function (filter, groupBy, sortBy, limit) {
    return await this.aggregate([{ $match: filter }, { $group: { _id: groupBy, advertiser_name: { $first: "$advertiser_name" }, "click": { $sum: '$click' }, 'conversion': { $sum: '$conversion' } } }]).sort(sortBy).limit(limit).allowDiskUse(true);
}
PublisherSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}
PublisherSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
PublisherSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
PublisherSummary.statics.exportAffiliateSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}
PublisherSummary.statics.countStats = async function (filter, groupBy, sortBy) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" } } }]).sort(sortBy).allowDiskUse(true);
}
PublisherSummary.statics.statsCount = async function (filter, group, sort) {
    return await this.aggregate([{ $match: filter }, { $group: group }]).sort(sort).allowDiskUse(true);
}
PublisherSummary.statics.getPublisherStat = async function (filter, groupBy, sortBy, limit) {
    return await this.aggregate([{ $match: filter }, { $group: { _id: groupBy, publisher_name: { $first: "$publisher_name" }, "click": { $sum: '$click' }, 'conversion': { $sum: '$conversion' } } }]).sort(sortBy).limit(limit).allowDiskUse(true);
}
// PublisherSummary.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
//     return await this.aggregate([
//         { $match: filter },
//         {
//             $group: {
//                 _id: group_by,
//                 count: { $sum: 1 },
//                 click: { $sum: "$click" },
//                 unique_click: { $sum: "$unique_click" },
//                 conversion: { $sum: "$conversion" },
//                 pre_conversion: { $sum: "$pre_conversion" },
//                 unique_conversion: { $sum: "$unique_conversion" },
//                 revenue: { $sum: "$revenue" },
//                 payout: { $sum: "$payout" },
//                 network_id: { $last: "$network_id" },
//                 publisher_id: { $last: "$publisher_id" },
//                 publisher_name: { $last: "$publisher_name" },
//             }
//         }
//     ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
// };
AppSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}
AppSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
AppSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
AppSummary.statics.exportAppSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}

SummaryLogSchema.statics.getLastLogTimeSlot = async function (
    network_id,
    report_name
) {
    return await this
        .find({ network_id: network_id, report_name: report_name }, { timeSlot: 1 })
        .sort({ timeSlot: -1 })
        .limit(1);
};

SourceOfferPublisherSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}
SourceOfferPublisherSummary.statics.findSlotDoc = async function (filter) {
    return await this.findOne(filter);
}
SourceOfferPublisherSummary.statics.updateSlotDoc = async function (filter, reflect) {
    return await this.updateOne(filter, { $set: reflect });
}
SourceOfferPublisherSummary.statics.exportAffiliateSummary = async function (filter, groupBy, option) {
    return await this.aggregate([{ $match: filter },
    { $group: { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" } } }, { $sort: option['sort'] }]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}

// ========
SourceOfferPublisherSummary.statics.getReportsSummary = async function (filter, project) {
    return await this.find(filter, project).lean().cursor();
}
SourceOfferPublisherSummary.statics.getOffersForAutoBlock = async function (filter, project, groupBy) {
    return await this.aggregate([
        { $match: filter },
        { $project: project },
        { $group: groupBy },
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
}

SourceOfferPublisherSummary.statics.statsCount = async function (filter, group, sort) {
    return await this.aggregate([{ $match: filter }, { $group: group }]).sort(sort).allowDiskUse(true);
}
SourceOfferPublisherSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
SourceOfferPublisherSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}

AdvertiserOfferPublisherSourceSummary.statics.updateOneDoc = async function (filter, update, options) {
    return await this.updateOne(filter, update, options);
}
AdvertiserOfferPublisherSourceSummary.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}
AdvertiserOfferPublisherSourceSummary.statics.fetchReportAsStream = async function (filter) {
    return await this.find(filter).lean().cursor({ batchSize: 1000 });
}
AdvertiserOfferPublisherSourceSummary.statics.totalAppidPublisherSummary = async function (filter, grossTotalProjection) {
    return await this.aggregate([
        { $match: filter },
        { $group: grossTotalProjection }
    ]).allowDiskUse(true);
}
AdvertiserOfferPublisherSourceSummary.statics.getAppidPublisherSummary = async function (filter, groupBy, options) {
    if (options['limit'] > 0 && options['skip'] >= 0) {
        return await this.aggregate([
            { $match: filter },
            // { $project: project },
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
        // { $project: project },
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
LiveDaily_AdvertiserOfferPublisherSourceSummary.statics.updateOneDoc = async function (filter, update, options) {
    return await this.updateOne(filter, update, options);
}
LiveDaily_AdvertiserOfferPublisherSourceSummary.statics.countStats = async function (filter, groupBy) {
    return await this.aggregate([{ $match: filter }, { $group: groupBy }]);
}
LiveDaily_AdvertiserOfferPublisherSourceSummary.statics.getAppidPublisherSummary = async function (filter, groupBy, options) {
    if (options['limit'] > 0 && options['skip'] >= 0) {
        return await this.aggregate([
            { $match: filter },
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
        // { $project: project },
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
LiveDaily_AdvertiserOfferPublisherSourceSummary.statics.totalAppidPublisherSummary = async function (filter, grossTotalProjection) {
    return await this.aggregate([
        { $match: filter },
        { $group: grossTotalProjection }
    ]).allowDiskUse(true);
}
OffersSourceAdvAffSummary.statics.insertManyDocs = async function (docs) {
    return await this.insertMany(docs, { ordered: false });
}

LiveDaily_AdvertiserOfferPublisherSourceSummary.statics.fetchDailySummaryUsingStream = async function (filter, group_by) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: group_by,
                count: { $sum: 1 },
                click: { $sum: "$click" },
                // unique_click: { $sum: "$unique_click" },
                conv: { $sum: "$conv" },
                // pre_conversion: { $sum: "$pre_conversion" },
                // unique_conversion: { $sum: "$unique_conversion" },
                rev: { $sum: "$rev" },
                pay: { $sum: "$pay" },
                N_id: { $last: "$N_id" },
                nid: { $last: "$nid" },
                source: { $last: "$source" },
                // advertiser_name: { $last: "$advertiser_name" },
                A_id: { $last: "$A_id" },
                aid: { $last: "$aid" },
            }
        }
    ]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
};
module.exports.OffersSourceAdvAffSummaryModel = Mongoose.model(
    "source_offer_adv_pub_summary",
    OffersSourceAdvAffSummary
);
module.exports.SourceSummaryModel = Mongoose.model('Source_Summary', SourceSummary);
module.exports.SourceAdvertiserAffiliateSummaryModel = Mongoose.model('Source_Advertiser_Affiliate_Summary', SourceAdvertiserAffiliateSummary);
module.exports.SourceAdvertiserSummaryModel = Mongoose.model('Source_Advertiser_Summary', SourceAdvertiserSummary);
module.exports.SourceAffiliateSummaryModel = Mongoose.model('Source_Affiliate_Summary', SourceAffiliateSummary);
module.exports.DailySummaryModel = Mongoose.model('Daily_Summary', DailySummary);
module.exports.AdvertiserSummaryModel = Mongoose.model('Advertiser_Summary', AdvertiserSummary);
module.exports.PublisherSummaryModel = Mongoose.model('Publisher_Summary', PublisherSummary);
module.exports.SummaryLogModel = Mongoose.model('summary_log', SummaryLogSchema);
module.exports.AppSummaryModel = Mongoose.model('App_Summary', AppSummary);
module.exports.DailyAdvertiserOfferPublisherSummaryModel = Mongoose.model('daily_advertiser_offer_publisher_summary', AdvertiserOfferPublisherSummary); //model name different
module.exports.MonthlyAdvertiserOfferPublisherSummaryModel = Mongoose.model('monthly_advertiser_offer_publisher_summary', MonthlyAdvertiserOfferPublisherSummary);
module.exports.DailySourceOfferAdvertiserPublisherSummaryModel = Mongoose.model(
    'daily_source_offer_advertiser_publisher_summary',
    OffersSourceAdvAffSummary
);
module.exports.MonthlySourceOfferAdvertiserPublisherSummaryModel = Mongoose.model(
    'monthly_source_offer_advertiser_publisher_summary',
    OffersSourceAdvAffSummary
);
module.exports.DailySourceAdvertiserSummaryModel = Mongoose.model('daily_source_advertiser_summary', SourceAdvertiserSummary);
module.exports.MonthlySourceAdvertiserSummaryModel = Mongoose.model('monthly_source_advertiser_summary', SourceAdvertiserSummary);
module.exports.DailySourcePublisherSummaryModel = Mongoose.model('daily_source_publisher_summary', SourceAffiliateSummary);
module.exports.MonthlySourcePublisherSummaryModel = Mongoose.model('monthly_source_publisher_summary', SourceAffiliateSummary);
module.exports.SourceOfferPublisherSummaryModel = Mongoose.model('source_offer_publisher_summary', SourceOfferPublisherSummary);
module.exports.LiveAdvOffPubSouSummaryModel = Mongoose.model("live_advertiser_offer_publisher_source_summary", AdvertiserOfferPublisherSourceSummary);
module.exports.LiveDaily_AdvertiserOfferPublisherSourceSummary = Mongoose.model("liveDaily_advertiser_offer_publisher_source_summary", LiveDaily_AdvertiserOfferPublisherSourceSummary);
