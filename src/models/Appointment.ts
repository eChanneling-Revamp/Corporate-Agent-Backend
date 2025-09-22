import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  _id: string;
  appointmentId: string;
  agentId: string;
  patientDetails: {
    name: string;
    email: string;
    phone: string;
    nic: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    address: string;
  };
  doctorDetails: {
    doctorId: string;
    name: string;
    specialization: string;
    hospital: string;
    fee: number;
  };
  appointmentDetails: {
    date: Date;
    timeSlot: string;
    type: 'consultation' | 'followup' | 'emergency';
    duration: number; // in minutes
    notes?: string;
  };
  paymentDetails: {
    amount: number;
    commission: number;
    netAmount: number;
    paymentMethod: 'card' | 'bank_transfer' | 'cash' | 'online';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
    paidAt?: Date;
  };
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  isACB: boolean; // Advance Call Booking
  acbConfirmed: boolean;
  acbConfirmedAt?: Date;
  acbConfirmedBy?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  refundDetails?: {
    amount: number;
    reason: string;
    processedAt: Date;
    refundId: string;
  };
  remindersSent: {
    sms: boolean;
    email: boolean;
    lastSentAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PatientDetailsSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  nic: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  address: { type: String, required: true }
});

const DoctorDetailsSchema = new Schema({
  doctorId: { type: String, required: true },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  hospital: { type: String, required: true },
  fee: { type: Number, required: true, min: 0 }
});

const AppointmentDetailsSchema = new Schema({
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  type: { type: String, enum: ['consultation', 'followup', 'emergency'], default: 'consultation' },
  duration: { type: Number, required: true, default: 30 },
  notes: { type: String, default: '' }
});

const PaymentDetailsSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  commission: { type: Number, required: true, min: 0 },
  netAmount: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['card', 'bank_transfer', 'cash', 'online'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  transactionId: { type: String, default: null },
  paidAt: { type: Date, default: null }
});

const RefundDetailsSchema = new Schema({
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  processedAt: { type: Date, required: true },
  refundId: { type: String, required: true }
});

const RemindersSchema = new Schema({
  sms: { type: Boolean, default: false },
  email: { type: Boolean, default: false },
  lastSentAt: { type: Date, default: null }
});

const AppointmentSchema = new Schema<IAppointment>({
  appointmentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  agentId: {
    type: String,
    required: true,
    ref: 'Agent',
    index: true
  },
  patientDetails: {
    type: PatientDetailsSchema,
    required: true
  },
  doctorDetails: {
    type: DoctorDetailsSchema,
    required: true
  },
  appointmentDetails: {
    type: AppointmentDetailsSchema,
    required: true
  },
  paymentDetails: {
    type: PaymentDetailsSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending',
    index: true
  },
  isACB: {
    type: Boolean,
    default: false,
    index: true
  },
  acbConfirmed: {
    type: Boolean,
    default: false
  },
  acbConfirmedAt: {
    type: Date,
    default: null
  },
  acbConfirmedBy: {
    type: String,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: String,
    default: null
  },
  refundDetails: {
    type: RefundDetailsSchema,
    default: null
  },
  remindersSent: {
    type: RemindersSchema,
    default: () => ({ sms: false, email: false })
  }
}, {
  timestamps: true
});

// Indexes for better query performance
AppointmentSchema.index({ agentId: 1, status: 1 });
AppointmentSchema.index({ 'appointmentDetails.date': 1 });
AppointmentSchema.index({ 'doctorDetails.doctorId': 1 });
AppointmentSchema.index({ 'patientDetails.email': 1 });
AppointmentSchema.index({ 'paymentDetails.paymentStatus': 1 });
AppointmentSchema.index({ isACB: 1, acbConfirmed: 1 });
AppointmentSchema.index({ createdAt: 1 });

// Pre-save middleware to generate appointmentId
AppointmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.appointmentId) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const lastAppointment = await mongoose.model('Appointment').findOne(
      { appointmentId: { $regex: `^AP${dateStr}` } },
      {},
      { sort: { 'createdAt': -1 } }
    );
    
    let sequence = 1;
    if (lastAppointment) {
      const lastSequence = parseInt(lastAppointment.appointmentId.slice(-4));
      sequence = lastSequence + 1;
    }
    
    this.appointmentId = `AP${dateStr}${String(sequence).padStart(4, '0')}`;
  }
  next();
});

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);