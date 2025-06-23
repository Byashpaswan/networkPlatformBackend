const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const InviteLink = Mongoose.Schema(
    {
        hash: {
            type: String,
            required: true
        },
        network_id: {
            type: objectIdType,
            required: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
)
InviteLink.index({ createdAt: 1 }, { expireAfterSeconds: 90 });
module.exports = InviteLink;