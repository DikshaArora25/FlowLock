import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri || mongoUri.trim() === '') {
      throw new Error('MONGODB_URI environment variable is missing in express/.env. Local fallback is disabled.');
    }

    const isAtlas = mongoUri.startsWith('mongodb+srv://') || mongoUri.includes('.mongodb.net');
    const isLocal = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1');
    let conn;
    try {
      conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      const targetType = isAtlas ? 'MongoDB Atlas (Cloud)' : (isLocal ? 'Local MongoDB' : 'Custom MongoDB');
      console.log(`[MongoDB] Connected to ${targetType} database: "${conn.connection.name}" at host: ${conn.connection.host}`);
      return conn;
    } catch (primaryError) {
      if (isAtlas) {
        console.warn(`[MongoDB Warning] Atlas connection failed (${primaryError.message}).`);
        console.log(`[MongoDB] Attempting fallback to local MongoDB: mongodb://127.0.0.1:27017/flowlock...`);
        conn = await mongoose.connect('mongodb://127.0.0.1:27017/flowlock', { serverSelectionTimeoutMS: 5000 });
        console.log(`[MongoDB] Connected to Local MongoDB database: "${conn.connection.name}" at host: ${conn.connection.host}`);
        return conn;
      }
      throw primaryError;
    }
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed.');
  } catch (error) {
    console.error(`[MongoDB] Error closing connection: ${error.message}`);
  }
};

export default connectDB;

