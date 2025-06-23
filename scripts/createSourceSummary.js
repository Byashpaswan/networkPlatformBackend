const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Script:SourceSummary");
require("dotenv").config({
  path: ".env"
});
const mongooseObjectId = Mongoose.Types.ObjectId;
var { ClickLogModel } = require("../db/click/clickLog");
var { OffersSourceAdvAffSummaryModel, SourceSummaryModel, SourceAdvertiserAffiliateSummaryModel, SourceAdvertiserSummaryModel, SourceAffiliateSummaryModel, SummaryLogModel } = require("../db/click/sourceSummary/sourceSummary");
var NetworkModel  = require("../db/network/Network");
var moment = require('moment');
const Promise = require('promise');
const SOURCE_SUMMARY_INTERVAL = process.env.SOURCE_SUMMARY_INTERVAL || 1;

require('../db/connection');
async function startScript() {
    // console.log('start');
    try {
        let SUMMARY_DATE_END = process.env.SUMMARY_DATE_END || '';
        let date = process.env.SUMMARY_DATE_START || '';
        // console.log(SUMMARY_DATE_END, date);
        let dateTime = moment(date);
        let networks = await fetchAllNetworks();
        //  console.log("all network", networks,dateTime.toDate() ,moment(SUMMARY_DATE_END).toDate() );
        if (!networks) {
            return false;
        }
        while (dateTime.isBefore(moment(SUMMARY_DATE_END))) {
            let timeInterval = calculateDateInterval(dateTime);
            // console.log(timeInterval);
            //let timezone_offset= +330;
            //let t=moment(timeInterval.startTime).add(timezone_offset, 'minutes');
            //console.log('=====',t.toDate());
            //process.exit();
            if (!timeInterval) {
                return false;
            }
            for (let i = 0; i < networks.length; i++) {
                try {
                    await buildSummary(timeInterval, networks[i]._id);
                }
                catch (e) {
                    console.log(e)
                }
            }
            dateTime = dateTime.add(SOURCE_SUMMARY_INTERVAL, 'hour');
            // console.log(dateTime.toDate());
        }
    }
    catch (e) {
        console.log(e)
    }
    // console.log('done');
    return;
}

exports.startCronScript = async () => {
    try {
        let currentDate = moment();
        let timeInterval = calculateDateInterval(currentDate);
        // console.log(timeInterval);
        if (!timeInterval) {
            return false;
        }
        let networks = await fetchAllNetworks();
        if (!networks) {
            return false;
        }
        // console.log(networks)
        for (let i = 0; i < networks.length; i++) {
            try {
                await buildSummary(timeInterval, networks[i]._id);
            }
            catch (e) {
                console.log(e)
            }
        }
    }
    catch (e)
    {
    console.log(e)
    }
    return await Promise.resolve(true);
}

function calculateDateInterval(summaryTime)
{
    try {
        let dateEnd = moment(summaryTime).startOf('hour').toDate();
        let dateStart = moment(dateEnd).subtract(SOURCE_SUMMARY_INTERVAL, 'hour').toDate();
        return { startTime: dateStart, endTime: dateEnd };
    }
    catch (e) {
        console.log(e)
        return null;
    }
}

async function fetchAllNetworks()
{
    try {
        let result = await NetworkModel.findAllNetwork({ status: 'pending' }, { _id: 1, status: 1});
        if (result && result.length)
        {
            return result;
        }
        return null;
    }
    catch(e){
        console.log(e)
        return null;
    }
}

async function buildSummary(timeInterval, network_id)
{
    return new Promise(async (resolve, reject) => {


        try {
            //let isDataExists = await InsertSourceSummary(timeInterval, network_id);
        }
        catch (e) {
            console.log(e)
        }
        try {
            //await InsertSourceAdvertiserSummary(timeInterval, network_id);
        }
        catch (e) {
            console.log(e)
        }
        try {
            //await InsertSourceAffiliateSummary(timeInterval, network_id);
        }
        catch (e) {
            console.log(e)
        }
        try {
            //await InsertSourceAdvertiserAffiliateSummary(timeInterval, network_id);
        }
        catch (e) {
            console.log(e)
        }
        try{
          await InsertOffersSourceAdvAffSummary(timeInterval, network_id);
        }catch(err){
          console.log(err);
        }
        resolve(true);
    });
}

