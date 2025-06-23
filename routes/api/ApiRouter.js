const express = require('express');
const route = express.Router();
const Functions = require("../../helpers/Functions");
const Validation = require("../../validations/Validator");
const authentication = require('../../helpers/Auth');
const permissions = require('express-jwt-permissions')();
const Platform = require("../../controllers/platform/Platform");
const ApiOffer = require('../../controllers/offer/apiOffer');
const Offer = require('../../controllers/offer/Offer');
const SmartOffer = require('../../controllers/offer/smartOffer');
const OfferValidation = require('../../validations/offerValidation');
const validation = require('../../validations/validation');
const Publisher = require('../../controllers/publisher/Publisher');
const PublisherLog = require("../../controllers/publisher/publisherLog")
const PublisherOffer = require('../../controllers/publisher/publisherOffer/publisherOffer');
const PermissionController = require("../../controllers/Permissions");
const RolesController = require("../../controllers/Roles");
const permissionAndRoleValidation = require('../../validations/permissionAndRoleValidation');
const userValidation = require('../../validations/userValidation');
const User = require("../../controllers/user/User");
const postbackValidation = require("../../validations/postback")
const Postback = require("../../controllers/postback/Postback");
const OfferCategoryValidation = require('../../validation/offerCategoryValidation');
const Network = require('../../controllers/network/networklist');
const NetworkUpdate = require('../../controllers/network/updateNetworkPostbackList')
const registerValidation = require('../../validations/registerValidation');
const publisherValidator = require('../../validations/publisherValidation');
const advertiserValidator = require('../../validations/advertiserValidation');
const AdvertiserController = require("../../controllers/advertiser/Advertiser");
const OfferAuditLog = require('../../controllers/offer/offerAuditLog');
const Currency = require('../../controllers/currency')
const ClickLog = require('../../controllers/reports/click/click');
const ReportConversion = require('../../controllers/reports/conversion/conversion');
const LiveOffer = require('../../controllers/offer/liveOffer');
const Login = require("../../controllers/login/Login");
const jsonToCsvFileDownloader = require("../../controllers/json2csv/jsonToCsv");
const WishListController = require('../../controllers/wishlist/wishlistParse');
const OfferApiStats = require('../../controllers/offer/offerApiStats');
const PackageSummaryController = require('../../controllers/summary/appIdSummary');
const clickfails = require('../../controllers/reports/click/clickfails');
const inviteLink = require('../../controllers/invitelink');
const downloadCenter = require('../../controllers/downloadCentre');
const viewAsPublisher = require('../../controllers/viewAsPublisher/offers')
const viewPublisherapi = require('../../controllers/viewAsPublisher/publisher')
const viewpostback = require('../../controllers/viewAsPublisher/postback')



const wishlistValidate = require("../../validations/wishlistValidation");
const Integration = require('../../controllers/integration/Integration');
const ApplicationDetails = require('../../controllers/applicationDetails/ApplicationDetails');
const ExportReport = require('../../libAgenda/jobControllers/exportReport')
const ReuploadWishlist = require('../../libAgenda/jobControllers/reuploadWishlist')
const UploadWishlist = require('../../libAgenda/jobControllers/uploadWishlist')


const networkDashboard = require('../../controllers/dashboard/networkDashboard');
const publisherDashboard = require('../../controllers/dashboard/publisherDashboard');
const offerImportStats = require('../../controllers/offerImportStats/offerImportStats');



const webHook = require('../../controllers/webHook/webhook');

const sendbox_clicklogs = require('../../controllers/sendbox_clicklogs')

const campaigns = require('../../controllers/campaigns/Campaigns');
const Billing = require('../../controllers/billing/Billing');
const ApiRedisQueue = require('../../controllers/apiRedisQueue/ApiRedisQueue');
const DownloadCenter = require('../../controllers/DownloadCenter');
const pushBulkOfferStatus = require('../../controllers/offer/pushBulkOfferStatus');
const Categories = require('../../controllers/Categories');
const Features = require("../../controllers/network/features");

