import { Request, Response, NextFunction } from "express";
import { JWTPayload, verifyJWT } from "../lib/auth";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export async function authenticateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export function requireRole(allowedRoles: ("ADMIN" | "MANAGER" | "CASHIER")[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    next();
  };
}

export const requireAdmin = requireRole(["ADMIN"]);
export const requireManagerOrAdmin = requireRole(["ADMIN", "MANAGER"]);
