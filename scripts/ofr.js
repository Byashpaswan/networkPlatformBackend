
require("dotenv").config({ path: ".env" });
require("../db/connection");
const debug = require("debug")("darwin:Script:updateOffer");

const OfferModel = require("../db/offer/Offer");
// const fs = require("fs");
// const path=require('path')
//  let ofrArry=[];

async function updateOffer() {
    const allOffers = await OfferModel.getAllOfferByCursor({}, {payout:1,revenue:1}, {});

    for (let docs = await allOffers.next(); docs != null; docs = await allOffers.next()) {
        try {
            if (!docs || Object.keys(docs).length === 0) {
                debug("Skipped empty document");
                continue;
            }

            let updateFlag = false;

            debug("Processing Offer ID: %s with Payout: %o and Revenue: %o", docs._id, docs.payout, docs.revenue);

            // Fix payout
            if (docs.payout && typeof docs.payout.value === 'string') {
                docs.payout.value = parseFloat(docs.payout.value);
                updateFlag = true;
            }

            // Fix revenue
            if (docs.revenue && typeof docs.revenue.value === 'string') {
                docs.revenue.value = parseFloat(docs.revenue.value);
                updateFlag = true;
            }

            if (!updateFlag) {
                debug("No update required for Offer ID: %s", docs._id);
                continue;
            }

            //  ofrArry.push(docs._id.toString()); 
            await OfferModel.updateOne(
                { _id: docs._id },
                {
                    $set: {
                        payout: docs.payout,
                        revenue: docs.revenue,
                    }
                },
                { timestamps: false }
            );


            debug("Updated Offer ID: %s with Payout: %o and Revenue: %o", docs._id, docs.payout, docs.revenue);

        } catch (error) {
            debug("Error processing Offer ID: %s → %o", docs._id, error);
        }
    }
}

async function startScript() {
    try {
        await updateOffer();
        debug("Offer update script completed successfully.");

        // const csvContent= ofrArry.map(id => `${id}`).join("\n");
        // const csvFilePath = path.join(__dirname, "updated_offer_ids.csv");
        // fs.writeFileSync(csvFilePath, csvContent);
        // console.log(`Offer IDs saved to ${csvFilePath}`);
        process.exit(0);
    } catch (error) {
        console.error("Error in startScript:", error);
        process.exit(1);
    }
}

startScript();
