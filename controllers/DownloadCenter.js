const debug = require('debug')('darwin:controllers:DownloadCenter');
const Mongoose = require('mongoose');
const ObjectId = Mongoose.Types.ObjectId;
const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const fs = require('fs');
const path = require('path');
const DownloadCenterModel = require('../db/DownloadCenterModel');
const crypto = require('crypto');
const { sendJobToGenericWorker } = require('../helpers/Functions');

exports.getDownloadCenterData = async (req, res) => {
    try {
        let filter = {
            'networkId': ObjectId(req.user.userDetail.network[0]),
            "userDetails.category": req.user.userDetail.category
        };
        let projection = {
            downloadId: 1,
            userDetails: 1,
            report: 1,
            status: 1,
            query: 1,
            createdAt: 1,
            filePath: 1
        };
        let options = { sort: { _id: -1 } };

        let result = await DownloadCenterModel.findDocs(filter, projection, options);
        let response = Response.success();
        response.msg = 'Success';
        response.payloadType = payloadType.array;
        response.payload = result;
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(200).json(response);
    }
}

exports.deleteDownloadCenterData = async (req, res) => {
    try {
        let result = await DownloadCenterModel.deleteOneDoc({ _id: ObjectId(req.body.id) });
        if (result && result['deletedCount']) {
            let serverFilePath = path.join(__dirname, '../../public/uploads' + req.body.filepath);
            if (fs.existsSync(serverFilePath)) {
                fs.unlink(serverFilePath, (err) => {
                    if (err) {
                        debug(err);
                    }
                });
            }
            let response = Response.success();
            response.msg = 'Successfully deleted.';
            response.payloadType = payloadType.object;
            response.payload = { id: req.body.id };
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.error = ['unable to delete from database'];
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

exports.saveReport = async (req, res) => {
    try {
        let networkId = ObjectId(req.user.userDetail.network[0]);
        let report = 'Offer';
        let query = req.body;
        query['networkId'] = req.user.userDetail.network[0];
        let hash = encodeURIComponent(crypto.createHash('md5').update(JSON.stringify(query)).digest('hex'));
        let result = await DownloadCenterModel.findOneDoc({ hash: hash }, { downloadId: 1 }, {});
        if (result) {
            let response = Response.success();
            response.msg = 'File already exists. Please check download id (' + result['downloadId'] + ') in Download Center.';
            response.payloadType = payloadType.object;
            response.payload = result;
            return res.status(200).json(response);
        } else {
            let downloadCenterData = new DownloadCenterModel({
                networkId: networkId,
                userDetails: {
                    id: req.user.userDetail.id,
                    name: req.user.userDetail.name,
                    category: req.user.userDetail.category
                },
                query: JSON.stringify(query),
                hash: hash,
                status: 'processing',
                report: report
            });
            result = await downloadCenterData.save();
            if (result && result['downloadId']) {
                let publishResult = await sendJobToGenericWorker({ workerName: "downloadCenter", workerData: result['_id'] }, 15);
                if (publishResult) {
                    let response = Response.success();
                    response.msg = 'Request received by server. Please check download id (' + result['downloadId'] + ') in Download Center.';
                    response.payloadType = payloadType.object;
                    response.payload = result;
                    return res.status(200).json(response);
                } else {
                    DownloadCenterModel.deleteOneDoc({ _id: ObjectId(result['_id']) });
                    let response = Response.error();
                    response.error = ['unable to publish job to the queue'];
                    response.msg = 'Something went wrong. Please try again later.';
                    return res.status(200).json(response);
                }
            } else {
                let response = Response.error();
                response.error = ['unable to save the database'];
                response.msg = 'Something went wrong. Please try again later.';
                return res.status(200).json(response);
            }
        }
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(200).json(response);
    }
}