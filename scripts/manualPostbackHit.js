require("dotenv").config({ path: ".env" });
require('../db/connection')
const networkModel = require('../db/network/Network');
const axios = require('axios').default;

async function getNetworkTrackerDomain() {

    let trackerDomain = {};
    try {
        let networks = await networkModel.findAllNetwork({}, { network_unique_id: 1, _id: 1, 'domain.tracker': 1 })
        for (let obj of networks) {
            if (obj.domain && obj.domain.tracker) trackerDomain[obj.network_unique_id] = obj.domain.tracker;
            else if (obj.network_unique_id == 'crossway') trackerDomain[obj.network_unique_id] = "track.crossway.rocks";
            else if (obj.network_unique_id == 'adsdolfin') trackerDomain[obj.network_unique_id] = "t.adsdolf.in";
            else trackerDomain[obj.network_unique_id] = `${obj.network_unique_id}.g2prof.net`;
        }
    } catch (error) {
        console.log(error)
    }
    return trackerDomain
}

async function hitPostBackManuel(domains, postBackObj) {
    for (const key in postBackObj) {
        const clickList = postBackObj[key];
        for (const clickId of clickList) {
            let postBackUrl = `http://${domains[key]}/pb/?click_id=${clickId}`;
            console.log("hitPostBackManuel ~ postBackUrl ~ ", postBackUrl)
            const result = await axios.get(postBackUrl);
            console.log("hitPostBackManuel ~ status ~ ", result)
        }
    }
}

async function hitPostBackUrl(postBackUrlList) {
    for (const postBackUrl of postBackUrlList) {
        console.log("hitPostBackManuel ~ postBackUrl ~ ", postBackUrl)
        const result = await axios.get(postBackUrl);
        console.log("hitPostBackManuel ~ status ~ ", result)
    }
}


(async () => {
    if (process.argv[2]) {
        let argValue = JSON.parse(process.argv[2]);
        if (Array.isArray(argValue)) {
            await hitPostBackUrl(argValue);
        } else if (typeof (argValue) == 'object') {
            if (Object.keys(argValue).length) {
                let domains = await getNetworkTrackerDomain();
                let postBackObj = JSON.parse(process.argv[2]);
                await hitPostBackManuel(domains, postBackObj);
            } else {
                console.log(`send proper data in Object format ex: '{"cost2action":[click_ids]}'`)
            }
        } else {
            console.log('send data into array of url with string quote!')
        }
    }
    process.exit();
})();