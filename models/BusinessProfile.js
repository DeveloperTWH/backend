
const mongoose = require('mongoose');

// In models/BusinessProfile.js, add this pre-save hook:



const businessProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  
  // Business Profile Fields
  logo: {
    type: String, // 250x250px image URL
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v);
      },
      message: 'Logo must be a valid image URL'
    }
  },
  
businessBio: {
  type: String,
  maxlength: 1000  // Set to highest tier limit, validation happens in controller
},
  
  contactInfo: {
    email: {
      type: String,
      required: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
    },
    phone: {
      type: String,
      required: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number']
    }
  },
  
  // Optional Documents
  refundPolicy: {
    type: String, // Document URL
  },
  termsAndConditions: {
    type: String, // Document URL
  },
  
  // Optional Links
  googleReviewsLink: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(www\.)?google\.com\//.test(v);
      },
      message: 'Must be a valid Google Reviews link'
    }
  },
  communityServiceLink: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Must be a valid URL'
    }
  },
  
  // Step 3 Questions & Points
  step3Questions: [{
    questionNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 7
    },
    answer: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      default: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date
  }],
  
  // Status & Points
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'],
    default: 'draft'
  },
  
  totalStep3Points: {
    type: Number,
    default: 0
  },
  
  tierType: {
    type: String,
    enum: ['basic', 'pro', 'premium'],
    required: true
  },
  // Add these new fields:
// Add these new fields:
badge: {
  type: String,
  enum: ['Silver', 'Gold', 'Platinum', 'Diamond']
},

totalPoints: {
  type: Number,
  default: 0
},

finalizedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},

finalizedAt: {
  type: Date
},

submittedAt: {
  type: Date
},
step4Survey: {
  growthChallenges: [{
    type: String,
    enum: [
      'scaling_operations',
      'increasing_reach', 
      'growing_revenue_sales',
      'accessing_capital',
      'marketing_visibility',
      'technology_adoption',
      'workforce_development',
      'other'
    ]
  }],
  growthChallengesOther: String, // For "Other" option
  
  platformGoals: [{
    type: String,
    enum: [
      'increase_brand_visibility',
      'connect_new_customers',
      'access_funding_opportunities', 
      'network_other_businesses',
      'sell_products_services_online',
      'participate_community_events',
      'other'
    ]
  }],
  platformGoalsOther: String, // For "Other" option
  
  targetCustomers: [{
    type: String,
    enum: [
      'local_community_shoppers',
      'national_buyers',
      'international_buyers',
      'b2b_business_to_business',
      'b2c_business_to_consumer', 
      'niche_cultural_ethnic_markets',
      'government_institutional_buyers'
    ]
  }],
  
  step4CompletedAt: Date
},
  
}, { timestamps: true });

// Calculate total points when questions are updated
businessProfileSchema.pre('save', function(next) {
  this.totalStep3Points = this.step3Questions
    .filter(q => q.isVerified)
    .reduce((sum, q) => sum + q.points, 0);
  next();
});

businessProfileSchema.pre('save', function(next) {
  this.totalStep3Points = this.step3Questions
    .filter(q => q.isVerified)
    .reduce((sum, q) => sum + q.points, 0);
  next();
});

businessProfileSchema.pre('validate', function(next) {
  if (this.badge === 'Bronze') {
    this.badge = 'Silver';
  }
  next();
});

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);
