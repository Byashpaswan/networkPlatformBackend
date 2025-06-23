const Mongoose = require('mongoose');
const { BlockOffer } = require("../Model");


BlockOffer.statics.findAllBlockOffer = async function (filter, projections = {}, options = {}) {
    return await this.find(filter, projections, options).lean();
}

BlockOffer.statics.findOneBlockOffer = async function (filter, projections = {}) {
    return await this.findOne(filter, projections).lean();
}

BlockOffer.statics.findOneAndUpdateBlockOffer = async function (filter, data) {
    return await this.findOneAndUpdate(filter, data);
}

BlockOffer.statics.updateManyBlockOffer = async function (filter, data) {
    return await this.updateMany(filter, data, { upsert: true });
}

BlockOffer.statics.insertManyBlockOffer = async function (data, options = {}) {
    return await this.insertMany(data, { ordered: false });
}

BlockOffer.statics.deleteOneBlockOffer = async function (filter, options = {}) {
    return await this.deleteOne(filter, options);
}

BlockOffer.statics.deleteManyBlockOffer = async function (filter, options = {}) {
    return await this.deleteMany(filter, options);
}

module.exports = Mongoose.model('block_offer', BlockOffer);