async function InsertSourceSummary(timeInterval, network_id)
{
    //let isDataExists = false;
    // console.log('InsertSourceSummary');
    return new Promise( async (resolve, reject) =>{
      try {
        if (timeInterval.startTime && timeInterval.endTime && network_id) {
            let result = await ClickLogModel.fetchDailySummaryUsingStream(
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
                try{
                  await SourceSummaryModel.insertManyDocs(insert_docs);
                }catch( err){
                  console.log("Err while inserting SourceSummaryModel", err.message);
                }

                //result_buffer = [];
              }
            });

            cursor.on("end", async () => {
              try{
                await SourceSummaryModel.insertManyDocs(result_buffer);
              }catch(err ){
                console.log("Err while inserting SourceSummaryModel" ,err.message)
              }
              result_buffer = [];
               //isDataExists = true;
                try{
                  await logSummaryResult(
                    network_id,
                    records_count,
                    timeInterval,
                    "source"
                  );
                   resolve(true);
                }catch( err ){
                  console.log( "Err while saving logs in source ",err.message);
                   resolve(true);
                }


            });

            cursor.on("error", async () => {
              try {
                await SourceSummaryModel.insertManyDocs(result_buffer);
              } catch (err) {
                console.log("Err while inserting SourceSummaryModel", err.message)
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
                console.log("Err while saving logs in source ", err.message)
                 resolve(true);
              }
            });





            // if (result && result.length) {
            //     let summary = formatDocument(result, network_id, timeInterval);
            //     if (summary.length) {
            //       let uploadMaxLimit = 1000;
            //       let totatalDoc = summary.length;
            //       let fromIndex = 0;
            //       let totalLoop = Math.ceil(totatalDoc / uploadMaxLimit);
            //       for (let page = 0; page < totalLoop; page++) {
            //         fromIndex = page * uploadMaxLimit;
            //         toIndex = fromIndex + uploadMaxLimit;
            //         let insertSummary = summary.slice(fromIndex, toIndex);
            //         //For last page
            //         if (page == (totalLoop -1) ) {
            //             //toIndex = totatalDoc.length;
            //             insertSummary = summary.slice(fromIndex);
            //         }
            //         await SourceSummaryModel.insertManyDocs(insertSummary);

            //       }

            //     }
            //     isDataExists = true;
            //   try {

            //     let timezone_offset = +330;
            //     let timeZone_code = "IST";
            //     let timeSolot = moment(timeInterval.startTime).add(
            //       timezone_offset,
            //       "minutes"
            //     );

            //     let newLog = new SummaryLogModel({
            //       network_id: network_id,
            //       summary_count: result.length,
            //       report_name: "InsertSourceSummary",
            //       timeSlot: timeSolot,
            //       timezone: timeZone_code,
            //       timezone_offset: timezone_offset
            //     });
            //     await newLog.save();
            //   }
            //   catch (e) {
            //     console.log("error : while saving SourceSummary log")
            //     console.log(e)
            //   }

            // }
            //resolve(isDataExists);
        }
    }
    catch(err){
      console.log("error in InsertSourceSummary", err);
      reject(false);
    }
  })

    //return await Promise.resolve(isDataExists);
}

