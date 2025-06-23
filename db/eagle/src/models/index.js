//const Mongoose = require('mongoose');
//const MongooseAutoIncrement = require('mongoose-auto-increment');
//MongooseAutoIncrement.initialize(Mongoose.connection);
const User = require("./User");
const Network = require("./Network");
const Role = require('./Role');
const Permission = require('./Permission');
const Platform = require('./Platform');
const Advertiser = require('./advertiser/Advertiser');
const PlatformAccount = require('./advertiser/PlatformAccount');
const ClickLog = require('./click/ClickLog');
const ClickFailed = require('./click/ClickFailed');
const ClickSummary = require('./click/ClickSummary');
const Conversion = require('./conversion/conversion');
const ConversionFailed = require('./conversion/conversionFailed');
const Offers = require('./offer/Offer');
const SmartOffer = require('./offer/SmartOffer');
const ApiOffers = require('./offer/ApiOffer');
const OffersCategory = require('./offer/Category');
const PublisherOffers = require('./offer/PublisherOffers');
const Publisher = require('./publisher/Publisher');
const Postback = require('./publisher/Postback');
const PostbackHold = require('./publisher/PostbackHold');
const Master = require('./system/Master');
const Test = require('./test');
const OffersAuditLog = require('./offer/offersAuditLog');
const WorkingOfferLog = require('./workingOfferLog');
const Currency = require('./currency');
const PublisherOfferRequest = require('./offer/LiveOffer');
const Wishlist = require('./wishlist');
const rejectedAppId = require("./rejectedAppId")

const InviteLink = require('./inviteLink');

const SourceSummary = require('./reports/SourceSummary');
const SourceAdvertiserAffiliateSummary = require("./reports/sourceAdvAffSummary");
const SourceAdvertiserSummary = require("./reports/sourceAdvertiserSummary");
const SourceAffiliateSummary = require("./reports/sourceAffiliateSummary");
const OffersSourceSummaryReports = require("./reports/OffersSourceSummaryReports");
const DailySummaryReport = require("./reports/dailySummary");
const AdvertiserSummaryReport = require("./reports/advSummary");
const PublisherSummaryReport = require("./reports/pubSummary");
const AppSummaryReport = require("./reports/appSummary");
const AppidPublisherSummaryReport = require("./reports/appidPublisherSummary");
const SummaryLogSchema = require("./reports/summaryLog");
const SourceOfferPublisherSummary = require("./reports/sourceOfferPublisherSummary");
const AdvertiserOfferPublisherSummary = require("./reports/AdvertiserOfferPublisherSummary");
const MonthlyAdvertiserOfferPublisherSummary = require("./reports/MonthlyAdvertiserOfferPublisherSummary");

const OfferApiStats = require("./offer/OfferApiStats");
const ForwardPostbacks = require("./forwardPostbacks");
const AppIdSummary = require("./appIdSummary");
const PackageSummary = require("./packageSummary");
const GoalConvFailed = require("./conversion/goalConvFailed");
const DownloadCentre = require("./DownloadCentre")
const WorkerStatus = require("./workerStatus")

const Integration = require('./integration/Integration');
const ApplicationDetails = require("./applicationDetails/ApplicationDetails");
const PConversion = require("./click/PConversion");
const SchedulerData = require("./schedulerdata");
const offerImportStat = require("./offerImportStat");
const sendbox_clicklogs = require("./sendbox_clicklogs")

const webhook = require('./webhook');
const TotalDashboardStats = require("./dashboard/TotalDashboardStats");
const DeletedOffers = require("./offer/DeletedOffer");
const UserActivityLog = require("./userActivityLog");
const DownloadCenter = require("./downloadCenter/DownloadCenter");
const AdvertiserOfferPublisherSourceSummary = require('./reports/AdvertiserOfferPublisherSourceSummary');
const BlockOffer = require('./offer/BlockOffer');
const Categories = require('./Categories');
const advertiserOfferNetwork = require('./advertiserOfferNetwork') ;
const advOfferIdLocationInUrl = require('./advOfferIdLocationInUrl');
const LiveDaily_AdvertiserOfferPublisherSourceSummary=require('./reports/LiveDaily_AdvertiserOfferPublisherSourceSummary');
const handlingDomain =require('./handlingDomain/handlingDomain');
const AdvertiserOfferStats=require('./offer/AdvertiserOfferStats')
const ApplicationStatus = require('../models/applicationStatus/applicationStatus')
const PublisherLog = require("./PublisherLog/PublisherLog")
const Features = require('../models/features/features')
const publisher_v2=require('../models/publisher/publisherV2.0')
const InvoiceDroft=require('../models/invoicedraft/invoiceDraft')
const chatLog=require('../models/charlog')


