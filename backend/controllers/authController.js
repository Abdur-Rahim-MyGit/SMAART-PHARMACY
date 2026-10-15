import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';

export const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        if (user.status === 'Disabled' || user.status === 'Inactive') {
            return res.status(403).json({ message: 'This account is inactive or disabled. Please contact your system administrator.' });
        }

        user.lastLogin = new Date();
        await user.save();

        const pharmacy = await Pharmacy.findById(user.pharmacyId);
        if (!pharmacy) {
            return res.status(404).json({ message: 'Associated pharmacy not found' });
        }

        // Save variables into session
        req.session.userId = user._id;
        req.session.pharmacyId = user.pharmacyId;
        req.session.role = user.role;

        res.json({
            id: user._id,
            username: user.username,
            role: user.role,
            pharmacy: {
                id: pharmacy._id,
                name: pharmacy.name
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Failed to destroy session' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Successfully logged out' });
    });
};

export const getMe = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const pharmacy = await Pharmacy.findById(user.pharmacyId);
        res.json({
            id: user._id,
            username: user.username,
            role: user.role,
            pharmacy: {
                id: pharmacy ? pharmacy._id : null,
                name: pharmacy ? pharmacy.name : null
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getPharmacies = async (req, res) => {
    try {
        const pharmacies = await Pharmacy.find({}, 'name address').sort({ name: 1 });
        res.json(pharmacies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

