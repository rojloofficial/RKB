import "server-only";
import { NextRequest } from "next/server";
import {
  findUserById,
  findUserByEmail,
  findUserBySessionToken,
  type User,
} from "./models/user";
import { extractJWTFromHeader, verifyJWT } from "./jwt";

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<User | null> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    const token = extractJWTFromHeader(authHeader);
    if (token) {
      const payload = verifyJWT(token);
      if (payload?._id) {
        const user = await findUserById(payload._id);
        if (user) return user;
      }
      if (payload?.email) {
        const user = await findUserByEmail(payload.email);
        if (user) return user;
      }
    }
  }

  const raw = request.cookies.get("rojlo_auth")?.value;
  if (!raw) return null;

  const sessionUser = await findUserBySessionToken(raw);
  if (sessionUser) return sessionUser;

  const jwtPayload = verifyJWT(raw);
  if (jwtPayload?._id) {
    const user = await findUserById(jwtPayload._id);
    if (user) return user;
  }
  if (jwtPayload?.email) {
    const user = await findUserByEmail(jwtPayload.email);
    if (user) return user;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed?._id) {
      const user = await findUserById(parsed._id);
      if (user) return user;
    }
    if (parsed?.email) {
      const user = await findUserByEmail(parsed.email);
      if (user) return user;
    }
  } catch {
    // Non-JSON
  }

  return findUserById(raw);
}

export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  return user?._id ? String(user._id) : null;
}
