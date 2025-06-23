const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Offer");
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferModel = require('../../db/offer/Offer');
const NetworkModel = require('../../db/network/Network');
const DownloadCenterModel = require('../../db/downloadCenter');
const Response = require('../../helpers/Response');
// const { ImportantFields, getAppId } = require('../../plugin/plugin');
const apiPlugin=require('../../plugin/plugin')
const { payloadType } = require('../../constants/config');
const { config } = require('../../constants/Global');
const { generateHash, offersAuditLog, filterHash, getCacheData, encodeData, decodeData, chunkArrayInGroups, checkMyOffer, formatMongooseIdArray } = require('../../helpers/Functions');
const moment = require('moment');
const publisherModel = require("../../db/publisher/Publisher");
const { setRedisHashData, getRedisHashData, delRedisHashData, getDataFromRedisSortedSet, setRedisData, getRedisData, delRedisData, getRedisMgetData } = require('../../helpers/Redis');
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');
const url = require('url');
const { validateMongooseObjectIdArray, getNetworkData } = require('../../helpers/Functions');

const rabbitMq = require('../../helpers/rabbitMQ');
const publish_queue = "download_center_offer_queue";

const AdvertiserModel = require("../../db/advertiser/Advertiser");
const offerImportStatModel = require('../../db/offerImportStats');
const Functions = require("../../helpers/Functions");
const { PlatformModel, PlatformTypeModel } = require('../../db/platform/Platform');
const { fetchSingleOfferFromApi, syncAndUpdateOfferFromAPi } = require('../../plugin/fetchSingleOffer');
const AppDetailsModel = require('../../db/applicationDetails/ApplicationDetails');
const platformType = require('../platform/Platform');
const Redis = require('../../helpers/Redis')
const generalFunction = require('../../helpers/generalFunction')
exports.fetchPublisherDetails = async (req, res) => {
    try {
        if (req.body.id) {
            //console.log(req.body.id);
            filter = { pid: { $in: req.body.id } }
            projection = { company: 1, pid: 1 };
            option = {};
            result = await publisherModel.getPublisherList(filter, projection, option);
            if (result) {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "success"
                return res.status(200).json(response);
            }
        } else {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = data;
            response.msg = "offer is not assigned to any publisher"
            return res.status(200).json(response);
        }
    } catch (err) {
        let response = Response.error();
        response.error = [err.message];
        response.msg = " exeception occur "
        return res.status(200).json(response);
    }

}

const fetchPublisherOffers = async (advertiser_platform_id, network_id) => {
    let publisherOffers = [];
    try {
        let result = await PlatformModel.getOnePlatform(
            { _id: mongooseObjectId(advertiser_platform_id) },
            { offer_visibility_status: 1, payout_percent: 1, publishers: 1 }
        );
        if (result['publishers'] && result['publishers'].length && result['offer_visibility_status']) {
            let status = 0;
            let status_label = 'no_link';
            let publisherPidArray = result['publishers'];
            let payoutPercent = 100;
            if (result['payout_percent']) {
                payoutPercent = result['payout_percent'];
            }
            if (result['offer_visibility_status'] == 'auto_approve') {
                status = 1;
                status_label = 'active';
            }
            if (publisherPidArray.includes('all')) {
                publisherPidArray = [];
                let publisherList = await publisherModel.getPublisherList({ network_id: mongooseObjectId(network_id), status: 'Active' }, { pid: 1 }, {});
                if (publisherList && publisherList.length) {
                    publisherPidArray = publisherList.map(obj => { return obj.pid });
                }
            }
            for (let pid of publisherPidArray) {
                publisherOffers.push({
                    publisher_offer_status_label: status_label,
                    publisher_offer_status: status,
                    publisher_id: +pid,
                    publisher_payout_percent: payoutPercent
                });
            }
        }
        return publisherOffers;
    } catch (error) {
        debug(error);
        return publisherOffers;
    }
}

exports.offerStore = async (req, res) => {
    try {
        let filter = {
            network_id: req.user.userDetail.network[0],
            advertiser_offer_id: req.body.advertiser_offer_id,
            advertiser_id: req.body.advertiser_id,
            advertiser_platform_id: req.body.advertiser_platform_id ? req.body.advertiser_platform_id : ({ $in: [null, ''] })
        };
        let result = await OfferModel.getOneOffer(filter, { _id: 1 });
        if (result && result['_id']) {
            let response = Response.error();
            response.msg = "Offer already exists!"
            response.payload = result;
            response.error = ["Offer already exists"];
            return res.status(200).json(response);
        }
    } catch (error) {
        debug(error);
    }

    let [platform_id, platform_name, advertiser_platform_id, plty, plid, aid] = [null, null, null, +req.body.plty || 0, +req.body.plid || 0, +req.body.aid || 0];

    if (req.body.platform_id == null || req.body.platform_id == 'null' || req.body.platform_id == '') {
        platform_id = mongooseObjectId('5e0b93a80000000000000000');
        platform_name = 'Direct';
    } else {
        platform_id = req.body.platform_id;
        platform_name = req.body.platform_name;
        plty = +req.body.plty;
        if (!plty) {
            let result = await PlatformTypeModel.getPlatformTypesOne({ _id: mongooseObjectId(req.body.platform_id) }, { plty: 1 });
            if (result) plty = result.plty;
        }
    }
    if (req.body.advertiser_platform_id == null || req.body.advertiser_platform_id == 'null' || req.body.advertiser_platform_id == '') {
        advertiser_platform_id = req.body.advertiser_id;
    } else {
        advertiser_platform_id = req.body.advertiser_platform_id;
        plid = +req.body.plid;
        if (!plid) {
            let result = await PlatformModel.getOnePlatform({ _id: mongooseObjectId(req.body.advertiser_platform_id) }, { plid: 1 });
            if (result) plid = result.plid;
        }
    }

    let pubOff = [];
    if (req.body.advertiser_id) {
        let pubList = await publisherModel.getPublisherList({ network_id: mongooseObjectId(req.user.userDetail.network[0]), status: 'Active', appr_adv_opt: { $in: [104, 105, 106] } }, { pid: 1, appr_adv_opt: 1, appr_adv: 1 }, {});
        pubOff = await Functions.getPublisherOffer(req.body.advertiser_id, req.body.payout || 0, pubList);

        if (!aid) {
            let result = await AdvertiserModel.searchOneAdvertiser({ _id: mongooseObjectId(req.body.advertiser_id) }, { aid: 1 });
            if (result) aid = result.aid;
        }
    }

    let adv_off_hash = "";
    if (req.body.advertiser_offer_id && req.body.tracking_link) {
        adv_off_hash = crypto.createHash("md5").update(req.body.advertiser_offer_id + Functions.parseUrl(req.body.tracking_link)).digest("hex")
    }

    let adv_platform_payout_percent = 100;
    if (+req.body.revenue && +req.body.payout) {
        adv_platform_payout_percent = (+req.body.payout * 100) / +req.body.revenue;
    }

    let offer = new OfferModel({
        network_id: req.user.userDetail.network[0],
        nid: req.user.userDetail.nid,
        category: req.body.category,
        advertiser_offer_id: req.body.advertiser_offer_id,
        advertiser_platform_id: advertiser_platform_id,
        plid: plid,
        platform_id: platform_id,
        plty: plty,
        platform_name: platform_name,
        advertiser_id: req.body.advertiser_id,
        aid: aid,
        advertiser_name: req.body.advertiser_name,
        thumbnail: req.body.thumbnail,
        offer_name: req.body.offer_name,
        description: req.body.description,
        kpi: req.body.kpi,
        preview_url: req.body.preview_url,
        tracking_link: req.body.tracking_link,
        expired_url: req.body.expired_url,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        currency: req.body.currency,
        revenue: parseFloat(req.body.revenue),
        revenue_type: { enum_type: req.body.revenue_type, offer_type: '' },
        payout: parseFloat(req.body.payout),
        payout_type: { enum_type: req.body.payout_type, offer_type: '' },
        approvalRequired: req.body.approvalRequired,
        isCapEnabled: req.body.isCapEnabled,
        offer_capping: req.body.offer_capping,
        isTargeting: req.body.isTargeting,
        geo_targeting: req.body.geo_targeting,
        device_targeting: req.body.device_targeting,
        creative: req.body.creative,
        redirection_method: req.body.redirection_method,
        offer_visible: req.body.offer_visible,
        status_label: req.body.status_label,
        status: req.body.status,
        isgoalEnabled: req.body.isgoalEnabled,
        goal: req.body.goal,
        version: 0,
        liveType: 0,
        app_id: req.body.preview_url ? apiPlugin.getAppId(req.body.preview_url) : "",
        isMyOffer: false,
        isPublic: false,
        isApiOffer: false,
        pubOff: pubOff,
        adv_platform_payout_percent: adv_platform_payout_percent,
        adv_off_hash: adv_off_hash
    });

    if (offer['offer_visible'] == "public") {
        offer['isPublic'] = true;
    }
    if (offer['app_id']) {
        offer['isMyOffer'] = await checkMyOffer(offer['app_id'], offer['network_id']);
    }
    offer['offer_hash'] = generateHash(apiPlugin.ImportantFields, offer);

    offer.save().then(async result => {
        let event = 'offer_create'
        let reflectId = result._id
        if (result.status == 1) {
            await Functions.publishJobForWebhook(result.network_id, reflectId, event, "Manual Create Offer")
        }
        if (offer.tracking_link && offer.advertiser_platform_id && offer.advertiser_offer_id) {
            setRedisData(`OH:${offer.advertiser_platform_id}:${offer.advertiser_offer_id}`, `LNK:${offer.offer_hash}`, process.env.OFFERHASH_EXP);
        }
        let response = Response.success();
        response.payload = result;
        response.msg = " successfully save ";
        return res.status(200).json(response);
    }).catch(err => {
        let response = Response.error();
        response.msg = " error while  saving "
        response.error = [err.message];
        return res.status(200).json(response);
    });
};

// new api for publisher offers
const getPublisherOffersFilter = (networkId, publisherId, data) => {
    let match = {
        network_id: mongooseObjectId(networkId),
        status: 1,
        // updatedAt: { $gte: moment().subtract(2, 'days').toDate(), $lte: moment().toDate() }
    };

    if (data.offer_id) {
        let offer_id = validateMongooseObjectIdArray(data.offer_id);
        if (offer_id['invalidMongooseObjectIdArray'] && offer_id['invalidMongooseObjectIdArray'].length) {
            let response = Response.error();
            response.error = ['invalid mongoose object id'];
            response.msg = 'Invalid offer id ' + offer_id['invalidMongooseObjectIdArray'] + '.';
            return res.status(200).json(response);
        }
        if (offer_id['validMongooseObjectIdArray']) {
            let length = offer_id['validMongooseObjectIdArray'].length;
            if (length == 1) {
                match['_id'] = offer_id['validMongooseObjectIdArray'][0];
            } else if (length > 1) {
                match['_id'] = { '$in': offer_id['validMongooseObjectIdArray'] };
            }
        }
    }
    if (data.offer_name && data.offer_name.trim()) {
        match['offer_name'] = { $regex: data.offer_name.trim(), $options: 'i' };
    }
    if (data.app_id && data.app_id.trim()) {
        match['app_id'] = { $regex: data.app_id.trim(), $options: 'i' };
    }
    if (data.os && data.os.trim()) {
        match['device_targeting.os'] = data.os.trim();
    }
    // if (data.device && data.device.trim()) {
    //     match['device_targeting.device'] = data.device.trim();
    // }
    if (data.country && data.country.trim()) {
        if (data.country.trim() == "none") {
            match['geo_targeting.country_allow'] = { $size: 0 };
        } else {
            match['geo_targeting.country_allow.key'] = data.country.trim();
        }
    }
    // if (data.start_date && data.end_date) {
    //     match['updatedAt'] = {
    //         $gte: moment(data.start_date).toDate(),
    //         $lte: moment(data.end_date).toDate()
    //     };
    //     if (match['_id'] || match['app_id']) {
    //         delete match['updatedAt'];
    //     }
    // }


    if (data.offerVisibleType) {
        if (data.offerVisibleType.trim() == 'all' && data.status) {
            // if (data.status) {
            if (data.status.trim() == '0') {
                // new offers
                match['$and'] = [
                    { 'offer_visible': { '$ne': 'public' } },
                    { 'pubOff.id': { '$ne': +publisherId } }
                ];
            } else if (data.status.trim() == '1') {
                // active offers
                // match['$or'] = [
                //     { 'offer_visible': 'public' },
                //     { 'pubOff': { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } } }
                // ];
                match['pubOff'] = { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } };
            } else {
                // applied, paused, rejected offers
                match['$and'] = [
                    { 'offer_visible': { '$ne': 'public' } },
                    { 'pubOff': { $elemMatch: { 'id': +publisherId, 'pubOffSt': +data.status.trim() } } }
                ];
            }
            // }
            //  else {
            //     // all offers
            //     match['offer_visible'] = { $in: ['public', 'approval_required'] };
            // }
        }
        else if (data.offerVisibleType.trim() == 'active') {
            // active offers
            match['pubOff'] = { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } };
        }
        else if (data.offerVisibleType.trim() == 'public') {
            // Only public offers
            match['offer_visible'] = 'public';
        }
        else if (data.offerVisibleType.trim() == 'private') {
            // Only private offers
            match['$and'] = [
                { 'offer_visible': 'private' },
                { 'pubOff': { $elemMatch: { 'id': +publisherId, 'pubOffSt': 1 } } }
            ];
        }
    } else {
        // applied, paused, rejected offers
        match['offer_visible'] = { $in: ['public', 'approval_required'] };
    }

    return match;
}

