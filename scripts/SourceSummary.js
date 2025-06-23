const Mongoose = require("mongoose");
const debug = require("debug")("darwin:Script:SourceSummary");
require("dotenv").config({
  path: ".env"
});
const mongooseObjectId = Mongoose.Types.ObjectId;
var { ClickLogModel } = require("../db/click/clickLog");
var {
  OffersSourceAdvAffSummaryModel,
  SourceSummaryModel,
  SourceAdvertiserAffiliateSummaryModel,
  SourceAdvertiserSummaryModel,
  SourceAffiliateSummaryModel,
  SummaryLogModel
} = require("../db/click/sourceSummary/sourceSummary");
var NetworkModel = require("../db/network/Network");
var moment = require("moment");
const Promise = require("promise");
const SOURCE_SUMMARY_INTERVAL = process.env.SOURCE_SUMMARY_INTERVAL || 1;
require("../db/connection");

exports.startCronScript = async () => {
  try {

    let networks = await fetchAllNetworks();
    if (!networks) {
      return false;
    }
    for (let i = 0; i < networks.length; i++) {
      try {
        await buildSummary( networks[i]._id);
      } catch (e) {
        console.log(e);
      }
    }
    process.exit();
  } catch (e) {
    console.log(e);
  }
  return await Promise.resolve(true);
};

function buildSummary( network_id){
  return new Promise( async ( resolve, reject) =>{
    try{
      await processSourceSummary(network_id);
      await processSourceAdvSummary(network_id);
      await processSourceAffSummary(network_id);
      await processSourceAdvAffSummary(network_id);
      await processOffersSourceAdvAff(network_id);
      return resolve();
    }catch( err){
      console.log("err while processing all data ", err);
      return reject();
    }
  });
}

function processSourceSummary(network_id) {
  return new Promise(async (resolve, reject) => {
    let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(
      network_id,
      "source"
    );

    if ( lastdlogValue_OffersSourceAdvAff.length == 0 ) {
      return resolve(true);
    }
    let slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
    let slotTime_inString = moment.utc(slotTime).format("YYYY-MM-DDTHH:mm:ss");
    let utc_slotTime = moment(slotTime_inString).toDate();
    let currentTime = moment.utc();
    let timeInterval = getDateInterval(utc_slotTime);

    let timeDiff = moment
      .duration(currentTime.diff(moment(timeInterval.startTime)))
      .asMinutes();
    while (timeDiff > 60) {
      await InsertSourceSummary(timeInterval, network_id);

      timeInterval = getDateInterval(timeInterval.startTime);
      timeDiff = moment
        .duration(currentTime.diff(moment(timeInterval.startTime)))
        .asMinutes();
    }
    return resolve(true);
  });
}

function processSourceAdvSummary(network_id) {
  return new Promise(async (resolve, reject) => {
    let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(
      network_id,
      "SourceAdv"
    );


    if ( lastdlogValue_OffersSourceAdvAff.length == 0 ) {
      return resolve(true);
    }

    let slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
    let slotTime_inString = moment.utc(slotTime).format("YYYY-MM-DDTHH:mm:ss");
    let utc_slotTime = moment(slotTime_inString).toDate();
    let currentTime = moment.utc();
    let timeInterval = getDateInterval(utc_slotTime);

    //let slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
    //let currentTime = moment();
    //let timeInterval = getDateInterval(slotTime);
    let timeDiff = moment
      .duration(currentTime.diff(moment(timeInterval.startTime)))
      .asMinutes();
    while (timeDiff > 60) {
      await InsertSourceAdvertiserSummary(timeInterval, network_id);

      timeInterval = getDateInterval(timeInterval.startTime);
      timeDiff = moment
        .duration(currentTime.diff(moment(timeInterval.startTime)))
        .asMinutes();
    }
    return resolve(true);
  });
}

