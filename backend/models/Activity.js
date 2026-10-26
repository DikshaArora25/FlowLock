import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    text: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['info', 'move', 'unlock', 'blocked', 'add', 'edit', 'delete', 'system'],
      default: 'info'
    },
    timestamp: {
      type: String,
      default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
