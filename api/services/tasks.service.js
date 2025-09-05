import { notion, NOTION_DB_ID } from "./notionClient.js";
import { resolvePeopleIds } from "./usersCache.js";

/**
 * Crea una tarea en Notion. Campos opcionales:
 * { type, name, description, priority, url, requestedBy }
 */
export async function createNotionTask({
  type = "Sync",
  name = "Tarea automática",
  description,
  priority,
  url,
  requestedBy,
} = {}) {
  const people = await resolvePeopleIds(requestedBy);

  const properties = {
    Name: { title: [{ text: { content: String(name) } }] },
    Type: { select: { name: String(type) } },
    Status: { status: { name: "Pendiente" } },
    ...(priority ? { Priority: { select: { name: String(priority) } } } : {}),
    ...(url ? { URL: { url: String(url) } } : {}),
    ...(description
      ? {
          Description: {
            rich_text: [{ text: { content: String(description) } }],
          },
        }
      : {}),
    ...(people.length ? { "Requested by": { people } } : {}),
  };

  return notion.pages.create({
    parent: { database_id: NOTION_DB_ID },
    properties,
  });
}
