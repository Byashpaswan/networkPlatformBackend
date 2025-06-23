const Mongoose = require('mongoose');
const mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Redis = require('../helpers/Redis');
const advertiserOfferNetworkModel = require('../db/advertiserOfferNetwork')
const advOfferIdLocationInUrlModel = require('../db/advOfferIdLocationInUrl');

async function findAdv_Offer_network (search , projection ) {
  try{

    const data =  await advertiserOfferNetworkModel.getData(search , projection) ;
    if(data && data.length > 0 ){
    return data ;
    }else{
      return [];
    }

  }catch(error){
    console.log("Error : " , error) ;

  }
}

async function getDataByDomain  (search , projection) {
  try{
    if(!search){
      return 'please provide valid domain.' ;
    }
    const data  = await advOfferIdLocationInUrlModel.getData(search , projection);
    if(data && data.length > 0 ){
      return data;
    }else{
      return [];
    }
  }catch(error){
    throw error ;
  }
}

async function saveDomainInDb  (data){
  try {

    if(data.length > 0 ){
    const result =  await advOfferIdLocationInUrlModel.insertData(data);
    return result ;
    }
  } catch (error) {
    console.error("Error inserting documents:", error);
    throw error; // Re-throw the error to propagate it to the caller
  }

}

async function insertAdv_Offer_network (data) {
  try {
    if(data.length > 0 ){
    const result = await advertiserOfferNetworkModel.insertData(data);
    return result  ;
    }
  } catch (error) {
    console.error("Error inserting documents of advertiserOfferNetwork:", error);
    throw error; // Re-throw the error to propagate it to the caller
  }

};

async function getDataAdv_Offer_network (search, projection){
  try {
    const data = await advertiserOfferNetworkModel.getData(search ,projection);
    return data;
  } catch (error) {
    console.error('Error getDataing data:', error);
    throw error; // Re-throw the error to propagate it to the caller
  }
};



exports.getData_domain_from_db  = async (search, projection) => {
  try {
    const data  = await advOfferIdLocationInUrlModel.getData(search , projection);
    return data;
  } catch (error) {
    console.error('Error getDataing domain:', error);
    throw error; // Re-throw the error to propagate it to the caller
  }
};


async function  find_domain (host, advertiser_platform_id){
  try {
    let domain = await Redis.getRedisData(`DM:${host}:${advertiser_platform_id}`);
    if (domain && domain.data) {
      return true ; // Domain found in Redis
    } else {
      let data = await getDataByDomain({ 'host': host, 'aPlId': mongooseObjectId(advertiser_platform_id) }, { createdAt: 0, ofl: 0, loc: 0, updatedAt: 0, _id: 0 }); // fetch from db
      if ( data && data.length > 0) {
        // Store a boolean value 'true' in Redis to indicate presence of the domain
        await Redis.setRedisData(`DM:${host}:${advertiser_platform_id}`, true, process.env.REDIS_Exp);
        return true; // Domain found in the database
      } else {
        return false; // Domain not found in the database
      }
    }
  } catch (error) {
    console.log("Error: ", error);
    throw error; // Re-throw the error to propagate it to the caller
  }
}

const find_Adv_Offer_Network_with_redis = async (id) => {
  try {
    let adv_Offer_net_data = await Redis.getRedisData(`AON:${id}`);

    if (adv_Offer_net_data && adv_Offer_net_data.data) {
      return true;
    } else {
      let data = await findAdv_Offer_network({ '_id':  mongooseObjectId(id) }, { _id : 1 }); // fetch from db
      if (data && data.length > 0) {
        await Redis.setRedisData(`AON:${id}`, true, process.env.REDIS_Exp);
        return true;
      }
      else {
        return false;
      }
    }
  } catch (error) {
    console.log("Error: ", error);
    throw error; // Re-throw the error to propagate it to the caller
  }
};

