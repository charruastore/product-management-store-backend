import { notion, NOTION_DB_ID } from "../services/notionClient.js";
import { resolvePeopleIds } from "../services/usersCache.js";

export async function createTask(req, res) {
  try {
    const { type, url, name, description, priority, requestedBy } = req.body;

    const _type = type || "Modificar";
    const _name = name || "Sin nombre";
    const _status = "Pendiente";

    const people = await resolvePeopleIds(requestedBy);

    const properties = {
      Name: { title: [{ text: { content: _name } }] },
      Type: { select: { name: _type } },
      Status: { status: { name: _status } },
      ...(priority ? { Priority: { select: { name: priority } } } : {}),
      ...(url ? { URL: { url } } : {}),
      ...(description
        ? { Description: { rich_text: [{ text: { content: description } }] } }
        : {}),
      ...(people.length ? { "Requested by": { people } } : {}),
    };

    const page = await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties,
    });

    res
      .status(201)
      .json({ id: page.id, created: true, requestedByMatched: people.length });
  } catch (err) {
    console.error("CREATE_ERROR:", err.body || err);
    res.status(500).json({ error: "Error al crear la tarea en Notion" });
  }
}

export async function listTasks(req, res) {
  try {
    const { type, status } = req.query;
    const filters = [];
    if (type)
      filters.push({ property: "Type", select: { equals: String(type) } });
    if (status)
      filters.push({ property: "Status", status: { equals: String(status) } });

    const query = {
      database_id: NOTION_DB_ID,
      ...(filters.length
        ? { filter: filters.length === 1 ? filters[0] : { and: filters } }
        : {}),
      sorts: [
        { property: "Status", direction: "ascending" },
        { property: "Type", direction: "ascending" },
      ],
    };

    const resp = await notion.databases.query(query);
    const items = resp.results.map((p) => {
      const props = p.properties;
      return {
        id: p.id,
        title: props.Name?.title?.[0]?.plain_text || "",
        type: props.Type?.select?.name || null,
        status: props.Status?.status?.name || null,
        priority: props.Priority?.select?.name || null,
        url: props.URL?.url || null,
        createdAt: p.created_time,
      };
    });

    res.json({ items });
  } catch (err) {
    console.error("LIST_ERROR:", err.body || err);
    res.status(500).json({ error: "Error al listar tareas desde Notion" });
  }
}

export async function updateTaskStatus(req, res) {
  try {
    const id = req.params.id;
    const { status } = req.body;
    if (!status)
      return res.status(400).json({ error: "Falta 'status' en el body" });

    await notion.pages.update({
      page_id: id,
      properties: { Status: { status: { name: status } } },
    });

    res.json({ id, updated: true, newStatus: status });
  } catch (err) {
    console.error("STATUS_ERROR:", err.body || err);
    res.status(500).json({ error: "Error al actualizar el status en Notion" });
  }
}

export async function getTask(req, res) {
  try {
    const id = req.params.id;

    // Si alguna vez llega el ID sin guiones, helper opcional:
    // const pageId = id.length === 32 ? id.replace(
    //   /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/,
    //   "$1-$2-$3-$4-$5"
    // ) : id;

    const page = await notion.pages.retrieve({ page_id: id });
    const props = page.properties;

    const data = {
      id: page.id,
      title: props.Name?.title?.[0]?.plain_text || "",
      type: props.Type?.select?.name || null,
      status: props.Status?.status?.name || null,
      priority: props.Priority?.select?.name || null,
      url: props.URL?.url || null,
      createdAt: page.created_time,
      lastEditedAt: page.last_edited_time,
    };

    res.json(data);
  } catch (err) {
    // Notion tira 404 con { code: 'object_not_found' } si la page no existe
    const code = err?.code || err?.body?.code;
    if (code === "object_not_found") {
      return res.status(404).json({ error: "not_found" });
    }
    console.error("GET_TASK_ERROR:", err.body || err);
    res.status(500).json({ error: "Error al obtener la tarea desde Notion" });
  }
}