async function InsertSourceAdvertiserSummary(timeInterval, network_id) {
    // console.log('InsertSourceAdvertiserSummary');
    return new Promise(async  (resolve, reject)=>{
      try {
        if (timeInterval.startTime && timeInterval.endTime && network_id) {
            let result = await ClickLogModel.fetchDailySummaryUsingStream(
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
                try{
                  await SourceAdvertiserSummaryModel.insertManyDocs(
                    insert_docs
                  );
                }catch(err){
                  console.log( "Err while inserting SourceAdvertiserSummaryModel",err.message);
                }

                //result_buffer = [];
              }
            });

            cursor.on("end", async () => {
              try {
                await SourceAdvertiserSummaryModel.insertManyDocs(result_buffer);
              } catch (err) {
                console.log("Err while inserting SourceAdvertiserSummaryModel", err.message);
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
              try{
                await SourceAdvertiserSummaryModel.insertManyDocs(result_buffer);
              }catch(err){
                console.log( "Err while inserting SourceAdvertiserSummaryModel" , err.message);
              }

              result_buffer = [];
              try{
                await logSummaryResult(
                  network_id,
                  records_count,
                  timeInterval,
                  "SourceAdv"
                );
                 resolve(true);
              }catch( err){
                console.log("Err while saving logs in SourceAdv" ,err.message);
                 resolve(true);
              }

            });



            // if (result && result.length) {
            //     let summary = formatDocument(result, network_id, timeInterval);
            //     if (summary.length) {
            //       let uploadMaxLimit = 1000;
            //       let totatalDoc = summary.length;
            //       let fromIndex = 0;
            //       let totalLoop = Math.ceil(totatalDoc / uploadMaxLimit);
            //       for (let page = 0; page < totalLoop; page++) {
            //         fromIndex = page * uploadMaxLimit;
            //         toIndex = fromIndex + uploadMaxLimit;
            //         let insertSummary = summary.slice(fromIndex, toIndex);
            //         //For last page
            //         if (page == totalLoop - 1) {
            //           //toIndex = totatalDoc.length;
            //           insertSummary = summary.slice(fromIndex);
            //         }
            //         await SourceAdvertiserSummaryModel.insertManyDocs(
            //           insertSummary
            //         );

            //       }

            //       try {
            //         let timezone_offset = +330;
            //         let timeZone_code = "IST";
            //         let timeSolot = moment(timeInterval.startTime).add(
            //           timezone_offset,
            //           "minutes"
            //         );
            //         let newLog = new SummaryLogModel({
            //           network_id: network_id,
            //           summary_count: result.length,
            //           report_name: "InsertSourceAdvertiserSummary",
            //           timeSlot: timeSolot,
            //           timezone: timeZone_code,
            //           timezone_offset: timezone_offset
            //         });
            //         await newLog.save();
            //       }
            //       catch (e) {
            //         console.log("error : while saving SourceSummary log")
            //         console.log(e);
            //       }

            //     }
            // }
            //resolve(true);
        }
    }
    catch(err) {
      console.log("error in InsertSourceAdvertiserSummary", err);
      reject(false);
    }
    });
}

async function InsertSourceAffiliateSummary(timeInterval, network_id) {
    // console.log('InsertSourceAffiliateSummary');
    return new Promise( async (resolve, reject)=>{
      try {
        if (timeInterval.startTime && timeInterval.endTime && network_id) {
            let result = await ClickLogModel.fetchDailySummaryUsingStream(
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
                try{
                  await SourceAffiliateSummaryModel.insertManyDocs(insert_docs);
                }catch(err){
                  console.log("Error while inserting SourceAffiliateSummaryModel" ,err.message);
                }
              }
            });

            cursor.on("end", async () => {
              try {
                await SourceAffiliateSummaryModel.insertManyDocs(result_buffer);
              } catch (err) {
                console.log("Error while inserting SourceAffiliateSummaryModel", err.message)
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
              try{
                await SourceAffiliateSummaryModel.insertManyDocs(result_buffer);
              }catch(err){
                console.log("Error while inserting SourceAffiliateSummaryModel",err.message)
              }

              result_buffer = [];
              try{
                await logSummaryResult(
                  network_id,
                  records_count,
                  timeInterval,
                  "SourceAff"
                );
                 resolve(true);
              }catch(err){
                console.log("Error while saving log in SourceAff", err.message);
                 resolve(true);
              }

            });



            // if (result && result.length) {
            //     let summary = formatDocument(result, network_id, timeInterval);
            //     if (summary.length) {
            //       let uploadMaxLimit = 1000;
            //       let totatalDoc = summary.length;
            //       let fromIndex = 0;
            //       let totalLoop = Math.ceil(totatalDoc / uploadMaxLimit);
            //       for (let page = 0; page < totalLoop; page++) {
            //         fromIndex = page * uploadMaxLimit;
            //         toIndex = fromIndex + uploadMaxLimit;
            //         let insertSummary = summary.slice(fromIndex, toIndex);
            //         //For last page
            //         if (page == totalLoop - 1) {
            //           //toIndex = totatalDoc.length;
            //           insertSummary = summary.slice(fromIndex);
            //         }
            //         await SourceAffiliateSummaryModel.insertManyDocs(
            //           insertSummary
            //         );
            //       }
            //       try {

            //         let timezone_offset = +330;
            //         let timeZone_code = "IST";
            //         let timeSolot = moment(timeInterval.startTime).add(
            //           timezone_offset,
            //           "minutes"
            //         );
            //         let newLog = new SummaryLogModel({
            //           network_id: network_id,
            //           summary_count: result.length,
            //           report_name: "InsertSourceAffiliateSummary" ,
            //           timeSlot: timeSolot,
            //           timezone :timeZone_code,
            //           timezone_offset:timezone_offset
            //          });
            //         await newLog.save();
            //       }
            //       catch (e) {
            //         console.log("error : while saving SourceSummary log")
            //         console.log(e);
            //       }

            //     }

            // }
            //resolve(true);
        }
    }
    catch(err){
      console.log("error in InsertSourceAffiliateSummary", err);
      reject(false);
    }
    });


}

