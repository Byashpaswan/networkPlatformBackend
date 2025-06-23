
const moment = require('moment');
const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;

const WorkerStatusModel = require('../../db/WorkerStatus');
const Response = require('../../helpers/Response');


exports.getAllWorkerStatus = async (req, res) => {

    try {

        let filter = {};
        if (req.user && req.user.userDetail && req.user.userDetail.network[0]) {
            filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0])
        }
        else {
            let response = Response.error();
            response.msg = "Bad Request";
            return res.status(400).json(response);
        }

        let projection = {};
        let options = { sort: { _id: -1 } }
        let data = await WorkerStatusModel.getAllData(filter, projection, options);
        // console.log("file: pushBulkOfferStatus.js ~ line 26 ~ exports.getAllWorkerStatus= ~ data", data)
        if (data && data.length > 0) {
            let response = Response.success();
            response.payload = { serverTime: moment().toDate(), data: data };
            response.msg = "success";
            return res.status(200).json(response);
        }
        else {
            let response = Response.error();
            response.msg = "No Data Available";
            return res.status(200).json(response);
        }
    } catch (error) {
        console.log("file: pushBulkOfferStatus.js ~ line 39 ~ exports.getAllWorkerStatus= ~ error", error)
        let response = Response.error();
        response.msg = "Server Internal Error!";
        return res.status(500).json(response);
    }
}