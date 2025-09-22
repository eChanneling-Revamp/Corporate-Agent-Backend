import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    logger.warn('Validation errors:', errorMessages);

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
      error: 'VALIDATION_ERROR'
    });
    return;
  }

  next();
};

/**
 * Agent registration validation rules
 */
export const validateAgentRegistration = [
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),
  
  body('contactPerson')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('phone')
    .matches(/^(\+94|0)[0-9]{9}$/)
    .withMessage('Please provide a valid Sri Lankan phone number'),
  
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('address.zipCode')
    .trim()
    .isLength({ min: 5, max: 10 })
    .withMessage('Zip code must be between 5 and 10 characters'),
  
  body('businessRegistrationNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Business registration number must be between 5 and 50 characters'),
  
  body('taxId')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Tax ID must be between 5 and 50 characters'),
  
  body('paymentDetails.bankName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Bank name must be between 2 and 100 characters'),
  
  body('paymentDetails.accountNumber')
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Account number must be between 8 and 20 characters'),
  
  body('paymentDetails.accountHolderName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Account holder name must be between 2 and 100 characters'),
  
  body('paymentDetails.branchCode')
    .trim()
    .isLength({ min: 3, max: 10 })
    .withMessage('Branch code must be between 3 and 10 characters'),

  handleValidationErrors
];

/**
 * Agent login validation rules
 */
export const validateAgentLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

/**
 * Password change validation rules
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Password reset request validation rules
 */
export const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  handleValidationErrors
];

/**
 * Password reset validation rules
 */
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  handleValidationErrors
];

/**
 * Doctor search validation rules
 */
export const validateDoctorSearch = [
  query('specialization')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Specialization must be between 2 and 100 characters'),
  
  query('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in valid ISO format'),
  
  query('minFee')
    .optional()
    .isNumeric()
    .withMessage('Minimum fee must be a number'),
  
  query('maxFee')
    .optional()
    .isNumeric()
    .withMessage('Maximum fee must be a number'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors
];

/**
 * Appointment booking validation rules
 */
export const validateAppointmentBooking = [
  body('doctorId')
    .notEmpty()
    .withMessage('Doctor ID is required'),
  
  body('appointmentDate')
    .isISO8601()
    .withMessage('Appointment date must be in valid ISO format')
    .custom((value) => {
      const appointmentDate = new Date(value);
      const now = new Date();
      if (appointmentDate <= now) {
        throw new Error('Appointment date must be in the future');
      }
      return true;
    }),
  
  body('timeSlot')
    .notEmpty()
    .withMessage('Time slot is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time slot must be in HH:MM format'),
  
  body('patientDetails.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Patient name must be between 2 and 100 characters'),
  
  body('patientDetails.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid patient email address'),
  
  body('patientDetails.phone')
    .matches(/^(\+94|0)[0-9]{9}$/)
    .withMessage('Please provide a valid Sri Lankan phone number'),
  
  body('patientDetails.nic')
    .matches(/^([0-9]{9}[x|X|v|V]|[0-9]{12})$/)
    .withMessage('Please provide a valid NIC number'),
  
  body('patientDetails.dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be in valid ISO format'),
  
  body('patientDetails.gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('paymentMethod')
    .isIn(['card', 'bank_transfer', 'cash', 'online'])
    .withMessage('Payment method must be card, bank_transfer, cash, or online'),

  handleValidationErrors
];

/**
 * Appointment cancellation validation rules
 */
export const validateAppointmentCancellation = [
  param('appointmentId')
    .notEmpty()
    .withMessage('Appointment ID is required'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must not exceed 500 characters'),

  handleValidationErrors
];

/**
 * Bulk appointment booking validation rules
 */
export const validateBulkAppointmentBooking = [
  body('appointments')
    .isArray({ min: 1, max: 10 })
    .withMessage('Appointments must be an array with 1-10 items'),
  
  body('appointments.*.doctorId')
    .notEmpty()
    .withMessage('Doctor ID is required for each appointment'),
  
  body('appointments.*.appointmentDate')
    .isISO8601()
    .withMessage('Appointment date must be in valid ISO format'),
  
  body('appointments.*.timeSlot')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time slot must be in HH:MM format'),

  handleValidationErrors
];

/**
 * Report generation validation rules
 */
export const validateReportGeneration = [
  query('startDate')
    .isISO8601()
    .withMessage('Start date must be in valid ISO format'),
  
  query('endDate')
    .isISO8601()
    .withMessage('End date must be in valid ISO format')
    .custom((value, { req }) => {
      const startDate = new Date(req.query?.startDate as string);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  query('reportType')
    .isIn(['appointments', 'revenue', 'agents', 'doctors'])
    .withMessage('Report type must be appointments, revenue, agents, or doctors'),

  handleValidationErrors
];