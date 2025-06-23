const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:apiOffer");
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferModel = require('../../db/offer/Offer');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const { filterHash, getCacheData, encodeData, decodeData, chunkArrayInGroups } = require('../../helpers/Functions');
const moment = require('moment');
const { config } = require('../../constants/Global');
const { getRedisData, setRedisHashData, delRedisHashData } = require('../../helpers/Redis');
const platFormTypeController =  require('../../controllers/platform/Platform');
const Function = require('../../helpers/Functions');
exports.getOffers = async (req, res) => {
    try {
        let search = {};
        let projection = {};
        let invalidSearch = false;
        let options = { sort: { updatedAt: -1 }, skip: 0, limit: 10 };
        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        if (req.user_category == 'advertiser') {
            search["advertiser_id"] = req.user.userDetail.parentId;
        }
        else if (req.user_category == 'network' && req.loginType !== '') {
            if (req.loginType == 'advertiser') {
                search["advertiser_id"] = req.loginId;
            }
            else if (!req.permissions.includes("ofr.list")) {
                advertiser = req.advertiser.map(data => data.id);
                search["advertiser_id"] = { $in: advertiser };
            }
        }
        if (req.body.search) {
            search['updatedAt'] = { $gte: moment().subtract(2, 'days'), $lte: moment() };
            if (req.body.search.start_date) {
                search['updatedAt'] = { $gte: moment(req.body.search.start_date.trim()), $lte: moment(req.body.search.end_date.trim()) };
            }
            if (req.body.search.advertiser_id) {
                if (mongooseObjectId.isValid(req.body.search.advertiser_id.trim())) {
                    search['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.status) {
                search['status'] = req.body.search.status.trim();
            }
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
                        search['_id'] = { "$in": offerIds };
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
            if (req.body.search.blockedOffers) {
                // search['isBlacklist'] = 1;
                search['isBlacklist'] = { $gt: 0 }
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
            projection['advertiser_name'] = 1;
            projection['status_label'] = 1;
            projection['advertiser_offer_id'] = 1;
            projection['_id'] = 1;
            projection['isBlacklist'] = 1;
            projection['kpi'] = 1;
            projection['description'] = 1;            
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
            if (req.body.options.limit && req.body.options.limit != 0) {
                options['limit'] = req.body.options.limit;
            }
            if (req.body.options.page && req.body.options.page != 0) {
                options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
            }
        }
        // let key = filterHash({ search: search, projection: projection, options: options });
        // let hash = req.path;

        // let result = await getCacheData(hash, key);
        // let ecodedData = encodeData({ key: key, hash: hash });
        // if (!result) {
        let output = { result: [], totalOffers: null }
        projection['plty'] = 1;
        let result = await OfferModel.getSearchOffer(search, projection, options);
        if (result) {
            output['result'] = result;

            if (Object.keys(search).length == 1 && search.network_id) {
                key = "ALLOFFERSCOUNT:" + req.user.userDetail.network[0];
                let totalOffers = await getRedisData(key);
                output['totalOffers'] = +totalOffers.data
            }
            else if (Object.keys(search).length == 2 && search.offer_id) {
                output['totalOffers'] = result.length
            }
            else {
                let offersCount = await OfferModel.getTotalPagesCount(search);
                output['totalOffers'] = +offersCount
            }

            output['pageSize'] = req.body.options.limit;
            output['page'] = req.body.options.page || 1;
        }
        // setRedisHashData(hash, key, output, process.env.REDIS_OFFER_EXP)
        // }
        // else {
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
    } catch (err) {
        let response = Response.error();
        response.msg = "oops something going wrong";
        response.error = [err.message];
        return res.status(200).json(response);
    }

}

exports.offerApplyFromUi = async (req, res) => {
    let offerIds = [];
    let tryCount = 0;
    let count = 0;
    let jobPriority = 33;
    let pubRes;
    let network_id = req.user.userDetail['network'][0];
    try {

        if (!req.body.filter && !Array.isArray(req.body.filter)) {
            let response = Response.error();
            response.msg = 'no any offer provide to apply';
            response.error = ['Invalid Request'];
            return res.status(200).json(response);
        }
        var platformTypeData = await platFormTypeController.getApplyPlatformType();
        for(let i = 0; i < req.body.filter.length; i++){
            let offerData = req.body.filter[i];
            for(let k=0; k<platformTypeData.length; k++){
                if(+platformTypeData[k].plty == offerData.plty){
                    offerIds.push(offerData['offer_id']);
                }
                if(offerIds.length >= 20){
                    tryCount = tryCount + offerIds.length;
                    try{
                        // send to queue.                                       
                        let content = {
                            workerName: "applyOfferFromUi",
                            workerData: offerIds,
                            network_id : network_id
                        }
                        pubRes = await Function.sendJobToGenericWorker(content, priority = jobPriority);                        
                        count = count + offerIds.length;
                    }catch(error){
                        console.log(" error while apply offer from ui ", error.message);
                    }

                    offerIds = [];
                }
            }
        }
        if(offerIds.length >= 1){
            tryCount = tryCount + offerIds.length;
            try{
                // send to queue.
                let content = {
                    workerName: "applyOfferFromUi",
                    workerData: offerIds,
                    network_id : network_id
                }
                pubRes = await Function.sendJobToGenericWorker(content, priority = jobPriority);
                count = count + offerIds.length;
            }catch(error){
                console.log(" error while apply offer from ui ", error.message);
            }
            offerIds = [];
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        if(tryCount > count){
            response.msg = `${count} offers started applied outOf ${req.body.filter.length} and ${tryCount - count} failed to applied Queue due technical error remaining ${req.body.filter.length - tryCount} can not applied due to API UnAvailability`
        }else{
            response.msg = `${count} offers started applied outOf ${req.body.filter.length}, remaining ${req.body.filter.length - count} can not applied due to API UnAvailability`
        }
        return res.status(200).json(response);
    }
    catch (err) {
        let response = Response.error();
        response.msg = "Invalid Request";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}
exports.offerStatusUpdate = async (req, res) => {
    let search = {}
    let reflect = {};
    let invalidSearch = false;
    let msg = '';
    let offer_ids = [];
    try {
        
        if (req.body.filter && Array.isArray(req.body.filter) && req.body.filter.length > 0 && req.body.status_label && (req.body.status && req.body.status!=-1)) {
            // search['_id'] = { '$in': req.body.filter };
            offer_ids = req.body.filter;
            reflect['status_label'] = req.body.status_label.trim();
            reflect['status'] = +req.body.status;
        }
        else {
            invalidSearch = true;
            msg = "Invalid Request";
        }

        if (req.body.status_label == "active" || req.body.status_label == "no_link" || req.body.status_label == "rejected" || req.body.status_label == "waitingForApproval" || req.body.status_label == "waiting_in_apply") {
            msg = "You have no access to update this status";
            invalidSearch = true;
        }
        else if (req.body.status_label == "applied" && req.body.apply) {
            reflect['status'] = 3;
            search['status'] = 0;
        }
        else if (req.body.status_label == "paused") {
            reflect['status'] = 5;
        }
        else if (req.body.status_label != "deleted" && req.body.status_label != "unmanaged") {
            msg = "You have no access to update this status";
            invalidSearch = true;
        }
        else if (config.OFFERS_STATUS && config.OFFERS_STATUS[reflect['status_label']]) {
            reflect['status'] = config.OFFERS_STATUS[reflect['status_label']].value;
        }
        else {
            msg = "You have no access to update this status2";
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
            let decodedData = decodeData(req.body.keyHash);
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

exports.makeoffersLive = async (req, res) => {
    try {
        let search = {}
        let reflect = {};
        let offer_ids = [];
        let resMsg = "No Offers To be Live or Offer Already Live";
        if (req.body.filter && Array.isArray(req.body.filter) && req.body.filter.length > 0) {
            offer_ids = req.body.filter;
            search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
            search['status'] = 1;
            search['isLive'] = false;
        }
        else {
            let response = Response.error();
            response.msg = "Invalid Request";
            response.error = [];
            return res.status(200).json(response);
        }
        if (offer_ids.length) {
            let chunkIds = await chunkArrayInGroups(offer_ids, 50);
            if (chunkIds.length) {
                for (let i = 0; i < chunkIds.length; i++) {
                    search['_id'] = { '$in': chunkIds[i] };
                    try {
                        let result = await OfferModel.getSearchOffer(search, {}, { multi: true });
                        if (result && result.length > 0) {
                            resMsg = "Success";
                            // await liveApiOffer(result, chunkIds[i], '', [], 100, 0);
                        }
                    }
                    catch (e) { debug(e) }
                }
            }
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        response.msg = resMsg;
        return res.status(200).json(response);
    }
    catch (err) {
        let response = Response.error();
        response.msg = "error updating";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.offerShow = (req, res) => {
    if (req.params.Offer_id && mongooseObjectId.isValid(req.params.Offer_id.trim())) {
        let Offer_id = mongooseObjectId(req.params.Offer_id.trim());
        OfferModel.getOneOffer({ _id: Offer_id, network_id: mongooseObjectId(req.user.userDetail.network[0]) }).then(result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).json(response);
        })
            .catch(err => {
                let response = Response.error();
                response.msg = "Error Finding Offer";
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

