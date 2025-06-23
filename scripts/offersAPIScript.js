require("dotenv").config({ path: ".env" });
const debug = require("debug")("darwin:Script:OffersAPIScript");
require('../db/connection');

const { apiPlugins } = require("../plugin");

exports.startOffersAPIScript = async () => {
    try {
        let content = {
            network_id: '5e4d069278af0f2923e289fb',
            advertiser_id: '5ead6abb991abd7c6f44b35d',
            advertiser_name: 'liftmobi',
            platform_id: '5e2ebbb3ef041f099d6ddd0d',
            platform_name: 'Offer18',
            credentials: {
                network_id: 'liftmobi.offer18.com',
                affiliate_id: '33905',
                api_key: 'b2f908bdc7e33add76c2a01d0db85b60',
                mid: '1538'
            },
            offer_live_type: 'all_offer_live',
            visibility_status: 'auto_approve',
            payout_percent: '70',
            publishers: [45],
            advertiser_platform_id: '5eda078e961f4332ac91e297'
        };
        let platform_name = "Offer18";
        await apiPlugins[platform_name].offersApiCall(content);
    } catch (error) {
        debug(error);
    }
};

// this.startOffersAPIScript();