route.get('/get/external/package/summary', PackageSummaryController.getExternalPackageSummary);

route.use(authentication.tokenAuthentication);

// Platform Type Routes
route.post("/platform/types/create", Functions.upload.array('file', 2), Validation.platformTypes, Platform.platformTypeExistance, Platform.savePlaformType)
// route.get('/platform/types/show', permissions.check('manager'), Platform.allPlatformTypes); // for list
route.get('/platform/types/show', Platform.allPlatformTypes); // for list
route.get('/platform/type/show/:id', Platform.allPlatformTypes);
route.put("/platform/types/update/:id", Functions.upload.array('file', 2), Validation.platformTypes, Platform.updatePlatformType)
route.delete('/platform/types/delete/:id', Platform.deletePlatformTypes)


// PlatformAccount Routes
route.post('/platform/check/', Platform.checkApidetails);
route.post('/platform/create/:advertiser_id', Validation.platform, Functions.saveUserActivity, Platform.addPlatform)
route.put('/platform/update/:id', Validation.platform, Functions.saveUserActivity, Platform.updatePlatform)
route.get('/platform/show/:id', Platform.allPlatform);
route.get('/platformtypes/show', Platform.getPlatformTypes);
route.get('/platforms/show/:advertiser_id', Platform.allPlatform);
route.get('/adv/plat/:advertiser_id', Platform.getAdvPlatforms);
route.get('/platforms/list/:network_id', Platform.allPlatform);
route.post('/platform/delete/:id', Functions.saveUserActivity, Platform.deletePlatform);
route.get('/platformtypes/show/allName', Platform.getplatformTypeName);
// route.get('/platform/view/platformName', Platform.platformNameView);
// route.post("/platform",Functions.upload.array('file',2),Validation.platformTypes,Platform.platformTypeExistance,  Platform.savePlaformType)
// End PlatformAccount routes

// new routes platform
route.put('/update/platform/publisher/:id', Functions.saveUserActivity, Platform.updatePlatformByPublisher);
route.put('/update/platform/auto', Platform.updatePlatformAuto);
route.post('/update/platform/status', Platform.updatePlatformStatus);
route.get('/get/platforms', Platform.getPlatform);

//**generating token for external user */
route.get('/getInviteToken', inviteLink.inviteLink);

//Live Offers Routes
route.post("/offer/assign/publisher", Offer.fetchPublisherDetails)
route.post("/offer/create", OfferValidation.checkOffer, Functions.saveUserActivity, Offer.offerStore);

route.post("/validate/offers", Offer.formatAndValidateMultipleOffers);
route.post("/import/offers", Offer.importMultipleOffers);
route.post("/assign/publisher/offers", Offer.assignPublisherToOffers);
route.post("/unassign/publisher/offers", Offer.unassignPublisherOffers);
route.get("/offer/stats/data", offerImportStats.getStatsData);

