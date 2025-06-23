const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Publisher");
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferModel = require('../../db/offer/Offer');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const PublisherOfferRequest = require('../../db/offer/liveOfferApply');
const { PlatformModel } = require('../../db/platform/Platform');
const AdvertiserModel = require('../../db/advertiser/Advertiser');
const axios = require('axios');
const webhookModel = require('../../db/webhook')
const Network = require('../../db/network/Network')
const Publisher = require('../../db/publisher/Publisher');
const WorkerStatusModel = require('../../db/WorkerStatus');
const { decodeData, chunkArrayInGroups, sendJobToGenericWorker } = require('../../helpers/Functions');
const Redis = require('../../helpers/Redis');
const { delRedisHashData, delRedisData, getRedisSetData, setRedisSetData, removeRedisSetMember, setRedisQueueData } = require('../../helpers/Redis');
const Function = require('../../helpers/Functions');
const moment = require('moment');
const blockOfferModel = require('../../db/offer/BlockOffer');

exports.publisherApplyOffersRequest = async (req, res) => {
    try {
        let publisher_id = +req.accountid;
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let offerIds = [];
        let output = [];
        if (req.body.offerIds && req.body.offerIds.length) {
            offerIds = req.body.offerIds;
        } else {
            let response = Response.error();
            response.msg = 'Please select at least one offer.';
            response.error = ['please select at least one offer'];
            return res.status(200).json(response);
        }

        let dataChunks = await chunkArrayInGroups(offerIds, 10);
        for (let item of dataChunks) {
            let result = await PublisherOfferRequest.isOfferExists({ offer_id: { $in: item }, network_id: network_id, publisher_id: publisher_id }, { _id: 1, offer_id: 1 });
            if (item.length != result.length) {
                for (let offer of result) {
                    let index = item.indexOf(offer['offer_id'].toString());
                    if (index >= 0) {
                        item.splice(index, 1);
                    }
                }
                let tempArr = await this.handlePublisherOfferRequest(network_id, publisher_id, item);
                if (tempArr && tempArr.length) {
                    for (let item of tempArr) {
                        output.push(item);
                    }
                }
            }
        }
        let response = Response.success();
        response.msg = 'Your request has been successfully sent.';
        response.payloadType = payloadType.array;
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

exports.handlePublisherApplyRequest = async (req, res) => {
    try {
        let publisher_id = parseInt(req.accountid);
        let network_id = req.user.userDetail.network[0];
        if (req.body.data && Array.isArray(req.body.data)) {
            let dataArray = req.body.data;
            let dataChunks = await chunkArrayInGroups(dataArray, 10);
            for (let tempId of dataChunks) {
                let filter = { offer_id: { $in: tempId }, network_id: network_id, publisher_id: publisher_id };
                let projection = { _id: 1, offer_id: 1 };
                try {
                    let result = await PublisherOfferRequest.isOfferExists(filter, projection);
                    if (result.length != tempId.length) {
                        for (let doc of result) {
                            let index = tempId.indexOf(doc.offer_id.toString());
                            if (index >= 0) {
                                tempId.splice(index, 1);
                            }
                        }
                        await this.handlePublisherOfferRequest(network_id, publisher_id, tempId);
                    }
                }
                catch (err) {
                    debug(err);
                }
            }
            if (req.body.keyHash) {
                decodedData = decodeData(req.body.keyHash);
                delRedisHashData(decodedData.hash, decodedData.key);
            }
            let response = Response.success();
            response.msg = "Apply Request Sent Successfully.";
            return res.status(200).send(response)
        }
        else {
            let response = Response.error();
            response.msg = " Invalid Data Request"
            response.error = ["Request data is not formatted correctly"];
            return res.status(200).json(response);
        }
    }
    catch (err) {
        console.log(err.message);
        let response = Response.error();
        response.msg = " Invalid Request, Try Later";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.handlePublisherOfferRequest = async (network_id, publisher_id, offerIdArray) => {
    try {
        if (offerIdArray.length == 0) {
            return null;
        }
        let requestArray = [];
        let filter = { _id: { $in: offerIdArray } };
        let projection = {
            pubOff: { $elemMatch: { id: publisher_id } },
            offer_name: 1,
            payout: 1,
            advertiser_platform_id: 1,
            advertiser_id: 1
        }
        let offerStatus = [];
        let offerResult = await OfferModel.getSearchOffer(filter, projection, {});
        if (offerResult.length) {
            for (let doc of offerResult) {
                try {
                    let updateStatus = await this.handleOfferForApplyRequest(network_id, publisher_id, doc);
                    if (updateStatus && updateStatus == 1) {
                        offerStatus.push({
                            offer_id: doc._id,
                            status: 'active'
                        });
                    } else {
                        let newPublisherRequest = new PublisherOfferRequest({
                            network_id: network_id,
                            offer_id: doc._id,
                            publisher_id: +publisher_id,
                            offerName: doc.offer_name,
                            request_status: 'pending'
                        });
                        requestArray.push(newPublisherRequest);
                        offerStatus.push({
                            offer_id: doc._id,
                            status: 'applied'
                        });
                    }
                    if (requestArray.length >= 10) {
                        await PublisherOfferRequest.bulkInsertRequest(requestArray);
                        requestArray = [];
                    }
                }
                catch (err) {
                    debug(err);
                }
            }
            if (requestArray.length > 0) {
                await PublisherOfferRequest.bulkInsertRequest(requestArray);
            }
        }
        return offerStatus;
    }
    catch (err) {
        debug(err);
        return null;
    }
}


exports.handleOfferForApplyRequest = async (network_id, publisher_id, offerDoc) => {
    try {
        let publisherData = await Publisher.searchOnePublisher({ pid: publisher_id }, { appr_adv_opt: 1, appr_adv: 1 });
        let status = 2;
        if (publisherData && publisherData['appr_adv'] && publisherData['appr_adv_opt']) {
            if (publisherData['appr_adv_opt'] == 101) {
                // Auto Approve Selected
                let advArr = publisherData['appr_adv'].toString().split(',');
                if (advArr.includes(offerDoc['advertiser_id'].toString())) {
                    status = 1;
                }
            } else if (publisherData['appr_adv_opt'] == 102) {
                // Auto Approve All
                status = 1;
            } else if (publisherData['appr_adv_opt'] == 103) {
                // Auto Approve Other Than Selected
                let advArr = publisherData['appr_adv'].toString().split(',');
                if (!advArr.includes(offerDoc['advertiser_id'].toString())) {
                    status = 1;
                }
            }
        }
        let pay = offerDoc.payout;
        if (offerDoc.pubOff && offerDoc.pubOff[0]) {
            if (offerDoc.pubOff[0]['pay']) {
                pay = offerDoc.pubOff[0]['pay'];
            }
            await OfferModel.updateOffer({ _id: offerDoc._id }, { $pull: { pubOff: { id: publisher_id } } }, {});
        }
        await OfferModel.updateOffer({ _id: offerDoc._id }, { $addToSet: { pubOff: { id: publisher_id, pay: pay, pubOffSt: status } } }, {});
        return status;
    } catch (error) {
        debug(error);
        return null;
    }
}

exports.getPayoutPercent = async (platform_id) => {
    try {
        if (mongooseObjectId.isValid(platform_id)) {
            let plat_result = await PlatformModel.getOnePlatform({ _id: mongooseObjectId(platform_id) }, { payout_percent: 1 });
            if (plat_result && plat_result.payout_percent) {
                return plat_result.payout_percent;
            }
        }
    }
    catch (err) {
    }
    return 100;
}


exports.getLiveOfferDb = (req, res) => {
    pid = +req.params.pid
    try {
        if (pid) {
            options = { limit: 10, updatedAt: -1 };
            let search = {
                publisher_id: req.params.pid,
                request_status: 'pending'
            };
            if (req.body.search.offer_id) {
                if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
                    search['offer_id'] = mongooseObjectId(req.body.search.offer_id.trim());
                }
                else {
                    search['offerName'] = { $regex: req.body.search.offer_id.trim(), $options: 'i' };
                }
            }
            let projection = { offer_id: 1, offerName: 1, request_status: 1, publisher_id: 1, createdAt: 1 }
            if (req.body.options) {
                if (req.body.options.limit && req.body.options.limit != 0) {
                    options['limit'] = req.body.options.limit;
                }
                if (req.body.options.page && req.body.options.page != 0) {
                    options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
                }
            }
            search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
            PublisherOfferRequest.getOffers(search, projection, options)
                .then(result => {
                    if (result.length == 0) {
                        let response = Response.error();
                        response.msg = "No Offer Found";
                        response.error = ["no Offer found"];
                        return res.status(200).json(response);
                    }
                    let response = Response.success();
                    response.payloadType = payloadType.object;
                    response.payload = {};

                    PublisherOfferRequest.getTotalPagesCount(search).then(count => {
                        response.payload['totaloffer'] = count;
                        response.payload['result'] = result;
                        response.payload['pageSize'] = req.body.options.limit;
                        response.payload['page'] = req.body.options.page;
                        response.msg = "success";
                        return res.status(200).json(response);
                    }).catch(err => {
                        response.payload['result'] = result;
                        response.payload['pageSize'] = req.body.options.limit;
                        response.payload['page'] = req.body.options.page;
                        response.msg = "success";
                        return res.status(200).json(response);
                    });
                })
                .catch(err => {
                    let response = Response.error();
                    response.msg = " error while getting offers ";
                    response.error = [err.message];
                    return res.status(400).json(response);
                });
        }
    }
    catch (e) {
        console.log(e)
    }
}
exports.getPublisherOfferData = (req, res) => {
    search = {};
    search['request_status'] = "pending";
    let groupProjection = {};
    try {
        if (req.body.search) {
            if (req.body.search.request_status) {
                search['request_status'] = req.body.search.request_status.trim();
            }
            if (req.body.search.publisher_id) {
                {
                    search['publisher_id'] = +req.body.search.publisher_id;
                }
            }
        }
        groupProjection['_id'] = { publisher_id: "$publisher_id" };
        groupProjection['count'] = { $sum: 1 };
        groupProjection['createdAt'] = { $last: "$createdAt" };
        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        PublisherOfferRequest.getPublisherOffer(search, groupProjection)
            .then(result => {
                if (result.length == 0) {
                    let response = Response.error();
                    response.msg = "No List Found...!!";
                    response.error = ["no List found"];
                    return res.status(200).json(response);
                }
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result;
                return res.status(200).json(response);
            })
            .catch(err => {
                debug(err);
                let response = Response.error();
                response.error = [err.message];
                response.msg = "error"
                return res.status(200).json(response);
            })
    }
    catch (err) {
        let response = Response.error();
        response.msg = "Something went wrong";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}
exports.updateApprovedStatusOfferPublisher = (req, res) => {
    let search = {};
    search['request_status'] = 'pending';
    if (req.params.pid) {
        if (Number(req.params.pid.trim())) {
            search['publisher_id'] = +req.params.pid.trim();
        }
    }
    if (!req.params.pid) {
        return res.status(400).send({
            message: "Note content can not be empty"
        });
    }
    if (req.body.offer_id && req.body.offer_id.length) {
        search['offer_id'] = { $in: req.body.offer_id };
    }
    // debug(search)
    search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    let formdata = {
        request_status: 'approved',
    }
    projection = { $set: formdata }
    PublisherOfferRequest.approvedStatusOfferPublisher(search, projection, { multi: true }).then(result => {
        if (result.ok = 1) {
            pub_filter = {};
            pub_project = {};
            pub_filter['publisher_offers'] = { $elemMatch: { publisher_id: req.params.pid, publisher_offer_status: 3 } };
            pub_filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
            pub_project = { '$set': { "publisher_offers.$.publisher_offer_status_label": "active", "publisher_offers.$.publisher_offer_status": 1 } };
            // debug(pub_filter,pub_project)
            OfferModel.updateManyOffer(pub_filter, pub_project, { multi: true }).then(off_result => {
                if (result) {
                }
            })
                .catch(err => {
                    debug(err)
                    let response = Response.error();
                    response.msg = "error updating";
                    response.error = [err.message];
                    return res.status(200).json(response);
                })
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        response.msg = "success";
        return res.status(200).json(response);
    })
        .catch(err => {
            let response = Response.error();
            response.msg = " error while saving offer ";
            response.error = [err.message];
            return res.status(200).json(response);
        })

};
exports.updateRejectedStatusOfferPublisher = (req, res) => {
    let search = {};
    search['request_status'] = 'pending';
    if (req.params.pid) {
        if (Number(req.params.pid.trim())) {
            search['publisher_id'] = +req.params.pid.trim();
        }
    }
    if (!req.params.pid) {
        return res.status(400).send({
            message: "Note content can not be empty"
        });
    }
    if (req.body.offer_id && req.body.offer_id.length) {
        search['offer_id'] = { $in: req.body.offer_id };
    }
    // debug(search)
    search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    let formdata = {
        request_status: 'rejected',
    }
    projection = { $set: formdata }
    PublisherOfferRequest.rejectedStatusOfferPublisher(search, projection, {}).then(result => {
        if (result.ok = 1) {
            pub_filter = {};
            pub_project = {};
            pub_filter['publisher_offers'] = { $elemMatch: { publisher_id: req.params.pid, publisher_offer_status: 3 } };
            pub_filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
            pub_project = { '$set': { "publisher_offers.$.publisher_offer_status_label": "rejected", "publisher_offers.$.publisher_offer_status": -3 } };
            // debug(pub_filter, pub_project);
            OfferModel.updateManyOffer(pub_filter, pub_project, {}).then(off_result => {
                if (result) {
                }
            })
                .catch(err => {
                    debug(err)
                    let response = Response.error();
                    response.msg = "error updating";
                    response.error = [err.message];
                    return res.status(200).json(response);
                })
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        response.msg = "success";
        return res.status(200).json(response);
    })
        .catch(err => {
            let response = Response.error();
            response.msg = "error updating";
            response.error = [err.message];
            return res.status(200).json(response);
        })

};

exports.updateStatusOnePublisherOffer = async (req, res) => {
    try {
        let publisher_id = +req.params.pid;
        let message = 'Offer approval request rejected.';
        let offer_id = '';
        let multi = false;
        if (Array.isArray(req.body.offerId)) {
            if (req.body.offerId.length == 1) {
                offer_id = mongooseObjectId(req.body.offerId[0]);
            } else {
                offer_id = { $in: req.body.offerId };
                multi = true;
            }
        } else {
            offer_id = mongooseObjectId(req.body.offerId);
        }
        let pubOffSt = 4;
        if (req.body.statusType == 'approve') {
            message = 'Offer successfully approved.';
            pubOffSt = 1;
        }
        if (multi) {
            for (let offer_id of req.body.offerId) {
                let offer = await OfferModel.getOneOffer({ _id: offer_id }, { payout: 1, pubOff: 1 }, {});
                let update = [];
                if (offer['pubOff'] && offer['pubOff'].length) {
                    for (let item of offer['pubOff']) {
                        if (item['id'] == publisher_id) {
                            item['pubOffSt'] = pubOffSt;
                        }
                        update.push(item);
                    }
                }
                await OfferModel.updateOffer({ _id: offer_id }, { $set: { pubOff: update } }, {});
            }
        } else {
            let offer = await OfferModel.getOneOffer({ _id: offer_id }, { payout: 1, pubOff: 1 }, {});
            let update = [];
            if (offer['pubOff'] && offer['pubOff'].length) {
                for (let item of offer['pubOff']) {
                    if (item['id'] == publisher_id) {
                        item['pubOffSt'] = pubOffSt;
                    }
                    update.push(item);
                }
            }
            await OfferModel.updateOffer({ _id: offer_id }, { $set: { pubOff: update } }, {});
        }
        let filter = {
            request_status: 'pending',
            network_id: mongooseObjectId(req.user.userDetail.network[0]),
            offer_id: offer_id,
            publisher_id: publisher_id
        }
        if (multi) {
            await PublisherOfferRequest.approvedStatusOfferPublisher(filter, { $set: { request_status: req.body.statusType } }, {});
        } else {
            await PublisherOfferRequest.changeStatusOfferPulbisher(filter, { $set: { request_status: req.body.statusType } }, {});
        }
        let response = Response.success();
        response.msg = message;
        response.payloadType = payloadType.array;
        response.payload = [];
        return res.status(200).json(response);
    } catch (error) {
        console.log("file: liveOffer.js ~ line 515 ~ exports.updateStatusOnePublisherOffer= ~ error", error)
        let response = Response.error();
        response.msg = 'Something went wrong. Please try again later.';
        response.error = [error.message];
        return res.status(200).json(response);
    }
};

exports.pushOfferInWebhook = async (req, res) => {
    try {
        // this.processPushOfferInWebhook(req)
        if (req.body.offerId && req.body.offerId.length && Object.keys(req.body.search).length == 0) {
            // console.log("file: liveOffer.js ~ line 526 ~ exports.pushOfferInWebhook= ~ req.body.offerId", req.body.offerId)
            if (req.body.metaData && req.body.metaData.reqPushOfferType == 'report') {
                // console.log("file: liveOffer.js ~ line 528 ~ exports.pushOfferInWebhook= ~ req.body.offerId.length", req.body.offerId.length)
                let wStatusData = {
                    network_id: mongooseObjectId(req.user.userDetail.network[0]),
                    usrName: req.user.userDetail.name,
                    usrId: req.user.userDetail.id,
                    wName: 'Webhook_Queue',
                    pName: 'PushBulkOffer',
                    status: "InQueue",
                    fOffCnt: req.body.offerId.length,
                    sDetails: { "InQueue": moment().toDate() }
                };
                let result = await WorkerStatusModel.saveStatus(wStatusData);
                if (result && result['_id']) {
                    let pushedOffersCount = await Function.publishJobForWebhook(req.user.userDetail.network[0], req.body.offerId, "offer_update", "Push Offer from report", 18);
                    if (pushedOffersCount) {
                        await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(result._id.toString()) }, { $set: { status: 'Completed', updatedAt: moment().toDate(), 'sDetails.Completed': moment().toDate(), count: pushedOffersCount } });
                    } else {
                        await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(result._id.toString()) }, { $set: { status: 'Failed', 'sDetails.Failed': moment().toDate() } });
                    }
                } else {
                    let response = Response.error();
                    response.msg = "Something went wrong!";
                    return res.status(200).json(response);
                }
            } else if (req.body.offerId.length <= 10) {
                // console.log("file: liveOffer.js ~ line 528 ~ exports.pushOfferInWebhook= ~ req.body.offerId.length", req.body.offerId.length)
                Function.publishJobForWebhook(req.user.userDetail.network[0], req.body.offerId, "offer_update", "Push Offer from live offer", 18);
            }
            else {
                let workerData = { networkId: req.user.userDetail.network[0], offerId: req.body.offerId }
                // console.log("file: liveOffer.js ~ line 532 ~ exports.pushOfferInWebhook= ~ workerData", workerData)
                let wStatusData = {
                    network_id: mongooseObjectId(req.user.userDetail.network[0]),
                    usrName: req.user.userDetail.name,
                    usrId: req.user.userDetail.id,
                    wName: 'Generic_Worker_Queue',
                    pName: 'PushBulkOffer',
                    status: "InQueue",
                    fOffCnt: req.body.offerId.length,
                    sDetails: { "InQueue": moment().toDate() }
                };
                let result = await WorkerStatusModel.saveStatus(wStatusData);
                if (result && result._id) {
                    let pubRes = await setRedisQueueData("GENWORKERQUEUE", JSON.stringify({ "workerName": "PushBulkOffer", "workerData": workerData, workerId: result._id.toString() }))
                    // let pubRes = await Function.sendJobToGenericWorker({ "workerName": "pushBulkOffer", "workerData": workerData, result._id.toString(): result._id.toString() }, 18);
                    if (!pubRes) {
                        await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(result._id.toString()) }, { $set: { status: 'Failed', 'sDetails.Failed': moment().toDate() } });
                    }
                }
                else {
                    console.log("file: liveOffer.js ~ line 556 ~ exports.pushOfferInWebhook= ~ result", result)
                    let response = Response.error()
                    response.msg = "Something went wrong!";
                    return res.status(200).json(response);
                }

            }
        }
        else if (req.body.search && req.body.search.allOffer) {
            // console.log("file: liveOffer.js ~ line 535 ~ exports.pushOfferInWebhook= ~ req.body.search", req.body.search)
            let filter = { 'network_id': mongooseObjectId(req.user.userDetail.network[0]), "status": 1 }
            filter['updatedAt'] = { $gte: moment().subtract(2, 'days').toDate(), $lte: moment().toDate() };
            if (req.body.search.start_date && req.body.search.end_date) {
                filter['updatedAt'] = { $gte: moment(req.body.search.start_date.trim()), $lte: moment(req.body.search.end_date.trim()) };
            }
            if (req.body.search.advertiser_id) {
                if (mongooseObjectId.isValid(req.body.search.advertiser_id.trim())) {
                    filter['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.my_offers) {
                filter['isMyOffer'] = req.body.search.my_offers;
            }
            if (req.body.search.country) {
                if (req.body.search.country == "none") {
                    filter['geo_targeting.country_allow'] = { $size: 0 };
                } else {
                    filter['geo_targeting.country_allow.key'] = req.body.search.country;
                }
            }
            if (req.body.search.device) {
                filter['device_targeting.device'] = req.body.search.device;
            }
            if (req.body.search.os) {
                filter['device_targeting.os'] = req.body.search.os;
            }
            if (req.body.search.status) {
                filter['status'] = +req.body.search.status.trim();
            }
            if (req.body.search.platform_id) {
                if (mongooseObjectId.isValid(req.body.search.platform_id.trim())) {
                    filter['platform_id'] = mongooseObjectId(req.body.search.platform_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.app_id) {
                if (req.body.search.app_id.includes(',')) {
                    filter['app_id'] = { "$in": req.body.search.app_id.split(',') };
                }
                else {
                    filter['app_id'] = req.body.search.app_id.trim()
                }
                // if (filter.updatedAt) {
                //     delete filter.updatedAt;
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
                        filter['_id'] = { "$in": formatMongooseIdArray(offerIds) };
                    }
                    else {
                        invalidSearch = true;
                    }
                }
                else {
                    if (mongooseObjectId.isValid(req.body.search.offer_id)) {
                        filter['_id'] = mongooseObjectId(req.body.search.offer_id);
                    }
                    else {
                        invalidSearch = true;
                    }
                }
                if (filter.updatedAt) {
                    delete filter.updatedAt;
                }
            }
            if (req.body.search.advertiser_offer_id) {
                if (req.body.search.advertiser_offer_id.includes(',')) {
                    filter['advertiser_offer_id'] = { "$in": req.body.search.advertiser_offer_id.split(',') };
                }
                else {
                    filter['advertiser_offer_id'] = req.body.search.advertiser_offer_id;
                }
                // if (filter.updatedAt) {
                //     delete filter.updatedAt;
                // }
            }
            if (req.body.search.workingOffers) {
                filter['wTime'] = filter['updatedAt']
                delete filter['updatedAt']
                delete filter['status']
            }
            let workerData = { networkId: req.user.userDetail.network[0], search: filter }
            // console.log("file: liveOffer.js ~ line 626 ~ exports.pushOfferInWebhook= ~ workerData", workerData)
            let wStatusData = {
                network_id: mongooseObjectId(req.user.userDetail.network[0]),
                usrName: req.user.userDetail.name,
                usrId: req.user.userDetail.id,
                wName: 'Generic_Worker_Queue',
                pName: 'PushBulkOffer',
                status: "InQueue",
                search: JSON.stringify(filter),
                sDetails: { "InQueue": moment().toDate() }
            };
            let result = await WorkerStatusModel.saveStatus(wStatusData);
            if (result && result._id) {
                let pubRes = await setRedisQueueData("GENWORKERQUEUE", JSON.stringify({ "workerName": "PushBulkOffer", "workerData": workerData, workerId: result._id.toString() }))
                // let pubRes = await Function.sendJobToGenericWorker({ "workerName": "pushBulkOffer", "workerData": workerData, result._id.toString(): result._id.toString() }, 18);
                if (!pubRes) {
                    await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(result._id.toString()) }, { $set: { status: 'Failed', 'sDetails.Failed': moment().toDate() } });
                }
            }
            else {
                console.log("file: liveOffer.js ~ line 556 ~ exports.pushOfferInWebhook= ~ result", result)
                let response = Response.error()
                response.msg = "Something went wrong!";
                return res.status(200).json(response);
            }
        }

        let response = Response.success()
        response.msg = " Offers Pushed to Webook Successfully !!";
        return res.status(200).json(response);
    } catch (error) {
        console.log(error, "error");
    }

}


