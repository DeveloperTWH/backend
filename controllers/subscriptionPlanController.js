const SubscriptionPlan = require('../models/SubscriptionPlan');

exports.createSubscriptionPlan = async (req, res) => {
  try {
    const {
      name, price, durationInDays,
      limits, features,
    } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Invalid or missing name' });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Invalid price' });
    }

    if (durationInDays && (typeof durationInDays !== 'number' || durationInDays <= 0)) {
      return res.status(400).json({ message: 'Invalid durationInDays' });
    }

    if (limits && typeof limits !== 'object') {
      return res.status(400).json({ message: 'limits must be an object' });
    }

    if (features && typeof features !== 'object') {
      return res.status(400).json({ message: 'features must be an object' });
    }

    const existingPlan = await SubscriptionPlan.findOne({ name });
    if (existingPlan) {
      return res.status(409).json({ message: 'Subscription plan with this name already exists.' });
    }

    const plan = new SubscriptionPlan({
      name,
      price,
      durationInDays,
      limits,
      features,
    });

    await plan.save();

    res.status(201).json({
      message: 'Subscription plan created successfully',
      plan,
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Controller to fetch all subscription plans
exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find();
    if (!subscriptionPlans.length) {
      return res.status(404).json({ success: false, message: 'No subscription plans found.' });
    }
    return res.status(200).json({ success: true, data: subscriptionPlans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription plans' });
  }
};

