import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  _id: string;
  agentId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  password: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessRegistrationNumber: string;
  taxId: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  isVerified: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  profileImage?: string;
  commission: {
    percentage: number;
    minimumAmount: number;
  };
  paymentDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
  };
  documents: {
    businessLicense: string;
    taxCertificate: string;
    bankStatement: string;
  };
  permissions: string[];
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
}

const AddressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'Sri Lanka' }
});

const CommissionSchema = new Schema({
  percentage: { type: Number, required: true, default: 5, min: 0, max: 100 },
  minimumAmount: { type: Number, required: true, default: 0 }
});

const PaymentDetailsSchema = new Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  branchCode: { type: String, required: true }
});

const DocumentsSchema = new Schema({
  businessLicense: { type: String, required: true },
  taxCertificate: { type: String, required: true },
  bankStatement: { type: String, required: true }
});

const AgentSchema = new Schema<IAgent>({
  agentId: {
    type: String,
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  phone: {
    type: String,
    required: true,
    match: [/^(\+94|0)[0-9]{9}$/, 'Please enter a valid Sri Lankan phone number']
  },
  address: {
    type: AddressSchema,
    required: true
  },
  businessRegistrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  taxId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  profileImage: {
    type: String,
    default: null
  },
  commission: {
    type: CommissionSchema,
    required: true
  },
  paymentDetails: {
    type: PaymentDetailsSchema,
    required: true
  },
  documents: {
    type: DocumentsSchema,
    required: true
  },
  permissions: {
    type: [String],
    default: ['basic_access', 'book_appointments', 'view_reports']
  },
  refreshToken: {
    type: String,
    default: null
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      // Create a copy to avoid modifying original
      const result = { ...ret };
      if ('password' in result) delete result.password;
      if ('refreshToken' in result) delete result.refreshToken;
      if ('passwordResetToken' in result) delete result.passwordResetToken;
      if ('emailVerificationToken' in result) delete result.emailVerificationToken;
      return result;
    }
  }
});

// Indexes for better query performance
AgentSchema.index({ email: 1 });
AgentSchema.index({ agentId: 1 });
AgentSchema.index({ status: 1 });
AgentSchema.index({ isVerified: 1 });
AgentSchema.index({ createdAt: 1 });

// Pre-save middleware to generate agentId
AgentSchema.pre('save', async function(next) {
  if (this.isNew && !this.agentId) {
    const lastAgent = await mongoose.model('Agent').findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNumber = lastAgent ? parseInt(lastAgent.agentId.replace('AG', '')) : 0;
    this.agentId = `AG${String(lastNumber + 1).padStart(6, '0')}`;
  }
  next();
});

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);