route.post("/:routeType/offer/allOffers", Offer.getOffers);
route.post("/get/publisher/offers", Offer.getPublisherOffers);
// route.post("/get/working/publisher/offers", Offer.getPublisherWorkingOffers);
route.post("/publisher/all/offers", Offer.getPublisherAllOffers);
route.post("/count/publisher/offers", Offer.countPublisherOffers);
route.post("/publisher/offer/getOffers", Offer.getOffersToExport, jsonToCsvFileDownloader.downloadFile);
// route.post("/publisher/offer/offersExprt/:pid", Offer.exportPublisherOffers, jsonToCsvFileDownloader.downloadFile);
route.post("/publisher/offer/offersExprt/:pid", Offer.exportPublisherOffers);
route.post("/offer/update/status", Offer.offerStatusUpdate);
route.put("/offer/update/:id", OfferValidation.checkOffer, Functions.saveUserActivity, Offer.offerUpdate);
route.get("/offer/edit/:Offer_id", Offer.getOfferDetails);
route.get("/offer/show/:Offer_id", Offer.offerShow);
route.post("/publisher/offer/fetchPublishers", Publisher.findPublisher)
route.post("/publisher/offer/insert", Offer.insertPublisherOffer);
route.post("/publisher/offer/insertTo",Offer.insertPublisherInOffer)
route.post("/publisher/offer/unassign", Offer.unAssignPublisherOffer);
// route.post("/publisher/offer/insert", PublisherOffer.insertPublisherOffer, Offer.insertPublisherOffer);
route.get("/offer/log/:Offer_id", OfferAuditLog.offerLogShow);
route.post("/offer/liveOfferApply", LiveOffer.handlePublisherApplyRequest);
route.post("/publisher/apply/offers/request", LiveOffer.publisherApplyOffersRequest);
route.post("/publisher/offer/request", LiveOffer.getPublisherOfferData);
route.post("/offer/liveOfferApplyDb/:pid", LiveOffer.getLiveOfferDb);
route.put("/offer/publisher/approve/status/:pid", LiveOffer.updateApprovedStatusOfferPublisher);
route.put("/offer/publisher/reject/status/:pid", LiveOffer.updateRejectedStatusOfferPublisher);
route.put("/offer/approve/status/:pid", LiveOffer.updateStatusOnePublisherOffer);
route.put("/offer/reject/status/:pid", LiveOffer.updateStatusOnePublisherOffer);
route.get("/get/publisher/link/settings", Network.getPublisherLinkSettings);
route.get("/network/offerclone/:offer_id", Offer.offerClone);
route.post("/push/offer", LiveOffer.pushOfferInWebhook);

route.post("/single/offer/webhook" , LiveOffer.singleOfferInWebhook) ; 
route.post("/offer/liveOfferStatus", Offer.updateOfferStatus);
route.get("/offer/downloadcenter/data", downloadCenter.getallData);
route.post("/publisher/offer/download", Offer.getDownloadServerFile);
route.post("/offer/delete/downloadcenter/data", Offer.deleteDataById);
route.post("/offer/checkpath/downloadcenter/data", Offer.checkPath);
route.get("/offer/setting/keys", Offer.getOfferSettingData);
route.post("/offer/update/ewt", Offer.updateEwtTime);
// Api Offers Routes
route.post("/apioffer/allOffers", ApiOffer.getOffers);
route.post("/apioffer/update/status", ApiOffer.offerStatusUpdate);
route.post("/apioffer/update/status2", ApiOffer.offerApplyFromUi);
route.get("/apioffer/show/:Offer_id", ApiOffer.offerShow);
route.post("/apioffer/live/offer", ApiOffer.makeoffersLive);

// Routing for OfferApiStats
route.get("/advertiser/offer/stats", OfferApiStats.getOfferApiStats);
route.get('/offer/stats/advertiser', OfferApiStats.getallofferApistats)
route.get('/getAdvertiserName', OfferApiStats.getAdvertiserName);
route.post('/refresh/api', OfferApiStats.updateOfferInstantly);
route.post('/test/api', OfferApiStats.getApiOffersForTestApi);
route.get('/offer/stats/advertiserOffer',OfferApiStats.getAdvertiserOffers);

// Roles and Permission routes
route.post('/permissions', permissionAndRoleValidation.Permissions, PermissionController.permission);
route.post('/gettingPermissions', PermissionController.gettingPermissionDb);
route.post('/add/custom/roles', permissionAndRoleValidation.Roles, RolesController.AddCustomRole);
route.get('/get/roles', RolesController.getAllRoles);
route.get('/get/roles/:id', RolesController.getRole);
route.get('/system/roles', RolesController.getSystemRoles);
route.get('/rolesList', RolesController.getListRoles);
route.put('/update/roles/:id', RolesController.updateListRoles);
route.delete('/delete/roles/:id', RolesController.deleteListRoles);