exports.saveGoalBasedOfferInAdvertiserOfferNetwork = async (result) => {
  let data = [];
  // const adv_off_network_data = await find_Adv_Offer_Network_with_redis();
  for (let item of result) {
    if (item.goal && item.goal.length > 0) {
      if (!(await find_Adv_Offer_Network_with_redis(item._id))) {
        data.push({
          _id: mongooseObjectId(item._id),                               // Offer_id
          aPlId: mongooseObjectId(item.advertiser_platform_id),         // advertiser_platform_id
          N_id: mongooseObjectId(item.network_id),                     //  network_id
          A_id: mongooseObjectId(item.advertiser_id),                 //  advertiser_id
          aid: item.aid,                                             // advertiser id numeric
          nid: item.nid,                                            // network id numeric
          plid: item.plid,                                         // publisher id numeric
        });
      }
    }
  }

  try {
   await insertAdv_Offer_network(data);
  } catch (error) {
    console.error("Error:", error);
  }
}

const isValidUrl = (inputUrl) => {
  const urlRegex = /^(https?:\/\/[a-z0-9A-Z.-]*)(:[0-9]*)?((\/.*)|(\/?))$/
  return urlRegex.test(inputUrl);
}


exports.FindOfferIdLocation = async (url, offer_id, domainMap) => {
  // let data = [];
  let in_path_match = false;
  let in_query_match = false;
  let indexes = [];

  try {
    if (isValidUrl(url)) {
      const newUrl = new URL(url);

      // Check if offer_id is present in the pathname
      if (newUrl.pathname.includes(offer_id + "")) {
        in_path_match = true;
        const path_value = newUrl.pathname.split('/');
        // if multiple times matched  in path
        // if in query a=34&b=44&c=34  and offer_id = 34 , save this value two times.
        for (let i = 0; i < path_value.length; i++) {
          if (path_value[i] == offer_id + '') {
            indexes.push(i);
          }
        }
      }

      let foundPath = false;
      // Check if domainData is provided
      let indx = -1;
      if (in_path_match) {
        for (let index of indexes) {
          indx = domainMap.get(`${newUrl.hostname}:path:${index}`);
          if (indx) {
            // Element found, index contains the index of the element
            foundPath = true;
            let data = domainMap.get(`${newUrl.hostname}:path:${index}`);
            if (data['count']) {
              data['count'] += 1;
            }
            domainMap.set(`${newUrl.hostname}:path:${index}`, data);

          } else {
            // Element not found
            foundPath = false;
          }

          // If not found in domainData, add a new entry
          if (!foundPath) {
            domainMap.set(
              `${newUrl.hostname}:path:${index}`
              , {
                host: newUrl.hostname,
                ofl: 'path',
                loc: index,
                count: 1
              });
          }
        }
      }

      // Check if offer_id is present in the query parameters
      if (newUrl.search.includes(offer_id + '')) {
        in_query_match = true;
        let indx = -1;
        for (const [key, value] of newUrl.searchParams.entries()) {
          let foundQuery = false;
          indx = domainMap.get(`${newUrl.hostname}:query:${key}`);
          if (indx) {
            // Element found, index contains the index of the element
            foundQuery = true;
            let data = domainMap.get(`${newUrl.hostname}:query:${key}`);
            if (data['count']) {
              data['count'] += 1;
            }
            domainMap.set(`${newUrl.hostname}:query:${key}`, data);

          } else {
            // Element not found
            foundQuery = false;
          }
          // If not found in domainData, add a new entry
          if (!foundQuery) {
            if (offer_id == value) {
              domainMap.set(
                `${newUrl.hostname}:query:${key}`,
                {
                  host: newUrl.hostname,
                  ofl: "query",
                  loc: key,
                  count: 1
                });
            }
          }
          in_query_match = false;
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}


// // save domain into db if this domain  , location and key of offer_id is not present in domain
// save domain into db if this domain, location, and key of offer_id is not present in domain
exports.saveDomain = async (domainMap, advertiser_platform_id, network_id) => {

  let data = [];
  let mymap = new Map();

  if (domainMap && domainMap.size > 0) {
    const sortedArray = Array.from(domainMap.entries()).sort((a, b) => a[1].count - b[1].count);
    for (let i = sortedArray.length - 1; i >= 0; i--) {
        const domain = sortedArray[i][1];
        if (domain.count > 5 && !mymap.get(domain.host)) {
            mymap.set(domain.host, true);
            if (!(await find_domain(domain.host, advertiser_platform_id))) {
                delete domain.count;
                const newData = { ...domain, 'aPlId': mongooseObjectId(advertiser_platform_id), 'N_id': mongooseObjectId(network_id) };
                data.push(newData);
            }
        }
    }
  }

    // save new domain into db
   await saveDomainInDb(data);

}
