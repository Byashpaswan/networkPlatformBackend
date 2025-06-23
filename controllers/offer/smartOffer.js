const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../helpers/Response');
const SmartOfferModel = require('../../db/offer/smartOffer');
const { config } = require('../../constants/Global');
const moment = require('moment');
const offerVisibility = Object.values(config.OFFER_VISIBILITY).map(obj => obj.label)

exports.saveSmartOffer = async (req, res) => {

    try {
        if (!req.body.name.trim()) {
            let response = Response.error();
            response.msg = "Smart Offer Name is invalid!!";
            return res.status(400).json(response);
        }

        if (!(req.body.chOffer && Array.isArray(req.body.chOffer) && req.body.chOffer.length)) {
            let response = Response.error();
            response.msg = "Child Offer Required and must be an array of object!";
            return res.status(400).json(response);
        }

        let data = { network_id: mongooseObjectId(req.user.userDetail.network[0]), name: req.body.name };
        let childOffer = [];
        for (const tempOff of req.body.chOffer) {
            let tempChOffer = {};
            tempChOffer['priority'] = tempOff['priority'];
            tempChOffer['offId'] = tempOff['offId'];
            tempChOffer['name'] = tempOff['offName'];
            if (tempOff['stTime'].trim()) tempChOffer['stTime'] = +moment(`2023-01-01T${tempOff['stTime']}:00`).utc().format("HHmm");
            if (tempOff['endTime'].trim()) tempChOffer['endTime'] = +moment(`2023-01-01T${tempOff['endTime']}:00`).utc().format("HHmm");
            childOffer.push(tempChOffer)
        }
        data['chOffer'] = childOffer;

        let dbResult = await SmartOfferModel.createSmartOffer(data)
        if (dbResult && dbResult._id) {
            let response = Response.success();
            response.msg = "Successfully created!";
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.msg = "Server Internal Error!";
            return res.status(500).json(response);
        }
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!, Try after some time."
        return res.status(500).json(response);
    }
}

exports.getSmartOffer = async (req, res) => {

    try {
        if (req.params.id == undefined || !req.params.id || !mongooseObjectId.isValid(req.params.id)) {
            let response = Response.error();
            response.msg = "Smart offer id is invalid!";
            return res.status(400).json(response);
        }
        let filter = { "_id": mongooseObjectId(req.params.id) };
        let dbResult = await SmartOfferModel.getSmartOffer(filter);
        let response = Response.success();
        response.msg = "Success";
        response.payload = dbResult
        res.status(200).json(response);
    } catch (error) {
        console.log(`Smart offer => get smart offer => ${error}`);
        let response = Response.error();
        response.msg = "Server internal error!, Try after some time."
        return res.status(500).json(response);
    }
}

exports.getAllSmartOffer = async (req, res) => {

    try {
        let filter = { "network_id": mongooseObjectId(req.user.userDetail.network[0]) };
        let dbResult = await SmartOfferModel.getAllSmartOffer(filter);
        let response = Response.success();
        response.msg = dbResult.length ? "Success" : "No record found!";
        response.payloadType = [];
        response.payload = dbResult
        res.status(200).json(response);
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!, Try after some time."
        return res.status(500).json(response);
    }
}

exports.deleteSmartOffer = async (req, res) => {

    try {
        if (req.params.id == undefined || !req.params.id || !mongooseObjectId.isValid(req.params.id)) {
            let response = Response.error();
            response.msg = "Smart offer id is invalid!";
            return res.status(400).json(response);
        }
        let filter = { "_id": mongooseObjectId(req.params.id) };
        await SmartOfferModel.deleteSmartOffer(filter);
        let response = Response.success();
        response.msg = "Successfully Deleted";
        res.status(200).json(response);
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!, Try after some time."
        return res.status(500).json(response);
    }
}

exports.getSmartOffer = async (req, res) => {

    try {
        if (req.params.id == undefined || !req.params.id || !mongooseObjectId.isValid(req.params.id)) {
            let response = Response.error();
            response.msg = "Smart offer id is invalid!";
            return res.status(400).json(response);
        }
        let filter = { "_id": mongooseObjectId(req.params.id) };
        let projection = { network_id: 0, createdAt: 0, updatedAt: 0 }
        let dbResult = await SmartOfferModel.getSmartOffer(filter, projection);
        let response = Response.success();
        response.msg = "Success";
        response.payload = dbResult
        res.status(200).json(response);
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!, Try after some time."
        return res.status(500).json(response);
    }
}

