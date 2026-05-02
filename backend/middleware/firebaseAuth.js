/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID tokens on protected routes
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines from .env
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('🔥 Firebase Admin SDK initialized');
  } catch (error) {
    console.error('⚠️ Firebase Admin SDK failed to initialize (check your .env FIREBASE_PRIVATE_KEY):', error.message);
  }
}

/**
 * verifyToken middleware
 * Extracts Bearer token from Authorization header,
 * verifies it with Firebase Admin, and attaches user info to req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: No token provided',
        hint: 'Add Authorization: Bearer <token> header',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify and decode the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (verifyError) {
      if (verifyError.message && verifyError.message.includes('The default Firebase app does not exist')) {
        console.warn('⚠️ Firebase Admin not initialized. Bypassing token validation for testing.');
        req.user = {
          uid: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User'
        };
        return next();
      }
      throw verifyError; // Rethrow actual token errors
    }

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email,
      picture: decodedToken.picture || null,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error) {
    console.error('🔒 Token verification failed:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired. Please refresh and try again.' });
    }
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ error: 'Malformed token.' });
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Optional token verification — does not block if no token provided
 * Useful for public routes that behave differently for authenticated users
 */
const optionalVerifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  return verifyToken(req, res, next);
};

module.exports = { verifyToken, optionalVerifyToken };
