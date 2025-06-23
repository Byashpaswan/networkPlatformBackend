// const { makeRequest, ImportantFields, applyOfferStatusUpdate } = require('../plugin');
const { singleOfferUpdate } = require('./offers');
const debug = require("debug")("darwin:apply:hasoffer");
const plugin = require('../plugin')
exports.ApplyApiCall = async (content) => {
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let offer_data = content['offer_data'];

    let apiBaseurl = "https://" + network_id + ".api.hasoffers.com/Apiv3/json?api_key=" + api_key + "&Target=Affiliate_Offer&Method=requestOfferAccess&offer_id=";
    let answer = "In-App%20Traffic";

    return new Promise(async (resolve, reject) => {
        for (let offObj of offer_data) {
            try {
                let questions = await this.getQuestions(api_key, network_id, offObj.v);
                if (questions) {
                    let answers = '';
                    if (questions.status) {
                        let sendq = questions.question;
                        for (let i = 0; i < sendq.length; i++) {
                            answers = answers + "&answers[" + i + "][question_id]=" + sendq[i] + "&answers[" + i + "][answer]=" + answer;
                        }
                    }
                    let result = await plugin.makeRequest({
                        method: 'post',
                        url: apiBaseurl + offObj.v + answers,

                    });
                    if (result) {
                        // console.log("file: apply.js ~ line 31 ~ returnnewPromise ~ result", result.data)
                        result = result.data;
                        let response = result.response;
                        let OfferStatus = '';

                        if (response && response.status == 1) {
                            OfferStatus = 'waitingForApproval';
                        }
                        else if (response && response.status == -1) {
                            // debug("api response: ", response.errorMessage)
                            if (response.errorMessage.includes('status of application: rejected')) {
                                OfferStatus = 'rejected';
                            }
                            else if (response.errorMessage.includes('status of application: pending')) {
                                OfferStatus = 'waitingForApproval';
                            }
                            else if (response.errorMessage.includes('status of application: approved')) {
                                let result = await singleOfferUpdate(content, +offObj.v);
                                // if (!result) OfferStatus = 'waitingForApproval';
                            }
                            else if (response.errorMessage.includes('does not require approval')) {
                                OfferStatus = 'waitingForApproval';
                            }

                        }
                        if (OfferStatus) {
                            // debug("Offer status : ", OfferStatus)
                            let res = await plugin.applyOfferStatusUpdate(offObj.v, offObj.k, OfferStatus, content.network_id, content.advertiser_id, content.advertiser_platform_id, plugin.ImportantFields);
                        }
                        else {
                            // debug(response)
                        }
                    }
                }
            }
            catch (e) {
                // if (e.response)
                //     console.log(e.response.data, 'console-----------------', advertiser_offer_id)
                // else
                //     console.log(e, 'console*******************', advertiser_offer_id)

            }
        }
        return resolve(true);
    });
}


exports.getQuestions = async (api_key, network_id, offer_id) => {
    let apiBaseurl = "https://" + network_id + ".api.hasoffers.com/Apiv3/json?api_key=" + api_key + "&Target=Affiliate_Offer&Method=getApprovalQuestions&offer_id=";
    // "https://" + network_id + ".api.hasoffers.com/Apiv3/json?api_key=" + api_key + "&Target=Affiliate_Offer&Method=requestOfferAccess&offer_id="
    return new Promise(async (resolve, reject) => {
        try {
            let result = await plugin.makeRequest({
                method: 'post',
                url: apiBaseurl + offer_id,

            });
            if (result) {
                result = result.data;
                let response = result.response;
                let question = [];
                if (response.status == 1) {
                    if (response.data.length == 0) {
                        return resolve({ status: false, question: question });
                    }
                    else {
                        let queskeys = Object.keys(response.data);
                        for (let i = 0; i < queskeys.length; i++) {
                            ques = response.data[i];
                            question.push(ques.SignupQuestion['id']);
                        }
                        return resolve({ status: true, question: question });
                    }
                }
            }
            return resolve(false);

        }
        catch (e) {
            return resolve(false);

        }
    });
}


