import jwt from 'jsonwebtoken';

// In a real application, always use an environment variable for the secret key
const JWT_SECRET = (import.meta as any).env?.VITE_JWT_SECRET || 'fallback-secret-key-running-local';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Generates a JWT token for the given user payload.
 */
export const generateToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Verifies the given JWT token and returns the payload if valid.
 */
export const verifyToken = (token: string): JWTPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return null;
    }
};
