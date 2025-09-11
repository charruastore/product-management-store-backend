import { notion, NOTION_DB_ID } from "./notionClient.js";

export async function ensureMultiSelectOptions(propName, values) {
  if (!Array.isArray(values) || values.length === 0) return [];

  const wanted = Array.from(
    new Set(values.map((v) => String(v).trim()).filter(Boolean))
  );
  if (!wanted.length) return [];

  const db = await notion.databases.retrieve({ database_id: NOTION_DB_ID });
  const prop = db.properties?.[propName];
  if (!prop || prop.type !== "multi_select") {
    throw new Error(
      `La propiedad '${propName}' no existe o no es multi_select`
    );
  }

  const existing = (prop.multi_select?.options || []).map((o) => o.name);
  const toAdd = wanted.filter((v) => !existing.includes(v));

  if (toAdd.length > 0) {
    const newOptions = [
      ...existing.map((name) => ({ name })),
      ...toAdd.map((name) => ({ name })),
    ];
    await notion.databases.update({
      database_id: NOTION_DB_ID,
      properties: {
        [propName]: { multi_select: { options: newOptions } },
      },
    });
  }

  return wanted.map((name) => ({ name }));
}
