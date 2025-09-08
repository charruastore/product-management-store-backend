import { Client } from "@notionhq/client";
import { ENV } from "../../config/env.js";

const NOTION_TOKEN =
  ENV.NOTION_TOKEN ?? process.env.NOTION_TOKEN ?? process.env.NOTION_API_KEY;
export const NOTION_DB_ID =
  ENV.NOTION_DB_ID ??
  process.env.NOTION_DB_ID ??
  process.env.NOTION_DB_PRODUCTS;

export const notion = NOTION_TOKEN ? new Client({ auth: NOTION_TOKEN }) : null;
export const HAS_NOTION = Boolean(notion && NOTION_DB_ID);

if (!NOTION_TOKEN) {
  console.warn("[Notion] Falta NOTION_TOKEN/NOTION_API_KEY, se usará STUB.");
}
if (!NOTION_DB_ID) {
  console.warn(
    "[Notion] Falta NOTION_DB_ID/NOTION_DB_PRODUCTS, se usará STUB."
  );
}

export function requireNotion() {
  if (!HAS_NOTION) {
    const msg =
      "Notion no está configurado (falta NOTION_TOKEN y/o NOTION_DB_ID).";
    const err = new Error(msg);
    err.code = "NOTION_MISCONFIGURED";
    throw err;
  }
}

export async function pingNotion() {
  if (!HAS_NOTION) {
    return {
      ok: false,
      reason: "MISSING_ENV",
      detail: "Falta NOTION_TOKEN o NOTION_DB_ID",
    };
  }
  try {
    const db = await notion.databases.retrieve({ database_id: NOTION_DB_ID });
    return { ok: true, database: { id: db.id, title: db.title } };
  } catch (e) {
    return {
      ok: false,
      reason: "RETRIEVE_FAILED",
      detail: e?.message ?? String(e),
    };
  }
}