function processSourceAffSummary(network_id) {
  return new Promise(async (resolve, reject) => {
    let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(
      network_id,
      "SourceAff"
    );


    if ( lastdlogValue_OffersSourceAdvAff.length == 0 ) {
      return resolve(true);
    }
    let slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
    let slotTime_inString = moment.utc(slotTime).format("YYYY-MM-DDTHH:mm:ss");
    let utc_slotTime = moment(slotTime_inString).toDate();
    let currentTime = moment.utc();
    let timeInterval = getDateInterval(utc_slotTime);
    //let currentTime = moment();
    //let timeInterval = getDateInterval(slotTime);
    let timeDiff = moment
      .duration(currentTime.diff(moment(timeInterval.startTime)))
      .asMinutes();
    while (timeDiff > 60) {
      await InsertSourceAffiliateSummary(timeInterval, network_id);

      timeInterval = getDateInterval(timeInterval.startTime);
      timeDiff = moment
        .duration(currentTime.diff(moment(timeInterval.startTime)))
        .asMinutes();
    }
    return resolve(true);
  });
}


function processOffersSourceAdvAff(network_id) {
  return new Promise(async (resolve, reject) => {
    let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(
      network_id,
      "OffersSourceAdvAff"
    );


    if (lastdlogValue_OffersSourceAdvAff.length == 0 ) {
      return resolve(true);
    }
    let slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
    let slotTime_inString = moment.utc(slotTime).format("YYYY-MM-DDTHH:mm:ss");
    let utc_slotTime = moment(slotTime_inString).toDate();
    let currentTime = moment.utc();
    let timeInterval = getDateInterval(utc_slotTime);
    let timeDiff = moment
      .duration(currentTime.diff(moment(timeInterval.startTime)))
      .asMinutes();
      //process.exit();
    while (timeDiff > 60) {

      await InsertOffersSourceAdvAffSummary(timeInterval, network_id);

      timeInterval = getDateInterval(timeInterval.startTime);
      timeDiff = moment
        .duration(currentTime.diff(moment(timeInterval.startTime)))
        .asMinutes();
    }
    return resolve(true);
  });
}

function processSourceAdvAffSummary(network_id) {
  return new Promise(async (resolve, reject) => {
    let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(
      network_id,
      "SourceAdvAff"
    );

    if ( lastdlogValue_OffersSourceAdvAff.length == 0 ) {
      return resolve(true);

    }
    let slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
    let currentTime = moment();
    let timeInterval = getDateInterval(slotTime);
    let timeDiff = moment
      .duration(currentTime.diff(moment(timeInterval.startTime)))
      .asMinutes();
    while (timeDiff > 60) {
      await InsertSourceAdvertiserAffiliateSummary(timeInterval, network_id);

      timeInterval = getDateInterval(timeInterval.startTime);
      timeDiff = moment
        .duration(currentTime.diff(moment(timeInterval.startTime)))
        .asMinutes();
    }
    return resolve(true);
  });
}

async function fetchAllNetworks() {
  try {
    let result = await NetworkModel.findAllNetwork(
      { status: "pending" },
      { _id: 1, status: 1 , company_name :1 }
    );
    if (result && result.length) {
      return result;
    }
    return null;
  } catch (e) {
    console.log(e);
    return null;
  }
}

function getDateInterval(lastSlotTime) {
  // console.log(
  //   moment(lastSlotTime).toDate(),
  //   moment(lastSlotTime)
  //     .startOf("hour")
  //     .toDate()
  // );
  try{
    let dateStart = moment(lastSlotTime)
      .startOf("hour")
      .add(SOURCE_SUMMARY_INTERVAL, "hour")
      .toDate();
    let endDate = moment(dateStart)
      .add(SOURCE_SUMMARY_INTERVAL, "hour")
      .toDate();
      return { startTime: dateStart, endTime: endDate };
  }catch( err){

    console.log(err);
    return null;
  }

}

