const debug = require("debug")("dragon:helper:export:download");
const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
const fastCsv = require('fast-csv');
const fs = require('fs');
const path = require('path');
const moment = require("moment");
const { validateMongooseObjectIdArray, validateIntegerArray } = require('../Functions');
const DownloadCenterModel = require('../../db/DownloadCenterModel');
const NetworkModel = require('../../db/network/Network');
const OfferModel = require('../../db/offer/Offer');


function reportTransformer(doc, networkReportColumn) {
  let data = {};
  for (let item in networkReportColumn) {
    if (item == 'category') {
      data['Category'] = '';
      if (doc['category']) {
        data['Category'] = doc['category'];
      }
    } else if (item == 'advertiser_offer_id') {
      data['Advertiser_Offer_Id'] = '';
      if (doc['advertiser_offer_id']) {
        data['Advertiser_Offer_Id'] = doc['advertiser_offer_id'];
      }
    } else if (item == 'platform_id') {
      data['Platform_Id'] = '';
      if (doc['platform_id']) {
        data['Platform_Id'] = doc['platform_id'];
      }
    } else if (item == 'platform_name') {
      data['Platform_Name'] = '';
      if (doc['platform_name']) {
        data['Platform_Name'] = doc['platform_name'];
      }
    } else if (item == 'advertiser_id') {
      data['Advertiser_Id'] = '';
      if (doc['advertiser_id']) {
        data['Advertiser_Id'] = doc['advertiser_id'];
      }
    } else if (item == 'advertiser_name') {
      data['Advertiser_Name'] = '';
      if (doc['advertiser_name']) {
        data['Advertiser_Name'] = doc['advertiser_name'];
      }
    } else if (item == 'thumbnail') {
      data['Thumbnail'] = '';
      if (doc['thumbnail']) {
        data['Thumbnail'] = doc['thumbnail'];
      }
    } else if (item == 'offer_name') {
      data['Offer_Id'] = '';
      data['Offer_Name'] = '';
      if (doc['_id']) {
        data['Offer_Id'] = doc['_id'];
      }
      if (doc['offer_name']) {
        data['Offer_Name'] = doc['offer_name'].replace(/;/g, '').replace(/,/g, '').replace(/\t/g, '');
      }
    } else if (item == 'description') {
      data['Description'] = '';
      if (doc['description']) {
        data['Description'] = doc['description'];
      }
    } else if (item == 'kpi') {
      data['KPI'] = '';
      if (doc['kpi']) {
        data['KPI'] = doc['kpi'];
      }
    } else if (item == 'preview_url') {
      data['Preview_URL'] = '';
      if (doc['preview_url']) {
        data['Preview_URL'] = doc['preview_url'];
      }
    } else if (item == 'tracking_link') {
      data['Tracking_Link'] = '';
      if (doc['tracking_link']) {
        data['Tracking_Link'] = doc['tracking_link'];
      }
    } else if (item == 'expired_url') {
      data['Expired_URL'] = '';
      if (doc['expired_url']) {
        data['Expired_URL'] = doc['expired_url'];
      }
    } else if (item == 'redirection_method') {
      data['Redirection_Method'] = '';
      if (doc['redirection_method']) {
        data['Redirection_Method'] = doc['redirection_method'];
      }
    } else if (item == 'start_date') {
      data['Start_Date'] = '';
      if (doc['start_date']) {
        data['Start_Date'] = doc['start_date'];
      }
    } else if (item == 'end_date') {
      data['End_Date'] = '';
      if (doc['end_date']) {
        data['End_Date'] = doc['end_date'];
      }
    } else if (item == 'currency') {
      data['Currency'] = '';
      if (doc['currency']) {
        data['Currency'] = doc['currency'];
      }
    } else if (item == 'revenue') {
      data['Revenue'] = '';
      if (doc['revenue']) {
        data['Revenue'] = +doc['revenue'];
      }
    } else if (item == 'payout') {
      data['Payout'] = '';
      if (doc['payout']) {
        data['Payout'] = +doc['payout'];
      }
    } else if (item == 'approvalRequired') {
      data['ApprovalRequired'] = '';
      if (doc['approvalRequired']) {
        data['ApprovalRequired'] = doc['approvalRequired'];
      }
    } else if (item == 'isCapEnabled') {
      data['IsCapEnabled'] = '';
      if (doc['isCapEnabled']) {
        data['IsCapEnabled'] = doc['isCapEnabled'];
      }
    } else if (item == 'isTargeting') {
      data['IsTargeting'] = '';
      if (doc['isTargeting']) {
        data['IsTargeting'] = doc['isTargeting'];
      }
    } else if (item == 'isgoalEnabled') {
      data['IsGoalEnabled'] = '';
      if (doc['isgoalEnabled']) {
        data['IsGoalEnabled'] = doc['isgoalEnabled'];
      }
    } else if (item == 'device_targeting') {
      data['OS'] = '';
      if (doc['device_targeting'] && doc['device_targeting']['os']) {
        data['OS'] = doc['device_targeting']['os'];
      }
    }
    // else if (item == 'creative') {
    // } else if (item == 'goal') {
    // } 
    else if (item == 'offer_visible') {
      data['Offer_Visible'] = '';
      if (doc['offer_visible']) {
        data['Offer_Visible'] = doc['offer_visible'];
      }
    } else if (item == 'status_label') {
      data['Status_Label'] = '';
      if (doc['status_label']) {
        data['Status_Label'] = doc['status_label'];
      }
    } else if (item == 'status') {
      data['Status'] = '';
      if (doc['status']) {
        data['Status'] = doc['status'];
      }
    }
    // else if (item == 'pubOff') {
    // } else if (item == 'publisher_offers') {
    // } 
    else if (item == 'advertiser_platform_id') {
      data['Advertiser_Platform_Id'] = '';
      if (doc['advertiser_platform_id']) {
        data['Advertiser_Platform_Id'] = doc['advertiser_platform_id'];
      }
    } else if (item == 'app_id') {
      data['App_Id'] = '';
      if (doc['app_id']) {
        data['App_Id'] = doc['app_id'];
      }
    } else if (item == 'isPublic') {
      data['IsPublic'] = '';
      if (doc['isPublic']) {
        data['IsPublic'] = doc['isPublic'];
      }
    } else if (item == 'isBlacklist') {
      data['IsBlacklist'] = '';
      if (doc['isBlacklist']) {
        data['IsBlacklist'] = doc['isBlacklist'];
      }
    } else if (item == 'adv_off_hash') {
      data['Adv_Off_Hash'] = '';
      if (doc['adv_off_hash']) {
        data['Adv_Off_Hash'] = doc['adv_off_hash'];
      }
    } else if (item == 'updatedAt') {
      data['UpdatedAt'] = '';
      if (doc['updatedAt']) {
        data['UpdatedAt'] = doc['updatedAt'];
      }
    } else if (item == 'createdAt') {
      data['CreatedAt'] = '';
      if (doc['createdAt']) {
        data['CreatedAt'] = doc['createdAt'];
      }
    } else if (item == 'UserId') {

    } else if (item == 'Link') {

    } else if (item == 'revenue_type.enum_type') {
      data['Revenue_Type'] = '';
      if (doc['revenue_type'] && doc['revenue_type']['enum_type']) {
        data['Revenue_Type'] = doc['revenue_type']['enum_type'];
      }
    } else if (item == 'revenue_type.offer_type') {
      data['Revenue_Type'] = '';
      if (doc['revenue_type'] && doc['revenue_type']['offer_type']) {
        data['Revenue_Type'] = doc['revenue_type']['offer_type'];
      }
    } else if (item == 'payout_type.enum_type') {
      data['Payout_Type'] = '';
      if (doc['payout_type'] && doc['payout_type']['enum_type']) {
        data['Payout_Type'] = doc['payout_type']['enum_type'];
      }
    } else if (item == 'payout_type.offer_type') {
      data['Payout_Type'] = '';
      if (doc['payout_type'] && doc['payout_type']['offer_type']) {
        data['Payout_Type'] = doc['payout_type']['offer_type'];
      }
    } else if (item == 'offer_capping.daily_clicks') {
      data['Daily_Click'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['daily_clicks']) {
        data['Daily_Click'] = +doc['offer_capping']['daily_clicks'];
      }
    } else if (item == 'offer_capping.monthly_clicks') {
      data['Monthly_Click'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['monthly_clicks']) {
        data['Monthly_Click'] = +doc['offer_capping']['monthly_clicks'];
      }
    } else if (item == 'offer_capping.overall_click') {
      data['Overall_Click'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['overall_click']) {
        data['Overall_Click'] = +doc['offer_capping']['overall_click'];
      }
    } else if (item == 'offer_capping.daily_conv') {
      data['Daily_Conv'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['daily_conv']) {
        data['Daily_Conv'] = +doc['offer_capping']['daily_conv'];
      }
    } else if (item == 'offer_capping.monthly_conv') {
      data['Monthly_Conv'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['monthly_conv']) {
        data['Monthly_Conv'] = +doc['offer_capping']['monthly_conv'];
      }
    } else if (item == 'offer_capping.overall_conv') {
      data['Overall_Conv'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['overall_conv']) {
        data['Overall_Conv'] = +doc['offer_capping']['overall_conv'];
      }
    } else if (item == 'offer_capping.payout_daily') {
      data['Payout_Daily'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['payout_daily']) {
        data['Payout_Daily'] = +doc['offer_capping']['payout_daily'];
      }
    } else if (item == 'offer_capping.monthly_payout') {
      data['Monthly_Payout'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['monthly_payout']) {
        data['Monthly_Payout'] = +doc['offer_capping']['monthly_payout'];
      }
    } else if (item == 'offer_capping.overall_payout') {
      data['Overall_Payout'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['overall_payout']) {
        data['Overall_Payout'] = +doc['offer_capping']['overall_payout'];
      }
    } else if (item == 'offer_capping.daily_revenue') {
      data['Daily_Revenue'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['daily_revenue']) {
        data['Daily_Revenue'] = +doc['offer_capping']['daily_revenue'];
      }
    } else if (item == 'offer_capping.monthly_revenue') {
      data['Monthly_Revenue'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['monthly_revenue']) {
        data['Monthly_Revenue'] = +doc['offer_capping']['monthly_revenue'];
      }
    } else if (item == 'offer_capping.overall_revenue') {
      data['Overall_Revenue'] = '';
      if (doc['offer_capping'] && doc['offer_capping']['overall_revenue']) {
        data['Overall_Revenue'] = +doc['offer_capping']['overall_revenue'];
      }
    } else if (item == 'geo_targeting.country_allow') {
      data['Country_Allow'] = '';
      if (doc['geo_targeting'] && doc['geo_targeting']['country_allow']) {
        for (let item of doc['geo_targeting']['country_allow']) {
          data['Country_Allow'] += item['key'] + ', ';
        }
      }
    } else if (item == 'geo_targeting.country_deny') {
      data['Country_Deny'] = '';
      if (doc['geo_targeting'] && doc['geo_targeting']['country_deny']) {
        for (let item of doc['geo_targeting']['country_deny']) {
          data['Country_Deny'] += item['key'] + ', ';
        }
      }
    } else if (item == 'geo_targeting.city_allow') {
      data['City_Allow'] = '';
      if (doc['geo_targeting'] && doc['geo_targeting']['city_allow']) {
        for (let item of doc['geo_targeting']['city_allow']) {
          data['City_Allow'] += item['key'] + ', ';
        }
      }
    } else if (item == 'geo_targeting.city_deny') {
      data['City_Deny'] = '';
      if (doc['geo_targeting'] && doc['geo_targeting']['city_deny']) {
        for (let item of doc['geo_targeting']['city_deny']) {
          data['City_Deny'] += item['key'] + ', ';
        }
      }
    }
  }
  return data;
}

