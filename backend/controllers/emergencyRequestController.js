import EmergencyRequest from '../models/EmergencyRequest.js';
import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';
import Alert from '../models/Alert.js';

// Search network for a medicine (returns other branches that have stock)
export const searchNetworkMedicine = async (req, res) => {
    const { query } = req.query;
    try {
        if (!query || query.trim() === '') {
            return res.json([]);
        }

        const userPharmacyId = req.user.pharmacyId;

        // Find medicines in other branches with matching name/ndc, active, and stock > 0
        const matches = await Medicine.find({
            pharmacyId: { $ne: userPharmacyId },
            status: 'Active',
            stock: { $gt: 0 },
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { ndc: { $regex: query, $options: 'i' } }
            ]
        }).populate('pharmacyId', 'name address coordinator contactPhone email branchCode healthScore');

        // Map matches to a cleaner format and append realistic mock distance
        const results = matches.map(m => {
            const pharmacy = m.pharmacyId;
            // Generate a deterministic distance based on DB ID to keep UI consistent
            const lastChar = pharmacy._id.toString().slice(-1);
            const factor = isNaN(parseInt(lastChar, 16)) ? 5 : parseInt(lastChar, 16);
            const distance = (1.5 + (factor % 5) * 1.4).toFixed(1);

            return {
                medicineId: m._id,
                name: m.name,
                ndc: m.ndc,
                category: m.category,
                stock: m.stock,
                price: m.price,
                pharmacy: {
                    id: pharmacy._id,
                    name: pharmacy.name,
                    address: pharmacy.address,
                    coordinator: pharmacy.coordinator,
                    contactPhone: pharmacy.contactPhone,
                    email: pharmacy.email,
                    branchCode: pharmacy.branchCode,
                    healthScore: pharmacy.healthScore
                },
                distance: `${distance} km`
            };
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Retrieve all emergency requests (incoming & outgoing) for current pharmacy
export const getEmergencyRequests = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;

        const requests = await EmergencyRequest.find({
            $or: [
                { sourcePharmacyId: pharmacyId },
                { targetPharmacyId: pharmacyId }
            ]
        })
        .populate('sourcePharmacyId', 'name branchCode coordinator contactPhone email')
        .populate('targetPharmacyId', 'name branchCode coordinator contactPhone email')
        .populate('requestedBy', 'username fullName')
        .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new emergency request
export const createEmergencyRequest = async (req, res) => {
    const { targetPharmacyId, medicineName, ndc, quantityRequested, urgency, notes, contactPhone } = req.body;
    try {
        if (!targetPharmacyId || !medicineName || !ndc || !quantityRequested) {
            return res.status(400).json({ message: 'Missing required request details' });
        }

        const sourcePharmacyId = req.user.pharmacyId;

        // Verify source and target are different
        if (String(sourcePharmacyId) === String(targetPharmacyId)) {
            return res.status(400).json({ message: 'Cannot request emergency transfer from your own branch' });
        }

        const sourceBranch = await Pharmacy.findById(sourcePharmacyId);
        if (!sourceBranch) {
            return res.status(404).json({ message: 'Source branch not found' });
        }

        // Create the emergency request record
        const request = new EmergencyRequest({
            sourcePharmacyId,
            targetPharmacyId,
            medicineName,
            ndc,
            quantityRequested,
            urgency: urgency || 'High',
            status: 'Pending',
            notes,
            contactPhone,
            requestedBy: req.user.id
        });

        const savedRequest = await request.save();

        // Send a high-priority Alert to the target branch
        await Alert.create({
            pharmacyId: targetPharmacyId,
            title: `EMERGENCY Stock Request`,
            message: `Branch ${sourceBranch.name} is in critical need of ${quantityRequested}x ${medicineName} (NDC: ${ndc}). Urgency: ${urgency || 'High'}. Notes: ${notes || 'None'}`,
            severity: urgency === 'Critical' ? 'critical' : 'warning',
            alertType: 'Stock',
            createdBy: req.user.id
        });

        res.status(201).json(savedRequest);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update request status (e.g. Approve, Reject, Fulfill)
export const updateEmergencyRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        if (!['Approved', 'Rejected', 'Fulfilled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status update' });
        }

        const pharmacyId = req.user.pharmacyId;

        // Fetch request
        const request = await EmergencyRequest.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Emergency request not found' });
        }

        // Verify that the user belongs to the target branch (the supplier)
        if (String(request.targetPharmacyId) !== String(pharmacyId)) {
            return res.status(403).json({ message: 'Forbidden: You can only update requests directed to your branch' });
        }

        request.status = status;
        const updatedRequest = await request.save();

        const supplierBranch = await Pharmacy.findById(pharmacyId);

        // Send alert back to the requesting branch
        await Alert.create({
            pharmacyId: request.sourcePharmacyId,
            title: `Emergency Request ${status}`,
            message: `Your emergency request for ${request.medicineName} has been ${status.toLowerCase()} by ${supplierBranch?.name || 'supplying branch'}.`,
            severity: status === 'Rejected' ? 'warning' : 'info',
            alertType: 'Stock',
            createdBy: req.user.id
        });

        res.json(updatedRequest);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
