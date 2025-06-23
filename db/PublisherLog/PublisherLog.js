const Mongoose = require('mongoose');
const { PublisherLog } = require('../Model')


PublisherLog.statics.insertPublisherLog = async function (data) {
    try {
        const result = await this.create(data);  // Use `create` instead of `insertOne`
        return result;
    } catch (error) {
        console.error("Error inserting publisher log:", error);
        throw error;
    }
};

PublisherLog.statics.getPublisherLogDb  = async function (filter , projection  , options) {
    return this.find( filter  , projection  , options );
}
PublisherLog.statics.getTotalPagesCount  =async function (filter ){
    return this.find( filter );
} 
module.exports = Mongoose.model('publisher_log', PublisherLog);




