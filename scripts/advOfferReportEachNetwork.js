require("dotenv").config({ path: ".env" });
require('../db/connection');
const mongoose = require('mongoose');
const debug = require("debug")("darwin:Script:advOfferReportEachNetwork");
const OfferModel = require("../db/offer/Offer");
const AdvertiserOfferStats = require('../db/offer/AdvertiserOfferStats');
const networkModel = require('../db/network/Network');
const advertiserModel = require('../db/advertiser/Advertiser')

async function getData() {
    try {
        let statusList = [-1, -2, -3, 0, 1, 2, 3, 4, 5];
        let result = {};

        let cursor = await networkModel.find({}, { _id: 1 }).cursor();
    
        for (let Ndoc = await cursor.next(); Ndoc != null; Ndoc = await cursor.next()) {
            let advertiserCursor = await advertiserModel.find({ network_id: Ndoc['_id'] }, { _id: 1, company: 1,status:1 }).cursor();

            for (let advDoc = await advertiserCursor.next(); advDoc != null; advDoc = await advertiserCursor.next()) {
                result[Ndoc['_id']] = result[Ndoc['_id']] || {};
                result[Ndoc['_id']][advDoc['_id']] = {
                    advertiser_name: advDoc['company'],
                    status:advDoc['status'],
                    advertiser_id: advDoc['_id'],
                    network_id: Ndoc['_id'],
                    active: 0,
                    no_link_offers: 0,
                    applied: 0,
                    waitingForApproval: 0,
                    waiting_in_apply: 0,
                    paused: 0,
                    deleted: 0,
                    unmanaged: 0,
                    rejected: 0,
                    totalOffers: 0,
                };

                for (let status of statusList) {
                    let count = await OfferModel.countDocuments({
                        network_id: Ndoc['_id'],
                        advertiser_id: advDoc['_id'],
                        status: status
                    });


                    switch (status) {
                        case -1:
                            result[Ndoc['_id']][advDoc['_id']].deleted = count;
                            break;
                        case -2:
                            result[Ndoc['_id']][advDoc['_id']].unmanaged = count;
                            break;
                        case -3:
                            result[Ndoc['_id']][advDoc['_id']].rejected = count;
                            break;
                        case 0:
                            result[Ndoc['_id']][advDoc['_id']].no_link_offers = count;
                            break;
                        case 2:
                            result[Ndoc['_id']][advDoc['_id']].waitingForApproval = count;
                            break;
                        case 3:
                            result[Ndoc['_id']][advDoc['_id']].applied = count;
                            break;
                        case 4:
                            result[Ndoc['_id']][advDoc['_id']].waiting_in_apply = count;
                            break;
                        case 5:
                            result[Ndoc['_id']][advDoc['_id']].paused = count;
                            break;
                        case 1:
                            result[Ndoc['_id']][advDoc['_id']].active = count;
                            break;
                    }
                    result[Ndoc['_id']][advDoc['_id']].totalOffers += count;
                }

                // Save the result to the database
                await AdvertiserOfferStats.updateOne(
                    {
                        advertiser_id: advDoc['id'],
                        network_id: Ndoc['_id']
                    },
                   { $set: result[Ndoc['_id']][advDoc['_id']]},
                    { upsert: true }
                );
            }
        }

        debug("completed all offer inserted or updated");
    } catch (err) {
        console.error(err);
    }
}

exports.getData = async () => {
    try {

        await getData();
    }
    catch (err) {
        debug(err)
    }
}

this.getData();

