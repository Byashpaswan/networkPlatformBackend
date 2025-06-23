const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Double;

const GoalFailedLog = Mongoose.Schema(
    {
        network_id: {
            type: objectIdType
        },
        click_id: {
            type: String
        },
        goal: {
            type: String 
        },
        requested_url: {
            type: String
        },
        offer_id: {
            type: objectIdType
        },
        publisher_id: {
            type: Number
        },
        remarks: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

GoalFailedLog.index({ network_id: 1, offer_id: 1, publisher_id: 1, click_id: 1 });

module.exports = GoalFailedLog;
