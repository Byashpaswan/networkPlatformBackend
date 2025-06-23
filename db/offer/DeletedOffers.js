const Mongoose = require('mongoose');
const { DeletedOffers } = require("../Model");


DeletedOffers.statics.saveOldOffers = async function (oldOffers) {
    return await this.insertMany(oldOffers, { ordered: false });
}
DeletedOffers.statics.getOneOffer = async function (search, projection, readFromSecondary = false) {
    if (readFromSecondary) {
        return await this.findOne(search, projection).lean().read('secondary');
    }
    else {
        return await this.findOne(search, projection).lean();
    }
}
DeletedOffers.statics.deleteManyOffers = async function (search) {
    return await this.deleteMany(search);
}
DeletedOffers.statics.getSearchOffer = async function (search, projection, options, readFromSecondary = false) {
    if (readFromSecondary) {
        return await this.find(search, projection, options).lean().read('secondary');
    }
    else {
        return await this.find(search, projection, options).lean();
    }
}
module.exports.DeletedOffersModel = Mongoose.model('deleted_offer', DeletedOffers);