// user routes //
route.get('/userProfile/:id', User.getSingleUser);
route.post('/system/add/user', permissions.check(['system']), userValidation.user, User.addSystemUser);
route.post('/add/user', permissions.check([['user.create'], ['aff.user.add'], ['adv.user.add']]), Functions.uploadUserProfileImage.array('profile_image', 2), User.addUser);
route.get('/user', permissions.check([['user.list'], ['aff.user.list'], ['adv.user.list']]), User.getUser);
route.get('/get/network/owner' , User.getNetworkOwner);

route.get('/user/:id', User.getSingleUser);
route.put('/update/user/:id', permissions.check([['user.edit'], ['aff.user.edit'], ['adv.user.edit']]), Functions.uploadUserProfileImage.array('profile_image', 2), User.updateUser);///// userValidation.user,
route.put('/update/user/password/:id', permissions.check([['user.edit'], ['aff.user.edit'], ['adv.user.edit']]), userValidation.password, User.updatePassword);
route.delete('/delete/user/:id/:email', permissions.check([['user.delete']]), User.deleteUser);
route.get('/publisherUsers/:id', permissions.check(['aff.user.list'], ['network']), User.Users)
route.get('/advertiserUsers/:id', permissions.check(['adv.user.list'], ['network']), User.Users)
route.post('/type/user/list/:id', User.Users);
route.post('/type/user/add', userValidation.user, User.addTypeUser);

// new routes user
route.get('/get/managers', User.getManagers);

//Postback Routes//
route.post("/postback/create/:id", postbackValidation.postback, Postback.addPostback)
route.get("/postback/show", Postback.showPostback)
route.delete("/postback/delete/:id", Postback.deletePostback)
route.get("/postback/show/:id", Postback.showPostback)
route.get('/postback/status/:publisher_id', Postback.showPostback);
route.post('/postback/update/status/:publisher_id' , Postback.changeStatus) ;
route.put("/postback/update/:id", postbackValidation.postback, Postback.updatePostback)
route.get("/hold/postback/all", Postback.getAllHoldPostback);
route.get("/hold/postback/:publisher_id", Postback.getAllHoldPostback);
route.get("/hold/postback/data/:id", Postback.getAllHoldPostback);
route.post("/save/hold/postback", Postback.saveHoldPostback);
route.post("/update/hold/postback/:id", Postback.updateHoldPostback);
route.delete("/hold/postback/:holdPostbackId", Postback.deleteHoldPostback);
route.delete("/approve/hold/postback/:holdPostbackId", Postback.approveHoldPostback);


// Advertiser Routes //
route.post('/advertiser/save', Functions.upload.array('file', 2), Functions.saveUserActivity, AdvertiserController.saveAdvertiser);
route.put('/advertiser/update/:id', Functions.upload.array('file', 2), Functions.saveUserActivity, AdvertiserController.updateAdvertiser);
route.get('/advertiser/manager', AdvertiserController.getAllManager);
route.get('/advertiser/accounts', AdvertiserController.getAccount);
route.post('/advertiser/view/all', AdvertiserController.getAllAdvertiser);
route.get('/advertiser/view/:id', AdvertiserController.getAdvertiserDetails);
route.delete('/advertiser/delete/:id/', AdvertiserController.deleteAdvertiser);
route.get('/advertiser/view', AdvertiserController.getAllAdvertiserName);
route.get('/active/advertiser/name', AdvertiserController.getActiveAdvertiserName);
route.put('/advertiser/inactive/:id', AdvertiserController.deActivateAdvertiser);
route.put('/advertiser/active/:id',AdvertiserController.doActiveAdvertiser);


// Publisher Routes //
route.get('/publisher/list/', permissions.check([['aff.view']]), Publisher.findAllPublisher);
route.get('/publisher/accounts', Publisher.getAccount);
route.post('/publisher/list/:pubId/', Publisher.findAllPublisher);
route.put('/publisher/update/cutback/:pubId', Publisher.updatePublisherCutback);
route.delete('/publisher/list/:pubId/', Publisher.deletePublisher);
route.post('/publisher/view', Publisher.getAllPublishers);
route.get('/publisher/view/byname', Publisher.getAllPublisherName);
route.post('/get/publisherlog' , PublisherLog.getPublisherLog);

