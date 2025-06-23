const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { PublisherOffers } = require("../../Model");
MongooseAutoIncrement.initialize(Mongoose.connection);
// PublisherOffers.plugin(MongooseAutoIncrement.plugin,
//     {
//         model: 'publisherOffer',
//         field: 'pid',
//         startAt: 1
//     });

PublisherOffers.statics.insertOrUpdatePublisherOffer = async function (search,setpublisherOffers) {
    return await this.updateOne(search, { $setOnInsert: setpublisherOffers }, { upsert: true });
}


module.exports = Mongoose.model('publisher_offers', PublisherOffers);




