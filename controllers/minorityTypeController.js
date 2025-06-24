const MinorityType = require('../models/MinorityType');

exports.getAllMinorityTypes = async (req, res) => {
    try {
        const types = await MinorityType.find({ isActive: true }).sort({ name: 1 });
        res.json(types);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch minority types' });
    }
};


//  Private Route only For Admin


exports.getAllMinorityTypesAdmin = async (req, res) => {
    try {
        const types = await MinorityType.find().sort({ name: 1 });
        res.json(types);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch all minority types' });
    }
};


exports.createMinorityType = async (req, res) => {
    try {
        const { name, description } = req.body;

        const exists = await MinorityType.findOne({ name });
        if (exists) return res.status(409).json({ message: 'Minority type already exists' });

        const newType = await MinorityType.create({ name, description });
        res.status(201).json({ message: 'Created successfully', type: newType });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create minority type' });
    }
};

exports.updateMinorityType = async (req, res) => {
    try {
        const { name, description, isActive } = req.body;
        const { id } = req.params;

        const type = await MinorityType.findById(id);
        if (!type) return res.status(404).json({ message: 'Type not found' });

        if (name !== undefined) {
            const trimmed = name.trim();
            if (!trimmed) {
                return res.status(400).json({ message: 'Name cannot be empty' });
            }

            // Prevent duplicate name
            const duplicate = await MinorityType.findOne({ name: trimmed, _id: { $ne: id } });
            if (duplicate) {
                return res.status(409).json({ message: 'Another type with this name already exists' });
            }

            type.name = trimmed;
        }

        if (description !== undefined) type.description = description;
        if (isActive !== undefined) type.isActive = isActive;

        await type.save();

        res.json({ message: 'Updated successfully', type });
    } catch (err) {
        console.error('MinorityType update error:', err);
        res.status(500).json({ message: 'Failed to update minority type' });
    }
};


exports.deleteMinorityType = async (req, res) => {
    try {
        const { id } = req.params;
        await MinorityType.findByIdAndDelete(id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete minority type' });
    }
};
