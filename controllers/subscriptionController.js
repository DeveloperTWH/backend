const Subscription = require('../models/Subscription'); // Import Subscription model
const SubscriptionPlan = require('../models/SubscriptionPlan'); // Import SubscriptionPlan model

// Get user's subscriptions and populate subscription plan
exports.getUserSubscriptions = async (req, res) => {
    try {
        // Find subscriptions linked to the user
        const userId = req.user._id; // assuming you're using some sort of authentication middleware
        const subscriptions = await Subscription.find({
            userId: req.user._id,
            businessId: null  // Add condition to check for subscriptions with no linked business
        })
            .populate('subscriptionPlanId')  // Populate the plan details
            .exec();

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(404).json({ message: 'No subscriptions found for the user.' });
        }

        // Return the populated subscriptions
        res.status(200).json({ subscriptions });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Error fetching subscriptions, please try again later.' });
    }
};
