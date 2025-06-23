
const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const advertiserOfferNetwork = new  Mongoose.Schema(
  {
    aPlId : {
      type : objectIdType,    // advertiser_platform_id

    },
    N_id:{
    type : objectIdType ,   // network_id
    },
    A_id : {
      type : objectIdType ,  // advertiser_id
    } ,
    aid: {
      type: Number,    //  advertiser id numeric
    },
    nid: {
      type: Number,    // network id numeric
    },
    plid: {
      type : Number ,    // publiser id numeric 
    }

  } , {timestamps : true }) ;

  module.exports =  advertiserOfferNetwork ;


