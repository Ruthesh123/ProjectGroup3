import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

// Initialize admin
admin.initializeApp();

// Import auth functions
import { registerUser } from './auth/register';
import { loginUser } from './auth/login';
import { resetPassword } from './auth/passwordReset';

// Initialize Express
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'InternLink Backend API',
    version: '1.0.0'
  });
});

// Authentication endpoints
app.post('/auth/register', registerUser);
app.post('/auth/login', loginUser);
app.post('/auth/reset-password', resetPassword);

// Export the API
export const api = functions.https.onRequest(app);

// Export individual functions for direct access
export { registerUser as register } from './auth/register';
export { createUserProfile } from './auth/userProfile';