route.put('/publisher/inactive/:id',Publisher.deActivatePublisher)
route.put('/publisher/active/:id',Publisher.activatePublisher);
// new routes publisher
route.get('/get/publisher/:id/', permissions.check([['aff.view']]), Publisher.getPublisher);
route.post('/add/publisher/', permissions.check([['aff.create']]), Functions.upload.array('file', 2), Functions.saveUserActivity, Publisher.addPublisher);
route.put('/update/publisher/:id', permissions.check([['aff.edit']]), Functions.upload.array('file', 2), Functions.saveUserActivity, Publisher.updatePublisher);
route.put('/update/publisher/auto/approve/:id', permissions.check([['aff.edit']]), Publisher.updatePublisherAutoApprove);
route.post('/publisher/updateFinancial/:id', permissions.check([['aff.edit']]), Functions.saveUserActivity, Publisher.UpdateFinancial);


// publisher api credentials //
route.get("/credential/create/:id", Publisher.createCredentials)
route.get("/credential/create/", Publisher.createCredentials)
route.put("/credential/update/:id", Publisher.updateCredentials)
module.exports = route;

//features 
route.get('/get/network/features', Features.getFeaturesByNetwork);
route.get('/get/features', Features.getFeatures);
route.post('/create/features',Features.createFeatures);
route.post('/update/features', Features.updateFeatures);
route.post('/get/single/network',Network.getSingleNetworks);

//network api
route.get('/network/list/', Network.allNetwork);
route.get('/get/networks/', Network.getNetworks);
route.post('/network/list/search/', Network.getOneNetwork);
route.post('/network/get/theme/', Network.getTheme);
route.post('/network/get/themeM/', Network.getThemeM);
route.post('/network/save/themeM/', Network.saveNetworkThemeM);
route.post('/network/save/theme/', Network.saveNetworkTheme);
route.post('/network/list/search/:netId/',Network.getOneNetwork);
route.delete('/network/list/:netId/', Network.deleteNetwork);
route.put('/network/list', registerValidation.RegisterNetwork, Network.updateNetwork);
route.put('/network/upload/logo/', Functions.uploadNetworkLogo.single('network_logo'), Network.updateNetworkLogo);
route.put('/network/upload/logo/medium', Functions.uploadNetworkLogoMedium.single('network_logo'), Network.updateSecondaryNetworkLogo);
route.put('/network/upload/logo/small', Functions.uploadNetworkLogoSmall.single('network_logo'), Network.updateSecondaryNetworkLogo);
route.post('/network/setting/save', Functions.saveUserActivity, Network.saveSetting);
route.get('/get/network/setting', Network.getSettings);
route.post('/network/postback/forwarding/save', Functions.saveUserActivity, Network.savePostbackForwarding);
route.post('/network/postback/forwarding/update', Network.savePostbackForwarding);
route.post('/network/offer/setting/keys', Functions.saveUserActivity, Network.updateOffer_export_setting);
route.get('/get/offer/setting/keys', Network.findOfferSettingKey)
route.post('/network/setting/savedomain', Functions.saveUserActivity, Network.savedomain);
route.post('/network/setting/save/timezone', Functions.saveUserActivity, Network.saveTimeZone);
route.get('/get/network/postback/forwarding/setting', Network.getNetworkPostback);
route.post('/delete/network/postback/forwarding/setting', Network.deleteNetworkPostback);
route.post('/update/network/postback/forwarding/setting' , NetworkUpdate.updateNetworkPostbackStatus );
 // new route for save networkDomain
