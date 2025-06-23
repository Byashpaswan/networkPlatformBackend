const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Publisher offer api");
const mongooseObjectId = Mongoose.Types.ObjectId;
const offersModel = require("../../db/offer/Offer");
const Response = require('../../helpers/Response');
const NetworkModel = require("../../db/network/Network");
const { payloadType } = require('../../constants/config');
var Moment = require('moment');
const Redis = require('../../helpers/Redis');
const { config } = require('../../constants/Global');
const PublisherLogModel = require("../../db/PublisherLog/PublisherLog") ;

exports.getPublisherOffer = async (req, res) => {
    req.setTimeout(800000);
    try {
        let publisherData = req.publisherData;
        if (publisherData['pid'] && publisherData['network_id']) {
            let networkData = await getNetworkData(publisherData['network_id']);
            if (!networkData) {
                let response = Response.error();
                response.msg = "Invalid Request, Contact Your Manager";
                return res.status(200).json(response);
            }
            let networkUniqueId = networkData['network_unique_id'];
            let networkSetting = networkData['network_publisher_setting_string'] || "";
            let pubId = publisherData['pid'];
            let netId = publisherData['network_id'];
            let page = 1;
            let limit = 5000;
            let offerType = '';
            if (req.query.page) {
                page = checkNumaric(req.query.page);
                if (!page) {
                    let response = Response.error();
                    response.msg = "not a vaild page no";
                    return res.status(200).json(response);
                }
            }
            if (req.query.limit) {
                limit = checkNumaric(req.query.limit);
                if (!limit) {
                    let response = Response.error();
                    response.msg = "not a vaild limit";
                    return res.status(200).json(response);
                }
            }
            if (req.params.offerType) {
                offerType = req.params.offerType;
            }
            let checkOfferType = checkTypeOfOffers(offerType);
            if (!checkOfferType) {
                let response = Response.error();
                response.msg = "something wrong in url please check again";
                return res.status(200).json(response);
            }
            let offerData = await getOfferdata(pubId, page, limit, offerType, netId);
            if (!offerData) {
                let response = Response.error();
                response.msg = "no record found";
                return res.status(200).json(response);
            }
            let outputOffers = [];
            let linkDomain = `${networkUniqueId}.${process.env.TRACKING_DOMAIN}`;
            if (networkData['domain'] && networkData['domain']['tracker']) {
                linkDomain = networkData['domain']['tracker'];
            }
            for (let i in offerData) {
                let newObject = {};
                newObject['updatedAt'] = Moment(offerData[i]['updatedAt']).format('MMMM Do YYYY, h:mm:ss a');
                newObject['category'] = offerData[i]['category'];
                newObject['isCapEnabled'] = offerData[i]['isCapEnabled'];
                newObject['isTargeting'] = offerData[i]['isTargeting'];
                newObject['isgoalEnabled'] = offerData[i]['isgoalEnabled'];
                newObject['offer_id'] = offerData[i]['_id'];
                newObject['thumbnail'] = offerData[i]['thumbnail'];
                newObject['offer_name'] = offerData[i]['offer_name'];
                newObject['description'] = offerData[i]['description'];
                newObject['kpi'] = offerData[i]['kpi'];
                newObject['advertiser_id'] = offerData[i]['advertiser_id'];
                newObject['advertiser_name'] = offerData[i]['advertiser_name'];
                newObject['preview_url'] = offerData[i]['preview_url'];
                // newObject['expired_url']= offerData[i]['expired_url'];
                // newObject['start_date']= offerData[i]['start_date'];
                // newObject['end_date']= offerData[i]['end_date']; 
                newObject['currency'] = offerData[i]['currency'];
                newObject['revenue_type'] = offerData[i]['revenue_type'];
                newObject['offer_capping'] = offerData[i]['offer_capping'];
                newObject['geo_targeting'] = offerData[i]['geo_targeting'];
                newObject['device_targeting'] = offerData[i]['device_targeting'];
                newObject['creative'] = offerData[i]['creative'];
                newObject['goal'] = offerData[i]['goal'];
                newObject['tracking_link'] = '';
                newObject['approvalRequired'] = true;
                newObject['revenue'] = 0;
                newObject['status_label'] = '';
                if (offerData[i]['publisher_offers']) {
                    if (offerData[i]['publisher_offers'][0]['publisher_offer_status_label'] == 'no_link') {
                        newObject['tracking_link'] = '';
                        newObject['approvalRequired'] = true;
                    } else if (offerData[i]['publisher_offers'][0]['publisher_offer_status_label'] == 'active') {
                        newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offerData[i]['_id'] + "&aff_id=" + pubId + "&" + networkSetting.replace(/&adv_id=true/g, '');
                        newObject['approvalRequired'] = false;
                    }
                    if (offerData[i]['revenue'] !== 0) {
                        newObject['revenue'] = (offerData[i]['revenue'] * offerData[i]['publisher_offers'][0]['publisher_payout_percent']) / 100;
                    }
                    newObject['status_label'] = offerData[i]['publisher_offers'][0]['publisher_offer_status_label'];

                }
                outputOffers.push(newObject);
            }
            let response = Response.success();
            response.msg = "Success";
            response.payloadType = payloadType.array;
            response.payload = outputOffers
            return res.status(200).json(response);
        }
        let response = Response.error();
        response.msg = "something went wrong";
        return res.status(200).json(response);
    } catch (err) {
        debug(err)
        let response = Response.error();
        response.msg = "something went wrong";
        response.err = true;
        return res.status(200).json(response);
    }

}

