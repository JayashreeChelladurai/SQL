import { Request, Response, NextFunction } from "express";

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "prof@2026";
const ADMIN_TOKEN_SECRET = "sql-exam-secret-key-2026";

export function verifyAdminPasscode(passcode: string): boolean {
  return passcode.trim() === ADMIN_PASSCODE;
}

export function generateAdminToken(): string {
  const timestamp = Date.now();
  return Buffer.from(`admin:${timestamp}:${ADMIN_TOKEN_SECRET}`).toString("base64");
}

export function validateAdminToken(token: string): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [role, timestamp, secret] = decoded.split(":");
    if (role !== "admin" || secret !== ADMIN_TOKEN_SECRET) return false;
    // Expire token after 24 hours
    const ageMs = Date.now() - Number(timestamp);
    return ageMs < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing Admin Token" });
  }
  const token = authHeader.substring(7);
  if (!validateAdminToken(token)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired Admin Token" });
  }
  next();
}
