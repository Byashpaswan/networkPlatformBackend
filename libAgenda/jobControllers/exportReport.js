const agenda = require('../agenda');
const Mongoose = require('mongoose');
const SchedulerDataModel = require('../../db/schedulerData');
const Response = require('../../helpers/Response');
const mongooseObjectId = Mongoose.Types.ObjectId;

function getMetaDataByReportName(req) {

    // console.log("getMetaDataByReportName = ", req.body);

    let metaData = {};
    let reportName = req.body.reportName;

    if (reportName == "Report_Source") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType
        }
    }
    if (reportName == "Report_SourceAdvertiser") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType,
            loginId: req.loginId,
            parentId: req.parentId
        }
    }
    if (reportName == "Report_Publisher") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType,
            accountid: req.accountid
        }
    }
    if (reportName == "Report_SourcePublisher") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType,
            accountid: req.accountid
        }
    }
    if (reportName == "Report_AdvertiserPublisher") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType,
            loginId: req.loginId,
            accountid: req.accountid,
            parentId: req.parentId
        }
    }
    if (reportName == "Report_Offers") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType,
            loginId: req.loginId,
            accountid: req.accountid,
            parentId: req.parentId
        }
    }
    if (reportName == "Report_Advertiser") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType,
            loginId: req.loginId,
            parentId: req.parentId
        }
    }
    if (reportName == "Report_Daily") {
        metaData = {
            user_category: req.user_category,
            loginType: req.loginType
        }
    }

    return metaData;
}

async function scheduleJob(schedulerData) {

    // console.log("schedulerData = ", schedulerData);

    let cronTime = "";
    let agendaResult = "";
    let scheduleTag = schedulerData.scheduleTag;
    let jobName = schedulerData.jobName;
    let hours = schedulerData.scheduleTime.split(":")[0];
    let minutes = schedulerData.scheduleTime.split(":")[1];
    const tempJob = agenda.create(schedulerData.jobName, schedulerData);

    if (scheduleTag == "Everyday") {
        cronTime = `${minutes} ${hours} * * *`;
        await agenda.start();
        agendaResult = await tempJob.repeatEvery(cronTime).save();
    }
    else if (scheduleTag == "Every Week") {
        let day = schedulerData.scheduleDay;
        cronTime = `${minutes} ${hours} * * ${day}`;
        await agenda.start();
        agendaResult = await tempJob.repeatEvery(cronTime).save();
    }
    else if (scheduleTag == "Every Month") {
        let date = schedulerData.scheduleDate;
        cronTime = `${minutes} ${hours} ${date} * *`;
        await agenda.start();
        agendaResult = await tempJob.repeatEvery(cronTime).save();
    }
    else if (scheduleTag == "Only Once") {
        let date = schedulerData.scheduleDate.day;
        let month = schedulerData.scheduleDate.month;
        cronTime = `${minutes} ${hours} ${date} ${month} *`;
        await agenda.start();
        agendaResult = await tempJob.schedule(cronTime).save();
    }

    return agendaResult;
}

function formatSchedulerData(req) {

    let metaData = getMetaDataByReportName(req);
    let filterData = {
        body: req.body.filterData,
        params: req.params,
        query: req.query
    };
    return {
        jobName: req.body.schedulerData.jobName,
        NetworkId: req.user.userDetail.network[0],
        userCategory: req.user.userDetail.category,
        userDetails: {
            UserId: req.user.userDetail.id,
            name: req.user.userDetail.name
        },
        filter: filterData,
        metaData: metaData,
        reportName: req.body.reportName,
        filterTag: req.body.filterTag,
        scheduleTag: req.body.schedulerData.scheduleTag,
        scheduleDate: req.body.schedulerData.scheduleDate,
        scheduleTime: req.body.schedulerData.scheduleTime,
        scheduleDay: req.body.schedulerData.scheduleDay
    };
}

async function saveSchedulerData(schedulerData) {
    await SchedulerDataModel.saveJob(schedulerData).then(result => {
        if (result) {
            return true;
        }
        else {
            return false;
        }
    });
}

exports.scheduleExportReport = async (req, res) => {

    try {
        let schedulerData = formatSchedulerData(req);
        let agendaResult = await scheduleJob(schedulerData);

        if (agendaResult) {
            // console.log(" ============== your Job Scheduler is Started");
            let response = Response.success();
            response.payload = [agendaResult.attrs.nextRunAt];
            response.msg = "your Job is schedule to run on given time";
            return res.status(200).json(response);
        }
        else {
            let response = Response.error();
            response.msg = "Job not scheduled, Agenda error";
            return res.status(200).json(response);
        }
    }
    catch (err) {
        let response = Response.error();
        response.msg = "Probably something went wrong, Try again!";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.getAllSchedulerJob = async (req, res) => {

    try {

        let networkId = req.user.userDetail.network[0];
        let search = { "data.NetworkId": networkId.toString() }
        let projection = { "_id": 1, "name": 1, "type": 1, "data.filter": 1, "nextRunAt": 1, "repeatInterval": 1, "repeatTimezone": 1, "lastRunAt": 1 }
        let options = { "nextRunAt": 1 }

        let resultSet = await Mongoose.connection.db.collection('agendaJobs').find(search).sort(options).toArray();

        // console.log("resultSet", resultSet);

        if (resultSet && resultSet.length > 0) {
            let response = Response.success();
            response.payloadType = [];
            response.payload = resultSet;
            response.msg = "success";
            return res.status(200).json(response);
        }
        else {
            let response = Response.error();
            response.payloadType = [];
            response.payload = resultSet;
            response.msg = "No scheduler job found";
            return res.status(200).json(response);
        }
    } catch (error) {
        let response = Response.error();
        response.payloadType = [];
        response.payload = [];
        response.msg = "Something went wrong, Internal error";
        return res.status(400).json(response);
    }
}

exports.cancelScheduleJob = async (req, res) => {

    try {
        let jobId = req.body.jobId;
        let resultSet = await agenda.cancel({_id:mongooseObjectId(jobId)});

        if (resultSet > 0) {
            let response = Response.success();
            response.payloadType = [];
            response.payload = [jobId];
            response.msg = "Job deleted succesfully!!";
            return res.status(200).json(response);
        }
        else {
            let response = Response.error();
            response.payloadType = [];
            response.payload = [];
            response.msg = "Something went wrong, Internal error";
            return res.status(400).json(response);
        }
    } catch (error) {
        let response = Response.error();
        response.payloadType = [];
        response.payload = [];
        response.msg = "Something went wrong, Internal error";
        return res.status(400).json(response);
    }
}
