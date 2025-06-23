const Mongoose = require('mongoose');
const { advOfferIdLocationInUrl } = require("./Model");

advOfferIdLocationInUrl.statics.insertData  = async function (data ) {
  return await this.insertMany(data);
}

advOfferIdLocationInUrl.statics.getData  = async function( search , projection) {
  return await this.find(search , projection ) ;
}

module.exports = Mongoose.model('adv_Offer_Id_Location_In_Url', advOfferIdLocationInUrl);