exports.updateSmartOffer = async (req, res) => {

    try {

        if (req.params.id == undefined || !req.params.id || !mongooseObjectId.isValid(req.params.id)) {
            let response = Response.error();
            response.msg = "Smart offer id is invalid!";
            return res.status(400).json(response);
        }
        if (!req.body.name || !req.body.name.trim()) {
            let response = Response.error();
            response.msg = "Smart offer name is required";
            return res.status(400).json(response);
        }
        if (!req.body.chOffer.length) {
            let response = Response.error();
            response.msg = "Send at least one child offer";
            return res.status(400).json(response);
        }

        let reqFormatValid = true;
        let chOffer = req.body.chOffer.reduce((arr, curr) => {
            if (!curr.offId) {
                reqFormatValid = false;
            } else {
                let temp = {};
                if (curr.offId) temp['offId'] = curr.offId;
                if (curr.offName) temp['name'] = curr.offName;
                if (curr.priority) temp['priority'] = curr.priority;
                if (curr.stTime.trim()) temp['stTime'] = +moment(`2023-01-01T${curr.stTime}:00`).utc().format("HHmm");
                if (curr.endTime.trim()) temp['endTime'] = +moment(`2023-01-01T${curr.endTime}:00`).utc().format("HHmm");
                arr.push(temp);
            }
            return arr
        }, [])

        let filter = { "_id": mongooseObjectId(req.params.id) }
        let data = {
            name: req.body.name.trim(),
            chOffer: chOffer
        }
        if (req.body.offer_visible) {
            if (offerVisibility.includes(req.body.offer_visible)) {
                data['offer_visible'] = req.body.offer_visible;
            } else { reqFormatValid = false }
        }
        if (req.body.description) {
            data['description'] = req.body.description;
        }
        if (req.body.kpi) {
            data['kpi'] = req.body.kpi;
        }
        if (req.body.currency) {
            if (config.currency.includes(req.body.currency)) {
                data['currency'] = req.body.currency;
            } else { reqFormatValid = false }
        }
        if (req.body.category && req.body.category.length) {
            data['category'] = req.body.category.map(obj => obj.value);
        }
        if (req.body.revenue) {
            data['revenue'] = req.body.revenue;
        }
        if (req.body.payout) {
            data['payout'] = req.body.payout;
        }
        if (req.body.geo_targeting) {
            let tempGeoTargeting = {}
            if (req.body.geo_targeting.country_allow && req.body.geo_targeting.country_allow.length) {
                tempGeoTargeting['country_allow'] = req.body.geo_targeting.country_allow;
            }
            if (req.body.geo_targeting.country_deny && req.body.geo_targeting.country_deny.length) {
                tempGeoTargeting['country_deny'] = req.body.geo_targeting.country_deny;
            }
            if (req.body.geo_targeting.city_allow && req.body.geo_targeting.city_allow.length) {
                tempGeoTargeting['city_allow'] = req.body.geo_targeting.city_allow;
            }
            if (req.body.geo_targeting.city_deny && req.body.geo_targeting.city_deny.length) {
                tempGeoTargeting['city_deny'] = req.body.geo_targeting.city_deny;
            }
            if (Object.keys(tempGeoTargeting).length) {
                data['geo_targeting'] = tempGeoTargeting;
            }
        }
        if (req.body.device_targeting) {
            let tempDeviceTargeting = {}
            if (req.body.device_targeting.device) {
                tempDeviceTargeting['device'] = req.body.device_targeting.device;
            }
            if (req.body.device_targeting.os) {
                tempDeviceTargeting['os'] = req.body.device_targeting.os;
            }
            if (req.body.device_targeting.os_version && req.body.device_targeting.os_version.length) {
                let tempOsVersion = [];
                for (const tempObj of req.body.device_targeting.os_version) {
                    if (tempObj.os && tempObj.version && tempObj.version_condition) {
                        tempOsVersion.push({ "os": tempObj.os, "version": tempObj.version, "version_condition": tempObj.version_condition })
                    }
                }
                if (tempOsVersion.length) {
                    tempDeviceTargeting['os_version'] = tempOsVersion;
                }
            }
            if (Object.keys(tempDeviceTargeting).length) {
                data['device_targeting'] = tempDeviceTargeting;
            }
        }
        if (!reqFormatValid) {
            let response = Response.error();
            response.msg = "Send Data not in format!";
            return res.status(400).json(response);
        }

        await SmartOfferModel.updateSmartOffer(filter, data);
        let response = Response.success();
        response.msg = "Updated Successfully!";
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!, Try after some time."
        return res.status(500).json(response);
    }
}