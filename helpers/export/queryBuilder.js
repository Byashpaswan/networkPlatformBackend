const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferModel = require('../../db/offer/Offer');
const NetworkModel = require('../../db/network/Network');
const moment = require('moment');
const { off } = require('../../db/offer/Offer');


exports.PublisherOffers_QueryBuilder = async (DownloadData, QueryData) => {

    let search = {};
    let projection = {};
    let options = {};
    search['status'] = 1;
    try {

        search['updatedAt'] = { $gte: moment().subtract(1, 'd'), $lte: moment() };
        search['publisher_offers'] = { $elemMatch: { publisher_id: +QueryData.params.pid || '', publisher_offer_status: 1 } };
        projection['publisher_offers'] = { $elemMatch: { publisher_id: +QueryData.params.pid || '' } };
        search['isPublic'] = true;

        if (QueryData.body.search) {
            if (QueryData.body.search.offer_id) {
                if (mongooseObjectId.isValid(QueryData.body.search.offer_id.trim())) {
                    search['_id'] = mongooseObjectId(QueryData.body.search.offer_id.trim());
                }
                else {
                    search['offer_name'] = { $regex: QueryData.body.search.offer_id.trim(), $options: 'i' };
                }
            }
            if (QueryData.body.search.advertiser_offer_id) {
                search['advertiser_offer_id'] = QueryData.body.search.advertiser_offer_id.trim();
            }
            if (QueryData.body.search.app_id) {
                search['app_id'] = { $regex: QueryData.body.search.app_id.trim(), $options: 'i' };
            }
            if (QueryData.body.search.advertiser_id) {
                if (mongooseObjectId.isValid(QueryData.body.search.advertiser_id.trim())) {
                    search['advertiser_id'] = mongooseObjectId(QueryData.body.search.advertiser_id.trim());
                }
            }
            if (QueryData.body.search.platform_id) {
                if (mongooseObjectId.isValid(QueryData.body.search.platform_id.trim())) {
                    search['platform_id'] = mongooseObjectId(QueryData.body.search.platform_id.trim());
                }
            }
            if (QueryData.body.search.my_offers) {
                search['isMyOffer'] = QueryData.body.search.my_offers;
            }
            if (QueryData.body.search.start_date) {
                search['updatedAt'] = { $gte: moment(QueryData.body.search.start_date.trim()), $lte: moment(QueryData.body.search.end_date.trim()) };
            }
            if (QueryData.body.search.select_os) {
                search['device_targeting.os'] = QueryData.body.search.select_os.trim();
            }
            if (QueryData.body.search.select_device) {
                search['device_targeting.device'] = QueryData.body.search.select_device.trim();
            }
            if (QueryData.body.search.select_country) {
                search['geo_targeting.country_allow'] = { $elemMatch: { "key": QueryData.body.search.select_country.trim() } };
            }
            if (QueryData.body.search.blockedOffers) {
                // search['isBlacklist'] = 1;
                search['isBlacklist'] = { $gt: 0 }
            }
            // if(QueryData.body.search.status_label){
            //     search['status_label'] = QueryData.body.search.status_label;
            // }
        }
        let offerProjection = await NetworkModel.findOneNetwork({ _id: DownloadData.network_id }, { _id: 0, offer_export_setting: 1, network_publisher_setting_string: 1 });
        if (offerProjection) {
            if (offerProjection[0]['offer_export_setting']) {
                if (offerProjection[0]['offer_export_setting'].includes('OfferId')) {
                    offerProjection[0]['offer_export_setting'][offerProjection[0]['offer_export_setting'].indexOf('OfferId')] = '_id';
                }
                if (offerProjection[0]['offer_export_setting'].includes('UserId')) {
                    temp = ['UserId'];
                    offerProjection[0]['offer_export_setting'] = offerProjection[0]['offer_export_setting'].filter(item => !temp.includes(item));
                }
                if (offerProjection[0]['offer_export_setting'].includes('Link')) {
                    temp = ['Link'];
                    offerProjection[0]['offer_export_setting'] = offerProjection[0]['offer_export_setting'].filter(item => !temp.includes(item));
                }
            }
            if (!offerProjection[0]['offer_export_setting']) {
                projection['advertiser_name'] = 1;
                projection['advertiser_id'] = 1;
                projection['app_id'] = 1;
                projection['platform_name'] = 1;
                projection['_id'] = 1;
                projection['offer_name'] = 1;
                projection['geo_targeting.country_allow'] = 1;
                projection['payout'] = 1;

            }
            else if (offerProjection[0]['offer_export_setting'].length > 0) {
                projection = offerProjection[0]['offer_export_setting'];
                projection['_id'] = 1;

            }
            if (offerProjection[0]['network_publisher_setting_string'] && offerProjection[0]['network_publisher_setting_string'].includes("&adv_id=true")) {
                projection['advertiser_id'] = 1;
            }
        }
        options['sort'] = { updatedAt: -1 }
        search['network_id'] = mongooseObjectId(DownloadData.network_id);
        let cursor = OfferModel.find(search, projection, options).lean().cursor({ batchSize: 1000 });
        return cursor;

    } catch (err) {
        console.log(err, "Error in PublisherOffers_QueryBuilder");
    }

}