module.exports = {
  PublisherLog : PublisherLog , 
  Features : Features ,
  ApplicationStatus : ApplicationStatus,
  advertiserOfferNetwork : advertiserOfferNetwork ,
  advOfferIdLocationInUrl : advOfferIdLocationInUrl ,
  User: User,
  Network: Network,
  Role: Role,
  Permission: Permission,
  Test: Test,
  Platform: Platform,
  Advertiser: Advertiser,
  PlatformAccount: PlatformAccount,
  ClickLog: ClickLog,
  ClickSummary: ClickSummary,
  Conversion: Conversion,
  ConversionFailed: ConversionFailed,
  Offers: Offers,
  OffersCategory: OffersCategory,
  ApiOffers: ApiOffers,
  PublisherOffers: PublisherOffers,
  OffersAuditLog: OffersAuditLog,
  OfferApiStats: OfferApiStats,
  PublisherOfferRequest: PublisherOfferRequest,
  WorkingOfferLog: WorkingOfferLog,
  Publisher: Publisher,
  Postback: Postback,
  PostbackHold: PostbackHold,
  Master: Master,
  ClickFailed: ClickFailed,
  Currency: Currency,
  Wishlist: Wishlist,
  SourceSummary: SourceSummary,
  SourceOfferPublisherSummary: SourceOfferPublisherSummary,
  SourceAdvertiserAffiliateSummary: SourceAdvertiserAffiliateSummary,
  SourceAdvertiserSummary: SourceAdvertiserSummary,
  SourceAffiliateSummary: SourceAffiliateSummary,
  DailySummary: DailySummaryReport,
  AdvertiserSummary: AdvertiserSummaryReport,
  PublisherSummary: PublisherSummaryReport,
  AppSummary: AppSummaryReport,
  AppidPublisherSummary: AppidPublisherSummaryReport,
  SummaryLogSchema: SummaryLogSchema,
  OffersSourceAdvAffSummary: OffersSourceSummaryReports,
  AdvertiserOfferPublisherSummary: AdvertiserOfferPublisherSummary,
  MonthlyAdvertiserOfferPublisherSummary: MonthlyAdvertiserOfferPublisherSummary,
  ForwardPostbacks: ForwardPostbacks,
  AppIdSummary: AppIdSummary,
  GoalConvFailed: GoalConvFailed,
  Integration: Integration,
  ApplicationDetails: ApplicationDetails,
  InviteLink: InviteLink,
  DownloadCentre: DownloadCentre,
  DownloadCenter: DownloadCenter,
  PConversion: PConversion,
  SchedulerData: SchedulerData,
  rejectedAppId: rejectedAppId,
  offerImportStat: offerImportStat,
  webhook: webhook,
  sendbox_clicklogs: sendbox_clicklogs,
  TotalDashboardStats: TotalDashboardStats,
  DeletedOffers: DeletedOffers,
  UserActivityLog: UserActivityLog,
  AdvertiserOfferPublisherSourceSummary: AdvertiserOfferPublisherSourceSummary,
  PackageSummary: PackageSummary,
  WorkerStatus: WorkerStatus,
  Categories: Categories,
  SmartOffer: SmartOffer,
  BlockOffer: BlockOffer,
  LiveDaily_AdvertiserOfferPublisherSourceSummary:LiveDaily_AdvertiserOfferPublisherSourceSummary,
  HandlingDomain:handlingDomain,
  AdvertiserOfferStats:AdvertiserOfferStats,
  Publisher_v2:publisher_v2,
  InvoiceDroft:InvoiceDroft,
  chatLog:chatLog

};
