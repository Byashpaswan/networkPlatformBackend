const Mongoose = require('mongoose');
const { advertiserOfferNetwork } = require("./Model");
// advertiserOfferNetwork : advertiserOfferNetwork ,
// advOfferIdLocationInUrl : advOfferIdLocationInUrl ,

advertiserOfferNetwork.statics.insertData  = async function (data) {
  return await this.insertMany(data);
}

advertiserOfferNetwork.statics.getData  = async function( search , projection) {
  return await this.find(search , projection ) ;
}

module.exports = Mongoose.model('goalIdentified_offer', advertiserOfferNetwork);
