
const Response = require('../helpers/Response');
const mongoose = require('mongoose');
const mongoObjectId = mongoose.Types.ObjectId;

const Redis = require('../helpers/Redis');
const Offer = require('../db/offer/Offer');
const advOfferIdLocationInUrlModel  = require('../db/advOfferIdLocationInUrl')

const getOffer = async (net , adv_pl , adv_off_id) => {
  try {
    const offer_data = await Redis.getRedisData(`OF:${adv_off_id}:advPl:${adv_pl}:net:${net}`);
    if (offer_data && offer_data.data) {
      return JSON.parse(offer_data.data);
    } else {
    const search = { network_id: mongoObjectId(net) , advertiser_platform_id : mongoObjectId(adv_pl)  , advertiser_offer_id : adv_off_id  } ; // fetch  offers data by adv_off_hash
    const projection = { adv_off_hash : 1 , advertiser_offer_id : 1  , network_id : 1  , advertiser_name : 1 };
    const data = await Offer.getSearchOffer( search , projection , {} );
    if (data && data.length > 0) {
    await Redis.setRedisData(`OF:${adv_off_id}:advPl:${adv_pl}:net:${net}`, JSON.stringify(data), process.env.REDIS_Exp);
      return data;
    } else {
      return [];
    }
    }
  } catch (error) {
    throw error;
  }
};


const find_Domain_with_redis = async (search) => {
  try {
    let domain_data = await Redis.getRedisData(`DM:${search['host']}`);
    if (domain_data && domain_data.data) {
      return JSON.parse(domain_data.data) ;
    } else {
    // const projection = { createdAt: 0, updatedAt: 0, _id: 1  , ofl : 1  , loc : 1 , };
    const data = await advOfferIdLocationInUrlModel.getData(search , {}); 
    if (data && data.length > 0) {
      await Redis.setRedisData(`DM:${search['host']}`,  JSON.stringify(data) , process.env.REDIS_Exp) ;
      return data;
    }
    else {
      return [];
    }
    }
  } catch (error) {
    console.log("Error: ", error);
    throw error; // Re-throw the error to propagate it to the caller
  }
};


const isValidUrl = (inputUrl) => {
  const urlRegex = /^(https?:\/\/[a-z0-9A-Z.-]*)(:[0-9]*)?((\/.*)|(\/?))$/
  return urlRegex.test(inputUrl);
}


exports.getAdvertiserOfferData  = async (req, res) => {
  const { url } = req.body;
  let offer_data = [];
  if (!isValidUrl(url)) {
    let response = Response.error();
    response.error = ['Url is not valid'];
    response.msg = 'Something went wrong. Please try again later.';
    return res.status(200).json(response);
  }
  const newUrl = new URL(url);
  const host = newUrl.hostname;
  try {
    // fetch data using domain name .
    const data =  await find_Domain_with_redis({ "host": host });

    if (data && data.length > 0 ) {
      for(let ele of data) {
        let advertiser_offer_id = ''
       // find if in query adv_off_id
        if ( ele.ofl.toLowerCase() == 'query') {
          for (const [key, value] of newUrl.searchParams.entries()) {
            if (key == ele.loc.toLowerCase()) {
              advertiser_offer_id = value;
            const offer_data_from_Db = await getOffer(ele.N_id , ele.aPlId , advertiser_offer_id ) ;
            if (offer_data_from_Db && offer_data_from_Db.length > 0) {
              offer_data_from_Db.map(ele=>{
                let value = ele['_id'];
                delete ele['_id'];
                ele['offer_id']  = value ; 
                offer_data.push(ele);
              })
            }
           }
          }
        }

        // find if in path adv_off_id
        if(ele.ofl == 'path'){
          const path_value  = newUrl.pathname.split('/') ;
          advertiser_offer_id = path_value[ele.loc] ;
          const offer_data_from_Db = await getOffer(ele.N_id , ele.aPlId , advertiser_offer_id );
          if(offer_data_from_Db && offer_data_from_Db.length > 0 ){
            offer_data_from_Db.map( ele => {
              let value = ele['_id'];
              delete ele['_id'];
              ele['offer_id']  = value ;
              offer_data.push(ele) ;
            })
          }
        }
      }
    }else{
        let response = Response.error();
        response.error = ['Domain not found in to Database'];
        response.msg = 'Something went wrong. Please try again later.' ;
        return res.status(200).json(response);
    }

    if(offer_data && offer_data.length){
      let response = Response.success();
        response.msg = 'Success';
        response.payload = offer_data;
        response['no. of offer found '] = offer_data.length ;
        return res.status(200).json(response);
    }else{
      let response = Response.error();
    response.error = ['no any offer found by domain '];
    response.msg = 'Something went wrong. Please try again later.';
    return res.status(200).json(response);
    }

  } catch (error) {
    let response = Response.error();
    response.error = ['Url not found '];
    response.msg = 'Something went wrong. Please try again later. ';
  }

}

