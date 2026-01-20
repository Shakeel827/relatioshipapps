import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { InviteModel } from "../models/Invite.js";
import { ConversationModel } from "../models/Conversation.js";

const router = express.Router();

function makeInviteCode() {
  // 8-char, easy to read, low collision risk
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// Create invite (returns code and link)
router.post(
  "/invite/create",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user!.sub;
      let invite: any = null;
      let codeUsed: string | null = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = makeInviteCode();
        try {
          invite = await InviteModel.create({ code, createdBy: userId });
          codeUsed = code;
          break;
        } catch (e: any) {
          // Retry on unique collision
          if (e?.code === 11000) continue;
          throw e;
        }
      }
      if (!invite) return res.status(500).json({ error: "Failed to create invite" });
      const link = `${req.protocol}://${req.get("host")}/invite/${codeUsed}`;
      res.json({ code: codeUsed, link, expiresAt: invite.expiresAt });
    } catch (e) {
      console.error("Invite create error", e);
      res.status(500).json({ error: "Failed to create invite" });
    }
  }
);

// Accept invite (creates 1:1 conversation if not exists)
router.post(
  "/invite/accept",
  requireAuth,
  async (req: AuthedRequest & Request<{}, {}, { code?: string }>, res: Response) => {
    try {
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ error: "code is required" });

      const invite = await InviteModel.findOne({ code });
      if (!invite) return res.status(404).json({ error: "Invalid code" });
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invite expired" });
      }

      const acceptorId = req.user!.sub;
      if (String(invite.createdBy) === acceptorId) {
        return res.status(400).json({ error: "Cannot accept your own invite" });
      }

      // Ensure conversation
      let conversationId = invite.conversationId;
      if (!conversationId) {
        const createdBy = new mongoose.Types.ObjectId(String(invite.createdBy));
        const acceptor = new mongoose.Types.ObjectId(String(acceptorId));

        let convo = await ConversationModel.findOne({ members: { $all: [createdBy, acceptor] } });
        if (!convo) {
          convo = await ConversationModel.create({ members: [createdBy, acceptor] });
        }
        conversationId = convo._id;
        invite.conversationId = convo._id;
      }
      invite.acceptedBy = acceptorId as any;
      await invite.save();

      res.json({ conversationId });
    } catch (e) {
      console.error("Invite accept error", e);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  }
);

export default router;
