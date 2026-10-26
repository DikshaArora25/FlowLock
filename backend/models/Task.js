import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Backlog', 'Todo', 'In Progress', 'Done'],
        message: '{VALUE} is not a valid status'
      },
      default: 'Todo'
    },
    priority: {
      type: String,
      required: true,
      enum: {
        values: ['High', 'Medium', 'Low'],
        message: '{VALUE} is not a valid priority'
      },
      default: 'Medium'
    },
    assignee: {
      type: String,
      default: 'Unassigned',
      trim: true
    },
    dueDate: {
      type: String,
      default: ''
    },
    dependsOn: {
      type: [String],
      default: []
    },
    locked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Ensure id is clean string, remove __v
        delete ret.__v;
        return ret;
      }
    }
  }
);

const Task = mongoose.model('Task', taskSchema);

export default Task;
