import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  
  next();
};

export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('role')
    .isIn(['student', 'employer'])
    .withMessage('Invalid role'),
  body('firstName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

export const validateJobCreation = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Job title must be between 3 and 100 characters'),
  body('companyName')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('description')
    .isString()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('location')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('type')
    .isIn(['full-time', 'part-time', 'internship', 'contract', 'remote'])
    .withMessage('Invalid job type'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('skills.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each skill must be a string'),
  body('salary')
    .optional()
    .isObject()
    .withMessage('Salary must be an object'),
  body('salary.min')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  body('salary.max')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number'),
  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date'),
  handleValidationErrors,
];

export const validateJobUpdate = [
  param('jobId')
    .isString()
    .notEmpty()
    .withMessage('Job ID is required'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Job title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('location')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty'),
  body('type')
    .optional()
    .isIn(['full-time', 'part-time', 'internship', 'contract', 'remote'])
    .withMessage('Invalid job type'),
  handleValidationErrors,
];

export const validateApplication = [
  body('jobId')
    .isString()
    .notEmpty()
    .withMessage('Job ID is required'),
  body('coverLetter')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter must not exceed 2000 characters'),
  body('resumeUrl')
    .optional()
    .isURL()
    .withMessage('Resume URL must be valid'),
  handleValidationErrors,
];

export const validateApplicationStatus = [
  param('applicationId')
    .isString()
    .notEmpty()
    .withMessage('Application ID is required'),
  body('status')
    .isIn(['pending', 'reviewing', 'accepted', 'rejected', 'interview'])
    .withMessage('Invalid status'),
  body('feedback')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters'),
  handleValidationErrors,
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

export const validateSearch = [
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  handleValidationErrors,
];

export const validateUserVerification = [
  param('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required'),
  body('verified')
    .isBoolean()
    .withMessage('Verified must be a boolean'),
  body('verificationNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Verification notes must not exceed 500 characters'),
  handleValidationErrors,
];

export const validateUserSuspension = [
  param('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required'),
  body('suspended')
    .isBoolean()
    .withMessage('Suspended must be a boolean'),
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Suspension reason must not exceed 500 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be between 1 and 365 days'),
  handleValidationErrors,
];

export const validateRoleChange = [
  param('userId')
    .isString()
    .notEmpty()
    .withMessage('User ID is required'),
  body('newRole')
    .isIn(['student', 'employer', 'admin'])
    .withMessage('Invalid role'),
  handleValidationErrors,
];

export const validateContentModeration = [
  param('contentType')
    .isIn(['job', 'profile', 'application'])
    .withMessage('Invalid content type'),
  param('contentId')
    .isString()
    .notEmpty()
    .withMessage('Content ID is required'),
  body('action')
    .isIn(['approve', 'reject', 'flag'])
    .withMessage('Invalid action'),
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  handleValidationErrors,
];

export const validateSystemNotification = [
  body('targetRole')
    .isIn(['all', 'student', 'employer'])
    .withMessage('Invalid target role'),
  body('subject')
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Subject must be between 3 and 100 characters'),
  body('message')
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  handleValidationErrors,
];

export const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  handleValidationErrors,
];

export const validateBulkUpdate = [
  body('applicationIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Application IDs must be an array with 1-50 items'),
  body('applicationIds.*')
    .isString()
    .notEmpty()
    .withMessage('Each application ID must be a non-empty string'),
  body('status')
    .isIn(['reviewing', 'accepted', 'rejected'])
    .withMessage('Invalid status for bulk update'),
  body('feedback')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Feedback must not exceed 500 characters'),
  handleValidationErrors,
];