// when single offers, push to webHook  
exports.singleOfferInWebhook = async (req, res) => {

    let content = {
        offersId: req.body.offerId,
        network_id: req.user.userDetail.network[0],
        event: 'offer_update'
    };

    try {

        if (content.network_id && content.event) {
            // Find webhook setting
            let WHsetting = [];
            let WHSettingRedis = await Redis.getRedisHashData("webhooksetting:", content.network_id);
            if (!WHSettingRedis.error && WHSettingRedis.data && WHSettingRedis.data[0]) {
                WHsetting = WHSettingRedis.data;
            } else {
                WHsetting = await webhookModel.findwebhookSetting({ network_id: content.network_id });
                Redis.setRedisHashData("webhooksetting:", content.network_id, WHsetting, 3600);
            }

            // Find network data
            let networkData = {};
            let networkDataRedis = await Redis.getRedisHashData('networks', content.network_id);
            if (!networkDataRedis.error && networkDataRedis.data && networkDataRedis.data._id) {
                networkData = networkDataRedis.data;
            } else {
                let networkDataDB = await Network.isNetworkExist(
                    { _id: content.network_id },
                    { network_unique_id: 1, network_publisher_setting_string: 1, country: 1, status: 1, company_name: 1, domain: 1 }
                );
                networkData = networkDataDB[0];
                Redis.setRedisHashData('networks', content.network_id, networkData, 36000);
            }

            // Find pushed offer detail according to setting(projection)
            let search = { _id: mongooseObjectId(req.body.offerId) };
            let projection = { 'advertiser_id': 1, 'ewt': 1 }
            for (let key of WHsetting[0].offersKeys) { projection[key] = 1 }
            let offersData = await OfferModel.getSearchOffer(search, projection, {})

            // Find inactive advertisers of this network
            let allInActiveAdvertiser = (await Redis.getRedisSetData("INACTIVEADVERTISER:" + content.network_id.toString())).data;
            if (!allInActiveAdvertiser.length) {
                allInActiveAdvertiser = []
                let advertiserIds = await AdvertiserModel.getAdvertiser({ network_id: mongooseObjectId(content.network_id), "status": "InActive" }, { _id: 1 })
                for (let obj of advertiserIds) { allInActiveAdvertiser.push("" + obj._id) }
                Redis.setRedisSetData("INACTIVEADVERTISER:" + content.network_id.toString(), allInActiveAdvertiser)
            }

            // Prepare and Filter offer accroding to inactive advertiser to push in webhook
            let webhookOffers = []
            for (let singleOffer of offersData) {
                if (!allInActiveAdvertiser.includes("" + singleOffer.advertiser_id)) {
                    // console.log("callWorkingApi -> allInActiveAdvertiser.includes(singleOffer.advertiser_id)", allInActiveAdvertiser.includes(""+singleOffer.advertiser_id), ""+singleOffer.advertiser_id)
                    if (projection.link) {
                        singleOffer['link'] = Function.generateTrackingLink(networkData, singleOffer._id, WHsetting[0].pid, singleOffer.advertiser_id, networkData.network_publisher_setting_string)
                    }

                    webhookOffers.push(singleOffer)
                } else {

                    let response = Response.error();
                    response.msg = " Advertiser InActive ";
                    response.error = "Advertiser InActive ";
                    return res.status(200).json(response);
                }
            }

            try {
                if (webhookOffers.length) {
                    let key = "WPCNT:" + content.network_id + ":" + moment.utc().format('DD/MM/YY:HH');
                    Redis.incrbyRedisData(key, webhookOffers.length, process.env.MAX_WEBHOOK_PUSHED_OFFER_TIME || 86400);
                }
            } catch (error) {
                debug(error);
            }

            let webHookData = {}
            webHookData[WHsetting[0]['key']] = { "network_id": mongooseObjectId(content.network_id), "offers": webhookOffers, "token": WHsetting[0]['token'] };
            let config = {
                method: WHsetting[0].method,
                url:  WHsetting[0].url,
                data: webHookData,
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded"
                }
            }

            axios(config).then(result => {
                let response = Response.success();
                response.msg = " Offers Pushed to Webook Successfully ";
                return res.status(200).json(response);

            }).catch(err => {
                let response = Response.success();
                response.msg = " Offers Pushed to Webook Successfully2 ";
                return res.status(200).json(response);
            })
        }
        else {
            let response = Response.success()
            response.msg = " Offers Pushed to Webook Successfully 3";
            return res.status(200).json(response);
        }
    } catch (e) {
        let response = Response.error();
        response.msg = " Something went wrong! ";
        response.error = " Something went wrong! ";
        return res.status(200).json(response);
    }
}


