const crypto = require("crypto");
const DownloadCenterModel = require('../../db/downloadCenter');
const rabbitMq = require('../../helpers/rabbitMQ');
const publish_queue = "download_center_reports_queue";
const moment = require('moment');

function updateFilterDataBody(filterData, filterTag) {

    if (filterTag == 1) { //today
        filterStartDate = moment().startOf('day').toDate();
        filterEndDate = moment().toDate();

    } else if (filterTag == 2) { //yesterday
        filterStartDate = moment().subtract(1, 'days').startOf('day').toDate();
        filterEndDate = moment().subtract(1, 'days').endOf('day').toDate();

    } else if (filterTag == 3) { //last 2 days
        filterStartDate = moment().subtract(2, 'days').startOf('day').toDate();
        filterEndDate = moment().subtract(1, 'days').endOf('day').toDate();

    } else if (filterTag == 4) { //last 3 days
        filterStartDate = moment().subtract(3, 'days').startOf('day').toDate();
        filterEndDate = moment().subtract(1, 'days').endOf('day').toDate();

    } else if (filterTag == 5) { //last 1 days including today
        filterStartDate = moment().subtract(1, 'days').startOf('day').toDate();
        filterEndDate = moment().toDate();

    }
    else if (filterTag == 6) { //last 2 days including today
        filterStartDate = moment().subtract(2, 'days').startOf('day').toDate();
        filterEndDate = moment().toDate();

    } else if (filterTag == 7) { //last 3 days including today
        filterStartDate = moment().subtract(3, 'days').startOf('day').toDate();
        filterEndDate = moment().toDate();

    } else if (filterTag == 8) { //this week
        filterStartDate = moment().startOf('week').toDate();
        filterEndDate = moment().toDate();

    } else if (filterTag == 9) { //last week
        filterStartDate = moment().startOf('week').subtract(7, 'days').toDate();
        filterEndDate = moment().endOf('week').subtract(7, 'days').toDate();

    } else if (filterTag == 10) { //this month
        filterStartDate = moment().startOf('month').toDate();
        filterEndDate = moment().toDate();

    } else if (filterTag == 11) { //last month
        filterStartDate = moment().startOf('month').subtract(1, 'month').toDate();
        filterEndDate = moment().startOf('month').subtract(1, 'month').endOf('month').toDate();
    }

    filterData.body.search['start_date'] = filterStartDate;
    filterData.body.search['end_date'] = filterEndDate;
    return filterData;
}

module.exports = (agenda) => {

    agenda.define('exportReport', (job, done) => {

        // console.log("Report Export Sceduler Start Excuting");
        // console.log("job.attrs.data ", job.attrs.data);

        let jobData = job.attrs.data;

        try {
            let filterData = updateFilterDataBody(jobData.filter, jobData.filterTag);
            filterData['network_id'] = jobData.NetworkId;
            filterData['User_Category'] = jobData.userCategory;

            let hashOfQuery = encodeURIComponent(crypto.createHash("md5").update(JSON.stringify(filterData)).digest("hex"));

            let downloadCenterData = new DownloadCenterModel({
                UserDetails: jobData.userDetails,
                Filter: {
                    body: filterData.body,
                    params: filterData.params,
                    query: filterData.query
                },
                NetworkId: jobData.NetworkId,
                User_Category: jobData.userCategory,
                MetaData: jobData.metaData,
                hash: hashOfQuery,
                status: "processing",
                reportName: jobData.reportName,
                format: "CSV",
                IsScheduler: true
            })

            // console.log("downloadCenterData = ", downloadCenterData.Filter.body.search);

            downloadCenterData.save().then(docs => {

                if (docs) {

                    // console.log("=========== Data saved in Download center");

                    let downloadCenterId = docs['_id'];
                    let result = rabbitMq.publish_Content(isMultipleContent = false, publish_queue, downloadCenterId, true, true);
                    if (result) {
                        // console.log("=========== Job Published Sucessfully");
                    } else {
                        // console.log("=========== RabbitMq Error");
                        DownloadCenterModel.deleteData({ _id: docs['_id'] }).then(data => {

                            if (data.deletedCount > 0) {
                                // console.log("=========== Download center Data Deleted ");
                            }
                        }).catch(err => {
                            console.log(err);
                        })
                    }
                }
            }).catch(err => {
                console.log("=========== Download Center Error", err);
            })
        }
        catch (err) {
            console.log("=========== Error in scheduling job", err);
        }

        done();
    });
}
