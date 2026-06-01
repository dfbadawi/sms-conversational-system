import { Hono } from "hono";
import {
  getConversationById,
  listConversations,
} from "../services/conversation.service";
import { notFound } from "../utils/errors";

export const conversationsRoutes = new Hono();

conversationsRoutes.get("/conversations", async (c) => {
  const conversations = await listConversations();
  return c.json(conversations);
});

conversationsRoutes.get("/conversations/:id", async (c) => {
  const conversation = await getConversationById(c.req.param("id"));
  if (!conversation) {
    return notFound(c);
  }

  return c.json(conversation);
});
