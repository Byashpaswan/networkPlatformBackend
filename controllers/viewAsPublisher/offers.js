const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Offer");
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferModel = require('../../db/offer/Offer');
const Response = require('../../helpers/Response');
const { ImportantFields, getAppId } = require('../../plugin/plugin');
const { payloadType } = require('../../constants/config');
const { config } = require('../../constants/Global');
const { generateHash, offersAuditLog, filterHash, getCacheData, encodeData, decodeData, chunkArrayInGroups, checkMyOffer } = require('../../helpers/Functions');
const moment = require('moment');
const publisherModel = require("../../db/publisher/Publisher");
const NetworkModel = require('../../db/network/Network');
const { setRedisHashData, delRedisHashData, delRedisData } = require('../../helpers/Redis');


exports.getOffers = async (req, res) => {
    let search = {};
    let projection = {};
    let invalidSearch = false;
    let options = { limit: 10, skip: 0, sort: { updatedAt: -1 } };
    let currentPublisher = await publisherModel.searchOnePublisher({ _id: req.body.pubObjId }, { pid: 1 })
    search['status'] = 1;
    search['updatedAt'] = { $gte: moment().subtract(2, 'd'), $lte: moment() };
    try {
        if (req.body.search.offer_type && req.body.search.offer_type == "active_offers") {
            search['publisher_offers'] = { $elemMatch: { publisher_id: +currentPublisher.pid || '', publisher_offer_status: 1 } };
            projection['publisher_offers'] = { $elemMatch: { publisher_id: +currentPublisher.pid || '' } };
        }
        search['isPublic'] = true;

        if (req.body.search) {
            if (req.body.search.my_offers) {
                search['isMyOffer'] = req.body.search.my_offers;
            }
            if (req.body.search.country) {
                if (req.body.search.country == "none") {
                    search['geo_targeting.country_allow'] = { $size: 0 };
                } else {
                    search['geo_targeting.country_allow.key'] = req.body.search.country;
                }
            }
            if (req.body.search.device) {
                search['device_targeting.device'] = req.body.search.device;
            }
            if (req.body.search.os) {
                search['device_targeting.os'] = req.body.search.os;
            }
            if (req.body.search.app_id) {
                search['app_id'] = {
                    $regex: req.body.search.app_id.trim(),
                    $options: 'i'
                };
            }
            if (req.body.search.status) {
                search['status'] = req.body.search.status.trim();
            }
            else if (req.body.search.publisher_offer_status) {
                search['publisher_offers'] = { $elemMatch: { publisher_id: +currentPublisher.pid || '', publisher_offer_status: +req.body.search.publisher_offer_status.trim() } };
            }
            if (req.body.search.start_date) {
                search['updatedAt'] = {
                    $gte: moment(req.body.search.start_date.trim()),
                    $lte: moment(req.body.search.end_date.trim())
                };
            }
            if (req.body.search.offer_id) {
                if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
                    search['_id'] = mongooseObjectId(req.body.search.offer_id.trim());
                    if (search.updatedAt) {
                        delete search.updatedAt;
                    }
                } else {
                    search['offer_name'] = {
                        $regex: req.body.search.offer_id.trim(),
                        $options: 'i'
                    };
                }
            }
        }

        if (invalidSearch) {
            let response = Response.error();
            response.msg = "No Offer Found!!";
            response.error = ["no offers found"];
            return res.status(200).json(response);
        }
        if (req.body.projection) {
            projection['advertiser_name'] = 1;
            projection['offer_name'] = 1;
            projection['preview_url'] = 1;
            projection['app_id'] = 1;
            projection['status'] = 1;
            projection['advertiser_offer_id'] = 1;
            projection['status_label'] = 1;
            projection['_id'] = 1;
            for (let item in req.body.projection) {
                if (item == 'country_allow') {
                    projection['geo_targeting.country_allow'] = 1;
                } else if (item == 'os') {
                    projection['device_targeting.os'] = 1;
                    projection['os'] = '$device_targeting.os';
                } else {
                    projection[item] = 1;
                }
            }
        }

        if (req.body.options) {
            if (req.body.options.limit && req.body.options.limit != 0) {
                options['limit'] = req.body.options.limit;
            }
            if (req.body.options.page && req.body.options.page != 0) {
                options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
            }
        }

        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);

        // let key = filterHash({
        //     search: search,
        //     projection: projection,
        //     options: options
        // });
        // let hash = req.path;
        // let result = await getCacheData(hash, key);
        // let ecodedData = encodeData({
        //     key: key,
        //     hash: hash
        // });
        let output = {
            result: [],
            totalOffers: null
        }
        let result = await OfferModel.getSearchOffer(search, projection, options);
        if (result) {
            output['result'] = result;
            output['pageSize'] = req.body.options.limit;
            output['page'] = req.body.options.page;
            try {
                let count = await OfferModel.getTotalPagesCount(search);
                output['totalOffers'] = count;
            } catch (err) { }
            //   setRedisHashData(hash, key, output, process.env.REDIS_OFFER_EXP)
        }
        // else {
        //   output = result;
        // }
        // output['keyHash'] = ecodedData;
        if (!result) {
            let response = Response.error();
            response.msg = "error while fetch data";
            return res.status(200).json(response);
        }
        if (output['result'].length == 0) {
            let response = Response.error();
            response.msg = "No Offers Found!!";
            response.error = ["no offers found"];
            return res.status(200).json(response);
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = output;
        response.msg = "success";
        return res.status(200).json(response);
    } catch (err) {
        console.log(err);
        let response = Response.error();
        response.msg = "Error Finding offers";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}



