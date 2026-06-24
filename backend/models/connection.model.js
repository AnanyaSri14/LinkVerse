import mongoose from "mongoose";

export const CONNECTION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected"
};

export const buildPairKey = (firstUserId, secondUserId) => {
  return [firstUserId, secondUserId]
    .map((value) => value?.toString?.() || String(value))
    .sort()
    .join(":");
};

const mapLegacyStatusToStatus = (legacyStatus) => {
  if (legacyStatus === true) {
    return CONNECTION_STATUS.ACCEPTED;
  }

  if (legacyStatus === false) {
    return CONNECTION_STATUS.REJECTED;
  }

  return CONNECTION_STATUS.PENDING;
};

const mapStatusToLegacyStatus = (status) => {
  if (status === CONNECTION_STATUS.ACCEPTED) {
    return true;
  }

  if (status === CONNECTION_STATUS.REJECTED) {
    return false;
  }

  return null;
};

const connectionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    status: {
      type: String,
      enum: Object.values(CONNECTION_STATUS),
      default: CONNECTION_STATUS.PENDING
    },
    pairKey: {
      type: String,
      index: true
    },

    // Legacy fields are kept during the transition so existing records keep working.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    status_accepted: {
      type: Boolean,
      default: null
    }
  },
  {
    timestamps: true,
    collection: "connectionrequests"
  }
);

connectionSchema.pre("validate", function syncLegacyAndModernFields(next) {
  const sender = this.sender || this.userId;
  const receiver = this.receiver || this.connectionId;

  if (sender) {
    this.sender = sender;
    this.userId = sender;
  }

  if (receiver) {
    this.receiver = receiver;
    this.connectionId = receiver;
  }

  if (sender && receiver) {
    this.pairKey = buildPairKey(sender, receiver);
  }

  if (!this.status && this.status_accepted !== undefined) {
    this.status = mapLegacyStatusToStatus(this.status_accepted);
  }

  this.status_accepted = mapStatusToLegacyStatus(this.status);

  next();
});

const Connection = mongoose.model("Connection", connectionSchema);

export default Connection;
