const wishlistParser = require("../../controllers/wishlist/wishlistParse")
module.exports = (agenda) => {

    agenda.define('reuploadWishlist', async (job, done) => {

        // console.log("Reupload Wishlist Scheduler Start Executing");
        // console.log("job.attrs.data ", job.attrs.data);
        try {
            let jobData = job.attrs.data;
            await wishlistParser.reuploadedWishListFromScheduler(jobData.NetworkId)
        }
        catch (err) {
            console.log("=========== Error in scheduling job", err);
        }
        done();
    });
}