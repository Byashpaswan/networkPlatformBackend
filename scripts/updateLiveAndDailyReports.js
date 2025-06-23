require("dotenv").config({ path: ".env" });
require('../db/connection');

const mongoose = require('mongoose');
const mongooseObjectId = mongoose.Types.ObjectId;
const NetworkModel = require('../db/network/Network');
const {ClickLogModel} = require('../db/click/clickLog');
const rabbitMQ = require('../helpers/rabbitMQ');
const moment = require('moment');
let publisher_queue = 'live_report_clicks_queue';

async function processLiveReportClicks(networkId) {
    try {
        // let liveReportData = {};
        let time = moment().subtract(1, 'hours').startOf('hour').toDate();
        console.log(" time ->", time );
        let cursor = await ClickLogModel.getClickLog(
            { network_id: networkId, report: false, createdAt: { $lte: time } },
            {}
        );
        for(let clickData = await cursor.next(); clickData != null; clickData = await cursor.next()){
            let reportData = {
                id : clickData['_id'],
                N_id : clickData['network_id'],
                nid: clickData['nid'],
                oId : clickData['offer_id'],
                oName : clickData['offer_name'],
                A_id : clickData['advertiser_id'],
                aid : clickData['aid'],
                plid : clickData['plid'],
                source : clickData['source'],
                pid: clickData['publisher_id'],
                createdAt : clickData['createdAt'],
                adOId : clickData['advertiser_offer_id'],
                coin: clickData['currency'],
                app: clickData['app_id'],
                aPlId: clickData['aPlId'],
            }
            try{
                await rabbitMQ.publish_Content(isMultipleContent = false, publisher_queue, reportData, true, true);
               
            }catch(error){
                console.log(" error -> ", error);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

exports.startLiveReportScript = async () => {
    try {
        let networks = await NetworkModel.find({ }, { _id: 1 });
        if (networks && networks.length) {
            for (let network of networks) {
                if (network['_id']) {
                    await processLiveReportClicks(mongooseObjectId(network['_id']));
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
};


// (async()=>{
//     await this.startLiveReportScript();
// })()