route.post('/network/setting/saveNetwokDomain', Functions.saveUserActivity, Network.saveNetwokDomain);
route.get('/network/setting/getHndData',Network.getHandlingDomainData);
route.get('/network/setting/getNetworkData',Network.getNetworkDomainData);
route.post('/network/setting/deleteNetworkDomain',Network.deleteNetworkDomain);
route.post('/network/setting/updatestatus',Network.updateStatus);
route.post('/network/setting/PublisherIdPrefix',Network.UpdatePublisherIdPrefix)
route.post('/network/setting/IpBlockWithoutTestClick',Network.IpBlockWithoutTestClick)
route.post('/network/setting/IpBlockWithTestClick',Network.IpBlockWithTestClick)
route.post('/network/setting/advLink',Network.saveAdvLinkStatus)
route.post('/network/setting/pubLink',Network.savePubLinkStatus)
route.post('/network/setting/exportOfrSet',Network.setOfferExportSetting)
route.post('/network/setting/exportReport',Network.setReportExportSetting);
route.post('/network/setting/cutPercent',Network.setCutpercentage);
route.post('/network/report/setting/keys', Functions.saveUserActivity, Network.updateReport_export_setting)
route.get('/get/report/setting/keys', Network.findReportSettingKey)
route.post('/network/update/financial',Network.UpdateFinancial);

route.get('/faildclicks/', clickfails.getclickfails);
route.get('/getcurrency/', Currency.ShowCurrency);
route.post('/report/clicklog/', ClickLog.getClickReport);
route.get('/getClicks', ClickLog.getClickDb)

route.post('/report/summary/get', ReportConversion.getConversionSummary);
route.post('/conversion/view', ReportConversion.getConversion);
route.post('/click/view', ReportConversion.getClick);

//get conversionFailed
route.post('/conversionFailed/view', ReportConversion.getConversionFailed)

route.post('/logout', Login.logout);



//wishlist upload
route.post('/upload/wishlist', Functions.uploadCSV.single('file'), WishListController.wishlistParser);
route.get('/get/wishlist', WishListController.fetchWishlist);

route.get('/get/wishlists/', WishListController.getWishlists);
route.post('/add/wishlist/', WishListController.addWishlist);
route.delete('/wishlist/:_id/', WishListController.deleteWishlistById);
route.post('/delete/wishlists/', WishListController.deleteMultipleWishlists);
route.post('/get/wishlistsbynetwork/', WishListController.fetchWishlistByNetworkId);
route.post('/get/wishlists/not/', WishListController.fetchWishlistNotIn);

// Integration Routes......
route.get('/integrations/', Integration.getIntegrations);
route.get('/integration/:name/', Integration.getIntegrationByName);
route.post('/integration/add/', Integration.saveIntegration);
route.post('/integration/update/', Integration.updateIntegration);
route.delete('/integration/:_id/', Integration.deleteIntegration);

route.post('/packagesummary/get', PackageSummaryController.getSummary);
route.post('/wishlist/single/add', WishListController.addAppId)

// Application Details Routes...
route.post('/application/details', ApplicationDetails.getApplicationDetails);
route.get('/application/categories', ApplicationDetails.getApplicationCategories);

route.post('/viewpublisher/:routeType/offer/allOffers', viewAsPublisher.getOffers)
route.get("/viewcredential/create/:id", viewPublisherapi.createCredentials)
route.put("/viewcredential/update/:id", viewPublisherapi.updateCredentials)
route.post("/getpublisherdetails", viewPublisherapi.getPublisherDetails)
route.post("/viewpublisher/postback/show", viewpostback.showPostback)
route.delete("/viewpublisher/postback/delete/:id", viewpostback.deletePostback)
route.post("/viewpub/offer/show/:Offer_id", viewAsPublisher.offerShow);




// Url for scheduler
route.post('/schedule/job/exportreport', ExportReport.scheduleExportReport)
route.post('/schedule/job/reupload/wishlist', ReuploadWishlist.scheduleReuploadWishlistJob)
route.post('/schedule/job/upload/wishlist', Functions.uploadCSV.single('file'), UploadWishlist.scheduleUploadWishlistJob)
route.get('/scheduler/alljob', ExportReport.getAllSchedulerJob)
route.post('/scheduler/canceljob', ExportReport.cancelScheduleJob)