function getQueryFilter(networkId, publisherId, data) {
  let match = {};
  match['network_id'] = mongooseObjectId(networkId);
  match['updatedAt'] = { $gte: moment().startOf('day').toDate(), $lte: moment().toDate() };
  if (data.offer_id) {
    let offer_id = validateMongooseObjectIdArray(data.offer_id);
    if (offer_id['invalidMongooseObjectIdArray'] && offer_id['invalidMongooseObjectIdArray'].length) {
      return { error: 'Invalid offer id ' + offer_id['invalidMongooseObjectIdArray'] + '.' };
    }
    if (offer_id['validMongooseObjectIdArray']) {
      let length = offer_id['validMongooseObjectIdArray'].length;
      if (length == 1) {
        match['offer_id'] = offer_id['validMongooseObjectIdArray'][0];
      } else if (length > 1) {
        match['offer_id'] = { '$in': offer_id['validMongooseObjectIdArray'] };
      }
    }
  }
  if (data.offer_name && data.offer_name.trim()) {
    match['offer_name'] = { $regex: data.offer_name.trim(), $options: 'i' };
  }
  if (data.start_date && data.end_date) {
    let startDate = moment(data.start_date);
    let endDate = moment(data.end_date);
    if (startDate.isValid() && endDate.isValid()) {
      match['updatedAt'] = { $gte: startDate.toDate(), $lte: endDate.endOf('minute').toDate() };
    } else {
      return { error: 'Invalid start date or end date.' };
    }
  }
  if (publisherId) {
    match['publisher_id'] = publisherId;
  } else {
    if (data.advertiser_id) {
      let advertiser_id = validateMongooseObjectIdArray(data.advertiser_id);
      if (advertiser_id['invalidMongooseObjectIdArray'] && advertiser_id['invalidMongooseObjectIdArray'].length) {
        return { error: 'Invalid advertiser id ' + advertiser_id['invalidMongooseObjectIdArray'] + '.' };
      }
      if (advertiser_id['validMongooseObjectIdArray']) {
        let length = advertiser_id['validMongooseObjectIdArray'].length;
        if (length == 1) {
          match['advertiser_id'] = advertiser_id['validMongooseObjectIdArray'][0];
        } else if (length > 1) {
          match['advertiser_id'] = { '$in': advertiser_id['validMongooseObjectIdArray'] };
        }
      }
    }
    if (data.publisher_id) {
      let publisher_id = validateIntegerArray(data.publisher_id);
      if (publisher_id['invalidIntegerArray'] && publisher_id['invalidIntegerArray'].length) {
        return { error: 'Invalid publisher id ' + publisher_id['invalidIntegerArray'] + '.' };
      }
      if (publisher_id['validIntegerArray']) {
        let length = publisher_id['validIntegerArray'].length;
        if (length == 1) {
          match['publisher_id'] = publisher_id['validIntegerArray'][0];
        } else if (length > 1) {
          match['publisher_id'] = { '$in': publisher_id['validIntegerArray'] };
        }
      }
    }
  }
  if (data.advertiser_offer_id) {
    if (data.advertiser_offer_id.length == 1) {
      match['advertiser_offer_id'] = data.advertiser_offer_id[0];
    } else {
      match['advertiser_offer_id'] = { '$in': data.advertiser_offer_id };
    }
  }
  if (data.app_id) {
    if (data.app_id.length == 1) {
      match['app_id'] = data.app_id[0];
    } else {
      match['app_id'] = { '$in': data.app_id };
    }
  }
  if (data.platform_id) {
    let platform_id = validateMongooseObjectIdArray(data.platform_id);
    if (platform_id['invalidMongooseObjectIdArray'] && platform_id['invalidMongooseObjectIdArray'].length) {
      return { error: 'Invalid offer id ' + platform_id['invalidMongooseObjectIdArray'] + '.' };
    }
    if (platform_id['validMongooseObjectIdArray']) {
      let length = platform_id['validMongooseObjectIdArray'].length;
      if (length == 1) {
        match['platform_id'] = platform_id['validMongooseObjectIdArray'][0];
      } else if (length > 1) {
        match['platform_id'] = { '$in': platform_id['validMongooseObjectIdArray'] };
      }
    }
  }
  if (data.country) {
    match['geo_targeting.country_allow.key'] = data.country;
  }
  if (data.os) {
    match['device_targeting.os'] = data.os;
  }
  if (data.device) {
    match['device_targeting.device'] = data.device;
  }
  return match;
}

