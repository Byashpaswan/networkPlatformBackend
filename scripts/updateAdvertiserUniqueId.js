require("dotenv").config({ path: ".env" });
require("../db/connection");

const debug = require("debug")("darwin:Script:UpdateAdvertiserUniqueId");
const AdvertiserModel = require('../db/advertiser/Advertiser');

const updateAdvertiserSlug = async () => {
    
    try {

        let updateCount = 0;
        let advertiserCompanyNameList = await AdvertiserModel.getAdvertiser({}, { _id: 1, company: 1 });

        if (advertiserCompanyNameList && advertiserCompanyNameList.length) {
            for (const advtiserObj of advertiserCompanyNameList) {

                let companyName = advtiserObj.company.trim().toLowerCase().replace(/\s/g, '');
                let result = await AdvertiserModel.updateAdvertiserData({ _id: advtiserObj._id }, { $set: { slug: companyName } });
                if (result) {
                    updateCount++
                }
            }
            debug("updateCount : ",updateCount)
        }
    } catch (error) {
        debug("error : ", error)
    }
}

updateAdvertiserSlug();