exports.getPublisherOffers = async (req, res) => {
    try {
        let output = { data: [] };
        let match = await getPublisherOffersFilter(req.user.userDetail.network[0], req.accountid, req.body);
        let project = {
            _id: 1,
            offer_name: 1,
            thumbnail: 1,
            offer_visible: 1,
            pubOff: { $elemMatch: { id: +req.accountid } },
            updatedAt: 1
        };

        let option = {
            limit: 100,
            skip: 0,
            sort: { updatedAt: -1 }
        };

        if (req.body.column) {
            for (let item of req.body.column) {
                if (item == 'preview_url') {
                    project['app_id'] = 1;
                }
                project[item] = 1;
            }
        }
        if (req.body.limit && +req.body.limit > 0) {
            option['limit'] = +req.body.limit;
        }
        if (req.body.page && +req.body.page > 0) {
            option['skip'] = (+req.body.page - 1) * option['limit'];
        }

        let offers = await OfferModel.getSearchOffer(match, project, option);
        if (offers && offers.length) {
            let formattedOffers = [];
            for (let item of offers) {
                if (item['offer_visible'] == 'public') {
                    item['status'] = 'active';
                } else if (item['pubOff'] && item['pubOff'][0] && !isNaN(item['pubOff'][0]['pubOffSt'])) {
                    let offerStatus = Object.values(config.PUBLISHER_OFFERS_STATUS);
                    let index = offerStatus.findIndex(x => x.value == item['pubOff'][0]['pubOffSt']);
                    item['status'] = (offerStatus[index]['label'] == 'approved') ? 'active' : offerStatus[index]['label'];
                } else {
                    item['status'] = 'new';
                }
                if (item['pubOff'] && item['pubOff'][0] && !isNaN(item['pubOff'][0]['pay'])) {
                    item['payout'] = item['pubOff'][0]['pay'];
                }

                formattedOffers.push(item);
                delete item['pubOff'];
            }
            output['data'] = formattedOffers;
        }
        let response = Response.success();
        response.msg = 'success';
        response.payloadType = payloadType.object;
        response.payload = output;
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        response.error = [error.message];
        return res.status(200).json(response);
    }
}

exports.getPublisherAllOffers = async (req, res) => {
    try {
        let publisher_id;
        if (req.body.publisher_id && +req.body.publisher_id) {
            publisher_id = +req.body.publisher_id;
        } else {
            let response = Response.error();
            response.msg = 'publisher_id is required.';
            response.error = ['required publisher_id'];
            return res.status(200).json(response);
        }
        const filter = {
            'network_id': mongooseObjectId(req.user.userDetail.network[0]),
            'pubOff.id': publisher_id
        };

        if( ( +req.body.status == 0 || +req.body.status ) && +req.body.status != -1 ){
            filter['pubOff.pubOffSt'] = +req.body.status
        }
        const projection = {
            '_id': 1,
            'offer_name': 1,
            'advertiser_id': 1,
            'advertiser_offer_id': 1,
            'geo_targeting.country_allow': 1,
            'device_targeting.os': 1,
            'currency': 1,
            'payout': 1,
            'payout_type.enum_type': 1,
            'revenue': 1,
            'thumbnail': 1,
            'preview_url': 1,
            'pubOff': { '$elemMatch': { 'id': publisher_id } },
            'updatedAt': 1,
            'app_id':1,
        };
        const options = {
            'limit': 100,
            'skip': 0,
            'sort': { 'updatedAt': -1 }
        };

        if (req.body.offer_id) {
            let offer_id = validateMongooseObjectIdArray(req.body.offer_id);
            if (offer_id['invalidMongooseObjectIdArray'] && offer_id['invalidMongooseObjectIdArray'].length) {
                let response = Response.error();
                response.error = ['invalid mongoose object id'];
                response.msg = 'Invalid offer id ' + offer_id['invalidMongooseObjectIdArray'] + '.';
                return res.status(200).json(response);
            }
            if (offer_id['validMongooseObjectIdArray']) {
                let length = offer_id['validMongooseObjectIdArray'].length;
                if (length == 1) {
                    filter['_id'] = offer_id['validMongooseObjectIdArray'][0];
                } else if (length > 1) {
                    filter['_id'] = { '$in': offer_id['validMongooseObjectIdArray'] };
                }
            }
        }

        if (req.body.start_date && req.body.end_date) {
            filter['updatedAt'] = {
                $gte: moment(req.body.start_date).toDate(),
                $lte: moment(req.body.end_date).toDate()
            };
        }

        if (req.body.limit && +req.body.limit) {
            options['limit'] = +req.body.limit;
        }

        if (req.body.page && +req.body.page) {
            options['skip'] = options['limit'] * (+req.body.page - 1);
        }

        let offers = await OfferModel.getSearchOffer(filter, projection, options);
        let offersCount = 0;

        if (offers && offers.length) {
            let offerStatus = Object.values(config.PUBLISHER_OFFERS_STATUS);
            for (let item of offers) {
                let status = offerStatus.find(x => x.value == item['pubOff'][0]['pubOffSt']).label;
                item['status_label'] = status == 'approved' ? 'active' : status;
                delete item['pubOff'];
            }
            // offersCount = await OfferModel.getTotalPagesCount(filter);
        }

        let response = Response.success();
        response.msg = 'success';
        response.payloadType = payloadType.object;
        response.payload = { 'result': offers, 'totalOffers': offersCount };
        return res.status(200).json(response);

    } catch (error) {
        debug(error);
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        response.error = [error.message];
        return res.status(200).json(response);
    }
}

exports.countPublisherOffers = async (req, res) => {
    try {
        let output = { count: 0 };
        let match = await getPublisherOffersFilter(req.user.userDetail.network[0], req.accountid, req.body);
        output['count'] = await OfferModel.countOffers(match);
        let response = Response.success();
        response.msg = 'success';
        response.payloadType = payloadType.object;
        response.payload = output;
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        response.error = [error.message];
        return res.status(200).json(response);
    }
}

