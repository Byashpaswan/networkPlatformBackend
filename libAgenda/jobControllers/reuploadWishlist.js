const agenda = require('../agenda');
const Mongoose = require('mongoose');
const SchedulerDataModel = require('../../db/schedulerData');
const Response = require('../../helpers/Response');
const mongooseObjectId = Mongoose.Types.ObjectId;


async function scheduleJob(schedulerData) {

    console.log("schedulerData = ", schedulerData);

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

    return {
        jobName: req.body.schedulerData.jobName,
        NetworkId: req.user.userDetail.network[0],
        userCategory: req.user.userDetail.category,
        userDetails: {
            UserId: req.user.userDetail.id,
            name: req.user.userDetail.name
        },
        scheduleTag: req.body.schedulerData.scheduleTag,
        scheduleDate: req.body.schedulerData.scheduleDate,
        scheduleTime: req.body.schedulerData.scheduleTime,
        scheduleDay: req.body.schedulerData.scheduleDay
    };
}

exports.scheduleReuploadWishlistJob = async (req, res) => {

    try {
        let schedulerData = formatSchedulerData(req);
        let agendaResult = await scheduleJob(schedulerData);

        if (agendaResult) {
            // console.log(" ============== your Job Scheduler is Started", agendaResult.attrs.data);
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
        console.log(err)
        let response = Response.error();
        response.msg = "Probably something went wrong, Try again!";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}