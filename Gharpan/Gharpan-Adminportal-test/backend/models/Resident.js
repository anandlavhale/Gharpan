const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
  // Basic Information
  registrationNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  admissionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  name: {
    type: String,
    trim: true
  },
  nameGivenByOrganization: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  weight: {
    type: Number,
    min: 0
  },
  height: {
    type: Number,
    min: 0
  },
  religion: {
    type: String,
    trim: true
  },
  identificationMark: {
    type: String,
    trim: true
  },

  // Contact & Guardian Information
  address: {
    state: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'India'
    },
    fullAddress: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^\d{6}$/.test(v);
        },
        message: 'PIN code should be 6 digits'
      }
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    }
  },
  alternativeAddress: {
    type: String,
    trim: true
  },
  nearestLandmark: {
    type: String,
    trim: true
  },
  distanceFromFacility: {
    type: Number,
    min: 0
  },
  relativeAdmit: {
    type: String,
    trim: true
  },
  relationWith: {
    type: String,
    trim: true
  },
  guardianName: {
    type: String,
    trim: true
  },
  mobileNo: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Mobile number should be 10 digits'
    }
  },
  phoneNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Phone number should be 10 digits'
    }
  },
  alternativeContact: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Alternative contact should be 10 digits'
    }
  },
  emailAddress: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  socialMediaHandle: {
    type: String,
    trim: true
  },
  voterId: {
    type: String,
    trim: true
  },
  aadhaarNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{12}$/.test(v);
      },
      message: 'Aadhaar number should be 12 digits'
    }
  },

  // Emergency Contact
  emergencyContactName: {
    type: String,
    trim: true
  },
  emergencyContactNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Emergency contact number should be 10 digits'
    }
  },
  emergencyContactRelationship: {
    type: String,
    trim: true
  },

  // Health & Status Information
  healthStatus: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Other', 'Emergency', 'Routine'],
    default: 'Other'
  },
  bloodGroup: {
    type: String,
    trim: true
  },
  allergies: {
    type: String,
    trim: true
  },
  knownAllergies: {
    type: String,
    trim: true
  },
  medicalConditions: {
    type: String,
    trim: true
  },
  disabilityStatus: {
    type: String,
    trim: true,
    default: 'None'
  },
  disabilityDetails: {
    type: String,
    trim: true
  },
  medications: {
    type: String,
    trim: true
  },
  rehabStatus: {
    type: String,
    trim: true
  },

  // Vital Signs & Physical Metrics
  bodyTemperature: {
    type: Number,
    min: 30,
    max: 45
  },
  heartRate: {
    type: Number,
    min: 30,
    max: 200
  },
  respiratoryRate: {
    type: Number,
    min: 5,
    max: 40
  },
  bloodPressure: {
    type: String,
    trim: true
  },

  // Additional Health Information
  primaryDoctor: {
    type: String,
    trim: true
  },
  preferredHospital: {
    type: String,
    trim: true
  },
  medicalHistoryNotes: {
    type: String,
    trim: true
  },
  medicalHistory: {
    type: String,
    trim: true
  },

  // Comments & Notes
  comments: {
    type: String,
    trim: true
  },
  generalComments: {
    type: String,
    trim: true
  },
  medicalNotes: {
    type: String,
    trim: true
  },
  behavioralNotes: {
    type: String,
    trim: true
  },
  careInstructions: {
    type: String,
    trim: true
  },
  priorityLevel: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Critical', 'Emergency'],
    default: 'Normal'
  },
  updateSummary: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: String,
    trim: true
  },
  lastUpdateDate: {
    type: Date
  },

  // Informer Information
  informerName: {
    type: String,
    trim: true
  },
  informerMobile: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Informer mobile number should be 10 digits'
    }
  },
  informerRelationship: {
    type: String,
    trim: true
  },
  informationDate: {
    type: Date
  },
  informerAddress: {
    type: String,
    trim: true
  },
  informationDetails: {
    type: String,
    trim: true
  },

  // Transport & Organization Information
  conveyanceVehicleNo: {
    type: String,
    trim: true,
    uppercase: true
  },
  pickUpPlace: {
    type: String,
    trim: true
  },
  pickUpTime: {
    type: Date
  },
  entrantName: {
    type: String,
    trim: true
  },
  driverName: {
    type: String,
    trim: true
  },
  driverMobile: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Driver mobile number should be 10 digits'
    }
  },
  transportTime: {
    type: String,
    trim: true
  },
  transportNotes: {
    type: String,
    trim: true
  },
  admittedBy: {
    type: String,
    trim: true
  },
  organizationId: {
    type: String,
    trim: true
  },
  admissionStatus: {
    type: String,
    enum: ['Active', 'Pending', 'Discharged', 'Transferred', 'On Leave', 'Absconded'],
    default: 'Active'
  },
  ward: {
    type: String,
    trim: true
  },
  receiptNo: {
    type: String,
    trim: true
  },
  letterNo: {
    type: String,
    trim: true
  },
  itemDescription: {
    type: String,
    trim: true
  },
  itemAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  videoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Please enter a valid URL'
    }
  },

  // Photo URLs - FIXED: Both before and after photos with separate fields
  photoBeforeAdmission: {
    type: String,
    trim: true
  },
  photoAfterAdmission: {
    type: String,
    trim: true
  },
  photoUrl: {
    type: String,
    trim: true
  }, // Keep for backward compatibility

  documentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],

  // System fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Care tracking events
  careEvents: [{
    type: {
      type: String,
      required: true,
      trim: true,
      default: 'General Care'
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000
    },
    date: {
      type: Date,
      required: true
    },
    doctor: {
      type: String,
      trim: true,
      maxlength: 200
    },
    medications: {
      type: String,
      trim: true,
      maxlength: 500
    },
    nextVisit: {
      type: Date
    },
    status: {
      type: String,
      trim: true,
      default: 'Completed',
      maxlength: 100
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
residentSchema.index({ registrationNo: 1 });
residentSchema.index({ name: 1 });
residentSchema.index({ nameGivenByOrganization: 1 });
residentSchema.index({ admissionDate: -1 });
residentSchema.index({ createdAt: -1 });
residentSchema.index({ 'address.state': 1 });
residentSchema.index({ 'address.district': 1 });
residentSchema.index({ healthStatus: 1 });
residentSchema.index({ mobileNo: 1 });
residentSchema.index({ isActive: 1 });

// Virtual field for full name display
residentSchema.virtual('displayName').get(function() {
  return this.nameGivenByOrganization || this.name || 'N/A';
});

// Virtual field for full address display
residentSchema.virtual('fullAddressDisplay').get(function() {
  const parts = [];
  if (this.address && this.address.fullAddress) parts.push(this.address.fullAddress);
  if (this.address && this.address.city) parts.push(this.address.city);
  if (this.address && this.address.district) parts.push(this.address.district);
  if (this.address && this.address.state) parts.push(this.address.state);
  if (this.address && this.address.country) parts.push(this.address.country);
  return parts.join(', ') || 'N/A';
});

// Virtual field for primary photo (prioritize after admission, then before, then legacy)
residentSchema.virtual('primaryPhoto').get(function() {
  return this.photoAfterAdmission || this.photoBeforeAdmission || this.photoUrl || null;
});

// Pre-save middleware to update the updatedAt field
residentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-calculate age if dateOfBirth is provided
  if (this.dateOfBirth && !this.age) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    this.age = age;
  }
  
  next();
});

