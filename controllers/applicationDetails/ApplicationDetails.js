const Mongoose = require('mongoose');
const AppDetailsModel = require('../../db/applicationDetails/ApplicationDetails');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');

exports.saveApplicationDetails = (req, res) => {
    let filter = {
        app_id: req.body.app_id
    };
    let projection = {
        app_id: 1
    };
    let options = {};
    AppDetailsModel.getApplicationDetails(filter, projection, options)
        .then(async result => {
            if (result && result.length) {
                let response = Response.error();
                response.msg = "app_id is already exists!";
                return res.status(200).json(response);
            } else {
                let data = {
                    'app_id': req.body.app_id,
                    'name': req.body.name,
                    'description': req.body.description,
                    'img': req.body.img,
                    'last_update': req.body.last_update,
                    'app_size': req.body.app_size,
                    'installs': req.body.installs,
                    'version': req.body.version,
                    'required_os': req.body.required_os,
                    'rating': req.body.rating,
                    'rating_count': req.body.rating_count,
                    'offered_by': req.body.offered_by,
                    'device': req.body.device,
                    'category': req.body.category,
                }
                AppDetailsModel.saveApplicationDetails(data)
                    .then(async result => {
                        let response = Response.success();
                        response.payloadType = payloadType.object;
                        response.payload = result;
                        response.msg = "Application details saved successfully!";
                        return res.status(200).json(response);
                    })
                    .catch(err => {
                        let response = Response.error();
                        response.msg = "Probably something went wrong, Try again!";
                        response.error = [err.message];
                        return res.status(200).json(response);
                    });
            }
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}

exports.getApplicationDetails = (req, res) => {
    let filter = {};
    if (req.body.filter) {
        if (req.body.filter.app_id && req.body.filter.app_id != "") {
            filter['app_id'] = req.body.filter.app_id;
        }
        if (req.body.filter.device && req.body.filter.device != "") {
            filter['device'] = req.body.filter.device;
        }
        if (req.body.filter.category && req.body.filter.category != "") {
            filter['category'] = req.body.filter.category;
        }
    }
    let projection = {
        _id: 1,
        app_id: 1,
        name: 1,
        description: 1,
        img: 1,
        last_update: 1,
        app_size: 1,
        installs: 1,
        version: 1,
        required_os: 1,
        rating: 1,
        rating_count: 1,
        offered_by: 1,
        device: 1,
        category: 1,
        is_published: 1,
        createdAt: 1,
        updatedAt: 1
    };
    let options = {};
    if (req.body.options) {
        if (req.body.options.limit && req.body.options.limit != 0) {
            options['limit'] = req.body.options.limit;
        }
        if (req.body.options.page && req.body.options.page != 0) {
            options['skip'] = (req.body.options.page - 1) * (req.body.options.limit);
        }
    }
    AppDetailsModel.getApplicationDetails(filter, projection, options)
        .then(async result => {
            if (result.length == 0) {
                let response = Response.error();
                response.msg = "No record found!";
                return res.status(200).json(response);
            }
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = {};
            AppDetailsModel.getTotalPagesCount(filter).then(count => {
                response.payload['totalApplications'] = count;
                response.payload['result'] = result;
                response.payload['pageSize'] = req.body.options.limit;
                response.payload['page'] = req.body.options.page;
                response.msg = "success";
                return res.status(200).json(response);
            }).catch(err => {
                response.payload['result'] = result;
                response.payload['pageSize'] = req.body.options.limit;
                response.payload['page'] = req.body.options.page;
                response.msg = "success";
                return res.status(200).json(response);
            });
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}

exports.getApplicationCategories = (req, res) => {
    let filter = { category: { $nin: ["", null] } };
    let distinctBy = "category";
    AppDetailsModel.getApplicationDistinctField(filter, distinctBy)
        .then(async result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success!";
            return res.status(200).json(response);
        })
        .catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}