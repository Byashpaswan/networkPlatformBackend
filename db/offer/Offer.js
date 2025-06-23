const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { Offers } = require("../Model");

Offers.statics.getSearchOffer = async function (search, projection, options, readFromSecondary = false) {
    if (readFromSecondary) {
        return await this.find(search, projection, options).lean().read('secondary');
    }
    else {
        return await this.find(search, projection, options).lean();
    }
}
Offers.statics.updateOffer = async function (search, reflect, options) {
    if (!options['timestamps']) {
        options['timestamps'] = false;
    }
    return await this.findOneAndUpdate(search, reflect, options);
}
Offers.statics.updateManyOffer = async function (search, reflect, options) {
    if (!options['timestamps']) {
        options['timestamps'] = false;
    }
    return await this.updateMany(search, reflect, options);
}
Offers.statics.findandupdateOffer = async function (search, reflect,) {
    return await this.findOneAndUpdate(search, { $set: reflect }, { timestamps: false });
}
Offers.statics.getOneOffer = async function (search, projection, readFromSecondary = false) {
    if (readFromSecondary) {
        return await this.findOne(search, projection).lean().read('secondary');
    }
    else {
        return await this.findOne(search, projection).lean() || {};
    }
}
Offers.statics.getSubDocument = async function (search, reflect, options) {
    return await this.updateOne(search, { $pull: reflect }, options);
}
Offers.statics.setSubDocument = async function (search, reflect, options) {
    return await this.updateOne(search, { $addToSet: reflect }, options);
}
Offers.statics.setPublisherPayoutPercent = async function (search, reflect) {
    return await this.updateOne(search, { $set: reflect });
}
Offers.statics.insertManyOffers = async function (offers) {
    return await this.insertMany(offers);
}
Offers.statics.getTotalPagesCount = async function (search) {
    return await this.countDocuments(search).read('secondary');
}

Offers.statics.deleteOffer = async function (search) {
    return await this.findOneAndDelete(search);
}
Offers.statics.deleteBulkOffer = async function (search) {
    return await this.deleteMany(search, { multi: true });
}
Offers.statics.getSearchOfferAndCountDoc = async function (search, projection, skip, sort, limit) {
    return await this.aggregate([
        { $match: search }, { $sort: sort }, {

            $facet: {
                "result": [{ $project: projection }, { $skip: skip }, { $limit: limit }],
                "totalOffers": [{ $count: "count" }]
            }
        }]);
}
Offers.statics.getAggregatePipelineSearch = async function (filter, group_byProjection, next_pipeline) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: group_byProjection
        },
        next_pipeline
    ]).read('secondary');
};
Offers.statics.updatePublisherOfferStatusValue = async function (filter, setValue) {
    return await this.updateOne(filter, setValue);
}

Offers.statics.getOffersByBatch = async function (filter, projection) {
    return await this.find(filter, projection).lean().cursor();
}
Offers.statics.countOffers = async function (filter) {
    return await this.countDocuments(filter);
}

Offers.statics.updateStatus = async function(filter , reflect){
    return await this.updateOne(filter , {$set : reflect});
}
Offers.statics.offersCount = async function (filter, group, sort) {
    return await this.aggregate([{ $match: filter }, { $group: group }]).sort(sort);
}

Offers.statics.getDistinctOfferKeys = async function (filter, key) {
    return await this.distinct(key, filter);
}

Offers.statics.fetchSummaryUsingStream = async function (filter, group_byProjection, next_pipeline) {
    return await this.aggregate([{ $match: filter }, { $group: group_byProjection }, next_pipeline]).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();
};

Offers.statics.getAllOfferByCursor = async function (search, projection, options) {
    return await this.find(search, projection, options).cursor({ batchSize: 1000 });
}

Offers.statics.getOffers = async function (match, project, sort, skip, limit) {
    return await this.aggregate([
        { $match: match },
        { $project: project },
        { $sort: sort },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }]
            }
        }
    ]).allowDiskUse(true);
};
Offers.statics.getofferCountByApp_id = async function( pipeline){
    return await this.aggregate(pipeline) ; 
}
Offers.statics.findOfferCountByAppId = async function(filter){
    return await this.countDocuments(filter) ; 
}

module.exports = Mongoose.model('offer', Offers);