exports.processPushOfferInWebhook = async (req) => {
    try {
        let filter = { "status": 1 }
        let count = 0;
        let newOfferIds = []


        if (req.body.offerId && req.body.offerId.length) {
            newOfferIds.push(req.body.offerId);
        }
        if (req.body.search && req.body.search.allOffer) {
            filter = { 'network_id': mongooseObjectId(req.user.userDetail.network[0]), 'status': 1 };
            if (req.body.search.advertiser_id) {
                if (mongooseObjectId.isValid(req.body.search.advertiser_id.trim())) {
                    filter['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.my_offers) {
                filter['isMyOffer'] = req.body.search.my_offers;
            }
            if (req.body.search.country) {
                if (req.body.search.country == "none") {
                    filter['geo_targeting.country_allow'] = { $size: 0 };
                } else {
                    filter['geo_targeting.country_allow.key'] = req.body.search.country;
                }
            }
            if (req.body.search.device) {
                filter['device_targeting.device'] = req.body.search.device;
            }
            if (req.body.search.os) {
                filter['device_targeting.os'] = req.body.search.os;
            }
            if (req.body.search.status) {
                filter['status'] = +req.body.search.status.trim();
            }
            else if (req.body.search.publisher_offer_status) {
                filter['publisher_offers'] = { $elemMatch: { publisher_id: +req.accountid || '', publisher_offer_status: +req.body.search.publisher_offer_status.trim() } };
            }
            if (req.body.search.platform_id) {
                if (mongooseObjectId.isValid(req.body.search.platform_id.trim())) {
                    filter['platform_id'] = mongooseObjectId(req.body.search.platform_id.trim());
                }
                else {
                    invalidSearch = true;
                }
            }
            if (req.body.search.start_date) {
                filter['updatedAt'] = { $gte: moment(req.body.search.start_date.trim()), $lte: moment(req.body.search.end_date.trim()) };
            }
            if (req.body.search.app_id) {
                if (req.body.search.app_id.includes(',')) {
                    filter['app_id'] = { "$in": req.body.search.app_id.split(',') };
                }
                else {
                    filter['app_id'] = req.body.search.app_id.trim()
                }
                if (filter.updatedAt) {
                    delete filter.updatedAt;
                }
            }
            if (req.body.search.offer_name) {
                search['offer_name'] = { "$regex": new RegExp(req.body.search.offer_name, "i") };
                if (search.updatedAt) {
                    delete search.updatedAt;
                }
            }
            if (req.body.search.offer_id) {
                if (req.body.search.offer_id.includes(',')) {
                    let offerIds = req.body.search.offer_id.split(",");
                    if (mongooseObjectId.isValid(offerIds[0])) {
                        filter['_id'] = { "$in": formatMongooseIdArray(offerIds) };
                    }
                    else {
                        invalidSearch = true;
                    }
                }
                else {
                    if (mongooseObjectId.isValid(req.body.search.offer_id)) {
                        filter['_id'] = mongooseObjectId(req.body.search.offer_id);
                    }
                    else {
                        invalidSearch = true;
                    }
                }
                if (filter.updatedAt) {
                    delete filter.updatedAt;
                }
            }
            if (req.body.search.advertiser_offer_id) {
                if (req.body.search.advertiser_offer_id.includes(',')) {
                    filter['advertiser_offer_id'] = { "$in": req.body.search.advertiser_offer_id.split(',') };
                }
                else {
                    filter['advertiser_offer_id'] = req.body.search.advertiser_offer_id;
                }
                if (filter.updatedAt) {
                    delete filter.updatedAt;
                }
            }
            let searchedOffers = await OfferModel.getSearchOffer(filter, { '_id': 1 }, {});
            // console.log("file: liveOffer.js ~ line 641 ~ exports.processPushOfferInWebhook= ~ searchedOffers", searchedOffers.length)
            let totalIds = await searchedOffers.map((obj) => { return obj._id })
            newOfferIds = [];
            newOfferIds = await Function.chunkArrayInGroups(totalIds, 1000)
            // newOfferIds.push(totalIds);
        }
        let pushedOfferCount = 0
        for (let i = 0; i < newOfferIds.length; i++) {
            let event = 'offer_update'
            let priority = 0;
            if (newOfferIds[0] && newOfferIds[0].length <= 5) {
                priority = 20;
            }
            Function.publishJobForWebhook(req.user.userDetail.network[0], newOfferIds[i], event, "Push Offer", priority);
            pushedOfferCount += newOfferIds[i].length
        }
        // console.log("file: liveOffer.js ~ line 657 ~ exports.processPushOfferInWebhook= ~ pushedOfferCount", pushedOfferCount)
    }
    catch (err) {
        console.log(err, "=================error in updateOfferTime====================");
    }
}

exports.blacklistOffer = async (req, res) => {
    try {
        if (req.body.offerIds) {
            let network_id = req.user.userDetail.network[0]
            let nid = req.user.userDetail.nid;
            let search = { _id: { $in: req.body.offerIds } };
            let reflect = { isBlacklist: 1 };
            let result = await OfferModel.updateManyOffer(search, reflect, {});
            if (result && result.nModified > 0) {
                await blockOfferModel.updateManyBlockOffer(search, { $set: { nid: nid, status: 1 } });
                let keys = req.body.offerIds.reduce((arr, curr) => {
                    arr.push(`OFFER:${curr.toString()}`);
                    return arr;
                }, [])
                await delRedisData(keys)
                Function.publishJobForWebhook(network_id, req.body.offerIds, 'offer_update', "Block Offer")
                let response = Response.success()
                response.payload = req.body.offerIds;
                response.msg = "Selected Offers Blocked";
                return res.status(200).json(response);
            }
            else {
                let response = Response.success()
                response.msg = "Offer Not Found";
                return res.status(200).json(response);
            }
        }
        else {
            let response = Response.success()
            response.msg = "Select At-least one offer to block";
            return res.status(200).json(response);
        }
    } catch (err) {
        // console.log("Darwin:controllers:offer:liveOffer:blacklistOffer", err);
        let response = Response.error();
        response.msg = "Something Went Wrong";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}
exports.unblockOffer = async (req, res) => {
    try {
        if (req.body.offerIds) {
            let network_id = req.user.userDetail.network[0]

            let search = { _id: { $in: req.body.offerIds } };
            let reflect = { isBlacklist: 0 };
            let result = await OfferModel.updateManyOffer(search, reflect, {})
            if (result && result.nModified > 0) {
                await blockOfferModel.deleteManyBlockOffer({ _id: { $in: req.body.offerIds } });
                let keys = req.body.offerIds.reduce((arr, curr) => {
                    arr.push(`OFFER:${curr.toString()}`);
                    return arr;
                }, [])
                await delRedisData(keys)
                Function.publishJobForWebhook(network_id, req.body.offerIds, 'offer_update', "Unblock Offer")
                let response = Response.success()
                response.payload = req.body.offerIds;
                response.msg = "Selected Offer UnBlocked";
                return res.status(200).json(response);
            }
            else {
                let response = Response.success()
                response.msg = "Offer Not Found";
                return res.status(200).json(response);
            }
        }
        else {
            let response = Response.success()
            response.msg = "Select At-least one offer to blacklist";
            return res.status(200).json(response);
        }
    } catch (err) {
        // console.log("Darwin:controllers:offer:liveOffer:unblockOffer", err);
        let response = Response.error();
        response.msg = "Something Went Wrong";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.unblockOfferAccToAdvOfferHash = async (req, res) => {
    try {
        if (!req.body.advOfferHash) {
            let response = Response.success()
            response.msg = "Send advertiser offer hash.";
            return res.status(200).json(response);
        }

        let content = {
            workerName: "UnblockOfferAdvOfferHash",
            workerData: req.body
        }
        await sendJobToGenericWorker(content, priority = 18);
        return res.status(200).json(Response.success());
    } catch (err) {
        // console.log("Darwin:controllers:offer:liveOffer:unblockOffer", err);
        let response = Response.error();
        response.msg = "Something Went Wrong";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}