// getPublisherId = async(apiKey,secretKey)=>{
//     try{
//         filter = {'api_details.api_key':apiKey,'api_details.secret_key':secretKey};
//         projection = {pid:1,network_id:1};
//         returnData = {};
//         publisherId = await publisherModel.findPublisher(filter,projection);
//         if(publisherId.length){
//             return publisherId;
//         }else{
//             return null;
//         }
//     }catch(err){
//         return null;
//     }
// }
getNetworkData = async (networkId) => {
    try {
        let res = await Redis.getRedisHashData('networks', networkId);
        if (res && res.data) {
            return res.data;
        }
        else {
            let networkData = await getNetworkFromDb(networkId);
            return networkData;
        }
    }
    catch {
        let networkData = await getNetworkFromDb(networkId);
        return networkData;
    }
}
getNetworkFromDb = async (networkId) => {
    try {
        let filter = { _id: mongooseObjectId(networkId) };
        let projection = { network_unique_id: 1, network_publisher_setting_string: 1, country: 1, status: 1, company_name: 1, domain: 1 };
        let networkData = await NetworkModel.findOneNetwork(filter, projection);
        if (networkData.length) {
            Redis.setRedisHashData('networks', networkId, networkData[0], 36000);
            return networkData[0];
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
}

getOfferdata = async (pubId, page, limit, offerType, networkId) => {
    try {
        let dateTo = Moment().endOf('day').format();
        let dateFrom = Moment().startOf('day').subtract(3, 'd').format();
        let filter = {
            network_id: mongooseObjectId(networkId),
            status: 1,
            $or: [
                { 'offer_visible': { $in: ['public', 'approval_required'] } },
                { 'pubOff.id': +pubId }
            ],
            updatedAt: { $gte: dateFrom, $lte: dateTo }
        };
        if (offerType == "active_offers") {
            filter['$or'] = [
                { 'offer_visible': 'public' },
                { '$and': [{ 'pubOff.id': +pubId }, { 'pubOff.pubOffSt': 1 }] }
            ];
        } else if (offerType == "my-offers") {
            filter['isMyOffer'] = true;
        }
        let projection = {
            advertiser_id: 1,
            advertiser_name: 1,
            updatedAt: 1,
            category: 1,
            isCapEnabled: 1,
            payout: 1,
            approvalRequired: 1,
            isCapEnabled: 1,
            isTargeting: 1,
            isgoalEnabled: 1,
            thumbnail: 1,
            offer_name: 1,
            description: 1,
            kpi: 1,
            preview_url: 1,
            currency: 1,
            "payout_type.enum_type": 1,
            offer_capping: 1,
            "geo_targeting.country_allow": 1,
            "geo_targeting.country_deny": 1,
            "geo_targeting.city_allow": 1,
            "geo_targeting.city_deny": 1,
            device_targeting: 1,
            creative: 1,
            goal: 1,
            offer_visible: 1,
            pubOff: { $elemMatch: { id: +pubId } }
        };
        let sort = { updatedAt: -1 };
        let data = await offersModel.getSearchOffer(filter, projection, { limit: +limit, skip: +(page - 1) * limit, sort: sort });
        if (data.length) {
            return data;
        } else {
            return null;
        }
    } catch (err) {
        debug(err);
        return null;
    }
}

checkNumaric = (number) => {
    if (isNaN(number)) {
        return null;
    } else {
        return number;
    }
}

checkTypeOfOffers = (offerType) => {
    try {
        let existingType = ['get-offers', 'my-offers'];
        if (offerType && existingType.includes(offerType)) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
}

exports.fetchPublisherOffer = async (req, res) => {
    req.setTimeout(800000);
    try {
        let publisherData = req.publisherData;
        if (publisherData['pid'] && publisherData['network_id']) {
            let networkData = await getNetworkData(publisherData['network_id']);
            if (!networkData) {
                let response = Response.error();
                response.msg = "Invalid Request, Contact Your Manager";
                return res.status(200).json(response);
            }
            let networkUniqueId = networkData['network_unique_id'];
            let networkSetting = networkData['network_publisher_setting_string'] || "";
            let pubId = publisherData['pid'];
            let netId = publisherData['network_id'];
            let page = 1;
            let limit = 5000;
            let offerType = '';
            if (req.query.page) {
                page = checkNumaric(req.query.page);
                if (!page) {
                    let response = Response.error();
                    response.msg = "not a vaild page no";
                    return res.status(200).json(response);
                }
            }
            if (req.query.limit) {
                limit = checkNumaric(req.query.limit);
                if (!limit) {
                    let response = Response.error();
                    response.msg = "not a vaild limit";
                    return res.status(200).json(response);
                }
            }
            if (req.query.offerType) {
                offerType = req.query.offerType;
            }
            let offerData = await getOfferdata(pubId, page, limit, offerType, netId);
            if (!offerData) {
                let response = Response.error();
                response.msg = "no record found";
                return res.status(200).json(response);
            }
            let linkDomain = `${networkUniqueId}.${process.env.TRACKING_DOMAIN}`;
            if (networkData['domain'] && networkData['domain']['tracker']) {
                linkDomain = networkData['domain']['tracker'];
            }
            let outputOffers = [];
            for (let i in offerData) {
                let newObject = {};
                newObject['updatedAt'] = Moment(offerData[i]['updatedAt']).format('MMMM Do YYYY, h:mm:ss a');
                newObject['category'] = offerData[i]['category'];
                newObject['isCapEnabled'] = offerData[i]['isCapEnabled'];
                newObject['isTargeting'] = offerData[i]['isTargeting'];
                newObject['isgoalEnabled'] = offerData[i]['isgoalEnabled'];
                newObject['offer_id'] = offerData[i]['_id'];
                newObject['thumbnail'] = offerData[i]['thumbnail'];
                newObject['offer_name'] = offerData[i]['offer_name'];
                newObject['description'] = offerData[i]['description'];
                newObject['kpi'] = offerData[i]['kpi'];
                //   newObject['advertiser_id'] = offerData[i]['advertiser_id'];
                //   newObject['advertiser_name'] = offerData[i]['advertiser_name'];
                newObject['preview_url'] = offerData[i]['preview_url'];
                // newObject['expired_url']= offerData[i]['expired_url'];
                // newObject['start_date']= offerData[i]['start_date'];
                // newObject['end_date']= offerData[i]['end_date']; 
                newObject['currency'] = offerData[i]['currency'];
                // newObject['revenue_type'] = offerData[i]['payout_type'];
                newObject['payout_type'] = offerData[i]['payout_type'];
                // newObject['offer_capping'] = offerData[i]['offer_capping'];
                newObject['geo_targeting'] = offerData[i]['geo_targeting'];
                newObject['device_targeting'] = offerData[i]['device_targeting'];
                newObject['creative'] = offerData[i]['creative'];
                // newObject['goal'] = offerData[i]['goal'];
                newObject['tracking_link'] = '';
                newObject['approvalRequired'] = true;
                // newObject['revenue'] = offerData[i]['payout'];
                newObject['payout'] = offerData[i]['payout'];
                newObject['status_label'] = 'new';
                if (offerData[i]['offer_visible'] == 'public') {
                    newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offerData[i]['_id'] + "&aff_id=" + pubId + "&" + networkSetting.replace(/&adv_id=true/g, '');
                    newObject['approvalRequired'] = false;
                    newObject['status_label'] = 'active';
                } else if (offerData[i]['pubOff'] && offerData[i]['pubOff'][0]) {
                    if (offerData[i]['pubOff'][0]['pubOffSt'] == 1) {
                        newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offerData[i]['_id'] + "&aff_id=" + pubId + "&" + networkSetting.replace(/&adv_id=true/g, '');
                        newObject['approvalRequired'] = false;
                        newObject['status_label'] = 'active';
                    } else {
                        let statusArray = Object.values(config.PUBLISHER_OFFERS_STATUS);
                        let index = statusArray.findIndex(x => x.value == +offerData[i]['pubOff'][0]['pubOffSt']);
                        newObject['status_label'] = statusArray[index]['label'];
                    }
                    if (!isNaN(offerData[i]['pubOff'][0]['pay'])) {
                        // newObject['revenue'] = offerData[i]['pubOff'][0]['pay'];
                        newObject['payout'] = offerData[i]['pubOff'][0]['pay'];
                    }
                }
                outputOffers.push(newObject);
            }
            let response = Response.success();
            response.msg = "Success";
            response.payloadType = payloadType.array;
            response.payload = outputOffers;
            return res.status(200).json(response);
        }
        let response = Response.error();
        response.msg = "something went wrong";
        return res.status(200).json(response);
    } catch (err) {
        debug(err)
        let response = Response.error();
        response.msg = "something went wrong";
        response.err = true;
        return res.status(200).json(response);
    }

}

exports.getPublisherOffers = async (req, res) => {
    req.setTimeout(800000);
    try {
        let publisherData = req.publisherData;
        if (publisherData['pid'] && publisherData['network_id']) {
            let networkData = await getNetworkData(publisherData['network_id']);
            if (!networkData) {
                let response = Response.error();
                response.msg = "Invalid Request, Contact Your Manager";
                return res.status(200).json(response);
            }
            let networkUniqueId = networkData['network_unique_id'];
            let networkSetting = networkData['network_publisher_setting_string'] || "";
            let publisherId = publisherData['pid'];
            let networkId = publisherData['network_id'];
            let page = 1;
            let limit = 5001;
            if (req.query.page) {
                page = checkNumaric(req.query.page);
                if (!page) {
                    let response = Response.error();
                    response.msg = "not a vaild page no";
                    return res.status(200).json(response);
                }
            }
            if (req.query.limit) {
                limit = checkNumaric(req.query.limit);
                if (!limit) {
                    let response = Response.error();
                    response.msg = "not a vaild limit";
                    return res.status(200).json(response);
                }
                limit = +limit + 1;
            }
            let filter = {
                network_id: mongooseObjectId(networkId),
                status: 1,
                // updatedAt: { $gte: Moment().startOf('day').subtract(3, 'd').format(), $lte: Moment().endOf('day').format() }
            };

            if (req['params']['offerType'] == "active") {
                filter['$or'] = [
                    { 'offer_visible': 'public' },
                    { 'pubOff': { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } } }
                ];
            } else if (req['params']['offerType'] == "public") {
                filter['offer_visible'] = 'public';
            } else if (req['params']['offerType'] == "private") {
                filter['$and'] = [
                    { 'offer_visible': 'private' },
                    { 'pubOff': { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } } }
                ];
                // } else if (req['params']['offerType'] == "working") {

            } else {
                // all offers
                filter['$or'] = [
                    { 'offer_visible': { $in: ['public', 'approval_required'] } },
                    { 'pubOff.id': +publisherId }
                ]
            }
            let projection = {
                'advertiser_id': 1,
                'advertiser_name': 1,
                'updatedAt': 1,
                'category': 1,
                'isCapEnabled': 1,
                'payout': 1,
                'approvalRequired': 1,
                'isCapEnabled': 1,
                'isTargeting': 1,
                'isgoalEnabled': 1,
                'thumbnail': 1,
                'offer_name': 1,
                'description': 1,
                'kpi': 1,
                'preview_url': 1,
                'currency': 1,
                'payout_type.enum_type': 1,
                'offer_capping': 1,
                'geo_targeting.country_allow': 1,
                'geo_targeting.country_deny': 1,
                'geo_targeting.city_allow': 1,
                'geo_targeting.city_deny': 1,
                'device_targeting': 1,
                'creative': 1,
                'goal': 1,
                'offer_visible': 1,
                'pubOff': { $elemMatch: { id: +publisherId } }
            };
            let sort = { updatedAt: -1 };
            let offersData = await offersModel.getSearchOffer(filter, projection, { limit: +limit, skip: +(page - 1) * limit, sort: sort });
            if (offersData && offersData.length) {
                let offers = [];
                let nextPage = false;
                let linkDomain = `${networkUniqueId}.${process.env.TRACKING_DOMAIN}`;
                if (networkData['domain'] && networkData['domain']['tracker']) {
                    linkDomain = networkData['domain']['tracker'];
                }
                for (let i in offersData) {
                    if (i >= limit) {
                        nextPage = true;
                        break;
                    };
                    let newObject = {};
                    newObject['updatedAt'] = Moment(offersData[i]['updatedAt']).format('MMMM Do YYYY, h:mm:ss a');
                    newObject['category'] = offersData[i]['category'];
                    newObject['isCapEnabled'] = offersData[i]['isCapEnabled'];
                    newObject['isTargeting'] = offersData[i]['isTargeting'];
                    newObject['isgoalEnabled'] = offersData[i]['isgoalEnabled'];
                    newObject['offer_id'] = offersData[i]['_id'];
                    newObject['thumbnail'] = offersData[i]['thumbnail'];
                    newObject['offer_name'] = offersData[i]['offer_name'];
                    newObject['description'] = offersData[i]['description'];
                    newObject['kpi'] = offersData[i]['kpi'];
                    //   newObject['advertiser_id'] = offersData[i]['advertiser_id'];
                    //   newObject['advertiser_name'] = offersData[i]['advertiser_name'];
                    newObject['preview_url'] = offersData[i]['preview_url'];
                    // newObject['expired_url']= offersData[i]['expired_url'];
                    // newObject['start_date']= offersData[i]['start_date'];
                    // newObject['end_date']= offersData[i]['end_date']; 
                    newObject['currency'] = offersData[i]['currency'];
                    // newObject['revenue_type'] = offersData[i]['payout_type'];
                    newObject['payout_type'] = offersData[i]['payout_type'];
                    // newObject['offer_capping'] = offersData[i]['offer_capping'];
                    newObject['geo_targeting'] = offersData[i]['geo_targeting'];
                    newObject['device_targeting'] = offersData[i]['device_targeting'];
                    newObject['creative'] = offersData[i]['creative'];
                    // newObject['goal'] = offersData[i]['goal'];
                    newObject['tracking_link'] = '';
                    newObject['approvalRequired'] = true;
                    // newObject['revenue'] = offersData[i]['payout'];
                    newObject['payout'] = offersData[i]['payout'];
                    newObject['status_label'] = 'new';
                    if (offersData[i]['offer_visible'] == 'public') {
                        // newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offersData[i]['_id'] + "&aff_id=" + publisherId + "&" + networkSetting.replace(/&adv_id=true/g, '');
                        newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offersData[i]['_id'] + "&aff_id=" + publisherId;
                        newObject['approvalRequired'] = false;
                        newObject['status_label'] = 'active';
                    } else if (offersData[i]['pubOff'] && offersData[i]['pubOff'][0]) {
                        if (offersData[i]['pubOff'][0]['pubOffSt'] == 1) {
                            // newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offersData[i]['_id'] + "&aff_id=" + publisherId + "&" + networkSetting.replace(/&adv_id=true/g, '');
                            newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offersData[i]['_id'] + "&aff_id=" + publisherId;
                            newObject['approvalRequired'] = false;
                            newObject['status_label'] = 'active';
                        } else {
                            let statusArray = Object.values(config.PUBLISHER_OFFERS_STATUS);
                            let index = statusArray.findIndex(x => x.value == +offersData[i]['pubOff'][0]['pubOffSt']);
                            newObject['status_label'] = statusArray[index]['label'];
                        }
                        if (!isNaN(offersData[i]['pubOff'][0]['pay'])) {
                            // newObject['revenue'] = offersData[i]['pubOff'][0]['pay'];
                            newObject['payout'] = offersData[i]['pubOff'][0]['pay'];
                        }
                    }
                    offers.push(newObject);
                }
                let response = Response.success();
                response.msg = 'Success';
                response['page'] = +page;
                response['nextPage'] = nextPage ? +page + 1 : null;
                response.payloadType = payloadType.array;
                response.payload = offers;
                return res.status(200).json(response);
            }
            let response = Response.error();
            response.msg = "No record found.";
            return res.status(200).json(response);
        }
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(400).json(response);
    }
}


exports.getAffOffers = async (req, res) => {
    let time  = Moment(Date.now());

    req.setTimeout(800000);
    try {
        let publisherData = req.publisherData;
        if (publisherData['pid'] && publisherData['network_id']) {

            // if (![undefined, "all", "active"].includes(req.query.offer_type)) {
            //     let response = Response.error();
            //     response.msg = "Send offer_type all or active only!";
            //     return res.status(400).json(response);
            // }

            let page = 1;
            let limit = +req.publisherData.pol || 3000 ;
            if (req.query.page) {
                page = checkNumaric(req.query.page);
                if (!page) {
                    let response = Response.error();
                    response.msg = "not a vaild page no";
                    return res.status(200).json(response);
                }
            }
            if (req.query.limit && +req.query.limit <= +req.publisherData.pol) {
                limit = checkNumaric(req.query.limit);
                if (!limit) {
                    let response = Response.error();
                    response.msg = "not a vaild limit";
                    return res.status(200).json(response);
                }
            }

            let networkData = await getNetworkData(publisherData['network_id']);
            if (!networkData) {
                let response = Response.error();
                response.msg = "Invalid Request, Contact Your Manager";
                return res.status(200).json(response);
            }
            let networkUniqueId = networkData['network_unique_id'];
            let publisherId = publisherData['pid'];
            let networkId = publisherData['network_id'];

            let filter = { network_id: mongooseObjectId(networkId), status: 1, pubOff: { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } } };
            if(req.query.offer_id && req.query.offer_id.trim()){
                filter['_id'] = mongooseObjectId(req.query.offer_id);
            }
            // if (req.query.offer_type && req.query.offer_type.trim() === 'active') {
            //     filter['pubOff'] = { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } };
            // }
            let projection = {
                // 'advertiser_id': 1,
                // 'advertiser_name': 1,
                'updatedAt': 1,
                'category': 1,
                'isCapEnabled': 1,
                'payout': 1,
                'approvalRequired': 1,
                'isCapEnabled': 1,
                'isTargeting': 1,
                'isgoalEnabled': 1,
                'thumbnail': 1,
                'offer_name': 1,
                'description': 1,
                'kpi': 1,
                'preview_url': 1,
                'currency': 1,
                'payout_type.enum_type': 1,
                'offer_capping': 1,
                'geo_targeting.country_allow': 1,
                'geo_targeting.country_deny': 1,
                'geo_targeting.city_allow': 1,
                'geo_targeting.city_deny': 1,
                'device_targeting': 1,
                'creative': 1,
                'goal': 1,
                'offer_visible': 1,
                'pubOff': { $elemMatch: { id: +publisherId } }
            };
            let sort = { _id: -1 };
            let offersData = await offersModel.getSearchOffer(filter, projection, { limit: +limit, skip: +(page - 1) * limit, sort: sort });
            if ((req.query.offer_type == undefined || req.query.offer_type.toLowerCase() === 'all') && !offersData.length) {
                delete filter.pubOff;
                offersData = await offersModel.getSearchOffer(filter, projection, { limit: +limit, skip: +(page - 1) * limit, sort: sort });
            }
            
            let offerSize = calculateSizeInMB(offersData);
            let publisherLog =  {} ;
            publisherLog['N_id'] = mongooseObjectId(filter['network_id']);
            publisherLog['pid'] = publisherId ; 
            publisherLog['ofr_length'] = offersData.length ;
            publisherLog['S_key'] =  req.headers.secretkey ;
            publisherLog['A_key'] = req.headers.apikey ;
            publisherLog['offer_type'] = req.query.offer_type ; 
            publisherLog['page'] =  page ;
            publisherLog['limit'] = req.query.limit ; 
            publisherLog['data_transfer'] = offerSize ;
            publisherLog['time'] = time ;

            const PublisherLogModelResult = await PublisherLogModel(publisherLog);
            await PublisherLogModelResult.save() ;

            if (offersData && offersData.length) {
                let offers = [];
                let linkDomain = `${networkUniqueId}.${process.env.TRACKING_DOMAIN}`;
                if (networkData['domain'] && networkData['domain']['tracker']) {
                    linkDomain = networkData['domain']['tracker'];
                }
                for (let i in offersData) {
                    let newObject = {};
                    newObject['updatedAt'] = Moment(offersData[i]['updatedAt']).format('MMMM Do YYYY, h:mm:ss a');
                    newObject['category'] = offersData[i]['category'];
                    // newObject['isCapEnabled'] = offersData[i]['isCapEnabled'];
                    newObject['isTargeting'] = offersData[i]['isTargeting'];
                    // newObject['isgoalEnabled'] = offersData[i]['isgoalEnabled'];
                    newObject['offer_id'] = offersData[i]['_id'];
                    newObject['thumbnail'] = offersData[i]['thumbnail'];
                    newObject['offer_name'] = offersData[i]['offer_name'];
                    newObject['description'] = offersData[i]['description'];
                    newObject['kpi'] = offersData[i]['kpi'];
                    newObject['preview_url'] = offersData[i]['preview_url'];
                    newObject['currency'] = offersData[i]['currency'];
                    newObject['payout_type'] = offersData[i]['payout_type'];
                    newObject['geo_targeting'] = offersData[i]['geo_targeting'];
                    newObject['device_targeting'] = offersData[i]['device_targeting'];
                    newObject['creative'] = offersData[i]['creative'];
                    newObject['tracking_link'] = '';
                    newObject['approvalRequired'] = true;
                    newObject['payout'] = offersData[i]['payout'];
                    newObject['status_label'] = 'new';
                    if (offersData[i]['offer_visible'] == 'public') {
                        newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offersData[i]['_id'] + "&aff_id=" + publisherId;
                        newObject['approvalRequired'] = false;
                        newObject['status_label'] = 'active';
                    } else if (offersData[i]['pubOff'] && offersData[i]['pubOff'][0]) {
                        if (offersData[i]['pubOff'][0]['pubOffSt'] == 1) {
                            newObject['tracking_link'] = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offersData[i]['_id'] + "&aff_id=" + publisherId;
                            newObject['approvalRequired'] = false;
                            newObject['status_label'] = 'active';
                        } else {
                            let statusArray = Object.values(config.PUBLISHER_OFFERS_STATUS);
                            let index = statusArray.findIndex(x => x.value == +offersData[i]['pubOff'][0]['pubOffSt']);
                            newObject['status_label'] = statusArray[index]['label'];
                        }
                        if (!isNaN(offersData[i]['pubOff'][0]['pay'])) {
                            newObject['payout'] = offersData[i]['pubOff'][0]['pay'];
                        }
                    }
                    offers.push(newObject);
                }
                let response = Response.success();
                response.msg = 'Success';
                response['page'] = +page;
                response['nextPage'] = offers.length ? true : false;
                response['count'] = offers.length || 0;
                response.payloadType = payloadType.array;
                response.payload = offers;
                return res.status(200).json(response);
            }
            let response = Response.error();
            response.msg = "No record found.";
            response['page'] = +page;
            response['nextPage'] = false;
            response.payloadType = payloadType.array;
            response.payload = [];
            return res.status(200).json(response);
        }
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(500).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.msg = 'Server internal error!';
        return res.status(500).json(response);
    }
}

function calculateSizeInMB(array) {
    // Directly buffer the JSON string to get byte length
    const bytes = Buffer.byteLength(JSON.stringify(array));

    // Convert bytes to megabytes
    return bytes / (1024 * 1024);
}