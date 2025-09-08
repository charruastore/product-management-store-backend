import { pingNotion } from "../services/notionClient.js";

export function healthBasic(_req, res) {
  res.json({ ok: true, ts: new Date().toISOString() });
}

export async function healthNotion(_req, res) {
  const r = await pingNotion();
  res.status(r.ok ? 200 : 500).json(r);
}