exports.getOffers = async (req, res) => {
    let search = {};
    let projection = {};
    let invalidSearch = false;
    let options = { limit: 10, skip: 0, sort: { updatedAt: -1 } };
    search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    search['status'] = 1;
    try {
        if (req.params.routeType === 'network') {
            projection['advertiser_name'] = 1;
            if (!req.permissions.includes("ofr.list")) {
                advertiser = req.advertiser.map(data => data.id);
                search["advertiser_id"] = { $in: advertiser };
            }
        }
        else if (req.params.routeType == 'publisher') {
            // search['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '', publisher_offer_status: { $ne: 1 } } };
            if (req.body.search.offer_type && req.body.search.offer_type == "active_offers") {
                // search['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '', publisher_offer_status: 1 } }; // unComment after test. 
            }
            // projection['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '', publisher_offer_status: 1 } };
            search['isPublic'] = true;
            projection['advertiser_name'] = 1;
        }
        else if (req.params.routeType == 'advertiser') {
            projection['advertiser_name'] = 1;
            search['advertiser_id'] = req.loginId || req.user.userDetail.parentId || '';
        }
        else {
            let response = Response.error();
            response.msg = "Invalid Request";
            response.error = ["Invalid Request"];
            return res.status(400).json(response);
        }
        if (req.body.search) {
            search['updatedAt'] = { $gte: moment().subtract(2, 'days').toDate(), $lte: moment().toDate() };
            if (req.body.search.start_date) {
                search['updatedAt'] = { $gte: moment(req.body.search.start_date).toDate(), $lte: moment(req.body.search.end_date).toDate() };
            }
            if (req.body.search.advertiser_id) {
                if (mongooseObjectId.isValid(req.body.search.advertiser_id.trim())) {
                    search['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.my_offers) {
                search['isMyOffer'] = req.body.search.my_offers;
            }
            if (req.body.search.blockedOffers) {
                // search['isBlacklist'] = 1;
                search['isBlacklist'] = { $gt: 0 }
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
            if (req.body.search.status) {
                search['status'] = req.body.search.status.trim();
            }
            else if (req.body.search.publisher_offer_status != undefined) {
                search['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '', publisher_offer_status: +req.body.search.publisher_offer_status.trim() } };
            }
            if (req.body.search.platform_id) {
                if (mongooseObjectId.isValid(req.body.search.platform_id.trim())) {
                    search['platform_id'] = mongooseObjectId(req.body.search.platform_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.app_id) {
                if (req.body.search.app_id.includes(',')) {
                    search['app_id'] = { "$in": req.body.search.app_id.split(',') };
                }
                else {
                    search['app_id'] = req.body.search.app_id.trim()
                }
                // if (search.updatedAt) {
                //     delete search.updatedAt;
                // }
            }
            if (req.body.search.offer_name) {
                search['offer_name'] = { "$regex": new RegExp(req.body.search.offer_name, "i") };
                // if (search.updatedAt) {
                //     delete search.updatedAt;
                // }
            }
            if (req.body.search.offer_id) {
                if (req.body.search.offer_id.includes(',')) {
                    let offerIds = req.body.search.offer_id.split(",");
                    if (mongooseObjectId.isValid(offerIds[0])) {
                        search['_id'] = { "$in": formatMongooseIdArray(offerIds) };
                    }
                    else {
                        invalidSearch = true;
                    }
                }
                else {
                    if (mongooseObjectId.isValid(req.body.search.offer_id)) {
                        search['_id'] = mongooseObjectId(req.body.search.offer_id);
                    }
                    else {
                        invalidSearch = true;
                    }
                }
                if (search.updatedAt) {
                    delete search.updatedAt;
                }
            }

            // it's working offers  which assigned or not assigned to publishers offers.
            if(req.user.userDetail['pid'] && req.body['assignedOffers']){
                search['pubOff.id'] = req.user.userDetail['pid'];
            }
            if (req.body.search.advertiser_offer_id) {
                if (req.body.search.advertiser_offer_id.includes(',')) {
                    search['advertiser_offer_id'] = { "$in": req.body.search.advertiser_offer_id.split(',') };
                }
                else {
                    search['advertiser_offer_id'] = req.body.search.advertiser_offer_id;
                }
                if (search.updatedAt) {
                    delete search.updatedAt;
                }
            }
            if (req.body.search.workingOffers) {
                search['wTime'] = search['updatedAt']
                options['sort'] = { "wTime": -1 }
                delete search['updatedAt']
            }
        }
        if (invalidSearch) {
            let response = Response.error();
            response.msg = "No Offer Found!!";
            response.error = ["no offers found"];
            return res.status(200).json(response);
        }
        if (req.body.projection) {
            projection['thumbnail'] = 1;
            projection['offer_name'] = 1;
            projection['preview_url'] = 1;
            projection['app_id'] = 1;
            projection['status'] = 1;
            projection['advertiser_offer_id'] = 1;
            projection['status_label'] = 1;
            projection['isBlacklist'] = 1;
            projection['_id'] = 1;
            for (let item in req.body.projection) {
                if (item == 'country_allow') {
                    projection['geo_targeting.country_allow'] = 1;
                }
                else if (item == 'os') {
                    projection['device_targeting.os'] = 1;
                    projection['os'] = '$device_targeting.os';
                }
                else {
                    projection[item] = 1;
                }
            }
        }
        if (req.body.options) {
            if (req.body.options.limit && req.body.options.limit == -1) {
                delete options['limit'];
            } else {
                if (req.body.options.limit && req.body.options.limit != 0) {
                    options['limit'] = req.body.options.limit;
                }
                if (req.body.options.page && req.body.options.page != 0) {
                    options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
                }
            }
        }

        projection['advertiser_id'] = 1;
        // let key = filterHash({ search: search, projection: projection, options: options });
        // let hash = req.path;
        // let result = await getCacheData(hash, key);
        // let ecodedData = encodeData({ key: key, hash: hash });
        // if (!result) {
        let result = await OfferModel.getSearchOffer(search, projection, options);
        let output = { result: [], totalOffers: null }
        if (result) {
            output['result'] = result;

            // let key = "LINKSTATUS:" + req.user.userDetail.network[0] + ":" + moment().date() + ":" + moment().hours()
            // let cmd_args = [key, 0, -1, 'WITHSCORES']
            // let redirectionCount = await getDataFromRedisSortedSet(cmd_args)
            // output['redirectionCount'] = redirectionCount.data

            if (Object.keys(search).length == 2 && search.updatedAt) {
                key = "LIVEOFFERSCOUNT:" + req.user.userDetail.network[0];
                let totalOffers = await getRedisData(key);
                output['totalOffers'] = +totalOffers.data
            }
            else if (Object.keys(search).length == 3 && search.offer_id) {
                output['totalOffers'] = result.length
            }
            else {
                let offersCount = await OfferModel.getTotalPagesCount(search);
                output['totalOffers'] = +offersCount
            }

            output['pageSize'] = req.body.options.limit;
            output['page'] = req.body.options.page;

            // setRedisHashData(hash, key, output, process.env.REDIS_OFFER_EXP)
        }
        // } else {
        //     output = result;
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
    }
    catch (err) {
        console.log(err);
        let response = Response.error();
        response.msg = "Error Finding offers";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.offerStatusUpdate = async (req, res) => {
    let search = {}
    let reflect = {};
    let invalidSearch = false;
    let offer_ids = [];
    let msg = '';
    try {
        if (req.body.filter && Array.isArray(req.body.filter) && req.body.filter.length > 0 && req.body.status_label && (req.body.status || req.body.status <= 0)) {
            // search['_id'] = { '$in': req.body.filter };
            offer_ids = req.body.filter;
            reflect['status_label'] = req.body.status_label.trim();
            reflect['status'] = +req.body.status;
        }
        else {
            invalidSearch = true;
            msg = "Invalid Request";
        }
        if (req.body.status_label == "active" || req.body.status_label == "rejected" || req.body.status_label == "waitingForApproval" || req.body.status_label == "waiting_in_apply" || req.body.status_label == "no_link" || req.body.status_label == "deleted" || req.body.status_label == "unmanaged") {
            msg = "You have no access to update this status";
            invalidSearch = true;
        }
        if (config.OFFERS_STATUS && config.OFFERS_STATUS[reflect['status_label']]) {
            reflect['status'] = config.OFFERS_STATUS[reflect['status_label']].value;
        }
        else {
            msg = "You have no access to update this status";
            invalidSearch = true;
        }
        if (invalidSearch) {
            let response = Response.error();
            response.msg = msg;
            response.error = ['Invalid Request'];
            return res.status(200).json(response);
        }
        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        if (offer_ids.length) {
            let chunkIds = await chunkArrayInGroups(offer_ids, 50);
            // debug('i am reached', chunkIds)
            if (chunkIds.length) {
                for (let i = 0; i < chunkIds.length; i++) {
                    search['_id'] = { '$in': chunkIds[i] };
                    try {
                        await OfferModel.updateManyOffer(search, reflect, { multi: true });
                    }
                    catch (e) { debug(e) }
                }
            }
        }
        if (req.body.keyHash) {
            decodedData = decodeData(req.body.keyHash);
            delRedisHashData(decodedData.hash, decodedData.key);
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        response.msg = "success";
        return res.status(200).json(response);
    }
    catch (err) {
        let response = Response.error();
        response.msg = "Invalid Request";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

// exports.offerShow = (req, res) => {
//     let search = {};
//     let projection = { "_id": 1, "category": 1, "revenue": 1, "payout": 1, "approvalRequired": 1, "isCapEnabled": 1, "isTargeting": 1, "isgoalEnabled": 1, "status_label": 1, "status": 1, "network_id": 1, "platform_id": 1, "platform_name": 1, "thumbnail": 1, "offer_name": 1, "description": 1, "kpi": 1, "preview_url": 1, "tracking_link": 1, "expired_url": 1, "start_date": 1, "end_date": 1, "currency": 1, "revenue_type": 1, "payout_type": 1, "offer_capping": 1, "geo_targeting": 1, "device_targeting": 1, "creative": 1, "goal": 1, "publisher_offers": 1, "advertiser_id": 1 };
//     if (req.user_category == 'publisher' || req.loginType == 'publisher') {
//         // search['$or'] = [{ isPublic: true }, { pubOff: { $elemMatch: { publisher_id: +req.accountid || '' } } }];
//         search['$or'] = [{ 'offer_visible': 'public' }, { '$and': [{ 'pubOff.id': +req.accountid }, { 'pubOff.pubOffSt': 1 }] }];
//         search['status'] = 1;
//         projection["pubOff"] = { $elemMatch: { publisher_id: +req.accountid || '' } };

//     }
//     else {
//         projection["advertiser_platform_id"] = 1;
//         projection["advertiser_name"] = 1;
//     }
//     if (req.params.Offer_id && mongooseObjectId.isValid(req.params.Offer_id.trim())) {
//         search['_id'] = mongooseObjectId(req.params.Offer_id.trim());
//         search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
//         // debug(search);
//         OfferModel.getOneOffer(search, projection).then(result => {

//             let advertiser_id_setting;
//             NetworkModel.findOneNetwork({ _id: req.user.userDetail.network[0] }, { "network_publisher_setting_string": 1 }).then(doc => {
//                 advertiser_id_setting = doc[0]['network_publisher_setting_string'];

//                 //console.log(advertiser_id);

//                 let response = Response.success();
//                 response.payloadType = payloadType.object;
//                 if (req.user_category == 'publisher' || req.loginType == 'publisher') {
//                     if (result && result.tracking_link) {
//                         if (advertiser_id_setting.includes("adv_id=true")) {

//                             result.tracking_link = "http://" + req.network_unique_id + "." + process.env.TRACKING_DOMAIN + "/" + process.env.TRACKING_PATH + "?offer_id=" + result._id + "&aff_id=" + req.accountid + "&adv_id=" + result['advertiser_id'] + "&" + req.network_setting.replace(/&adv_id=true/g, '');
//                         }
//                         else {
//                             result.tracking_link = "http://" + req.network_unique_id + "." + process.env.TRACKING_DOMAIN + "/" + process.env.TRACKING_PATH + "?offer_id=" + result._id + "&aff_id=" + req.accountid + "&" + req.network_setting.replace(/&adv_id=true/g, '');
//                         }

//                     }
//                 }
//                 response.payload = result;
//                 response.msg = "success";
//                 return res.status(200).json(response);
//             }).catch(err => {
//                 console.log(err, "error fetching network");
//             })
//         })
//             .catch(err => {
//                 let response = Response.error();
//                 response.msg = "Error Fetching Offer";
//                 response.error = [err.message];
//                 return res.status(200).json(response);
//             })
//     } else {
//         let response = Response.error();
//         response.msg = "Invalid Request";
//         response.error = [];
//         return res.status(200).json(response);
//     }
// }

exports.offerShow = async (req, res) => {

    try {

        if (req.params.Offer_id && mongooseObjectId.isValid(req.params.Offer_id.trim())) {
            let search = {
                "_id": mongooseObjectId(req.params.Offer_id.trim()),
                "network_id": mongooseObjectId(req.user.userDetail.network[0])
            }
            let projection = { "_id": 1, "category": 1, "payout": 1, "approvalRequired": 1, "isCapEnabled": 1, "isTargeting": 1, "isgoalEnabled": 1, "status_label": 1, "status": 1, "network_id": 1, "thumbnail": 1, "offer_name": 1, "description": 1, "kpi": 1, "preview_url": 1, "tracking_link": 1, "start_date": 1, "end_date": 1, "currency": 1, "payout_type": 1, "offer_capping": 1, "geo_targeting": 1, "device_targeting": 1, "creative": 1, "goal": 1, "pubOff": 1, 'offer_visible': 1, "app_id": 1 };

            if (req.user_category == "network") {
                projection['revenue'] = 1
                projection['revenue_type'] = 1
                projection['advertiser_id'] = 1
                projection["advertiser_platform_id"] = 1;
                projection["advertiser_name"] = 1;
                projection["platform_id"] = 1;
                projection["platform_name"] = 1;
                projection["isBlacklist"] = 1;
                projection["advertiser_offer_id"] = 1;
                projection["createdAt"] = 1;
                projection["updatedAt"] = 1;
                projection["ewt"] = 1;
                projection["jumps"] = 1;
            }
            else if (req.user_category == 'publisher' || req.loginType == 'publisher') {
                search['$or'] = [{ 'offer_visible': { $in: ['public', 'approval_required'] } }, { 'pubOff.id': +req.accountid }];
                search['status'] = 1;
                projection["pubOff"] = { $elemMatch: { id: +req.accountid || '' } };
            }

            let offerData = await OfferModel.getOneOffer(search, projection);
            if (offerData.thumbnail == "" && offerData.app_id) {
                try {
                    let appDetails = await AppDetailsModel.getApplicationDetails({ "app_id": offerData.app_id }, { "img": 1 })
                    if (appDetails && appDetails.length) {
                        offerData.thumbnail = appDetails[0].img;
                    }
                } catch (error) {
                    console.log("file: Offer.js ~ line 793 ~ exports.offerShow= ~ error", error)
                }
            }

            let advertiserData = await generalFunction.getAdvertiser(offerData.advertiser_id);
            offerData['advertiser_status'] =  advertiserData['status'];
            let platformData = await generalFunction.getPlatform(offerData.advertiser_platform_id);   
            if(platformData && Object.keys(platformData).length > 0 )         
            offerData['platform_status'] = platformData['status'] == '1' ? 'Active' : 'inActive';                        
            if (offerData && (req.user_category == 'publisher' || req.loginType == 'publisher')) {

                let confPubOffStatus = {};
                for (let item of Object.values(config.PUBLISHER_OFFERS_STATUS)) {
                    confPubOffStatus[item['value']] = item['label']
                    if (item['label'] == 'approved') {
                        confPubOffStatus[item['value']] = "active"
                    }
                    else if (item['label'] == 'new') {
                        confPubOffStatus[item['value']] = "no_link"
                    }
                }

                if (offerData.pubOff && offerData.pubOff.length == 1) {

                    if (offerData.pubOff[0]['pay']) {
                        offerData['payout'] = offerData.pubOff[0]['pay']
                    }
                    if (offerData.pubOff[0]['pubOffSt'] == 1) {
                        offerData['status'] = offerData.pubOff[0]['pubOffSt']
                        offerData['status_label'] = confPubOffStatus[offerData.pubOff[0]['pubOffSt']]
                    }
                    else {
                        offerData['status'] = offerData.pubOff[0]['pubOffSt']
                        offerData['status_label'] = confPubOffStatus[offerData.pubOff[0]['pubOffSt']]
                    }
                }

                if (offerData.tracking_link) {
                    if ((offerData.offer_visible == 'public') || (offerData.offer_visible == 'approval_required' || offerData.offer_visible == 'private') && (offerData.pubOff && offerData.pubOff.length == 1 && offerData.pubOff[0]['pubOffSt'] == 1)) {

                        let networkData = await NetworkModel.findOneNetwork({ _id: req.user.userDetail.network[0] }, { "network_publisher_setting_string": 1, domain: 1 });
                        let advertiser_id_setting = networkData[0]['network_publisher_setting_string']
                        let linkDomain = `${req.network_unique_id}.${process.env.TRACKING_DOMAIN}`;
                        if (networkData[0] && networkData[0]['domain'] && networkData[0]['domain']['tracker']) {
                            linkDomain = networkData[0]['domain']['tracker'];
                        }
                        if (advertiser_id_setting.includes("adv_id=true")) {
                            offerData.tracking_link = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offerData._id + "&aff_id=" + req.accountid + "&adv_id=" + offerData['advertiser_id'] + "&" + req.network_setting.replace(/&adv_id=true/g, '');
                        }
                        else {
                            offerData.tracking_link = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offerData._id + "&aff_id=" + req.accountid + "&" + req.network_setting.replace(/&adv_id=true/g, '');
                        }
                        offerData['status'] = 1
                        offerData['status_label'] = confPubOffStatus['1']
                    }
                    else {
                        offerData.tracking_link = ""
                        offerData['status'] = 0
                        offerData['status_label'] = confPubOffStatus['0']
                        if (offerData['pubOff']) {
                            offerData['status'] = offerData.pubOff[0]['pubOffSt']
                            offerData['status_label'] = confPubOffStatus[offerData.pubOff[0]['pubOffSt']]

                        }
                    }
                }

                delete offerData['offer_capping']['daily_revenue']
                delete offerData['offer_capping']['monthly_revenue']
                delete offerData['offer_capping']['overall_revenue']

                if (offerData['pubOff']) {
                    delete offerData['pubOff']
                }
            }

            let response = Response.success();
            response.payload = offerData;
            response.msg = "success";
            return res.status(200).json(response);
        }
        else {
            let response = Response.error();
            response.msg = "Bad Request";
            response.error = ["Check Offerid"];
            return res.status(400).json(response);
        }
    } catch (error) {
        let response = Response.error();
        response.msg = "Internal Server Error";
        response.error = [error];
        return res.status(500).json(response);
    }
}
exports.getOfferDetails = (req, res) => {
    let search = {};
    let projection = {};
    if (req.params.Offer_id && mongooseObjectId.isValid(req.params.Offer_id.trim())) {
        search['_id'] = mongooseObjectId(req.params.Offer_id.trim());
        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        // debug(search);
        OfferModel.getOneOffer(search, projection).then(result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = result;
            response.msg = "success";
            return res.status(200).json(response);
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

exports.insertPublisherOffer = async (req, res) => {
    try {
        if (req.body.publisherOffers && req.body.publisherOffers.offer_id && req.body.publisherOffers.publisher_id) {
            let pay = 0;
            if (req.body.publisherOffers['publisher_payout'] && +req.body.publisherOffers['publisher_payout']) {
                pay = +req.body.publisherOffers['publisher_payout'];
            }
            let pubOffSt = 1;
            if (req.body.publisherOffers['pubOffSt'] && +req.body.publisherOffers['pubOffSt']) {
                pubOffSt = +req.body.publisherOffers['pubOffSt'];
            }
            let offers = await OfferModel.getSearchOffer({ _id: { $in: req.body.publisherOffers.offer_id } }, { payout: 1, pubOff: 1 }, {});
            let redisKey = []
            for (let offer of offers) {
                let pubOff = [];
                if (offer['pubOff']) {
                    pubOff = offer['pubOff'];
                }
                for (let item of req.body.publisherOffers.publisher_id) {
                    let index = pubOff.findIndex(x => x.id == item['pid']);
                    if (index >= 0) {
                        if (pay) {
                            pubOff[index] = { "id": pubOff[index]['id'], "pay": pay, "pubOffSt": pubOffSt }
                        }
                        else {
                            pubOff[index] = { "id": pubOff[index]['id'], "pubOffSt": pubOffSt }
                        }
                    } else {
                        let temp = { "id": item['pid'], "pubOffSt": pubOffSt };
                        if (pay) {
                            temp['pay'] = pay;
                        }
                        pubOff.push(temp);
                    }
                }
                let update = {
                    pubOff: pubOff
                };
                await OfferModel.updateOffer({ _id: mongooseObjectId(offer['_id']) }, { $set: update }, {});
                redisKey.push(`OFFER:${offer['_id']}`);
            }
            delRedisData(redisKey)
        }
        let response = Response.success();
        response.msg = 'Offers assigned to publishers successfully.';
        response.payloadType = payloadType.array;
        response.payload = [];
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        response.error = [error.message];
        return res.status(200).json(response);
    }
}

exports.unAssignPublisherOffer = async (req, res) => {

    try {
        // console.log("file: Offer.js ~ line 666 ~ exports.unAssignPublisherOffer= ~ req.body", req.body)
        if (req.body.publisher_id && req.body.publisher_id.length && req.body.offer_id && req.body.offer_id.length) {

            let selectedOffers = req.body.offer_id;
            let selectedPublishers = req.body.publisher_id;

            for (const offerId of selectedOffers) {
                for (let pid of selectedPublishers) {
                    let filter = {
                        _id: offerId,
                        publisher_offers: { $elemMatch: { publisher_id: pid } }
                    }

                    // let offerData = await OfferModel.getOneOffer(filter, filter);
                    // if (offerData && offerData.publisher_offers && offerData.publisher_offers.length) {
                    // console.log("file: Offer.js ~ line 678 ~ exports.unAssignPublisherOffer= ~ publihserOffers", offerData.publisher_offers[0])


                    let reflect = {
                        publisher_offers: {
                            // publisher_id: offerData.publisher_offers[0].publisher_id,
                            publisher_offer_status_label: config.OFFERS_STATUS["no_link"]["label"],
                            publisher_offer_status: config.OFFERS_STATUS["no_link"]['value'],
                            // publisher_payout_percent: +offerData.publisher_offers[0].publisher_payout_percent
                        }
                    };
                    // console.log("file: Offer.js ~ line 691 ~ exports.unAssignPublisherOffer= ~ reflect", reflect)
                    OfferModel.getSubDocument({ _id: { $in: selectedOffers } }, { publisher_offers: { publisher_id: { $in: pid } } }, {})
                        .then(result => {
                            console.log("file: Offer.js ~ line 694 ~ exports.unAssignPublisherOffer= ~ result", result)
                            // OfferModel.setSubDocument({ network_id: mongooseObjectId(req.user.userDetail.network[0]), _id: mongooseObjectId(pOffers.offer_id[i]) }, reflect, {})
                            //     .then(result => { })
                            //     .catch(err => { })
                        })
                        .catch(err => { });
                    // }
                }
            }
        }
        else {
            let response = Response.error();
            response.msg = "Invalid Status";
            response.error = ["Invalid Status"];
            return res.status(200).json(response);
        }

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        response.msg = " successfully saved all ";
        // debug(response);
        return res.status(200).json(response);
    }
    catch (err) {
        console.log(err);
        let response = Response.error();
        response.msg = "Something Went Wrong";
        response.error = [err.message];
        return res.status(200).json(response);
    }

}

exports.offerUpdate = async (req, res) => {
    if (req.params.id && mongooseObjectId.isValid(req.params.id.trim())) {

        let id = req.params.id.trim();
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);

        let [platform_id, platform_name, advertiser_platform_id, plty, plid, aid] = [null, null, null, +req.body.plty || 0, +req.body.plid || 0, +req.body.aid || 0];

        if (req.body.platform_id == null || req.body.platform_id == 'null' || req.body.platform_id == '') {
            platform_id = mongooseObjectId('5e0b93a80000000000000000');
            platform_name = 'Direct';
        } else {
            platform_id = req.body.platform_id;
            platform_name = req.body.platform_name;
            plty = +req.body.plty;
            if (!plty) {
                let result = await PlatformTypeModel.getPlatformTypesOne({ _id: mongooseObjectId(req.body.platform_id) }, { plty: 1 });
                if (result) plty = result.plty;
            }
        }
        if (req.body.advertiser_platform_id == null || req.body.advertiser_platform_id == 'null' || req.body.advertiser_platform_id == '') {
            advertiser_platform_id = req.body.advertiser_id;
        } else {
            advertiser_platform_id = req.body.advertiser_platform_id;
            plid = +req.body.plid;
            if (!plid) {
                let result = await PlatformModel.getOnePlatform({ _id: mongooseObjectId(req.body.advertiser_platform_id) }, { plid: 1 });
                if (result) plid = result.plid;
            }
        }

        if (!aid && req.body.advertiser_id) {
            let result = await AdvertiserModel.searchOneAdvertiser({ _id: mongooseObjectId(req.body.advertiser_id) }, { aid: 1 });
            if (result) aid = result.aid;
        }

        let reflect = {
            "advertiser_offer_id": req.body.advertiser_offer_id,
            "platform_id": platform_id,
            "platform_name": platform_name,
            "advertiser_platform_id": advertiser_platform_id,
            "thumbnail": req.body.thumbnail,
            "offer_name": req.body.offer_name,
            "description": req.body.description,
            "kpi": req.body.kpi,
            "preview_url": req.body.preview_url,
            "tracking_link": req.body.tracking_link,
            "expired_url": req.body.expired_url,
            "start_date": req.body.start_date,
            "end_date": req.body.end_date,
            "currency": req.body.currency,
            "revenue": parseFloat(req.body.revenue),
            "revenue_type": { "enum_type": req.body.revenue_type, "offer_type": '' },
            "payout": parseFloat(req.body.payout),
            "payout_type": { "enum_type": req.body.payout_type, "offer_type": '' },
            "approvalRequired": req.body.approvalRequired,
            "isCapEnabled": req.body.isCapEnabled,
            "offer_capping": req.body.offer_capping,
            "isTargeting": req.body.isTargeting,
            "geo_targeting": req.body.geo_targeting,
            "device_targeting": req.body.device_targeting,
            "creative": req.body.creative,
            "redirection_method": req.body.redirection_method,
            "offer_visible": req.body.offer_visible,
            "status_label": req.body.status_label,
            "status": req.body.status,
            "isgoalEnabled": req.body.isgoalEnabled,
            "goal": req.body.goal,
            "app_id": req.body.preview_url ? apiPlugin.getAppId(req.body.preview_url) : '',
            "$inc": { "version": 1 },
        };

        if (req.body.category && req.body.category.length) {
            reflect['category'] = req.body.category
        }

        if (+req.body.revenue && +req.body.payout) {
            reflect['adv_platform_payout_percent'] = (+req.body.payout * 100) / +req.body.revenue;
        }

        if (req.body.advertiser_offer_id && req.body.tracking_link) {
            reflect['adv_off_hash'] = crypto.createHash("md5").update(req.body.advertiser_offer_id + Functions.parseUrl(req.body.tracking_link)).digest("hex")
        }
        if (aid) reflect['aid'] = +aid;
        if (plid) reflect['plid'] = +plid;
        if (plty) reflect['plty'] = +plty;
        if (req.user.userDetail.nid) reflect['nid'] = +req.user.userDetail.nid;

        if (req.body.advertiser_name && req.body.advertiser_name.trim()) {
            reflect['advertiser_name'] = req.body.advertiser_name.trim();
        }

        if (reflect['offer_visible'] == "public") {
            reflect['isPublic'] = true;
        }

        if (reflect['app_id']) {
            reflect['isMyOffer'] = await checkMyOffer(reflect['app_id'], network_id);
        }
        // reflect['offer_hash'] = generateHash(ImportantFields, reflect);
        OfferModel.updateOffer({ _id: id }, reflect, { new: true, timestamps: true }).then(async result => {
            if (reflect.status == 1) {
                await Functions.publishJobForWebhook(result.network_id, result._id, "offer_update", "Manual Update Offer")
            }
            if (reflect.advertiser_platform_id && reflect.advertiser_offer_id) {
                delRedisData(`OH:${reflect.advertiser_platform_id}:${reflect.advertiser_offer_id}`)
                delRedisData(`OFFER:${result._id}`)
            }
            let response = Response.success();
            response.payload = result;
            if (result) {
                offersAuditLog(apiPlugin.ImportantFields, result, 'ui', req.user.userDetail.name, req.user.userDetail.id, result.version);
                response.msg = "successfully Updated";
            }
            else {
                response.msg = "Offer Not Found";
            }
            return res.status(200).json(response);
        }).catch(err => {
            let response = Response.error();
            response.msg = "error updating";
            response.error = [err.message];
            return res.status(200).json(response);
        });
    }
    else {
        let response = Response.error();
        response.msg = "Invalid Request";
        response.error = ["Invalid Offer Id"];
        return res.status(403).json(response);
    }
}

// exports.offerUpdate = async (req, res) => {

//     if (req.params.id && mongooseObjectId.isValid(req.params.id.trim())) {

//         let id = req.params.id.trim();
//         let network_id = mongooseObjectId(req.user.userDetail.network[0]);

//         let platform_id = null;
//         if (req.body.platform_id == null || req.body.platform_id == 'null' || req.body.platform_id == '') {
//             platform_id = null;
//         } else {
//             platform_id = req.body.platform_id;
//         }

//         let advertiser_platform_id = null;
//         if (req.body.advertiser_platform_id == null || req.body.advertiser_platform_id == 'null' || req.body.advertiser_platform_id == '') {
//             advertiser_platform_id = null;
//         } else {
//             advertiser_platform_id = req.body.advertiser_platform_id;
//         }

//         let pubOff = [];
//         if (req.body.advertiser_id) {
//             let pubList = await publisherModel.getPublisherList({ network_id: mongooseObjectId(network_id), status: 'Active', appr_adv_opt: { $in: [104, 105, 106] } }, { pid: 1, appr_adv_opt: 1, appr_adv: 1 }, {});
//             pubOff = await Functions.getPublisherOffer(req.body.advertiser_id, req.body.payout || 0, pubList);
//         }

//         let adv_off_hash = "";
//         if (req.body.advertiser_offer_id && req.body.tracking_link) {
//             adv_off_hash = crypto.createHash("md5").update(req.body.advertiser_offer_id + Functions.parseUrl(req.body.tracking_link)).digest("hex")
//         }

//         let adv_platform_payout_percent = 100;
//         if (req.body.revenue && req.body.payout) {
//             adv_platform_payout_percent = (+req.body.payout * 100) / +req.body.revenue;
//         }

//         let reflect = {
//             "category": req.body.category,
//             "advertiser_offer_id": req.body.advertiser_offer_id,
//             "platform_id": platform_id,
//             "platform_name": req.body.platform_name || 'Direct',
//             "advertiser_platform_id": req.body.advertiser_platform_id,
//             "thumbnail": req.body.thumbnail,
//             "offer_name": req.body.offer_name,
//             "description": req.body.description,
//             "kpi": req.body.kpi,
//             "preview_url": req.body.preview_url,
//             "tracking_link": req.body.tracking_link,
//             "expired_url": req.body.expired_url,
//             "start_date": req.body.start_date,
//             "end_date": req.body.end_date,
//             "currency": req.body.currency,
//             "revenue": req.body.revenue,
//             "revenue_type": { "enum_type": req.body.revenue_type, "offer_type": '' },
//             "payout": req.body.payout,
//             "payout_type": { "enum_type": req.body.payout_type, "offer_type": '' },
//             "approvalRequired": req.body.approvalRequired,
//             "isCapEnabled": req.body.isCapEnabled,
//             "offer_capping": req.body.offer_capping,
//             "isTargeting": req.body.isTargeting,
//             "geo_targeting": req.body.geo_targeting,
//             "device_targeting": req.body.device_targeting,
//             "creative": req.body.creative,
//             "redirection_method": req.body.redirection_method,
//             "offer_visible": req.body.offer_visible,
//             "status_label": req.body.status_label,
//             "status": req.body.status,
//             "isgoalEnabled": req.body.isgoalEnabled,
//             "goal": req.body.goal,
//             "app_id": req.body.preview_url ? getAppId(req.body.preview_url) : '',
//             "$inc": { "version": 1 },
//             "pubOff": pubOff,
//             "adv_platform_payout_percent": adv_platform_payout_percent,
//             "adv_off_hash": adv_off_hash
//         };

//         if (offer['offer_visible'] == "public") {
//             offer['isPublic'] = true;
//         }

//         if (offer['app_id']) {
//             offer['isMyOffer'] = await checkMyOffer(offer['app_id'], offer['network_id']);
//         }

//         // reflect['offer_hash'] = generateHash(ImportantFields, reflect);
//         OfferModel.updateOffer({ _id: id }, reflect, { new: false, timestamps: true }).then(async result => {
//             if (reflect.status == 1) {
//                 await Functions.publishJobForWebhook(result.network_id, result._id, "offer_update", "Manual Update Offer")
//             }
//             if (reflect.advertiser_platform_id && reflect.advertiser_offer_id) {
//                 delRedisData(`OH:${reflect.advertiser_platform_id}:${reflect.advertiser_offer_id}`)
//                 delRedisData(`OFFER:${result._id}`)
//             }
//             let response = Response.success();
//             response.payloadType = payloadType.array;
//             response.payload = [];
//             if (result) {
//                 offersAuditLog(ImportantFields, result, 'ui', req.user.userDetail.name, req.user.userDetail.id, result.version);
//                 response.msg = "successfully Updated";
//             }
//             else {
//                 response.msg = "Offer Not Found";
//             }
//             return res.status(200).json(response);
//         }).catch(err => {
//             let response = Response.error();
//             response.msg = "error updating";
//             response.error = [err.message];
//             return res.status(200).json(response);
//         });
//     }
//     else {
//         let response = Response.error();
//         response.msg = "Invalid Request";
//         response.error = ["Invalid Offer Id"];
//         return res.status(403).json(response);
//     }
// }

// For publisher user
exports.getOffersToExport = async (req, res, next) => {
    let search = {};
    let projection = {};
    let invalidSearch = false;
    let options = {};
    search['status'] = 1;
    try {
        search['updatedAt'] = { $gte: moment().subtract(1, 'd'), $lte: moment() };
        search['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '', publisher_offer_status: 1 } };
        projection['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '' } };
        search['isPublic'] = true;

        if (req.body.search) {
            if (req.body.search.offer_id) {
                if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
                    search['_id'] = mongooseObjectId(req.body.search.offer_id.trim());
                }
                else {
                    search['offer_name'] = { $regex: req.body.search.offer_id.trim(), $options: 'i' };
                }
            }

            if (req.body.search.advertiser_id) {
                if (mongooseObjectId.isValid(req.body.search.advertiser_id.trim())) {
                    search['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.my_offers) {
                search['isMyOffer'] = req.body.search.my_offers;
            }
            if (req.body.search.advertiser_offer_id) {
                search['advertiser_offer_id'] = req.body.search.advertiser_offer_id.trim();
            }
            if (req.body.search.app_id) {
                search['app_id'] = { $regex: req.body.search.app_id.trim(), $options: 'i' };
            }
            if (req.body.search.publisher_offer_status) {
                search['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '', publisher_offer_status: +req.body.search.publisher_offer_status.trim() } };
            }
            if (req.body.search.platform_id) {
                if (mongooseObjectId.isValid(req.body.search.platform_id.trim())) {
                    search['platform_id'] = mongooseObjectId(req.body.search.platform_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.start_date) {
                search['updatedAt'] = { $gte: moment(req.body.search.start_date.trim()), $lte: moment(req.body.search.end_date.trim()) };
            }
        }
        if (invalidSearch) {
            let response = Response.error();
            response.msg = "No Offer Found!!";
            response.error = ["Invalid Request"];
            return res.status(403).json(response);
        }
        // projection['advertiser_name'] = 1;
        projection['advertiser_id'] = 1;
        projection['app_id'] = 1;
        // projection['platform_name'] = 1;
        projection['_id'] = 1;
        projection['offer_name'] = 1;
        projection['geo_targeting.country_allow'] = 1;
        projection['payout'] = 1;
        // if (req.body.options) {
        //     if (req.body.options.limit && req.body.options.limit != 0) {
        //         options['limit'] = req.body.options.limit;
        //     }
        //     if (req.body.options.page && req.body.options.page != 0) {
        //         options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
        //     }
        // }
        options['sort'] = { updatedAt: -1 }
        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        let networkData = await getNetworkData(req.user.userDetail.network[0])
        let linkDomain = `${req.network_unique_id}.${process.env.TRACKING_DOMAIN}`;
        if (networkData && networkData['domain'] && networkData['domain']['tracker']) {
            linkDomain = networkData['domain']['tracker'];
        }
        req['cursor'] = OfferModel.find(search, projection, options).lean().cursor({ batchSize: 1000 });
        let transformer = (doc) => {
            let country = [];
            if (doc.geo_targeting && doc.geo_targeting.country_allow) {
                doc.geo_targeting.country_allow.map(obj => {
                    if (obj.key) {
                        country.push(obj.key);
                    }
                })
            }
            if (doc.offer_name) {
                // debug(doc.offer_name)
                doc.offer_name = doc.offer_name.replace(/[;,\t\n]/g, ' ');
            }
            return {
                '': '',
                OffersName: doc.offer_name,
                // NetworkName: doc.advertiser_name,
                PackageName: doc.app_id,
                // Platform: doc.platform_name,
                // 'blank': '',
                CountryCode: country.join(' '),
                // ToBeChecked: "to be checked",
                Payout: doc.payout,
                Link: "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + doc._id + "&aff_id=" + req.accountid + "&" + req.network_setting
            };
        }
        req['transformer'] = transformer;
        next();
    }
    catch (err) {
        let response = Response.error();
        response.msg = "Error Finding offers";
        response.error = [err.message];
        return res.status(400).json(response);
    }
}

// For network user
// exports.exportPublisherOffers = (req, res, next) => {

//     let search = {};
//     let projection = {};
//     let invalidSearch = false;
//     let options = { };
//     search['status'] = 1;
//     let network_setting = '';
//     try {
//         search['updatedAt'] = { $gte: moment().subtract(1, 'd'), $lte: moment() };
//         search['publisher_offers'] = { $elemMatch: { publisher_id: +req.params.pid || '', publisher_offer_status: 1 } };
//         projection['publisher_offers'] = { $elemMatch: { publisher_id: +req.params.pid || '' } };
//         search['isPublic'] = true;

//         if (req.body.search) {
//             if (req.body.search.offer_id) {
//                 if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
//                     search['_id'] = mongooseObjectId(req.body.search.offer_id.trim());
//                 }
//                 else {
//                     search['offer_name'] = { $regex: req.body.search.offer_id.trim(), $options: 'i' };
//                 }
//             }
//             if (req.body.search.advertiser_offer_id) {
//                 search['advertiser_offer_id'] = req.body.search.advertiser_offer_id.trim();
//             }
//             if (req.body.search.app_id) {
//                 search['app_id'] = { $regex: req.body.search.app_id.trim(), $options: 'i' };
//             }
//             if (req.body.search.advertiser_id) {
//                 if (mongooseObjectId.isValid(req.body.search.advertiser_id.trim())) {
//                     search['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
//                 }
//                 else {
//                     invalidSearch = true;
//                 }
//             }
//             if (req.body.search.platform_id) {
//                 if (mongooseObjectId.isValid(req.body.search.platform_id.trim())) {
//                     search['platform_id'] = mongooseObjectId(req.body.search.platform_id.trim());
//                 }
//                 else {
//                     invalidSearch = true;
//                 }
//             }
//             if (req.body.search.my_offers) {
//                 search['isMyOffer'] = req.body.search.my_offers;
//             }
//             if (req.body.search.start_date) {
//                 search['updatedAt'] = { $gte: moment(req.body.search.start_date.trim()), $lte: moment(req.body.search.end_date.trim()) };
//             }
//             if(req.body.search.select_os){
//                 search['device_targeting.os'] = req.body.search.select_os.trim();
//             }
//             if(req.body.search.select_device){
//                 search['device_targeting.device'] = req.body.search.select_device.trim();
//             }
//             if(req.body.search.select_country){
//                 search['geo_targeting.country_allow'] = {$elemMatch:{"key":req.body.search.select_country.trim()}};
//             }
//             // if(req.body.search.status_label){
//             //     search['status_label'] = req.body.search.status_label;
//             // }
//         }
//         if (invalidSearch) {
//             let response = Response.error();
//             response.msg = "No Offer Found!!";
//             response.error = ["Invalid Request"];
//             return res.status(403).json(response);
//         }
//         projection['advertiser_name'] = 1;
//         projection['advertiser_id'] = 1;
//         projection['app_id'] = 1;
//         projection['platform_name'] = 1;
//         projection['_id'] = 1;
//         projection['offer_name'] = 1;
//         projection['geo_targeting.country_allow'] = 1;
//         projection['payout'] = 1;
//         if (req.body.options) {
//             if (req.body.options.limit && req.body.options.limit != 0) {
//                 options['limit'] = req.body.options.limit;
//             }
//             if (req.body.options.page && req.body.options.page != 0) {
//                 options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
//             }
//         }
//         options['sort'] = { updatedAt: -1 }
//         search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
//         req['cursor'] = OfferModel.find(search, projection, options).lean().cursor({ batchSize: 1000 });
//         let transformer = (doc) => {

//             let country = [];
//             if (doc.geo_targeting && doc.geo_targeting.country_allow) {
//                 doc.geo_targeting.country_allow.map(obj => {
//                     if (obj.key) {
//                         country.push(obj.key);
//                     }
//                 })
//             }
//             if (doc.offer_name)
//             {
//                 // debug(doc.offer_name)
//                 doc.offer_name = doc.offer_name.replace(/;/g, '');
//                 doc.offer_name = doc.offer_name.replace(/,/g, '');
//             }

//             if(req.network_setting){
//                 network_setting = "&" + req.network_setting
//             }
//             else{
//                 network_setting = ''
//             }
//             return {
//                 '': '',
//                 OffersName: doc.offer_name,
//                 NetworkName: doc.advertiser_name,
//                 PackageName: doc.app_id,
//                 Platform: doc.platform_name,
//                 'blank': '',
//                 CountryCode: country.join(' '),
//                 ToBeChecked: "to be checked",
//                 Payout: doc.payout,
//                 Link: "http://" + req.network_unique_id + "." + process.env.TRACKING_DOMAIN + "/" + process.env.TRACKING_PATH + "?offer_id=" + doc._id + "&aff_id=" + req.params.pid + "&adv_id=" + doc.advertiser_id + network_setting

//             };
//         }

//         req['transformer'] = transformer;
//         next();
//     }
//     catch(err){
//         let response = Response.error();
//         response.msg = "Error Finding offers";
//         response.error = [err.message];
//         return res.status(400).json(response);
//     }
// }
exports.exportPublisherOffers = async (req, res) => {

    let invalidSearch = false;
    try {

        if (req.body.search) {
            if (req.body.search.advertiser_id) {
                if (!(mongooseObjectId.isValid(req.body.search.advertiser_id.trim()))) {
                    invalidSearch = true;
                }
            }
            if (req.body.search.platform_id) {
                if (!(mongooseObjectId.isValid(req.body.search.platform_id.trim()))) {
                    invalidSearch = true;
                }
            }
        }
        if (invalidSearch) {
            let response = Response.error();
            response.msg = "No Offer Found!!";
            response.error = ["Invalid Request"];
            return res.status(403).json(response);
        }

        let FilterData = {
            Filter: {
                body: req.body,
                params: req.params,
                query: req.query,
                network_id: req.user.userDetail.network[0],
                User_Category: req.user.userDetail.category
            }
        }
        let hashQuery = encodeURIComponent(crypto.createHash("md5").update(JSON.stringify(FilterData)).digest("hex"));
        let result = await DownloadCenterModel.findDownloadCenterData({ hash: hashQuery }, {})
        if (result.length > 0) {

            let response = Response.error();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "File already downloaded";
            return res.status(200).send(response)
        }
        else {
            let downloadData = new DownloadCenterModel({
                UserDetails: {
                    UserId: req.user.userDetail.id,
                    name: req.user.userDetail.name
                },
                NetworkId: req.user.userDetail.network[0],
                User_Category: req.user.userDetail.category,
                Filter: {
                    body: req.body,
                    params: req.params,
                    query: req.query
                },
                MetaData: {
                    network_setting: req.network_setting,
                    publisher_id: req.params.pid,
                    network_unique_id: req.network_unique_id
                },
                hash: hashQuery,
                status: "processing",
                reportName: "Live_Offers",
                format: "CSV"
            })
            downloadData.save().then(async docs => {
                if (docs) {
                    let downloadCenterId = docs['_id'];
                    // console.log("=============================Job Publish to the worker form offfers");
                    // let result = await rabbitMq.publish_Content(isMultipleContent = false, publish_queue, downloadCenterId, true, true);
                    let result = await Functions.sendJobToGenericWorker({ workerName: "downloadCenter", workerData: downloadCenterId }, priority = 15);
                    if (result) {
                        // console.log("================================Job Published Sucessfully");
                        let response = Response.success();
                        response.payloadType = payloadType.array;
                        response.payload = [docs];
                        response.msg = "Request Received by Server";
                        return res.status(200).json(response);


                    } else {
                        // console.log("================================", result);
                        DownloadCenterModel.deleteData({ _id: docs['_id'] }).then(data => {
                            if (data.deletedCount > 0) {
                                // console.log("Download Data Deleted ");
                                let response = Response.error();
                                response.payloadType = payloadType.array;
                                response.payload = [data];
                                response.msg = "Server Not Responding , Please Try After Some Time .. "
                                return res.status(400).json(response);

                            }
                        }).catch(err => {
                            console.log(err);
                            let response = Response.error();
                            response.msg = "error updating";
                            response.error = [err.message];
                            return res.status(400).json(response);
                        })

                    }

                }
            }).catch(err => {
                console.log(err);
                let response = Response.error();
                response.msg = "Download Center Error";
                response.error = [err.message];
                return res.status(400).json(response);

            })
        }
    } catch (err) {
        console.log(err);
        let response = Response.error();
        response.msg = "Error Finding offers";
        response.error = [err.message];
        return res.status(400).json(response);
    }
}

exports.offerClone = (req, res) => {
    let offerId = req.params.offer_id;
    if (mongooseObjectId.isValid(offerId)) {
        OfferModel.getSearchOffer({ "_id": offerId, "network_id": req.user.userDetail.network[0] }).then(result => {
            if (Array.isArray(result) && result.length) {
                let offer = result;
                delete offer[0]._id;
                delete offer[0].createdAt;
                delete offer[0].updatedAt;
                offer[0].isClone = true;

                OfferModel.insertManyOffers(offer).then(result => {
                    let response = Response.success();
                    response.msg = "Offer cloned successfully";
                    response.payload = { "offerId": result[0]._id }
                    return res.status(200).json(response);
                })
                    .catch(err => {
                        let response = Response.error();
                        response.msg = "error insert";
                        response.error = [err.message];
                        return res.status(200).json(response);
                    });
            }
            else {
                let response = Response.error();
                response.msg = "Invalid Request";
                response.error = ["Offer Id does not exists"];
                return res.status(403).json(response);
            }
        })
    }
    else {
        let response = Response.error();
        response.msg = "Invalid Request";
        response.error = ["Invalid Offer Id"];
        return res.status(403).json(response);
    }
}

exports.updateOfferStatus = (req, res) => {
    let offerId = req.body.offerId;
    let pid = req.body.pid;
    let status = req.body.status;
    let status_value;
    if (req.body.status === "active") {
        status_value = 1;
    }
    else if (req.body.status === "paused") {
        status_value = 5;
    }
    //console.log(offerId,pid,status);
    let filter = { _id: offerId, 'publisher_offers.publisher_id': pid };
    let value = { 'publisher_offers.$.publisher_offer_status_label': status, 'publisher_offers.$.publisher_offer_status': status_value };
    OfferModel.updatePublisherOfferStatusValue(filter, { $set: value })
        .then(result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = [result];
            if (result.nModified > 0) {
                response.msg = " Status Updated Sucessfully "
            }
            else {
                response.msg = " Data Not Found "
            }
            return res.status(200).json(response);
        }).catch(err => {
            let response = Response.error();
            response.msg = "error updating";
            response.error = [err.message];
            console.log(err);
            return res.status(200).json(response);
        });


}

exports.getDownloadServerFile = (req, res) => {

    let filter = { _id: req.body.DownloadCenterId };
    let projection = { filepath: 1 };
    DownloadCenterModel.findDownloadCenterData(filter, projection).then(doc => {
        if (doc.length) {
            let serverFilePath = ''
            if (process.env.NODE_ENV === 'dev') {
                serverFilePath = path.join(__dirname, process.env.DOWNLOAD_DOMAIN + doc[0]['filepath'])
            }
            else {
                serverFilePath = process.env.DOWNLOAD_DOMAIN + doc[0]['filepath']
            }
            //console.log(serverFilePath);
            res.download(serverFilePath);
        }
        else {
            let response = Response.error();
            response.msg = "Error Updating";
            response.error = [err.message];
            return res.status(400).send(response)
        }
    }).catch(err => {
        console.log(err);
    })
}

exports.deleteDataById = (req, res) => {

    let filter = { _id: req.body._id };
    const filepath = req.body.filepath;
    DownloadCenterModel.deleteData(filter).then(doc => {

        if (doc.deletedCount > 0) {
            let serverFilePath = path.join(__dirname, '../../public/uploads' + filepath)
            if (fs.existsSync(serverFilePath)) {

                fs.unlink(serverFilePath, function (err) {
                    if (err) {
                        console.log(err);
                        let response = Response.error();
                        response.msg = "Directory file delete error";
                        response.error = [err.message];
                        return res.status(200).json(response);
                    } else {
                        // console.log("Successfully deleted the file.");
                        let response = Response.success();
                        response.payloadType = payloadType.array;
                        response.payload = doc;
                        response.msg = "Deleted Successful"
                        return res.status(200).json(response);
                    }
                })
            }
            else {
                // console.log("Successfully deleted the file.");
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = doc;
                response.msg = "Deleted Successful"
                return res.status(200).json(response);
            }
        }

    }).catch(err => {
        console.log(err);
        let response = Response.error();
        response.msg = "error updating";
        response.error = [err.message];
        return res.status(400).json(response);

    })
}

exports.checkPath = (req, res) => {
    let filter = { _id: req.body._id };
    let projection = { filepath: 1 };
    DownloadCenterModel.findDownloadCenterData(filter, projection).then(doc => {
        //console.log(doc[0]['filepath']);
        if (doc.length) {
            if (!fs.existsSync(doc[0]['filepath'])) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.msg = "File Does not exist";
                return res.status(200).send(response)
            }
            else {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.msg = "File Exist"
                return res.status(200).json(response);
            }
        }
    })
}

formatAndValidateOfferCapping = (data) => {
    let offer_capping = {
        daily_clicks: 0,
        monthly_clicks: 0,
        overall_click: 0,
        daily_conv: 0,
        monthly_conv: 0,
        overall_conv: 0,
        payout_daily: 0,
        monthly_payout: 0,
        overall_payout: 0,
        daily_revenue: 0,
        monthly_revenue: 0,
        overall_revenue: 0
    };
    let check = false;
    try {
        for (let item in data) {
            if (data[item]) {
                offer_capping[item] = +data[item];
                check = true;
            }
        }
        if (check) {
            return offer_capping;
        } else {
            return false;
        }
    } catch (error) {
        // console.log(error);
        return false;
    }
}

formatAndValidateGeoTargeting = (data) => {
    let geo_targeting = {
        country_allow: [],
        country_deny: [],
        city_allow: [],
        city_deny: []
    };
    let check = false;
    try {
        for (let item in data) {
            if (data[item]) {
                let arr = data[item].split(",");
                for (let i = 0; i < arr.length; i++) {
                    let indexKey = config.country.findIndex(x => x.key === arr[i].trim().toUpperCase());
                    if (indexKey != -1) {
                        geo_targeting[item].push({
                            "key": arr[i].trim().toUpperCase(),
                            "value": config.country[indexKey]['value'],
                        });
                        check = true;
                    } else {
                        return false;
                    }
                }
            }
        }
        if (check) {
            return geo_targeting;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

formatAndValidateDeviceTargeting = (data) => {
    let device_targeting = {
        device: [],
        os: [],
        os_version: []
    };
    let check = false;
    try {
        for (let item in data) {
            if (data[item]) {
                let arr = data[item].split(",");
                for (let i = 0; i < arr.length; i++) {
                    if (item == "device") {
                        check = true;
                        if (config.DEVICE.includes(arr[i].trim().toLowerCase())) {
                            // [ 'all', 'mobile', 'desktop', 'unknown' ]
                            device_targeting[item].push(arr[i].trim().toLowerCase());
                        } else {
                            return false;
                        }
                    } else if (item == "os") {
                        check = true;
                        if (config.OS.includes(arr[i].trim().toLowerCase())) {
                            // ['all', 'android', 'ios', 'windows', 'amazon', 'blackberry', 'unknown']
                            device_targeting[item].push(arr[i].trim().toLowerCase());
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }
        }
        if (check) {
            return device_targeting;
        } else {
            return false;
        }
    } catch (error) {
        // console.log(error);
        return false;
    }
}

formatAndValidateSingleOffer = async (offerData, network_id) => {
    let isValid = true;
    let offer = {};
    let errors = {};
    try {
        let filter = {};

        filter["network_id"] = offer["network_id"] = mongooseObjectId(network_id);

        if (offerData['advertiser_offer_id']) {
            filter['advertiser_offer_id'] = offer['advertiser_offer_id'] = offerData['advertiser_offer_id'].toString();
        } else {
            errors['advertiser_offer_id'] = "advertiser_offer_id is required!";
            isValid = false;
        }

        if (offerData['advertiser_link'] && offerData['advertiser_link'].trim()) {
            let advertiser_link = url.parse(offerData['advertiser_link'].trim(), true);
            let tracking_link = advertiser_link.protocol + "//" + advertiser_link.hostname + advertiser_link.pathname + "?";
            let linkQuery = advertiser_link.query;
            for (let i in linkQuery) {
                if (linkQuery[i] != "{click_id}" && linkQuery[i] != "{source}") {
                    tracking_link = tracking_link + i + "=" + linkQuery[i] + "&";
                }
            }
            offer['tracking_link'] = tracking_link.slice(0, -1);
        } else {
            errors['advertiser_link'] = "advertiser_link is required!";
            isValid = false;
        }

        offer['platform_id'] = null;
        offer['platform_name'] = "Direct";

        if (offerData['offer_name'] && offerData['offer_name'].trim()) {
            offer['offer_name'] = offerData['offer_name'].trim();
        } else {
            errors['offer_name'] = "offer_name is required!";
            isValid = false;
        }

        if (offerData['app_id'] && offerData['app_id'].toString().trim()) {
            offer['app_id'] = offerData['app_id'].toString().trim();
            let device_targeting = {
                device: ["mobile"],
                os: [],
                os_version: []
            };
            if (isNaN(offerData['app_id'].toString().trim())) {
                device_targeting["os"] = ["android"];
            } else {
                device_targeting["os"] = ["ios"];
            }
            offer['device_targeting'] = device_targeting;
        } else {
            errors['app_id'] = "app_id is required!";
            isValid = false;
        }

        if (offerData['revenue']) {
            if (isNaN(offerData['revenue'])) {
                errors['revenue'] = "Invalid revenue!";
                isValid = false;
            } else {
                offer['revenue'] = +offerData['revenue'];
            }
        } else {
            offer['revenue'] = 0;
        }

        if (isValid) {
            let domain = Functions.parseUrl(offerData['advertiser_link'].trim());

            let advertiser = await getRedisHashData('advertiser', network_id + ":" + domain);

            if (advertiser['data'] && advertiser['data']['advertiser_id'] && advertiser['data']['advertiser_platform_id']) {
                filter['advertiser_id'] = mongooseObjectId(advertiser['data']['advertiser_id']);
                filter['advertiser_platform_id'] = mongooseObjectId(advertiser['data']['advertiser_platform_id']);

                offer['advertiser_id'] = mongooseObjectId(advertiser['data']['advertiser_id']);
                offer['advertiser_name'] = advertiser['data']['advertiser_name'];
                offer['platform_id'] = mongooseObjectId(advertiser['data']['platform_id']);
                offer['platform_name'] = advertiser['data']['platform_name'];
                offer['advertiser_platform_id'] = mongooseObjectId(advertiser['data']['advertiser_platform_id']);
                if (advertiser['data']['status'] != "Active") {
                    errors['status'] = advertiser['data']['status'] + " advertiser status!";
                    isValid = false;
                }
                // update for payout_percent
                if (advertiser['data']['payout_percent']) {
                    offer['payout'] = ((advertiser['data']['payout_percent'] * offer['revenue']) / 100);
                } else {
                    offer['payout'] = offer['revenue'];
                }
                // end update for payout_percent
            } else {
                let advertiserData = await AdvertiserModel.getAdvertiser({ "network_id": mongooseObjectId(network_id), "platforms.domain": domain }, { "_id": 1, "company": 1, "status": 1, "platforms": 1 }, {});
                if (advertiserData.length) {
                    if (advertiserData[0]['status'] != "Active") {
                        errors['status'] = advertiserData[0]['status'] + " advertiser status!";
                        isValid = false;
                    }

                    let setData = {};

                    setData['advertiser_id'] = advertiserData[0]['_id'];
                    filter['advertiser_id'] = offer['advertiser_id'] = mongooseObjectId(advertiserData[0]['_id']);

                    setData['advertiser_name'] = offer['advertiser_name'] = advertiserData[0]['company'];

                    setData['status'] = advertiserData[0]['status'];

                    for (let item of advertiserData[0]['platforms']) {
                        if (item['domain'].includes(domain)) {
                            offer['platform_id'] = mongooseObjectId(item['platform_type_id']);
                            setData['platform_id'] = item['platform_type_id'];

                            setData['platform_name'] = offer['platform_name'] = item['platform_name'];

                            filter['advertiser_platform_id'] = offer['advertiser_platform_id'] = mongooseObjectId(item['platform_id']);
                            setData['advertiser_platform_id'] = item['platform_id'];
                        }
                    }
                    // update for payout_percent
                    let platformData = await PlatformModel.getOnePlatform({ _id: filter['advertiser_platform_id'] }, { payout_percent: 1 });
                    if (platformData && platformData['payout_percent']) {
                        setData['payout_percent'] = +platformData['payout_percent'];
                        offer['payout'] = ((platformData['payout_percent'] * offer['revenue']) / 100);
                    } else {
                        offer['payout'] = offer['revenue'];
                    }
                    // end update for payout_percent
                    await setRedisHashData('advertiser', network_id + ":" + domain, setData, 86400);
                } else if (offerData['advertiser_id'] && offerData['advertiser_id'].trim()) {
                    if (offerData['advertiser_platform_id'] && offerData['advertiser_platform_id'].trim()) {
                        // update for platform_id
                        try {
                            filter['advertiser_id'] = offer['advertiser_id'] = mongooseObjectId(offerData['advertiser_id'].trim());

                            filter['advertiser_platform_id'] = offer['advertiser_platform_id'] = mongooseObjectId(offerData['advertiser_platform_id'].trim());

                            // update for payout_percent
                            let platformData = await PlatformModel.getOnePlatform({ _id: filter['advertiser_platform_id'] }, { payout_percent: 1 });
                            if (platformData && platformData['payout_percent']) {
                                setData['payout_percent'] = +platformData['payout_percent'];
                                offer['payout'] = ((platformData['payout_percent'] * offer['revenue']) / 100);
                            } else {
                                offer['payout'] = offer['revenue'];
                            }
                            // end update for payout_percent

                            let advData = await AdvertiserModel.getAdvertiser({
                                "network_id": mongooseObjectId(network_id),
                                "_id": offer['advertiser_id'],
                                "platforms.platform_id": offer['advertiser_platform_id']
                            }, { "_id": 1, "company": 1, "status": 1, "platforms": 1 }, {});

                            if (advData.length) {
                                offer['advertiser_name'] = advData[0]['company'];
                                if (advData[0]['status'] != "Active") {
                                    errors['status'] = advData[0]['status'] + " advertiser status!";
                                    isValid = false;
                                }
                                for (let item of advData[0]['platforms']) {
                                    if (item['platform_id'].toString() === offerData['advertiser_platform_id'].trim()) {
                                        offer['platform_id'] = mongooseObjectId(item['platform_type_id']);
                                        offer['platform_name'] = item['platform_name'];
                                    }
                                }
                            } else {
                                errors['advertiser_platform_id'] = "Invalid advertiser_platform_id";
                                isValid = false;
                            }
                        } catch (error) {
                            errors['advertiser_platform_id'] = "Invalid advertiser_platform_id " + error;
                            isValid = false;
                        }
                        // update end for platform_id
                    } else {
                        try {
                            let linkQuery = url.parse(offerData['advertiser_link'].trim(), true).query;
                            let macrosCount = 0;
                            for (let i in linkQuery) {
                                if (!linkQuery[i] || !i) {
                                    errors['advertiser_link'] = "Invalid advertiser_link";
                                    isValid = false;
                                    break;
                                } else {
                                    if (linkQuery[i] === "{click_id}") {
                                        macrosCount++;
                                    }
                                    if (linkQuery[i] === "{source}") {
                                        macrosCount++;
                                    }
                                }
                            }
                            if (isValid && macrosCount < 2) {
                                errors['advertiser_link'] = "Please add macros into advertiser_link";
                                isValid = false;
                            }

                            offer['tracking_link'] = offerData['advertiser_link'].trim();

                            filter['advertiser_id'] = offer['advertiser_id'] = mongooseObjectId(offerData['advertiser_id'].trim());

                            let advertiserData = await AdvertiserModel.getAdvertiser({ "_id": offer['advertiser_id'] }, { "company": 1, "status": 1 }, {});
                            if (advertiserData.length) {
                                if (advertiserData[0]['status'] != "Active") {
                                    errors['status'] = advertiserData[0]['status'] + " advertiser status!";
                                    isValid = false;
                                }
                                offer['advertiser_name'] = advertiserData[0]['company'];
                                filter['advertiser_platform_id'] = offer['advertiser_platform_id'] = null;
                                // update for payout_percent
                                offer['payout'] = offer['revenue'];
                                // end update for payout_percent
                            } else {
                                errors['advertiser_id'] = "Invalid advertiser_id!";
                                isValid = false;
                            }
                        } catch (error) {
                            errors['advertiser_id'] = "Invalid advertiser_id!";
                            isValid = false;
                        }
                    }
                } else {
                    errors['advertiser_link'] = "Update advertiser plateforms details or add advertiser_id to csv!";
                    isValid = false;
                }
            }
        }

        if (isValid) {
            let existsOffer = await OfferModel.getOneOffer(filter, {});
            if (existsOffer) {
                errors['offer_exists'] = "Offer is already exists!";
                isValid = false;
                return { "isValid": isValid, "offer": existsOffer, "errors": errors };
            }
        }

        if (offerData['category']) {
            offer['category'] = offerData['category'];
        }

        if (offerData['thumbnail'] && offerData['thumbnail'].trim()) {
            offer['thumbnail'] = offerData['thumbnail'].trim();
        }

        if (offerData['description'] && offerData['description'].trim()) {
            offer['description'] = offerData['description'].trim();
        }

        if (offerData['kpi'] && offerData['kpi'].trim()) {
            offer['kpi'] = offerData['kpi'].trim();
        }

        if (offerData['preview_url'] && offerData['preview_url'].trim()) {
            offer['preview_url'] = offerData['preview_url'].trim();
        }

        if (offerData['expired_url'] && offerData['expired_url'].trim()) {
            offer['expired_url'] = offerData['expired_url'].trim();
        }

        if (offerData['start_date'] && offerData['start_date'].trim()) {
            offer['start_date'] = moment(offerData['start_date'].trim());
        }

        if (offerData['end_date'] && offerData['end_date'].trim()) {
            offer['end_date'] = moment(offerData['end_date'].trim());
        }

        if (offerData['currency'] && offerData['currency'].trim()) {
            offer['currency'] = offerData['currency'].trim().toUpperCase();
        } else {
            offer['currency'] = "USD";
        }

        // if (offerData['revenue']) {
        //     if (isNaN(offerData['revenue'])) {
        //         errors['revenue'] = "Invalid revenue!";
        //         isValid = false;
        //     } else {
        //         offer['revenue'] = +offerData['revenue'];
        //     }
        // } else {
        //     offer['revenue'] = 0;
        // }
        offer['revenue_type'] = { enum_type: "unknown", offer_type: '' };
        if (offerData['revenue_type'] && offerData['revenue_type'].trim()) {
            if (offerData['revenue_type'].trim().toLowerCase() == "unknown") {
                offer['revenue_type'] = { enum_type: "unknown", offer_type: '' };
            }
            else if (config.OFFERS_REVENUE_TYPE.includes(offerData['revenue_type'].trim().toUpperCase())) {
                offer['revenue_type'] = { enum_type: offerData['revenue_type'].trim().toUpperCase(), offer_type: '' };
            } else {
                errors['revenue_type'] = "Invalid revenue_type!";
                isValid = false;
            }
        }

        // if (offerData['payout']) {
        //     if (isNaN(offerData['payout'])) {
        //         errors['payout'] = "Invalid payout!";
        //         isValid = false;
        //     } else {
        //         offer['payout'] = +offerData['payout'];
        //     }
        // } else {
        //     offer['payout'] = 0;
        // }

        offer['payout_type'] = { enum_type: "unknown", offer_type: '' };
        if (offerData['payout_type'] && offerData['payout_type'].trim()) {
            if (offerData['payout_type'].trim().toLowerCase() == "unknown") {
                offer['payout_type'] = { enum_type: "unknown", offer_type: '' };
            }
            else if (config.OFFERS_REVENUE_TYPE.includes(offerData['payout_type'].trim().toUpperCase())) {
                offer['payout_type'] = { enum_type: offerData['payout_type'].trim().toUpperCase(), offer_type: '' };
            } else {
                errors['payout_type'] = "Invalid payout_type!";
                isValid = false;
            }
        }

        if (offerData['approvalRequired']) {
            if (offerData['approvalRequired'] === true) {
                offer['approvalRequired'] = true;
            } else {
                errors['approvalRequired'] = "approvalRequired should be true or false!";
                isValid = false;
            }
        }

        // if (offerData['isCapEnabled'] && offerData['isCapEnabled'].trim()) {
        //     if (offerData['isCapEnabled'].trim().toLowerCase() === "true") {
        if (
            offerData['daily_clicks'] || offerData['monthly_clicks'] || offerData['overall_click'] ||
            offerData['daily_conv'] || offerData['monthly_conv'] || offerData['overall_conv'] ||
            offerData['payout_daily'] || offerData['monthly_payout'] || offerData['overall_payout'] ||
            offerData['daily_revenue'] || offerData['monthly_revenue'] || offerData['overall_revenue']
        ) {
            offer['isCapEnabled'] = true;
        } else {
            offer['isCapEnabled'] = false;
        }
        //     } else if (offerData['isCapEnabled'].trim().toLowerCase() === "false") {
        //         offer['isCapEnabled'] = false;
        //     } else {
        //         errors['isCapEnabled'] = "isCapEnabled should be true or false!";
        //         isValid = false;
        //     }
        // } else {
        //     offer['isCapEnabled'] = false;
        // }

        if (offer['isCapEnabled']) {
            let capData = {
                daily_clicks: offerData['daily_clicks'],
                monthly_clicks: offerData['monthly_clicks'],
                overall_click: offerData['overall_click'],
                daily_conv: offerData['daily_conv'],
                monthly_conv: offerData['monthly_conv'],
                overall_conv: offerData['overall_conv'],
                payout_daily: offerData['payout_daily'],
                monthly_payout: offerData['monthly_payout'],
                overall_payout: offerData['overall_payout'],
                daily_revenue: offerData['daily_revenue'],
                monthly_revenue: offerData['monthly_revenue'],
                overall_revenue: offerData['overall_revenue']
            };
            let offer_capping = formatAndValidateOfferCapping(capData);
            if (offer_capping) {
                offer['offer_capping'] = offer_capping;
            } else {
                errors['offer_capping'] = "Invalid offer_capping!";
                isValid = false;
            }
        } else {
            offer['offer_capping'] = {
                daily_clicks: 0,
                monthly_clicks: 0,
                overall_click: 0,
                daily_conv: 0,
                monthly_conv: 0,
                overall_conv: 0,
                payout_daily: 0,
                monthly_payout: 0,
                overall_payout: 0,
                daily_revenue: 0,
                monthly_revenue: 0,
                overall_revenue: 0
            };
        }

        // if (offerData['isTargeting'] && offerData['isTargeting'].trim()) {
        //     if (offerData['isTargeting'].trim().toLowerCase() === "true") {
        // if (offerData['country_allow'] || offerData['country_deny'] ||
        //     offerData['city_allow'] || offerData['city_deny'] ||
        //     offerData['device'] || offerData['os'] || offerData['os_version']) {
        //     offer['isTargeting'] = true;
        // } else {
        //     offer['isTargeting'] = false;
        // }
        //     } else if (offerData['isTargeting'].trim().toLowerCase() === "false") {
        //         offer['isTargeting'] = false;
        //     } else {
        //         errors['isTargeting'] = "isTargeting should be true or false!";
        //         isValid = false;
        //     }
        // } else {
        //     offer['isTargeting'] = false;
        // }

        offer['isTargeting'] = true;

        if (offer['isTargeting'] && (offerData['country_allow'] || offerData['country_deny'])) {
            let geoData = {
                country_allow: offerData['country_allow'],
                country_deny: offerData['country_deny']
            };
            let geo_targeting = formatAndValidateGeoTargeting(geoData);
            if (geo_targeting) {
                offer['geo_targeting'] = geo_targeting;
            } else {
                errors['geo_targeting'] = "Invalid geo_targeting!";
                isValid = false;
            }
        }

        // if (offer['isTargeting'] && (offerData['device'] || offerData['os'])) {
        //     let deviceData = {
        //         device: offerData['device'],
        //         os: offerData['os'],
        //     }
        //     let device_targeting = formatAndValidateDeviceTargeting(deviceData);
        //     if (device_targeting) {
        //         offer['device_targeting'] = device_targeting;
        //     } else {
        //         errors['device_targeting'] = "Invalid device_targeting!";
        //         isValid = false;
        //     }
        // }

        if (offerData['redirection_method'] && offerData['redirection_method'].trim()) {
            if (config.REDIRECT_METHOD.includes(offerData['redirection_method'].trim())) {
                offer['redirection_method'] = offerData['redirection_method'].trim();
            } else {
                errors['redirection_method'] = "Invalid redirection_method!";
                isValid = false;
            }
        }

        // if (offerData['offer_visible'] && offerData['offer_visible'].trim()) {
        //     if (config.OFFER_VISIBILITY[offerData['offer_visible'].trim().toLowerCase()]) {
        //         // 'private', 'approval_required', 'auto_approve', 'public'
        //         offer['offer_visible'] = offerData['offer_visible'].trim();
        //     } else {
        //         errors['offer_visible'] = "Invalid offer_visible!";
        //         isValid = false;
        //     }
        // } else {
        //     offer['offer_visible'] = "public";
        // }

        offer['offer_visible'] = "public";

        offer['status_label'] = "active";
        offer['status'] = 1;

        offer['isgoalEnabled'] = false;

        offer['goal'] = [];

        offer['publisher_offers'] = [];

        if (offerData['version'] && offerData['version'].trim()) {
            if (isNaN(offerData['version'].trim())) {
                errors['version'] = "Invalid version!";
                isValid = false;
            }
            offer['version'] = +offerData['version'].trim();
        }

        offer['liveType'] = 0;

        if (offer['app_id']) {
            offer['isMyOffer'] = await checkMyOffer(offer['app_id'], offer['network_id']);
        }

        if (offer['offer_visible'] != "private") {
            offer['isPublic'] = true;
        }

        offer['isApiOffer'] = false;

        offer['offer_hash'] = generateHash(apiPlugin.ImportantFields, offer);

    } catch (error) {
        errors['error'] = error.message;
        isValid = false;
    }
    return { "isValid": isValid, "offer": offer, "errors": errors };
}

exports.formatAndValidateMultipleOffers = async (req, res) => {
    let network_id = req.user.userDetail.network[0];
    let offersData = req.body;

    try {
        let validOffers = [];
        let existsOffers = [];
        let inValidOffers = [];
        for (let i = 0; i < offersData.length; i++) {
            let result = await formatAndValidateSingleOffer(offersData[i], network_id);
            if (result.isValid) {
                validOffers.push(result.offer);
            } else {
                if (result['errors'] && result['errors']['offer_exists']) {
                    existsOffers.push(result.offer);
                } else {
                    inValidOffers.push({ "offer": result.offer, "errors": result.errors });
                }
            }
        }
        let response = Response.success();
        response.payload = { "validOffers": validOffers, "existsOffers": existsOffers, "inValidOffers": inValidOffers };
        response.msg = "Offers successfully validated!";
        return res.status(200).json(response);
    } catch (err) {
        let response = Response.error();
        response.msg = "Error while validating offers!"
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.importMultipleOffers = async (req, res) => {
    let existsOfferIds = req.body.existsOfferIds;
    let validOffers = req.body.validOffers;
    let finalResult = {
        "savedOffers": [],
        "updatedOffers": {},
    };
    try {
        if (validOffers.length) {
            let result = await OfferModel.insertManyOffers(validOffers);
            if (result.length) {
                finalResult['savedOffers'] = result;
                let event = 'offer_create'
                let reflectId = [];
                result.map(obj => {
                    reflectId.push(obj._id);
                })
                await Functions.publishJobForWebhook(result[0].network_id, reflectId, event, "Import new Offer")

            }
        }
        if (existsOfferIds.length) {
            let filter = {
                "_id": { $in: existsOfferIds }
            };
            let reflect = {
                "updatedAt": moment()
            };
            let result = await OfferModel.updateManyOffer(filter, reflect);
            if (result) {
                finalResult['updatedOffers'] = result;
                let event = 'offer_update'
                await Functions.publishJobForWebhook(req.user.userDetail.network[0], existsOfferIds, event, "Import update Offer")
            }
        }
        try {
            let statsData = req.body.statsData;
            statsData = statsData.map(function (a) {
                var data = Object.assign({}, a); //make a copy of stats one object
                data.network_id = req.user.userDetail.network[0];
                data.userId = req.user.userDetail.id;
                data.userName = req.user.userDetail.name;
                return data;
            });
            await offerImportStatModel.InsertData(statsData);
        } catch (error) {
            console.log(error);
            console.log("======================Error while insert stats data=====================");
        }

        let response = Response.success();
        response.payload = finalResult;
        response.msg = "Offers successfully save!";
        return res.status(200).json(response);
    } catch (err) {
        let response = Response.error();
        response.msg = "Error while saving!"
        response.error = [err.message];
        return res.status(200).json(response);
    }
};

exports.assignPublisherToOffers = async (req, res) => {
    let updateCount = 0;
    let publisher_id = req.body.publisher_id;
    let offerDataToAssignPub = req.body.offerDataToAssignPub;
    if (offerDataToAssignPub && offerDataToAssignPub) {
        try {
            for (let item of offerDataToAssignPub) {
                let update = {
                    publisher_offer_status_label: "active",
                    publisher_offer_status: 1,
                    publisher_id: publisher_id,
                    publisher_payout_percent: 100
                }
                if (item['platform_id']) {
                    let platformData = await PlatformModel.getOnePlatform({ _id: mongooseObjectId(item['platform_id']) }, { payout_percent: 1 });
                    if (platformData && platformData['payout_percent']) {
                        update['publisher_payout_percent'] = +platformData['payout_percent'];
                    }
                }
                let offer = await OfferModel.getOneOffer({ _id: mongooseObjectId(item['offer_id']) }, { publisher_offers: 1 });
                let pubDataExist = false;
                for (let pubData of offer['publisher_offers']) {
                    if (+pubData['publisher_id'] === +publisher_id) {
                        pubDataExist = true;
                    }
                }
                if (!pubDataExist) {
                    let result = await OfferModel.updateOffer({ "_id": mongooseObjectId(item['offer_id']) }, { $push: { "publisher_offers": update } }, {});
                    if (result) {
                        updateCount++;
                    }
                }
            }
            if (updateCount > 0) {
                let response = Response.success();
                response.msg = "Publisher successfully assign to offers!";
                return res.status(200).json(response);
            } else {
                let response = Response.success();
                response.msg = "Offers already assign to publisher!";
                return res.status(200).json(response);
            }
        } catch (err) {
            console.log(err);
            let response = Response.error();
            response.msg = "Error while assigning publisher to offers!"
            response.error = [err.message];
            return res.status(200).json(response);
        }
    } else {
        let response = Response.error();
        response.msg = "No publisher assign to offers!"
        response.error = [];
        return res.status(200).json(response);
    }
}

exports.unassignPublisherOffers = async (req, res) => {
    try {
        let publisher_id;
        let status;
        if (req.body.publisherId && +req.body.publisherId) {
            publisher_id = +req.body.publisherId;
        } else {
            let response = Response.error();
            response.msg = 'publisher_id is required.';
            response.error = ['required publisher_id'];
            return res.status(200).json(response);
        }
        if (req.body.status > 0) {
            status = +req.body.status;
        } else {
            let response = Response.error();
            response.msg = 'status is required.';
            response.error = ['required status'];
            return res.status(200).json(response);
        }

        const filter = {};

        if (req.body.offerId && req.body.offerId.length) {
            let offer_id = validateMongooseObjectIdArray(req.body.offerId);
            if (offer_id['invalidMongooseObjectIdArray'] && offer_id['invalidMongooseObjectIdArray'].length) {
                let response = Response.error();
                response.error = ['invalid mongoose object id'];
                response.msg = 'Invalid offer id ' + offer_id['invalidMongooseObjectIdArray'] + '.';
                return res.status(200).json(response);
            }
            if (offer_id['validMongooseObjectIdArray']) {
                let length = offer_id['validMongooseObjectIdArray'].length;
                if (length == 1) {
                    filter['_id'] = offer_id['validMongooseObjectIdArray'][0];
                } else if (length > 1) {
                    filter['_id'] = { '$in': offer_id['validMongooseObjectIdArray'] };
                }
            }
        }

        if (req.body.start_date && req.body.end_date) {
            filter['updatedAt'] = {
                $gte: moment(req.body.start_date).toDate(),
                $lte: moment(req.body.end_date).toDate()
            };
        }


            filter['pubOff.id'] = publisher_id;
            await OfferModel.updateManyOffer(filter, { $set: { 'pubOff.$.pubOffSt': status } }, {});


        let response = Response.success();
        response.msg = 'Publisher offers unassign successfully.';
        response.payloadType = payloadType.array;
        response.payload = req.body.offerId;
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        response.error = [error.message];
        return res.status(200).json(response);
    }
}

exports.getOfferSettingData = (req, res) => {

    let allKeysOfOffersModel = Object.keys(OfferModel.schema.paths);
    let allNestedKeysOfOffersModel = Object.keys(OfferModel.schema.singleNestedPaths);
    let deleteKeysOffersModel = ['network_id',
        'offer_hash',
        'version',
        'isApiOffer',
        'liveType',
        'isMyOffer',
        'adv_platform_payout_percent',
        'isScraped',
        '__v',
        'revenue_type',
        'payout_type',
        'offer_capping',
        '_id',
        'geo_targeting'];

    allKeysOfOffersModel = allKeysOfOffersModel.filter(item => !deleteKeysOffersModel.includes(item));
    let deleteallNestedKeysOfOffersModel = ['revenue_type._id',
        'payout_type._id',
        'geo_targeting.country_allow.key',
        'geo_targeting.country_allow.value',
        'geo_targeting.country_allow._id',
        'geo_targeting.country_deny.key',
        'geo_targeting.country_deny.value',
        'geo_targeting.country_deny._id',
        'geo_targeting.city_allow.key',
        'geo_targeting.city_allow.value',
        'geo_targeting.city_deny.key',
        'geo_targeting.city_deny.value',
        'device_targeting.device',
        'device_targeting.os',
        'device_targeting.os_version',
        'device_targeting.device.$',
        'device_targeting.os.$',
        'device_targeting.os_version.os',
        'device_targeting.os_version.version',
        'device_targeting.os_version.version_condition',
        'geo_targeting._id',
        'geo_targeting.city_allow._id',
        'geo_targeting.city_deny._id',
        'device_targeting.os_version._id'];
    allNestedKeysOfOffersModel = allNestedKeysOfOffersModel.filter(item => !deleteallNestedKeysOfOffersModel.includes(item));

    let offerArray = [];
    offerArray.push(allKeysOfOffersModel);
    offerArray.push(allNestedKeysOfOffersModel);

    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = offerArray;
    response.msg = "Keys of Offer Collection"
    return res.status(200).json(response);
}

exports.getSingleOfferInfoFromApi = async (req, res) => {
    try {

        if (req.body.platform_id && req.body.advertiser_id && req.body.advertiser_offer_id) {
            let filter = { platform_id: mongooseObjectId(req.body.platform_id), advertiser_id: mongooseObjectId(req.body.advertiser_id) };
            let result = await PlatformModel.getOnePlatform(filter, {});
            if (result && Object.keys(result).length) {

                let content = {
                    'network_id': result.network_id,
                    'advertiser_id': result.advertiser_id,
                    'advertiser_name': result.advertiser_name,
                    'platform_id': result.platform_id,
                    'platform_name': result.platform_name,
                    'advertiser_platform_id': result._id,
                    'nid' : result.nid,
                    'aid': result.aid,
                    'plty' : result.plty,
                    'plid' : result.plid,
                    'credentials': result['credentials'].reduce((obj, curr) => {
                        obj[curr.key] = curr.val;
                        return obj;
                    }, {}),
                };
                if (req.body.type == 'sync') {
                    let data = [];
                    var platformTypeData = await platformType.getSingleSyncPlatformType();
                    let flag = false;
                    for(let i = 0; i < platformTypeData.length; i++){
                        if(platformTypeData[i]['_id'] == req.body.platform_id){
                            flag = true;
                            data.push(req.body.offer_id)
                            let content = {
                                workerName: "syncOffer",
                                workerData: data
                            }
                            await Functions.sendJobToGenericWorker(content, 34);
                        }
                    }
                    let advertiserData = await generalFunction.getAdvertiser(req.body.advertiser_id);
                    if(advertiserData && advertiserData.status != 'Active'){
                        let response = Response.error();
                        response.error = 'Advertiser not active';
                        response.msg = "Advertiser not active";
                        return res.status(200).json(response);
                    }
                    let advertiserPlatformData = '';
                    if(req.body && req.body.advertiser_platform_id){
                        advertiserPlatformData = await generalFunction.getPlatform(req.body.advertiser_platform_id);
                    }
                    if(advertiserPlatformData && advertiserPlatformData['status'] != '1'){
                        let response = Response.error();
                        response.error = 'platform not active';
                        response.msg = "platform not active";
                        return res.status(200).json(response);
                    }
                    if(flag){
                        let response = Response.success();
                        response.msg = "Sync process queue successfully";
                        return res.status(200).json(response);
                    }else{
                        let response = Response.error();
                        response.error = 'Sync api not available';
                        response.msg = "Sync api not available"
                        return res.status(200).json(response);
                    }
                }
                else {
                    let offer = await fetchSingleOfferFromApi(content, result['platform_name'], req.body.advertiser_offer_id)
                    if (offer == false) {
                        let response = Response.error();
                        response.error = 'Api is not ready yet !';
                        response.msg = "Api is not ready yet !"
                        return res.status(200).json(response);
                    }
                    else if (offer) {
                        let response = Response.success();
                        response.payload = offer;
                        response.msg = "success";
                        return res.status(200).json(response);
                    }
                    else {
                        let response = Response.error();
                        response.error = 'Offer not found';
                        response.msg = "Offer not found"
                        return res.status(200).json(response);
                    }
                }
            }
            else {
                let response = Response.error();
                response.msg = "Platform Not Found"
                return res.status(200).json(response);
            }
        }
        else {
            let response = Response.error();
            response.msg = "Bad Request"
            return res.status(500).json(response);
        }
    } catch (err) {
        // console.log(err)
        let response = Response.error();
        response.error = 'Offer not found';
        response.msg = " error while getting "
        return res.status(200).json(response);
    }
}

exports.getOfferData = async (offer_id ) =>{
    let redisKey = 'OFFER:' + offer_id.toString(); 
    let redisData = await Redis.getRedisHashMultipleData(redisKey);
    let usemongoDb = false ;
    let offerData  = {};
    let search = { _id : mongooseObjectId(offer_id)};
    let projections = { platform_id : 1, pubOff: 1, status: 1, network_id: 1, nid: 1, app_id: 1, offer_name: 1, plty:1, advertiser_id: 1, aid: 1, advertiser_name: 1, tracking_link: 1,offer_hash:1, advertiser_platform_id: 1, plid: 1, redirection_method: 1, revenue: 1, payout: 1, advertiser_offer_id: 1, offer_visible: 1, currency: 1, isBlacklist: 1, daily_c_r_t: 1, monthly_c_r_t: 1, platform_name: 1, appliedTime : 1 };

   try{
        if(redisData && redisData.data){
            redisData.data['pubOff'] = JSON.parse(redisData.data['pubOff']);
            let requiredFields = ['network_id', 'nid' , 'advertiser_id', 'advertiser_name', 'platform_name', 'advertiser_platform_id', 'plty', 'tracking_link', 'pubOff', 'revenue', 'offer_hash', 'advertiser_offer_id', 'status', 'redirection_method', 'payout'];
            let usemongoDb = requiredFields.some(field => !(field in redisData.data)); // Check if key is present, not its value

            if(!usemongoDb){  
                redisData.data['revenue'] = parseFloat(redisData.data['revenue']);
                redisData.data['payout'] = parseFloat(redisData.data['payout']); 
                redisData.data['isBlacklist'] = parseInt(redisData.data['isBlacklist']); 
                redisData.data['plid'] = parseInt(redisData.data['plid']);
                redisData.data['aid'] = parseInt(redisData.data['aid']);
                redisData.data['status'] = parseInt(redisData.data['status']);
                redisData.data['plty'] = parseInt(redisData.data['plty']);
                redisData.data['nid'] = parseInt(redisData.data['nid']);                 
                return redisData.data || {};
            }
        }else{
            usemongoDb = true ;
        }

        if(usemongoDb){
            offerData  = await OfferModel.getOneOffer(search, projections, {}) || {};
            if(offerData && Object.keys(offerData).length > 0 ){
                offerData['pubOff'] = JSON.stringify(offerData['pubOff']);
                Redis.setRedisHashMultipleData(redisKey, offerData, 900);
                offerData['pubOff'] = JSON.parse(offerData['pubOff']);
                return offerData || {};
            }
        }

   }catch(err){
        console.log('err',err);
        return {};
   }
  
}

exports.syncOfferFromApi = async (req, res) => {
    try {
        var response1 =  '';
        if (!req.body || !Array.isArray(req.body)) {
            response1 = Response.error();
            response1.msg = "Bad Request"
            return res.status(500).json(response);
        }
        var platformTypeData = await platformType.getSingleSyncPlatformType();
        var reqdata = req.body;
        var offer_ids = [];
        var offerCount = 0;
        var tryCount = 0;
        var jobPriority = 14;
        var flag = false; 
        var pubRes = '';
        if(req.body.length < 5 ){
            jobPriority = 34;
        }
        if(req.body.length == 1 ){
            platformTypeData.map(async ele=>{
                if(ele.plty == req.body[0].plty){
                    flag = true; 
                    try{
                        let data = [];
                        data.push(req.body[0].offer_id)
                        let content = {
                            workerName: "syncOffer",
                            workerData: data
                        }
                        pubRes =  await Functions.sendJobToGenericWorker(content, priority = jobPriority);
                    }catch(err){
                        response1 = Response.error();
                        response1.msg = `can not Sync due to technical error `
                        return res.status(500).json(response1);
                    }
                    if(pubRes){
                        let response1 = Response.success();                       
                        response1.msg = `Successfully Sync Offer`                    
                        return res.status(200).json(response1);

                    }else{
                        response1 = Response.error();
                        response1.msg = `can not Sync due to technical error `
                        return res.status(500).json(response1);

                    }

                }                
                // else{
                //    let response = Response.error();
                //     response.msg = `can not Sync due to API UnAvailability`
                //     return res.status(500).json(response);
                // }
            })
            if(!flag){
                let response = Response.error();
                response.msg = `can not Sync due to API UnAvailability`
                return res.status(200).json(response);
            }
        }
        for(var i = 0 ; i < reqdata.length ;i++ ){
           for(let m = 0 ; m < platformTypeData.length; m++){
            let ele = platformTypeData[m];
            if(+ele.plty == +reqdata[i].plty){
                offer_ids.push(reqdata[i].offer_id);
                if(offer_ids.length >= 20 ){                   
                    var content = {
                        workerName: "syncOffer",
                        workerData: offer_ids
                    }
                    tryCount  = tryCount + offer_ids.length;
                    try{
                        pubRes = await Functions.sendJobToGenericWorker(content, priority = jobPriority);
                        offerCount = offerCount + offer_ids.length;
                    }catch(err){
                        console.log("err",err);
                    }                    
                    offer_ids = [];
                }                                                                            
            }
           }
        }  
                
        if(offer_ids.length > 0 ){
            tryCount  = tryCount + offer_ids.length;
            var content = {
                workerName: "syncOffer",
                workerData: offer_ids
            }
            try{
                pubRes =  await Functions.sendJobToGenericWorker(content, priority = jobPriority);
                offerCount =  offerCount + offer_ids.length
            }catch(err){
                console.log(' err' ,err);
            }
            offer_ids = [];
        }                   
            

        let response = Response.success();
        // response.msg = `${offer_ids.length} offers Started sync with api, Wait for sometime.`
        if(tryCount > offerCount){
            response.msg = `${offerCount} offers started sync outOf ${req.body.length} and ${tryCount - offerCount} failed to Sync Queue due technical error remaining ${req.body.length - tryCount} can not Sync due to API UnAvailability`
        }else{
            response.msg = `${offerCount} offers started sync outOf ${req.body.length} remaining ${req.body.length - offerCount} can not Sync due to API UnAvailability`
        }
        return res.status(200).json(response);
    } catch (err) {
        console.log(err)
        let response = Response.error();
        response.msg = "Server internal error!"
        return res.status(500).json(response);
    }
}

exports.updateEwtTime = async (req, res) => {
    try {
        if (!req.body.ewt && !req.body.offerId) {
            let response = Response.error();
            response.msg = "Bad Request!"
            return res.status(400).json(response);
        }

        let filter = { _id: mongooseObjectId(req.body.offerId) };
        let reflect = { $set: { ewt: parseInt(req.body.ewt) } }
        OfferModel.updateOffer(filter, reflect, {})
            .then((dbRes) => {
                let response = Response.success();
                response.payload = dbRes;
                response.msg = "Expected Working Time Updated Successfully!";
                return res.status(200).json(response);
            })
            .catch((err) => {
                console.log(err);
                let response = Response.error();
                response.msg = "Server Internal Error!"
                return res.status(500).json(response);
            })
    } catch (error) {
        console.log(error)
        let response = Response.error();
        response.msg = "Server Internal Error!"
        return res.status(500).json(response);
    }

}



exports.insertPublisherInOffer = async (req, res) => {
    try {
        if (req.body.publisherOffers && req.body.publisherOffers.offer_id && req.body.publisherOffers.publisher_id) {
             let pay = 0;
             let name='';
             let cap ='';
            

            if (req.body.publisherOffers['publisher_payout'] && +req.body.publisherOffers['publisher_payout']) {
                pay = +req.body.publisherOffers['publisher_payout'];
            }
           if(req.body.publisherOffers['publisherCap'] && req.body.publisherOffers.publisherCap.name && req.body.publisherOffers.publisherCap.cap ){
              name= req.body.publisherOffers.publisherCap.name;
              cap=+req.body.publisherOffers.publisherCap.cap;
            

          // Use a mapping object for better scalability
           const capMapping = {
             'Daily Conv Cap': 'dConv_Cap',
             'Monthly Conv Cap': 'mConv_Cap',
             'Daily Payout Cap': 'dP_Cap',
             'Monthly Payout Cap': 'mP_Cap',
            };

              name = capMapping[`${name}`] || name;
          }
            
            let pubOffSt = 1;
            if (req.body.publisherOffers['pubOffSt'] && +req.body.publisherOffers['pubOffSt']) {
                pubOffSt = +req.body.publisherOffers['pubOffSt'];
            }
            let offers = await OfferModel.getSearchOffer({ _id: { $in: req.body.publisherOffers.offer_id } }, { payout: 1, pubOff: 1 }, {});
            let redisKey = []
            for (let offer of offers) {
                let pubOff = [];
                if (offer['pubOff']) {
                    pubOff = offer['pubOff'];
                }
                for (let item of req.body.publisherOffers.publisher_id) {
                    let index = pubOff.findIndex(x => x.id == item['pid']);
                    if (index >= 0) {
                        // Start with the existing object at index
                        let updatedObj = {
                            id: pubOff[index].id,
                            pubOffSt: pubOffSt,
                        };
                        // Add properties conditionally
                        if (pay) updatedObj.pay = pay;
                        if (name!='' && cap !='') {
                            updatedObj[`${name}`] = cap;
                        }
                    
                        // Update the object in the array
                        pubOff[index] = updatedObj;
                    } else {
                    
                        // Create a new object with the same conditional logic
                        let newObj = {
                            id: item.pid,
                            pubOffSt: pubOffSt,
                        };
                        if (pay) newObj.pay = pay;

                        if (name!='' && cap!=''){
                             newObj[`${name}`] =cap;
                        }
                    
                        // Add the new object to the array
                        pubOff.push(newObj);
                    }
                    
                }
                console.log("pubOff--",pubOff)
                let update = {
                    pubOff: pubOff
                };
                await OfferModel.updateOffer({ _id: mongooseObjectId(offer['_id']) }, { $set: update }, {});
                redisKey.push(`OFFER:${offer['_id']}`);
            }
            delRedisData(redisKey)
        }
        let response = Response.success();
        response.msg = 'Offers assigned to publishers successfully.';
        response.payloadType = payloadType.array;
        response.payload = [];
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        response.error = [error.message];
        return res.status(200).json(response);
    }
}