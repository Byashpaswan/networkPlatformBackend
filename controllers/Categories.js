const debug = require('debug')('darwin:controllers:Categories');
const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const categoriesModel = require('../db/Categories');
const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const { config } = require('../constants/Global');

exports.getCategories = async (req, res) => {
    try {
        let projection = { _id: 1, name: 1, type: 1, status: 1, description: 1 };
        let result = await categoriesModel.getCategories({}, projection, {});
        if (result && result.length) {
            let response = Response.success();
            response.msg = 'Success';
            response.payloadType = payloadType.array;
            response.payload = result;
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.error = ['no record found'];
            response.msg = 'No record found.';
            return res.status(200).json(response);
        }
    } catch (error) {
        let response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(200).json(response);
    }
}

exports.addCategory = async (req, res) => {
    try {
        let name = '';
        let type = '';
        let status = 0;
        let description = '';

        if (req.body.name && req.body.name.trim()) {
            name = req.body.name.trim().toLowerCase();
        } else {
            let response = Response.error();
            response.error = ['name is required'];
            response.msg = 'Category name is required.';
            return res.status(200).json(response);
        }

        if (req.body.type && req.body.type.trim()) {
            type = req.body.type.trim().toLowerCase();
            if (!config.OFFER_CATEGORY_TYPE.includes(type)) {
                let response = Response.error();
                response.error = ['invalid type'];
                response.msg = 'Invalid category type.';
                return res.status(200).json(response);
            }
        } else {
            let response = Response.error();
            response.error = ['type is required'];
            response.msg = 'Category type is required.';
            return res.status(200).json(response);
        }

        if (req.body.status || req.body.status == 0) {
            status = parseInt(req.body.status);
            if (!(status == 0 || status == 1)) {
                let response = Response.error();
                response.error = ['invalid status'];
                response.msg = 'Invalid category status.';
                return res.status(200).json(response);
            }
        } else {
            let response = Response.error();
            response.error = ['status is required'];
            response.msg = 'Category status is required.';
            return res.status(200).json(response);
        }

        if (req.body.description && req.body.description.trim()) {
            description = req.body.description.trim();
        }

        let result = await categoriesModel.getCategory({ name: name, type: type }, { _id: 1 }, {});
        if (result && result['_id']) {
            let response = Response.error();
            response.error = ['category already exists'];
            response.msg = 'Category already exists.';
            return res.status(200).json(response);
        }

        let category = new categoriesModel({
            name: name,
            type: type,
            status: status,
            description: description
        });

        result = await category.save();

        if (result && result['_id']) {
            let response = Response.success();
            response.msg = 'Category added successfully.';
            response.payloadType = payloadType.object;
            response.payload = result;
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.error = ['insert failed'];
            response.msg = 'Something went wrong. Please try again later.';
            return res.status(200).json(response);
        }
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(200).json(response);
    }
}

exports.updateCategory = async (req, res) => {
    try {
        let id = req.params.id;
        let name = '';
        let type = '';
        let status = 0;
        let description = '';

        if (req.body.name && req.body.name.trim()) {
            name = req.body.name.trim().toLowerCase();
        } else {
            let response = Response.error();
            response.error = ['name is required'];
            response.msg = 'Category name is required.';
            return res.status(200).json(response);
        }

        if (req.body.type && req.body.type.trim()) {
            type = req.body.type.trim().toLowerCase();
            if (!config.OFFER_CATEGORY_TYPE.includes(type)) {
                let response = Response.error();
                response.error = ['invalid type'];
                response.msg = 'Invalid category type.';
                return res.status(200).json(response);
            }
        } else {
            let response = Response.error();
            response.error = ['type is required'];
            response.msg = 'Category type is required.';
            return res.status(200).json(response);
        }

        if (req.body.status || req.body.status == 0) {
            status = parseInt(req.body.status);
            if (!(status == 0 || status == 1)) {
                let response = Response.error();
                response.error = ['invalid status'];
                response.msg = 'Invalid category status.';
                return res.status(200).json(response);
            }
        } else {
            let response = Response.error();
            response.error = ['status is required'];
            response.msg = 'Category status is required.';
            return res.status(200).json(response);
        }

        if (req.body.description && req.body.description.trim()) {
            description = req.body.description.trim();
        }

        let result = await categoriesModel.getCategory({ name: name, type: type }, { _id: 1 }, {});
        if (result && result['_id'] && id.toString() != result['_id'].toString()) {
            let response = Response.error();
            response.error = ['category already exists'];
            response.msg = 'Category already exists.';
            return res.status(200).json(response);
        }

        let filter = { _id: mongooseObjectId(id) };

        let update = {
            $set: {
                name: name,
                type: type,
                status: status,
                description: description
            }
        };

        let options = { new: true };

        result = await categoriesModel.findAndUpdateCategory(filter, update, options);

        if (result && result['_id']) {
            let response = Response.success();
            response.msg = 'Category updated successfully.';
            response.payloadType = payloadType.object;
            response.payload = result;
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.error = ['update failed'];
            response.msg = 'Something went wrong. Please try again later.';
            return res.status(200).json(response);
        }
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(200).json(response);
    }
}