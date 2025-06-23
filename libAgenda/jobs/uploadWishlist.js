const wishlistParser = require("../../controllers/wishlist/wishlistParse")
module.exports = (agenda) => {

    agenda.define('uploadWishlist', async (job, done) => {

        console.log("Upload Wishlist Scheduler Start Executing");
        // console.log("job.attrs.data ", job.attrs.data);
        try {
            let jobData = job.attrs.data;
            await wishlistParser.uploadedWishListFromScheduler(jobData)
        }
        catch (err) {
            console.log("=========== Error in scheduling job", err);
        }
        done();
    });
}