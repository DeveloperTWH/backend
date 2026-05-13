// controllers/admin/businessProfileVerifyController.js
const BusinessProfile = require('../../models/BusinessProfile');
const VendorOnboarding = require('../../models/VendorOnboardingStage1');
const Business = require('../../models/Business');

// Get pending business profiles for admin review
const getPendingBusinessProfiles = async (req, res) => {
  try {
    const profiles = await BusinessProfile.find({
      status: 'submitted'
    })
    .populate('userId', 'name email')
    .populate('subscriptionId')
    .sort({ submittedAt: -1 });

    return res.json({
      success: true,
      data: profiles
    });

  } catch (error) {
    console.error('Get pending profiles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get pending profiles'
    });
  }
};

// Get specific business profile details for admin
const getBusinessProfileDetails = async (req, res) => {
  try {
    const { profileId } = req.params;
    
    const profile = await BusinessProfile.findById(profileId)
      .populate('userId', 'name email')
      .populate('subscriptionId');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found'
      });
    }

    return res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get profile details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get profile details'
    });
  }
};


// Verify individual question and allocate points
const verifyQuestion = async (req, res) => {
  try {
    const { profileId, questionNumber } = req.params;
    const adminId = req.user._id;

    const profile = await BusinessProfile.findById(profileId)
      .populate('userId', 'name email');
      
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found'
      });
    }

    const question = profile.step3Questions.find(q => q.questionNumber == questionNumber);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if already verified
    if (question.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Question already verified'
      });
    }

    // Mark as verified and assign points
    question.isVerified = true;
    question.verifiedBy = adminId;
    question.verifiedAt = new Date();

    await profile.save();

    // Send email notification to vendor
    try {
      const { sendQuestionVerificationEmail } = require('../../utils/BuisnessprofileMail');
      await sendQuestionVerificationEmail(
        profile.userId.email, 
        profile.userId.name, 
        questionNumber, 
        question.points
      );
    } catch (emailError) {
      console.error('Failed to send question verification email:', emailError);
    }

    return res.json({
      success: true,
      message: `Question ${questionNumber} verified and ${question.points} points allocated`
    });

  } catch (error) {
    console.error('Verify question error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify question'
    });
  }
};


// Final approval and badge calculation
const finalizeBusinessProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const adminId = req.user._id;

    const profile = await BusinessProfile.findById(profileId)
      .populate('userId');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found'
      });
    }

    // Get Step 1 points from VendorOnboarding
    const onboarding = await VendorOnboarding.findOne({ userId: profile.userId._id });
    
    const step1Points = onboarding ? onboarding.totalVerificationPoints : 0;
    const step3Points = profile.totalStep3Points;
    const totalPoints = step1Points + step3Points;

    // Calculate badge based on updated criteria
    let badge = null; // No badge for < 30 points
    if (totalPoints >= 80) badge = 'Diamond';
    else if (totalPoints >= 50) badge = 'Platinum';
    else if (totalPoints >= 40) badge = 'Gold';
    else if (totalPoints >= 30) badge = 'Silver';

    // Update BusinessProfile with all new fields
    profile.status = 'approved';
    profile.finalizedBy = adminId;
    profile.finalizedAt = new Date();
    profile.badge = badge;
    profile.totalPoints = totalPoints;

    await profile.save();

    // Update User model with badge (add fields to User model first)
    const User = require('../../models/User');
    await User.findByIdAndUpdate(profile.userId._id, {
      badge: badge,
      totalPoints: totalPoints,
      verificationStatus: 'completed'
    });

    // Mirror final points/badge to Business for listing and filtering use-cases
    await Business.findOneAndUpdate(
      { owner: profile.userId._id },
      { $set: { points: totalPoints, badge } }
    );

    // Send approval email to vendor
    try {
      const { sendBusinessProfileApprovalEmail } = require('../../utils/BuisnessprofileMail');
      await sendBusinessProfileApprovalEmail(
        profile.userId.email, 
        profile.userId.name, 
        badge, 
        totalPoints
      );
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    return res.json({
      success: true,
      message: 'Business profile approved successfully',
      data: {
        step1Points,
        step3Points,
        totalPoints,
        badge,
        badgeCriteria: {
          'Silver': '30+ pts', 
          'Gold': '40+ pts',
          'Platinum': '50+ pts',
          'Diamond': '80+ pts'
        }
      }
    });

  } catch (error) {
    console.error('Finalize profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to finalize profile'
    });
  }
};



module.exports = {
  getPendingBusinessProfiles,
  getBusinessProfileDetails,
  verifyQuestion,
  finalizeBusinessProfile
};