function getExportQueryProjection(publisherId, data) {
  let project = {};
  let removeDataForPublisher = [
    'advertiser_offer_id',
    'platform_id',
    'platform_name',
    'advertiser_id',
    'advertiser_name',
    'tracking_link',
    'expired_url',
    'redirection_method',
    'revenue',
    'isCapEnabled',
    'isgoalEnabled',
    'goal',
    'pubOff',
    'publisher_offers',
    'advertiser_platform_id',
    'isBlacklist',
    'adv_off_hash',
    'createdAt',
    'UserId',
    'revenue_type.enum_type',
    'revenue_type.offer_type',
    'payout_type.enum_type',
    'offer_capping.daily_clicks',
    'offer_capping.monthly_clicks',
    'offer_capping.overall_click',
    'offer_capping.daily_conv',
    'offer_capping.monthly_conv',
    'offer_capping.overall_conv',
    'offer_capping.payout_daily',
    'offer_capping.monthly_payout',
    'offer_capping.overall_payout',
    'offer_capping.daily_revenue',
    'offer_capping.monthly_revenue',
    'offer_capping.overall_revenue'
  ];
  for (let item of data) {
    if (publisherId) {
      if (!removeDataForPublisher.includes(item)) {
        project[item] = 1;
      }
    } else {
      project[item] = 1;
    }
  }
  return project;
}

