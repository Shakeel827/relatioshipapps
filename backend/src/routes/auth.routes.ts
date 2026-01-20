import express, { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

const router = express.Router();

router.post(
  "/auth/register",
  async (
    req: Request<{}, {}, { email?: string; password?: string; name?: string; age?: number; gender?: string; location?: string }>,
    res: Response
  ) => {
    try {
      const { email, password, name, age, gender, location } = req.body || {};
      if (!email || !password || password.length < 6) {
        return res
          .status(400)
          .json({ error: "Email and password (min 6 chars) are required" });
      }
      const { token } = await authService.register(email, password, { name, age, gender, location });
      res.json({ token });
    } catch (e: any) {
      const msg = e?.message || "Registration failed";
      res.status(400).json({ error: msg });
    }
  }
);

router.post(
  "/auth/login",
  async (
    req: Request<{}, {}, { email?: string; password?: string }>,
    res: Response
  ) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const { token } = await authService.login(email, password);
      res.json({ token });
    } catch (e: any) {
      const msg = e?.message || "Login failed";
      res.status(401).json({ error: msg });
    }
  }
);

router.get("/auth/me", requireAuth, (req: AuthedRequest, res) => {
  const u = req.user;
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: { id: u.sub, email: u.email } });
});

export default router;
