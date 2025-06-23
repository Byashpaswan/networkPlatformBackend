const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const advOfferIdLocationInUrl = new  Mongoose.Schema(
  {

    host  : {
      type : String,   //domain

    },
    ofl:{
    type : String ,   // offer find location
    },
    loc : {
      type : String ,   // location  index or key of query 
    } ,
    aPlId: {
      type: objectIdType,    //advertiser_platform_id
    },
    N_id : {
      type: objectIdType,   // network_id
    },
  } , {timestamps : true }) ;

  module.exports =  advOfferIdLocationInUrl ;


