const { payloadType } = require('../../../constants/config');
const Response = require('../../../helpers/Response');
const { ClickFailedModel } = require('../../../db/click/clickfails')
var moment = require('moment');

exports.getclickfails = async function (req, res) {

    try {
        let filter = { 'network_id': req.user.userDetail.network[0] };
        let options = { 'limit': 50, 'sort': { 'createdAt': -1 } }
        let projection = {}

        if (req.query.start_date && req.query.end_date) {
            if (moment(req.query.start_date.trim()).isValid() && moment(req.query.end_date.trim()).isValid()) {
                filter['createdAt'] = { $gte: moment(req.query.start_date.trim()), $lte: moment(req.query.end_date.trim()).endOf('day') };
            }
            else {
                let response = Response.error();
                response.msg = "Invalid date";
                return res.status(200).json(response);
            }
        }

        if (req.query.limit) {
            options['limit'] = +req.query.limit;
        }

        if (req.query.status) {
            if (req.query.status == 118) {
                filter['status'] = { $in: [0, 118] }
            } else {
                filter['status'] = +req.query.status;
            }
        }

        if (req.query.page) {
            if (req.query.limit) {
                options['skip'] = +req.query.limit * (+req.query.page - 1);
            }
            else {
                options['skip'] = 50 * (+req.query.page - 1);
            }
        }

        let output = { result: [], totalfailsCount: null }
        let totalfailsCount = await ClickFailedModel.getAllCount(filter);
        if (totalfailsCount) {
            output['totalfailsCount'] = totalfailsCount
            let result = await ClickFailedModel.findAllFails(filter, projection, options);
            if (result && result.length) {
                let response = Response.success();
                output['result'] = result;
                response.payload = output;
                return res.status(200).send(response)
            }
            else {
                let response = Response.error();
                response.msg = "Click fails not found!";
                return res.status(200).send(response)
            }
        }
        else {
            let response = Response.error();
            response.msg = "Click fails not found!";
            return res.status(200).send(response)
        }
    } catch (error) {
        console.log("Click Failds =====> ", error)
    }
}