exports.offerShow = async (req, res) => {
    let search = {};
    let projection = { "_id": 1, "category": 1, "revenue": 1, "payout": 1, "approvalRequired": 1, "isCapEnabled": 1, "isTargeting": 1, "isgoalEnabled": 1, "status_label": 1, "status": 1, "network_id": 1, "platform_id": 1, "platform_name": 1, "thumbnail": 1, "offer_name": 1, "description": 1, "kpi": 1, "preview_url": 1, "tracking_link": 1, "expired_url": 1, "start_date": 1, "end_date": 1, "currency": 1, "revenue_type": 1, "payout_type": 1, "offer_capping": 1, "geo_targeting": 1, "device_targeting": 1, "creative": 1, "goal": 1, "publisher_offers": 1, "advertiser_id": 1 };
    let currentPublisher = await publisherModel.searchOnePublisher({ _id: req.body.pubObjId }, { pid: 1 })
    // if (req.user_category == 'publisher' || req.loginType == 'publisher') {
    search['$or'] = [{ isPublic: true }, { publisher_offers: { $elemMatch: { publisher_id: +currentPublisher.pid || '' } } }];
    search['status'] = 1;
    projection["publisher_offers"] = { $elemMatch: { publisher_id: +currentPublisher.pid || '' } };

    // // }
    // // else {
    // //     projection["advertiser_platform_id"] = 1;
    // //     projection["advertiser_name"] = 1;
    // // }
    if (req.params.Offer_id && mongooseObjectId.isValid(req.params.Offer_id.trim())) {
        search['_id'] = mongooseObjectId(req.params.Offer_id.trim());
        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        // debug(search);
        OfferModel.getOneOffer(search, projection).then(result => {

            let advertiser_id_setting;
            NetworkModel.findOneNetwork({ _id: req.user.userDetail.network[0] }, { "network_publisher_setting_string": 1, domain: 1 }).then(doc => {
                advertiser_id_setting = doc[0]['network_publisher_setting_string'];
                let linkDomain = `${req.network_unique_id}.${process.env.TRACKING_DOMAIN}`;
                if (doc[0]['domain'] && doc[0]['domain']['tracker']) {
                    linkDomain = doc[0]['domain']['tracker']
                }

                //console.log(advertiser_id);

                let response = Response.success();
                response.payloadType = payloadType.object;
                // if (req.user_category == 'publisher' || req.loginType == 'publisher') {
                if (result && result.tracking_link) {
                    if (advertiser_id_setting.includes("adv_id=true")) {

                        result.tracking_link = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + result._id + "&aff_id=" + req.accountid + "&adv_id=" + result['advertiser_id'] + "&" + req.network_setting.replace(/&adv_id=true/g, '');
                    }
                    else {
                        result.tracking_link = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + result._id + "&aff_id=" + req.accountid + "&" + req.network_setting.replace(/&adv_id=true/g, '');
                    }

                }
                // }
                response.payload = result;
                response.msg = "success";
                return res.status(200).json(response);
            }).catch(err => {
                console.log(err, "error fetching network");
            })
        })
            .catch(err => {
                let response = Response.error();
                response.msg = "Error Fetching Offer";
                response.error = [err.message];
                return res.status(200).json(response);
            })
    } else {
        let response = Response.error();
        response.msg = "Invalid Request";
        response.error = [];
        return res.status(200).json(response);
    }
}