// Static method to generate registration number
residentSchema.statics.generateRegistrationNo = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  const regNo = `REG-${year}-${String(count + 1).padStart(4, '0')}`;
  
  // Check if registration number already exists (edge case handling)
  const existing = await this.findOne({ registrationNo: regNo });
  if (existing) {
    // If exists, add timestamp suffix
    const timestamp = Date.now().toString().slice(-4);
    return `REG-${year}-${String(count + 1).padStart(4, '0')}-${timestamp}`;
  }
  
  return regNo;
};

// Instance method to get all photos
residentSchema.methods.getAllPhotos = function() {
  const photos = {};
  if (this.photoBeforeAdmission) photos.before = this.photoBeforeAdmission;
  if (this.photoAfterAdmission) photos.after = this.photoAfterAdmission;
  if (this.photoUrl && !photos.before && !photos.after) photos.legacy = this.photoUrl;
  return photos;
};

// Instance method to format contact information
residentSchema.methods.getContactInfo = function() {
  return {
    primary: this.mobileNo || 'N/A',
    alternative: this.phoneNumber || this.alternativeContact || 'N/A',
    email: this.emailAddress || 'N/A',
    emergency: {
      name: this.emergencyContactName || 'N/A',
      number: this.emergencyContactNumber || 'N/A',
      relationship: this.emergencyContactRelationship || 'N/A'
    }
  };
};

module.exports = mongoose.model('Resident', residentSchema);