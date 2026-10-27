import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      maxlength: [254, 'Email address cannot exceed 254 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      validate: {
        validator: value => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
        message: 'Password cannot exceed 72 UTF-8 bytes'
      },
      select: false // Never returned in normal queries
    },
    role: {
      type: String,
      default: 'Software Engineer',
      trim: true,
      maxlength: [60, 'Role cannot exceed 60 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Pre-save hook to hash password with bcryptjs before persisting to MongoDB
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare candidate password against hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema, 'users');

export default User;
