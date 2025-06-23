const rp = require('request-promise');
const moment = require('moment');
const store = require('app-store-scraper');
const debug = require("debug")("darwin:Helpers:storedata");
var playStore = require('google-play-scraper');

exports.iosStoreData = async (app_id, country = "us") => {
    return store.app({ id: app_id, ratings: true, country: country })
        .then(function (result) {
            let appData = {};
            appData['app_id'] = app_id;
            appData['name'] = result.title;
            appData['description'] = result.description;
            appData['img'] = result.icon;
            appData['last_update'] = result.updated || result.released;
            appData['app_size'] = result.size;
            appData['installs'] = "";
            appData['version'] = result.version;
            appData['required_os'] = result.requiredOsVersion;
            appData['rating'] = result.score;
            appData['rating_count'] = result.ratings;
            appData['offered_by'] = result.developer;
            appData['device'] = "IOS";
            appData['category'] = result.primaryGenre;
            return (appData);
        })
        .catch(function (err) {
            return (err);
        });
}
exports.androidStoreData = async (app_id, country = "us") => {
    let data;
    try {
        data = await playStore.app({ appId: app_id, country: country });
    } catch (error) {
        try {
            data = await playStore.app({ appId: app_id });
        } catch (error) {
            return error;
        }
    }

    if (data) {
        let appData = {};
        appData['name'] = data.title ? data.title : '';
        appData['description'] = data.summary ? data.summary : '';
        appData['img'] = data.icon;
        appData['last_update'] = data.updated ? moment(data.updated).toDate() : '';
        // appData['app_size'] =;
        appData['installs'] = data.installs ? data.installs : '';
        appData['version'] = data.version ? data.version : '';
        appData['required_os'] = data.androidVersionText ? data.androidVersionText : '';
        appData['rating'] = data.scoreText ? data.scoreText : '';
        appData['rating_count'] = data.ratings ? data.ratings : '';
        appData['device'] = "Android";
        appData['category'] = data.genreId ? data.genreId : '';
        appData['app_id'] = app_id;
        return (appData);
    }
}


exports.isNumeric = (item) => {
    if (item.match(/^[0-9]*$/)) {
        return true;
    }
    return false;
};
