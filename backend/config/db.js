import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-system';
        const conn = await mongoose.connect(uri);
        const dbName = conn.connection.db.databaseName;
        console.log(`MongoDB Connected: ${conn.connection.host} / Database: ${dbName}`);
    } catch (error) {
        console.error(`Database connection error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