exports.downloadReport = async (data) => {
  try {
    console.log("===>> Processing started for download id " + data['downloadId']);
    let networkData = await NetworkModel.findOneDoc({ _id: mongooseObjectId(data['networkId']) }, { network_unique_id: 1, offer_export_setting: 1 }, {});
    if (networkData && networkData['network_unique_id']) {
      let query = JSON.parse(data['query']);
      console.log("qiery--",query)
      let publisherId = null;
      let filter = getQueryFilter(data['networkId'], publisherId, query);
      let projection = {};
      console.log("filter query--",filter)
      let networkReportColumn = [];
      if (networkData['offer_export_setting'] && networkData['offer_export_setting'].length) {
        networkReportColumn = networkData['offer_export_setting'];
        projection = getExportQueryProjection(publisherId, networkData['offer_export_setting']);
      }
      let options = { sort: { updatedAt: -1 } };
      let cursor = await OfferModel.getAllOfferByCursor(filter, projection, options);
      let fileName = (data['report'] + '_' + networkData['network_unique_id'] + '_' + new Date().toISOString() + '.csv').replace(/:/g, '_');
      let dir = path.join(__dirname, '../../public/uploads/downloads/' , data['networkId'].toString());
      if (!fs.existsSync(dir)) {
      // fs.mkdirSync(dir, 0o744);
      fs.mkdirSync(dir, { recursive: true, mode: 0o744 });
      }
      const serverFilePath = path.join(dir + '/' + fileName);
      console.log("serverfile Path--",serverFilePath)
      let writerStream = fs.createWriteStream(serverFilePath);
      let csvStream = fastCsv.format({ headers: true, delimiter: "," }).transform((row) => {
      return reportTransformer(row, projection);
      });
      let stream = cursor.pipe(csvStream).pipe(writerStream);
      stream.on('finish', async function () {
        let filePath = '/downloads/' + data['networkId'] + '/' + fileName;
        DownloadCenterModel.updateOneDoc({ _id: mongooseObjectId(data['_id']) }, { $set: { status: 'completed', filePath: filePath } }, {});
        console.log("===>> Processing completed for download id " + data['downloadId']);
      });
      writerStream.on('error', async function () {
        DownloadCenterModel.updateOneDoc({ _id: mongooseObjectId(data['_id']) }, { $set: { status: 'failed', error: 'writer stream error' } }, {});
        console.log("===>> Processing failed for download id " + data['downloadId']);
      });
    } else {
      DownloadCenterModel.updateOneDoc({ _id: mongooseObjectId(data['_id']) }, { $set: { status: 'failed', error: 'invalid network id ' + data['networkId'] } }, {});
      console.log("===>> Processing failed for download id " + data['downloadId']);
    }
  } catch (error) {
    DownloadCenterModel.updateOneDoc({ _id: mongooseObjectId(data['_id']) }, { $set: { status: 'failed', error: error.message } }, {});
    console.log("===>> Processing failed for download id " + data['downloadId']);
  }
}
