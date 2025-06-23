const { apiPlugins } = require("../plugin");
const Promise = require('promise');
const Functions = require("../helpers/Functions");



exports.checkValidApi = async (name, apiCredentials, sampleTracking, typeSuperAdminCheck) => {

    return new Promise(async (resolve, reject) => {

        let ackMsg = { success: false, msg: "" };

        try {
            if (!name) {
                ackMsg['msg'] = 'Platform Name can\'t be blank';
                return resolve(ackMsg);
            }

            if (!apiCredentials) {
                ackMsg['msg'] = 'Api Credentials can\'t be blank';
                return resolve(ackMsg);
            }

            let credentials = Functions.trimArray(JSON.parse(apiCredentials));
            let validCredentials = {};
            credentials.map(obj => {
                validCredentials[obj.key] = obj.val;
            });

            if (!apiPlugins[name.trim()]) {
                ackMsg['msg'] = 'Api Not Ready!! Try Later';
                return resolve(ackMsg);
            }

            let result;
            try {
                let page = 1
                if (name.trim() == 'Offer18' || name.trim() == 'Vene') {
                    page = 0
                }
                result = await apiPlugins[name.trim()].apiCall(validCredentials, page, 100);
            } catch (apiCallError) {
                ackMsg['msg'] = 'Check Netwok Domain or Api url not working, error';
                return resolve(ackMsg);
            }

            if (result && result.data) {
                let valid = apiPlugins[name.trim()].checkValid(result.data);
                if (valid === true) {
                    let offerResponse = apiPlugins[name.trim()].fetchResponse(result.data);
                    let offerData = apiPlugins[name.trim()].traverseOffer(offerResponse, validCredentials);
                    if (offerData && typeSuperAdminCheck == false) {
                        let sampleDomain = Functions.parseUrl(sampleTracking)
                        let sampleTrackingLinkPid = apiPlugins[name.trim()].getPid(sampleTracking);
                        for (let i in offerData) {
                            let tracking_link_pid = apiPlugins[name.trim()].getPid(offerData[i].tracking_link);
                            let Domain = Functions.parseUrl(offerData[i].tracking_link)
                            if(tracking_link_pid == sampleTrackingLinkPid){
                                ackMsg['success'] = true;
                                ackMsg['msg'] = 'valid api details now you can submit data';
                                return resolve(ackMsg);
                            }
                            if(!sampleTrackingLinkPid){
                                if (Domain && sampleDomain && (Domain === sampleDomain)) { 
                                    ackMsg['success'] = true;
                                    ackMsg['msg'] = 'valid api details now you can submit data';
                                    return resolve(ackMsg); 
                                }
                            }
                        }
                        // ackMsg['success'] = true;
                        ackMsg['msg'] = "Sample tracking links doesn't match";
                        return resolve(ackMsg);
                    }
                    else if (typeSuperAdminCheck == true) {
                        ackMsg['success'] = true;
                        ackMsg['msg'] = 'valid api details now you can submit data';
                        return resolve(ackMsg);
                    }
                    else {
                        ackMsg['msg'] = 'Active offer not found, approve at least one offer';
                        return resolve(ackMsg);
                    }
                }
                else {
                    ackMsg['msg'] = 'Invalid Credentials or offer not found';
                    return resolve(ackMsg);
                }
            }
            else {
                ackMsg['msg'] = 'Check Netwok Domain or Api url not working';
                return resolve(ackMsg);
            }
        } catch (error) {
            console.log(error);
            ackMsg['msg'] = 'Internal Server Error';
            return resolve(ackMsg);
        }

        // try {
        //     if (name && apiCredentials) {
        //         let credentials = Functions.trimArray(JSON.parse(apiCredentials));
        //         // debug(credentials);
        //         let validCredentials = {};
        //         credentials.map(obj => {
        //             validCredentials[obj.key] = obj.val;
        //         });
        //         // console.log(validCredentials)

        //         if (apiPlugins[name.trim()] ) {
        //             let result = await apiPlugins[name.trim()].apiCall(validCredentials, 1, 100);
        //             if (result) {
        //                 let valid = apiPlugins[name.trim()].checkValid(result.data);
        //                 if (valid === true) {
        //                    let offerResponse = apiPlugins[name.trim()].fetchResponse(result.data);
        //                    let offerData = apiPlugins[name.trim()].traverseOffer(offerResponse,validCredentials);
        //                     if(offerData){
        //                         let sampleDomain = Functions.parseUrl(sampleTracking)
        //                         for(let i in offerData){
        //                             let Domain =  Functions.parseUrl(offerData[i].tracking_link)
        //                             if(Domain && sampleDomain && (Domain===sampleDomain)){
        //                                 ackMsg['success'] = true;
        //                                 ackMsg['msg'] = 'valid api details now you can submit data';
        //                                 return resolve(ackMsg);
        //                             }else{}
        //                         }
        //                         // ackMsg['success'] = true;
        //                         ackMsg['msg'] = "Valid api credentials but sample tracking links doesn't match";
        //                         return resolve(ackMsg);
        //                     }else{
        //                         // ackMsg['success'] = true;
        //                         ackMsg['msg'] = 'valid api credentials but offer not found, approve at least one offer';
        //                         return resolve(ackMsg);
        //                     }
        //                 }
        //                 else {
        //                     ackMsg['msg'] = 'Invalid Credentials';
        //                     return resolve(ackMsg);
        //                 }
        //             }
        //         }
        //         else {
        //             ackMsg['msg'] = 'Api Not Ready!! Try Later';
        //             // console.log(ackMsg)
        //             return resolve(ackMsg);

        //         }
        //     }
        //     else {
        //         //return false;
        //         ackMsg['msg'] = 'Invalid Credentials or Invalid Data';
        //         return resolve(ackMsg);
        //     }
        // }
        // catch(e){
        //     // debug(e, '===========');
        //     ackMsg['msg'] = 'Invalid Credentials or Server Error';
        //     return resolve(ackMsg);

        // }
    });

}