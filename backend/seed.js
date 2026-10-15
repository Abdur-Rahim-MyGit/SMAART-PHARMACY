import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Pharmacy from './models/Pharmacy.js';

dotenv.config();

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1/pharmacy_management_dev';

async function seed() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // Create main branch
        let branch = await Pharmacy.findOne({ branchCode: 'MAIN-01' });
        if (!branch) {
            branch = await Pharmacy.create({
                name: 'Central Pharmacy',
                branchCode: 'MAIN-01',
                address: '123 Main Street',
                contactPhone: '+1-555-0123'
            });
            console.log('Created Pharmacy:', branch.name);
        } else {
            console.log('Pharmacy already exists');
        }

        // Create admin user
        let admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            admin = await User.create({
                username: 'admin',
                password: 'password123',
                role: 'Admin',
                fullName: 'System Administrator',
                pharmacyId: branch._id,
                email: 'admin@pharmacy.local',
                status: 'Active'
            });
            console.log('Created Admin User (admin / password123)');
        } else {
            console.log('Admin user already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seed();
