const express = require('express');
const route = express.Router();
const debug = require('debug')('darwin:router:IntegrationRouter');

const authentication = require('../../helpers/Auth');
const Functions = require("../../helpers/Functions");
const findAdvOfferIdByfromUrl = require("../../controllers/findOffersFromUrl"); 

route.use(authentication.authenticationToken);

const Network = require('../../controllers/network/networklist');

const WishListController = require('../../controllers/wishlist/wishlistParse');
const WishListController1 = require('../../controllers/wishlist/wishlistParser');
const LinkStatus = require('../../controllers/linkStatus');
const offerController = require('../../controllers/offer/liveOffer');
route.get('/get/offerDetails' , findAdvOfferIdByfromUrl.getAdvertiserOfferData); 
route.get('/get/networks/', Network.getNetworks);
route.post('/reupload/wishlist/', WishListController.refreshUploadedWishList);
route.post('/upload/wishlist', Functions.uploadCSV.single('file'), WishListController1.wishlistParserFromJumbo);
route.get('/get/wishlists/', WishListController.getWishlists);
route.post('/get/wishlistsbynetwork/', WishListController.fetchWishlistByNetworkId);
route.post('/get/wishlists/not/', WishListController.fetchWishlistNotIn);
route.post('/add/wishlist/', WishListController.addWishlist);
route.post('/wishlist/:app_Id', WishListController.deleteWishlistById);
route.post('/add/wishlists', WishListController.addMultipleWishlist);
route.post('/delete/wishlists', WishListController.deleteMultipleWishlist);
route.post('/save/redirectioncount', LinkStatus.saveLinkRedirectionCount);
route.post('/unblock-offer', offerController.unblockOfferAccToAdvOfferHash);

module.exports = route;