function logSummaryResult(
  network_id,
  records_count,
  timeInterval,
  report_name
) {
  return new Promise(async (resolve, reject) => {
    try {
      let timezone_offset = +330;
      let timeZone_code = "IST";
      let timeSolot = moment(timeInterval.startTime).add(
        timezone_offset,
        "minutes"
      );
      let newLog = new SummaryLogModel({
        network_id: network_id,
        summary_count: records_count,
        report_name: report_name,
        timeSlot: timeSolot.toDate(),
        timezone: timeZone_code,
        timezone_offset: timezone_offset
      });
      await newLog.save();
      console.log(
        "end event called",
        network_id,
        records_count,
        timeSolot.toDate(),
        report_name
      );
      resolve();
    } catch (e) {
      console.log("error : while saving SourceSummary log");
      console.log(e);
      reject(e);
    }
  });
}

function formatDocument(obj, network_id, timeInterval) {
  let timezone_offset = +330;
  let timeZone_code = "IST";
  let timeSolot = moment(timeInterval.startTime)
    .add(timezone_offset, "minutes")
    .toDate();

  let temp = {
    network_id: network_id,
    source: obj._id["source"],
    click: obj.count,
    unique_click: obj.count,
    conversion: obj.conversion,
    unique_conversion: obj.conversion,
    revenue: obj.total_revenue,
    payout: obj.total_payout,
    timeSlot: timeSolot,
    timezone: timeZone_code,
    timezone_offset: timezone_offset
  };
  if (obj.offer_name) {
    temp["offer_name"] = obj.offer_name;
  }

  if (obj.advertiser_name) {
    temp["advertiser_name"] = obj.advertiser_name;
  }

  if (obj.publisher_name) {
    temp["publisher_name"] = obj.publisher_name;
  }

  if (obj._id["publisher_id"]) {
    temp["publisher_id"] = obj._id["publisher_id"];
  }
  if (obj._id["advertiser_id"]) {
    temp["advertiser_id"] = obj._id["advertiser_id"];
  }
  if (obj._id["offer_id"]) {
    temp["offer_id"] = obj._id["offer_id"];
  }

  return temp;
}

async function InsertSourceSummary(timeInterval, network_id) {
  //let isDataExists = false;
  return new Promise(async (resolve, reject) => {
    try {
      if (timeInterval.startTime && timeInterval.endTime && network_id) {
        let cursor = await ClickLogModel.fetchDailySummaryUsingStream(
          {
            network_id: network_id,
            createdAt: {
              $gte: timeInterval.startTime,
              $lt: timeInterval.endTime
            }
          },
          { source: "$source" }
        );

        let records_count = 0;
        let result_buffer = [];
        cursor.on("data", async function(doc) {
          records_count++;
          let summary = formatDocument(doc, network_id, timeInterval);
          result_buffer.push(summary);
          if (result_buffer.length >= 1000) {
            let insert_docs = result_buffer;
            result_buffer = [];
            try {
              await SourceSummaryModel.insertManyDocs(insert_docs);
            } catch (err) {
              console.log(
                "Err while inserting SourceSummaryModel",
                err.message
              );
            }

            //result_buffer = [];
          }
        });

        cursor.on("end", async () => {
          try {
            await SourceSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log("Err while inserting SourceSummaryModel", err.message);
          }
          result_buffer = [];
          //isDataExists = true;
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "source"
            );
            resolve(true);
          } catch (err) {
            console.log("Err while saving logs in source ", err.message);
            resolve(true);
          }
        });

        cursor.on("error", async () => {
          try {
            await SourceSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log("Err while inserting SourceSummaryModel", err.message);
          }
          result_buffer = [];
          //isDataExists = true;
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "source"
            );
            resolve(true);
          } catch (err) {
            console.log("Err while saving logs in source ", err.message);
            resolve(true);
          }
        });
      }
    } catch (err) {
      console.log("error in InsertSourceSummary", err);
      reject(false);
    }
  });

  //return await Promise.resolve(isDataExists);
}

