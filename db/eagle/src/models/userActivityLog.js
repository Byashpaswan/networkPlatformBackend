const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:UserActivityLog");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;

const UserActivityLog = Mongoose.Schema(
    {
        network_id: {
            type: objectIdType,
            required: true
        },
        user_id: {
            type: objectIdType,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
        },
        activity_type: {
            type: String,
        },
        log: {
            type: String,
        },
        url_path: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
        versionKey: false
    }
);


module.exports = UserActivityLog;