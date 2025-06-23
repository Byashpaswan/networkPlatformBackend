require("dotenv").config({ path: ".env" });
require("../db/connection");

const moment = require('moment');
const debug = require("debug")("darwin:Script:DeleteOldReports");

const startDate = moment("2020-05-01")
const endDate = moment("2022-03-31")
const { OffersSourceAdvAffSummaryModel, SourceAdvertiserAffiliateSummaryModel, SourceAdvertiserSummaryModel, SourceAffiliateSummaryModel, AdvertiserSummaryModel, DailySummaryModel, DailyAdvertiserOfferPublisherSummaryModel, DailySourceAdvertiserSummaryModel, MonthlySourceAdvertiserSummaryModel, DailySourcePublisherSummaryModel, MonthlySourcePublisherSummaryModel, SourceOfferPublisherSummaryModel, LiveAdvOffPubSouSummaryModel, MonthlyAdvertiserOfferPublisherSummaryModel } = require("../db/click/sourceSummary/sourceSummary");

const dumpTableName = { "advertiser_summaries": AdvertiserSummaryModel, "daily_advertiser_offer_publisher_summaries": DailyAdvertiserOfferPublisherSummaryModel, "daily_source_advertiser_summaries": DailySourceAdvertiserSummaryModel, "daily_source_publisher_summaries": DailySourcePublisherSummaryModel, "daily_summaries": DailySummaryModel, "live_advertiser_offer_publisher_source_summaries": LiveAdvOffPubSouSummaryModel, "monthly_advertiser_offer_publisher_summaries": MonthlyAdvertiserOfferPublisherSummaryModel, "monthly_source_advertiser_summaries": MonthlySourceAdvertiserSummaryModel, "monthly_source_publisher_summaries": MonthlySourcePublisherSummaryModel, "source_advertiser_affiliate_summaries": SourceAdvertiserAffiliateSummaryModel, "source_advertiser_summaries": SourceAdvertiserSummaryModel, "source_affiliate_summaries": SourceAffiliateSummaryModel, "source_offer_adv_pub_summaries": OffersSourceAdvAffSummaryModel, "source_offer_publisher_summaries": SourceOfferPublisherSummaryModel };

const networkList = ["adsdolfin_5e4d077078af0f2923e289ff", "cost2action_5e4d056eeb383b291949a3df", "leadworld_649005b62f2be21479f19bbe", "adsever_5e4d0702eb383b291949a3e3", "crossway_5e4d07f0eb383b291949a3e7", "offerrobo_606d57c90ed8256e416fd9e0", "andromobi_5e4d069278af0f2923e289fb", "grootmobi_6231e2ced133d53d82ffb22b", "pantherads_62a2fd31373f8b66bd20d4ec"]


exports.deleteOldReports = async () => {

    for (const [collection, dbModal] of Object.entries(dumpTableName)) {
        for (const network of networkList) {
            let [networkName, network_id] = network.split("_")
            console.log(`Delete started for ${networkName} on ${collection}`)
            try {
                let reportIds = []
                let cursor = await dbModal.fetchReportAsStream({ network_id, timeSlot: { $gte: startDate.toDate(), $lt: endDate.toDate() } }, { _id: 1 })
                for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                    reportIds.push(doc._id)
                    if (reportIds.length > 100) {
                        console.log(`Deleted for ${networkName} on ${collection} : `, reportIds.length)
                        await dbModal.deleteManyDocs({ _id: { $in: reportIds } })
                        reportIds = []
                    }
                }
                if (reportIds.length) {
                    console.log(`Deleted for ${networkName} on ${collection} : `, reportIds.length)
                    await dbModal.deleteManyDocs({ _id: { $in: reportIds } })
                }
            } catch (error) {
                debug(error)
            }
            console.log(`Delete completed for ${networkName} on ${collection}`)
        }
        console.log("all process completed related to report delete.")
    }
    process.exit(0)
}

this.deleteOldReports()