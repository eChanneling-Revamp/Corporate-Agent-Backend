import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  _id: string;
  doctorId: string;
  name: string;
  specialization: string;
  qualifications: string[];
  experience: number; // years
  hospital: {
    name: string;
    address: string;
    city: string;
    phone: string;
  };
  consultationFee: number;
  availability: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    timeSlots: {
      startTime: string;
      endTime: string;
      maxPatients: number;
    }[];
  }[];
  rating: {
    average: number;
    totalReviews: number;
  };
  status: 'active' | 'inactive' | 'on_leave';
  profileImage?: string;
  languages: string[];
  services: string[];
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  phone: { type: String, required: true }
});

const TimeSlotSchema = new Schema({
  startTime: { type: String, required: true }, // Format: "HH:MM"
  endTime: { type: String, required: true },   // Format: "HH:MM"
  maxPatients: { type: Number, required: true, min: 1, default: 10 }
});

const AvailabilitySchema = new Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  timeSlots: [TimeSlotSchema]
});

const RatingSchema = new Schema({
  average: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0, min: 0 }
});

const DoctorSchema = new Schema<IDoctor>({
  doctorId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  specialization: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  qualifications: {
    type: [String],
    required: true,
    validate: [arrayLimit, 'At least one qualification is required']
  },
  experience: {
    type: Number,
    required: true,
    min: 0,
    max: 50
  },
  hospital: {
    type: HospitalSchema,
    required: true
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  availability: {
    type: [AvailabilitySchema],
    required: true,
    validate: [arrayLimit, 'At least one availability slot is required']
  },
  rating: {
    type: RatingSchema,
    default: () => ({ average: 0, totalReviews: 0 })
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active',
    index: true
  },
  profileImage: {
    type: String,
    default: null
  },
  languages: {
    type: [String],
    default: ['English', 'Sinhala']
  },
  services: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Validation function for arrays
function arrayLimit(val: any[]) {
  return val.length > 0;
}

// Indexes for better query performance
DoctorSchema.index({ specialization: 1, status: 1 });
DoctorSchema.index({ 'hospital.city': 1 });
DoctorSchema.index({ consultationFee: 1 });
DoctorSchema.index({ 'rating.average': -1 });
DoctorSchema.index({ name: 'text', specialization: 'text' });

// Pre-save middleware to generate doctorId
DoctorSchema.pre('save', async function(next) {
  if (this.isNew && !this.doctorId) {
    const lastDoctor = await mongoose.model('Doctor').findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNumber = lastDoctor ? parseInt(lastDoctor.doctorId.replace('DR', '')) : 0;
    this.doctorId = `DR${String(lastNumber + 1).padStart(6, '0')}`;
  }
  next();
});

export const Doctor = mongoose.model<IDoctor>('Doctor', DoctorSchema);