async function InsertSourceAdvertiserAffiliateSummary(timeInterval, network_id) {

  return new Promise( async (resolve, reject)=>{
    try {
      // console.log("InsertSourceAdvertiserAffiliateSummary");
        if (timeInterval.startTime && timeInterval.endTime && network_id) {
            // console.log('InsertSourceAdvertiserAffiliateSummary');
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
                try{
                  await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(
                    insert_docs
                  );
                }catch(err){
                  console.log("Err while inserting  SourceAdvertiserAffiliateSummaryModel", err.message)
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
                console.log("Err while inserting  SourceAdvertiserAffiliateSummaryModel", err.message)
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
              try{
                await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(
                  result_buffer
                );
              }catch( err){
                console.log("Err while inserting  SourceAdvertiserAffiliateSummaryModel",err.message);
              }

              result_buffer = [];
              try{
                await logSummaryResult(
                  network_id,
                  records_count,
                  timeInterval,
                  "SourceAdvAff"
                );
                 resolve(true);
              }catch( err){
                console.log( "Error while saving logs in SourceAdvAff",err.message)
                 resolve(true);
              }

            });




            // if (result && result.length) {
            //     let summary = formatDocument(result, network_id, timeInterval);
            //     if (summary.length) {
            //       let uploadMaxLimit = 1000;
            //       let totatalDoc = summary.length;
            //       let fromIndex = 0;
            //       let totalLoop = Math.ceil(totatalDoc / uploadMaxLimit);
            //       for (let page = 0; page < totalLoop; page++) {
            //         fromIndex = page * uploadMaxLimit;
            //         toIndex = fromIndex + uploadMaxLimit;
            //         let insertSummary = summary.slice(fromIndex, toIndex);
            //         //For last page
            //         if (page == totalLoop - 1) {
            //           //toIndex = totatalDoc.length;
            //           insertSummary = summary.slice(fromIndex);
            //         }
            //         await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(
            //           insertSummary
            //         );
            //       }

            //       try {
            //         let timezone_offset = +330;
            //         let timeZone_code = "IST";
            //         let timeSolot = moment(timeInterval.startTime).add(
            //           timezone_offset,
            //           "minutes"
            //         );
            //         let newLog = new SummaryLogModel({
            //           network_id: network_id,
            //           summary_count: result.length,
            //           report_name: "InsertSourceAdvertiserAffiliateSummary",
            //           timeSlot: timeSolot,
            //           timezone :timeZone_code,
            //           timezone_offset:timezone_offset
            //          });
            //         await newLog.save();
            //       }
            //       catch (e) {
            //         console.log("error : while saving SourceSummary log")
            //         console.log(e)
            //       }

            //     }
            // }

        }
    }
    catch(err){
      console.log("error in InsertSourceAdvertiserAffiliateSummary", err);
      reject(false);
    }
  });
}


