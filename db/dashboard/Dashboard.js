const Mongoose = require('mongoose');
const { TotalDashboardStats } = require("../Model");

TotalDashboardStats.statics.updateOneDoc = async function (filter, reflect, options) {
    return await this.updateOne(filter, { $set: reflect }, options);
}

TotalDashboardStats.statics.deleteManyDocs = async function (filter) {
    return await this.deleteMany(filter);
}

TotalDashboardStats.statics.countStats = async function (filter, groupBy, sortBy) {
    return await this.aggregate([{ $match: filter }, { $group: groupBy }]).sort(sortBy).allowDiskUse(true);
}
TotalDashboardStats.statics.getDataByTimeSlot = async function ( filter , projections ){
    return await this.find( filter , projections ).sort({ timeSlot : -1 }).limit(1);
}
TotalDashboardStats.statics.insertData = async function ( insertData ){
    return await this.insertOne(insertData) ;
} 

module.exports.DashboardStatsModel = Mongoose.model('dashboard_stats', TotalDashboardStats);