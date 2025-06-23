const Mongoose = require('mongoose');

const { PublisherOfferRequest } = require("../Model");

PublisherOfferRequest.statics.isOfferExists = async function(filter, projection) {
    return await this.find(filter, projection).lean();
}

PublisherOfferRequest.statics.updateLiveOffer = async function (filter1, apply) {
    return await this.findOneAndUpdate(filter1, apply);
}

PublisherOfferRequest.statics.bulkInsertRequest = async function (request) {
    return await this.insertMany(request);
}
// LiveOffer.statics.getPublisherOffer = async function (search, projection) {
//   return await this.find(search, projection);
// }
PublisherOfferRequest.statics.getTotalPagesCount = async function (search) {
  return await this.countDocuments(search);
}

PublisherOfferRequest.statics.getOffers = async function(filter, projection,options){
    return await this.find(filter, projection, options).lean();
}
PublisherOfferRequest.statics.getPublisherOffer = async function (search, groupProjection) {
    
    return await this.aggregate([{ $match: search }, { $group: groupProjection }]);
}
PublisherOfferRequest.statics.approvedStatusOfferPublisher = async function (search, projection,options) {
    return await this.updateMany(search, projection,options);
}
PublisherOfferRequest.statics.rejectedStatusOfferPublisher = async function (search, projection,options) {
    return await this.updateMany(search, projection,options);
}
PublisherOfferRequest.statics.changeStatusOfferPulbisher = async function (search, projection, options) {
    return await this.findOneAndUpdate(search, projection, options)
}
module.exports = Mongoose.model('publisher_offer_request', PublisherOfferRequest)
  
// module.exports = Mongoose.model('liveOffer', LiveOffer)
