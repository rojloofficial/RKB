import "server-only";

import jwt from "jsonwebtoken";

function cleanEnv(val?: string): string {
  return (val ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getJwtSecret(): string {
  const secret = cleanEnv(process.env.JWT_SECRET);
  if (secret) {
    return secret;
  }
  return "rojlo-jwt-auth-session-secret-key-32-chars-minimum-fallback";
}

const expiresIn = process.env.JWT_TOKEN_EXPIRY || "30d";

export interface JWTPayload {
  _id: string;
  email: string;
  name: string;
  purpose?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateJWT(payload: Omit<JWTPayload, "iat" | "exp">): string {
  try {
    const secret = getJwtSecret();
    const token = jwt.sign(payload, secret, {
      expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
      algorithm: "HS256",
    });
    return token;
  } catch (error) {
    console.error("[jwt] Failed to generate token:", error instanceof Error ? error.message : String(error));
    throw new Error("Failed to generate authentication token");
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });
    return decoded as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error("[jwt] Token expired");
      return null;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("[jwt] Invalid token:", error.message);
      return null;
    }
    console.error("[jwt] Token verification failed:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Extract JWT from Authorization header
 */
export function extractJWTFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const trimmed = authHeader.trim();
  const match = trimmed.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  return token || null;
}