async function InsertSourceAdvertiserSummary(timeInterval, network_id) {
  return new Promise(async (resolve, reject) => {
    try {
      if (timeInterval.startTime && timeInterval.endTime && network_id) {
        let cursor = await ClickLogModel.fetchDailySummaryUsingStream(
          {
            network_id: network_id,
            createdAt: {
              $gte: timeInterval.startTime,
              $lt: timeInterval.endTime
            }
          },
          { source: "$source", advertiser_id: "$advertiser_id" }
        );

        let records_count = 0;
        let result_buffer = [];
        cursor.on("data", async function(doc) {
          records_count++;
          let summary = formatDocument(doc, network_id, timeInterval);
          result_buffer.push(summary);
          if (result_buffer.length >= 1000) {
            let insert_docs = result_buffer;
            result_buffer = [];
            try {
              await SourceAdvertiserSummaryModel.insertManyDocs(insert_docs);
            } catch (err) {
              console.log(
                "Err while inserting SourceAdvertiserSummaryModel",
                err.message
              );
            }

            //result_buffer = [];
          }
        });

        cursor.on("end", async () => {
          try {
            await SourceAdvertiserSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log(
              "Err while inserting SourceAdvertiserSummaryModel",
              err.message
            );
          }

          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "SourceAdv"
            );
            resolve(true);
          } catch (err) {
            console.log("Err while saving logs in SourceAdv", err.message);
            resolve(true);
          }
        });

        cursor.on("error", async () => {
          try {
            await SourceAdvertiserSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log(
              "Err while inserting SourceAdvertiserSummaryModel",
              err.message
            );
          }

          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "SourceAdv"
            );
            resolve(true);
          } catch (err) {
            console.log("Err while saving logs in SourceAdv", err.message);
            resolve(true);
          }
        });


      }
    } catch (err) {
      console.log("error in InsertSourceAdvertiserSummary", err);
      reject(false);
    }
  });
}

async function InsertSourceAffiliateSummary(timeInterval, network_id) {
  return new Promise(async (resolve, reject) => {
    try {
      if (timeInterval.startTime && timeInterval.endTime && network_id) {
        let cursor = await ClickLogModel.fetchDailySummaryUsingStream(
          {
            network_id: network_id,
            createdAt: {
              $gte: timeInterval.startTime,
              $lt: timeInterval.endTime
            }
          },
          { source: "$source", publisher_id: "$publisher_id" }
        );

        let records_count = 0;
        let result_buffer = [];
        cursor.on("data", async function(doc) {
          records_count++;
          let summary = formatDocument(doc, network_id, timeInterval);
          result_buffer.push(summary);
          if (result_buffer.length >= 1000) {
            let insert_docs = result_buffer;
            result_buffer = [];
            try {
              await SourceAffiliateSummaryModel.insertManyDocs(insert_docs);
            } catch (err) {
              console.log(
                "Error while inserting SourceAffiliateSummaryModel",
                err.message
              );
            }
          }
        });

        cursor.on("end", async () => {
          try {
            await SourceAffiliateSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log(
              "Error while inserting SourceAffiliateSummaryModel",
              err.message
            );
          }

          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "SourceAff"
            );
            resolve(true);
          } catch (err) {
            console.log("Error while saving log in SourceAff", err.message);
            resolve(true);
          }
        });

        cursor.on("error", async () => {
          try {
            await SourceAffiliateSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log(
              "Error while inserting SourceAffiliateSummaryModel",
              err.message
            );
          }

          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "SourceAff"
            );
            resolve(true);
          } catch (err) {
            console.log("Error while saving log in SourceAff", err.message);
            resolve(true);
          }
        });
      }
    } catch (err) {
      console.log("error in InsertSourceAffiliateSummary", err);
      reject(false);
    }
  });
}