//Network Dashboard Routing
route.post('/get/network/dashboard/data', networkDashboard.getDashboardData);
route.post('/get/publisher/dashboard/data', publisherDashboard.getDashboardData);
route.get('/publisher/get', Publisher.getLoginPublisher);

//Webhook Routing
route.get('/webHook/getOffersKeys', webHook.getOffersKeys)
route.get('/webhook/fetchWebhookSetting', webHook.fetcheWebhookSetting)
route.post('/webhook/updateWebhookSetting', Functions.saveUserActivity, webHook.updateWebhookSetting)
route.post('/webhook/saveWebhookSetting', webHook.saveWebhookSetting)
route.get('/webhook/deleteSetting', webHook.deleteSetting)
route.get('/webhook/getPublishers', webHook.getPublishers)
route.post('/webhook/change_Flag', webHook.change_Flag)


route.post('/integration/test/', sendbox_clicklogs.sendbox_clicklogs);
route.post('/integration/test/click/list', sendbox_clicklogs.getTestClick);

route.get('/get/campaigns/', campaigns.getCampaigns);
route.post('/approve/pending/conversion/', ReportConversion.approvePendingConversions);
route.post('/change/conversionStatus/',ReportConversion.changeStatusConversion)

route.post('/blacklist/offer', LiveOffer.blacklistOffer);
route.post('/unblock/offer', LiveOffer.unblockOffer);

route.post('/platforms/details', Offer.getSingleOfferInfoFromApi);
// SYNC OFFER FROM API
route.post('/sync/offer', Offer.getSingleOfferInfoFromApi);
route.post('/sync/multi/offer', Offer.syncOfferFromApi);

route.post('/get/all/billing', Billing.getBillingInfo);
route.post('/billing/publisher', Billing.getBillingByPublisher);
route.post('/update/billing', Billing.updateBillingByPublisher);
route.post('/billing/group', Billing.getBillingByGroup);
route.post('/billing/group/advertiser', Billing.getBillingGroupByAdvertisers); //getBillingGroupByAdvertisers getBillingGroupByAdvertiser
route.post('/invoice/view', Billing.getInvoiceByAdvertiserId);
route.post('/invoice/advertiser', Billing.getInvoiceByAdvertiserId);
route.post('/invoice/draft', Billing.getDraftInvoiceByAdvertiserId);
route.post('/invoice/draft/save',Billing.saveInvoiceInDrafts)
route.post('/invoice/generatebyGroup',Billing.generateInvoice2) //generateInvoice
route.post('/invoice/update',Billing.updateInvoiceDraft);
route.post('/get/redis/queue', permissions.check(['system']), ApiRedisQueue.getApiRedisQueue);
route.post('/delete/redis/queue/data', permissions.check(['system']), ApiRedisQueue.deleteApiRedisQueueData);
route.get('/get/queue', permissions.check(['system']), ApiRedisQueue.getRabbitMQueueDetails);

// Download Center routes
route.get('/get/download_center/data', DownloadCenter.getDownloadCenterData);
route.post('/delete/download_center/data', DownloadCenter.deleteDownloadCenterData);
route.post('/save/report', DownloadCenter.saveReport);

// Worker status
route.get('/worker/status', pushBulkOfferStatus.getAllWorkerStatus);

route.get('/publisher/login/token/:id', User.getPublisherLoginToken);
route.get('/publisher/login_v2/token/:id',User.getPublisherTokenLoginToken2)

route.get('/get/categories', Categories.getCategories);
route.post('/add/category', Categories.addCategory);
route.post('/update/category/:id', Categories.updateCategory);

/** Route For Smart Offer */
route.post('/smartoffer/save', SmartOffer.saveSmartOffer);
route.get('/smartoffer/:id', SmartOffer.getSmartOffer);
route.put('/smartoffer/:id', SmartOffer.updateSmartOffer);
route.delete('/smartoffer/:id', SmartOffer.deleteSmartOffer);
route.get('/smartoffer', SmartOffer.getAllSmartOffer);