async function InsertOffersSourceAdvAffSummary(
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
            offer_id: "$offer_id",
            source: "$source",
            advertiser_id: "$advertiser_id",
            publisher_id: "$publisher_id"
          }
        );
        let records_count=0;
        let result_buffer=[];
        cursor.on("data", async function(doc) {
          records_count++;
          let summary = formatDocument(doc, network_id, timeInterval);
          result_buffer.push(summary);
          if (result_buffer.length >= 1000) {
            let insert_docs = result_buffer;

            result_buffer = [];
            try{
              await OffersSourceAdvAffSummaryModel.insertManyDocs(insert_docs);
            }catch( err){
              console.log( "error while inserting doc in OffersSourceAdvAffSummaryModel",err.message)
            }

            //result_buffer=[];
          }
        });

        cursor.on( "end",  async ( ) =>{

          try{
            await OffersSourceAdvAffSummaryModel.insertManyDocs(result_buffer);
          }catch(err) {
            console.log( "error while inserting doc in OffersSourceAdvAffSummaryModel",err.message)
          }

          result_buffer = [];
          try{
            await logSummaryResult(
              network_id,
              records_count,
              timeInterval,
              "OffersSourceAdvAff"
            );
            resolve(true);
          }catch( err){
            console.log("error while inserting logs of  OffersSourceAdvAff", err.message )
            resolve(true);
          }

        });

        cursor.on("error", async () => {

          try{
            await OffersSourceAdvAffSummaryModel.insertManyDocs(result_buffer);
          }catch( err){
            console.log( "error while inserting doc in OffersSourceAdvAffSummaryModel", err.message)
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
            console.log("error while inserting logs of  OffersSourceAdvAff", err.message);
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

function logSummaryResult( network_id ,records_count , timeInterval, report_name ){
  return new Promise( async (resolve, reject) =>{
    try {
      let timezone_offset = +330;
      let timeZone_code = "IST";
      let timeSolot = moment(timeInterval.startTime).add(timezone_offset,"minutes" );
      let newLog = new SummaryLogModel({
              network_id: network_id,
              summary_count: records_count,
              report_name: report_name,
              timeSlot: timeSolot.toDate(),
              timezone: timeZone_code,
              timezone_offset: timezone_offset
              });
      await newLog.save();
      resolve();
    } catch (e) {
      console.log("error : while saving SourceSummary log");
      console.log(e);
      reject(e);
    }
  });


}


function formatDocument(obj, network_id, timeInterval){

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

// function formatDocument(result, network_id, timeInterval)
// {
//     let summary = [];
//     try {
//         if (result && result.length) {

//           //convert time to IST time
//             let timezone_offset= +330;
//             let timeZone_code="IST";
//             let timeSolot =  moment(timeInterval.startTime).add(timezone_offset, 'minutes').toDate();
//             result.map(obj => {
//                 let temp = {
//                   network_id: network_id,
//                   source: obj._id["source"],
//                   click: obj.count,
//                   unique_click: obj.count,
//                   conversion: obj.conversion,
//                   unique_conversion: obj.conversion,
//                   revenue: obj.total_revenue,
//                   payout: obj.total_payout,
//                   timeSlot: timeSolot,
//                   timezone :timeZone_code,
//                   timezone_offset:timezone_offset
//                 };
//                 if( obj.offer_name ){
//                   temp["offer_name"] = obj.offer_name;
//                 }

//                 if (obj.advertiser_name) {
//                   temp["advertiser_name"] = obj.advertiser_name;
//                 }

//                 if (obj.publisher_name) {
//                   temp["publisher_name"] = obj.publisher_name;
//                 }

//                 if (obj._id['publisher_id']) {
//                     temp['publisher_id'] = obj._id['publisher_id'];
//                 }
//                 if (obj._id['advertiser_id']) {
//                     temp['advertiser_id'] = obj._id['advertiser_id'];
//                 }
//                 if (obj._id["offer_id"]) {
//                   temp["offer_id"] = obj._id["offer_id"];
//                 }

//                 summary.push(temp);
//             })

//         }
//         return summary;
//     }
//     catch{
//         return [];
//     }
// }

startScript();