async function InsertSourceAdvertiserAffiliateSummary(
  timeInterval,
  network_id
) {
  return new Promise(async (resolve, reject) => {
    try {
      if (timeInterval.startTime && timeInterval.endTime && network_id) {
        let cursor = await ClickLogModel.fetchDailySummaryUsingStream(
          {
            network_id: network_id,
            createdAt: {
              $gte: timeInterval.startTime,
              $lt: timeInterval.endTime
            }
          },
          {
            source: "$source",
            advertiser_id: "$advertiser_id",
            publisher_id: "$publisher_id"
          }
        );

        let records_count = 0;
        let result_buffer = [];
        cursor.on("data", async function(doc) {
          records_count++;
          let summary = formatDocument(doc, network_id, timeInterval);
          result_buffer.push(summary);
          if (result_buffer.length >= 1000) {
            let insert_docs = result_buffer;
            result_buffer = [];
            try {
              await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(
                insert_docs
              );
            } catch (err) {
              console.log(
                "Err while inserting  SourceAdvertiserAffiliateSummaryModel",
                err.message
              );
            }

            //result_buffer = [];
          }
        });

        cursor.on("end", async () => {
          try {
            await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(
              result_buffer
            );
          } catch (err) {
            console.log(
              "Err while inserting  SourceAdvertiserAffiliateSummaryModel",
              err.message
            );
          }
          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "SourceAdvAff"
            );
            resolve(true);
          } catch (err) {
            console.log("Error while saving logs in SourceAdvAff", err.message);
            resolve(true);
          }
        });

        cursor.on("error", async () => {
          try {
            await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(
              result_buffer
            );
          } catch (err) {
            console.log(
              "Err while inserting  SourceAdvertiserAffiliateSummaryModel",
              err.message
            );
          }

          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "SourceAdvAff"
            );
            resolve(true);
          } catch (err) {
            console.log("Error while saving logs in SourceAdvAff", err.message);
            resolve(true);
          }
        });

      }
    } catch (err) {
      console.log("error in InsertSourceAdvertiserAffiliateSummary", err);
      reject(false);
    }
  });
}

async function InsertOffersSourceAdvAffSummary(timeInterval, network_id) {
  return new Promise(async (resolve, reject) => {
    try {
      if (timeInterval.startTime && timeInterval.endTime && network_id) {
        let cursor = await ClickLogModel.fetchDailySummaryUsingStream(
          {
            network_id: network_id,
            createdAt: {
              $gte: timeInterval.startTime,
              $lt: timeInterval.endTime
            }
          },
          {
            offer_id: "$offer_id",
            source: "$source",
            advertiser_id: "$advertiser_id",
            publisher_id: "$publisher_id"
          }
        );
        let records_count = 0;
        let result_buffer = [];
        cursor.on("data", async function(doc) {
          records_count++;
          let summary = formatDocument(doc, network_id, timeInterval);
          result_buffer.push(summary);
          if (result_buffer.length >= 1000) {
            let insert_docs = result_buffer;

            result_buffer = [];
            try {
              await OffersSourceAdvAffSummaryModel.insertManyDocs(insert_docs);
            } catch (err) {
              console.log(
                "error while inserting doc in OffersSourceAdvAffSummaryModel",
                err.message
              );
            }

            //result_buffer=[];
          }
        });

        cursor.on("end", async () => {
          try {
            await OffersSourceAdvAffSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log(
              "error while inserting doc in OffersSourceAdvAffSummaryModel",
              err.message
            );
          }

          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "OffersSourceAdvAff"
            );
            resolve(true);
          } catch (err) {
            console.log(
              "error while inserting logs of  OffersSourceAdvAff",
              err.message
            );
            resolve(true);
          }
        });

        cursor.on("error", async () => {
          try {
            await OffersSourceAdvAffSummaryModel.insertManyDocs(result_buffer);
          } catch (err) {
            console.log(
              "error while inserting doc in OffersSourceAdvAffSummaryModel",
              err.message
            );
          }

          result_buffer = [];
          try {
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "OffersSourceAdvAff"
            );
            resolve(true);
          } catch (err) {
            console.log(
              "error while inserting logs of  OffersSourceAdvAff",
              err.message
            );
            resolve(true);
          }
        });
      }
    } catch (err) {
      console.log("error in InsertOffersSourceAdvAffSummary", err);
      reject(false);
    }
  });
}



this.startCronScript()
