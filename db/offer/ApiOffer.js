const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { ApiOffers } = require("../Model");

ApiOffers.statics.getSearchOffer = async function (search, projection, options) {
    return await this.find(search, projection, options).lean();
}
ApiOffers.statics.updateOffer = async function (search, reflect, options) {
    return await this.updateOne(search, { $set: reflect }, options);
}
ApiOffers.statics.updateManyOffer = async function (search, reflect, options) {
    return await this.updateMany(search, { $set: reflect }, options);
}
ApiOffers.statics.findandupdateOffer = async function (search, reflect, ) {
    return await this.findOneAndUpdate(search, { $set: reflect });
}
ApiOffers.statics.getOneOffer = async function (search) {
    return await this.findOne(search).lean();
}
ApiOffers.statics.insertManyOffers = async function (ApiOffers) {
    return await this.insertMany(ApiOffers, { ordered: false });
}
ApiOffers.statics.getTotalPagesCount = async function (search) {
    return await this.find(search).count();
}
ApiOffers.statics.deleteOffer = async function (search) {
    return await this.findOneAndDelete(search);
}
ApiOffers.statics.deleteBulkOffer = async function (search) {
    return await this.deleteMany(search, { multi: true });
}
ApiOffers.statics.getSearchOfferAndCountDoc = async function (search, projection, skip, sort, limit) {
    return await this.aggregate([{ $match: search }, { $sort: sort },{
       
        $facet: {
            "result": [ { $project: projection },  { $skip: skip }, { $limit: limit }],
            "totalOffers": [ { $count: "count" }]
        }
    }]);
}
ApiOffers.statics.getAggregateSearch = async function (filter, group_byProjection) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: group_byProjection
        }
    ]).read('secondary');
};

ApiOffers.statics.getAggregatePipelineSearch = async function (filter, group_byProjection, next_pipeline) {
    return await this.aggregate([
        { $match: filter },
        {
            $group: group_byProjection
        },
        next_pipeline
    ]).read('secondary');
};
module.exports = Mongoose.model('apioffer', ApiOffers);
