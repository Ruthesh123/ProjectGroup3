import rateLimit from 'express-rate-limit';
import * as helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Lazy load Firestore to ensure admin is initialized
const getDb = () => admin.firestore();

// Check if rate limiting should be disabled for testing
const isTestMode = process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test';

/**
 * Wrapper to conditionally apply rate limiting
 */
function createRateLimiter(options: any) {
  const limiter = rateLimit(options);

  // Return a middleware that checks test mode
  return (req: Request, res: Response, next: NextFunction) => {
    if (isTestMode) {
      // Skip rate limiting in test mode
      return next();
    }
    return limiter(req, res, next);
  };
}

export const generalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const applicationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many applications submitted, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Let express-rate-limit handle IP-based rate limiting by default
  // It will properly handle IPv4 and IPv6 addresses
});

export const apiKeyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'API rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const securityHeaders = helmet.default({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/on\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript:/gi, '');
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
};

export const preventSQLInjection = (req: Request, res: Response, next: NextFunction): void => {
  const sqlPatterns = [
    /('|(\-\-)|(;)|(\|\|)|(\*)|(<)|(>)|(\^)|(\[)|(\])|(\{)|(\})|(`))/gi,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)/gi,
  ];

  const checkForSQL = (str: string): boolean => {
    if (typeof str !== 'string') return false;
    return sqlPatterns.some(pattern => pattern.test(str));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkForSQL(obj);
    } else if (Array.isArray(obj)) {
      return obj.some(checkObject);
    } else if (obj !== null && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    res.status(400).json({ error: 'Invalid input detected' });
    return;
  }

  next();
};

export const logRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    try {
      await getDb().collection('requestLogs').add({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: (req as any).user?.uid || null,
        statusCode: res.statusCode,
        duration,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging request:', error);
    }
  });
  
  next();
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      details: err.message,
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Unauthorized',
    });
    return;
  }

  if (err.name === 'MulterError') {
    res.status(400).json({
      error: 'File upload error',
      details: err.message,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
};

export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  try {
    const apiKeyDoc = await getDb().collection('apiKeys')
      .where('key', '==', apiKey)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (apiKeyDoc.empty) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const keyData = apiKeyDoc.docs[0].data();

    await getDb().collection('apiKeys').doc(apiKeyDoc.docs[0].id).update({
      lastUsed: FieldValue.serverTimestamp(),
      requestCount: FieldValue.increment(1),
    });

    (req as any).apiKeyData = keyData;
    next();
  } catch (error) {
    console.error('Error validating API key:', error);
    res.status(500).json({ error: 'Failed to validate API key' });
  }
};

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400,
};