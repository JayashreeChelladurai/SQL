import { Router } from "express";
import { verifyAdminPasscode, generateAdminToken, validateAdminToken } from "../services/auth.js";

export const authRouter = Router();

authRouter.post("/admin-login", (req, res) => {
  const { passcode } = req.body;
  if (!passcode) {
    return res.status(400).json({ error: "Passcode is required." });
  }

  if (!verifyAdminPasscode(passcode)) {
    return res.status(401).json({ error: "Invalid instructor passcode." });
  }

  const token = generateAdminToken();
  return res.json({
    token,
    role: "admin",
    name: "Professor",
  });
});

authRouter.get("/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ valid: false });
  }
  const token = authHeader.substring(7);
  const isValid = validateAdminToken(token);
  return res.json({ valid: isValid });
});
