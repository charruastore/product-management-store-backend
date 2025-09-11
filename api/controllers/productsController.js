import { notion, HAS_NOTION, NOTION_DB_ID } from "../services/notionClient.js";
import { mapNotionPageToProduct } from "../mappers/productMapper.js";
import { resolvePeopleIds } from "../services/usersCache.js";

/** Normaliza el string del tipo a los valores del Select en Notion */
function normalizeTipo(input) {
  if (!input) return null;
  const s = String(input).toLowerCase();
  if (["nuevo", "nueva", "new"].includes(s)) return "Nuevo";
  if (
    [
      "modificar",
      "modificado",
      "update",
      "modificación",
      "modificacion",
    ].includes(s)
  )
    return "Modificar";
  return input;
}

function buildFilter({ q, category, inStock }) {
  const blocks = [];

  const tipo = normalizeTipo(category);
  if (tipo) {
    blocks.push({
      or: [
        { property: "Tipo", select: { equals: tipo } },
        { property: "Type", select: { equals: tipo } },
      ],
    });
  }

  if (typeof inStock !== "undefined" && inStock !== null) {
    const val =
      typeof inStock === "string" ? inStock === "true" : Boolean(inStock);
    blocks.push({ property: "InStock", checkbox: { equals: val } });
  }

  const orQ =
    q && q.trim()
      ? {
          or: [
            { property: "Name", title: { contains: q } },
            { property: "Nombre", title: { contains: q } },
            { property: "SKU", rich_text: { contains: q } },
            { property: "Sku", rich_text: { contains: q } },
          ],
        }
      : null;

  if (orQ && blocks.length) return { and: [orQ, ...blocks] };
  if (orQ) return orQ;
  if (blocks.length === 1) return blocks[0];
  if (blocks.length > 1) return { and: blocks };
  return undefined;
}

export async function listProducts(req, res) {
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const q = String(req.query.q ?? "");
  const cursor = req.query.cursor || null;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const category = req.query.type ?? req.query.category ?? null;
  const inStock = req.query.inStock ?? null;

  if (HAS_NOTION) {
    try {
      const filter = buildFilter({ q, category, inStock });

      if (cursor) {
        const resp = await notion.databases.query({
          database_id: NOTION_DB_ID,
          page_size: pageSize,
          start_cursor: cursor,
          filter,
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
        });
        const items = resp.results.map(mapNotionPageToProduct);
        return res.json({
          items,
          total: null,
          page: null,
          pageSize,
          cursor,
          nextCursor: resp.has_more ? resp.next_cursor : null,
        });
      }

      let nextCursor = null;
      let results = null;
      for (let i = 1; i <= page; i++) {
        const resp = await notion.databases.query({
          database_id: NOTION_DB_ID,
          page_size: pageSize,
          start_cursor: nextCursor || undefined,
          filter,
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
        });
        results = resp;
        nextCursor = resp.has_more ? resp.next_cursor : null;
        if (i < page && !resp.has_more) break;
      }

      const items = (results?.results || []).map(mapNotionPageToProduct);
      return res.json({
        items,
        total: null,
        page,
        pageSize,
        cursor: null,
        nextCursor,
      });
    } catch (err) {
      console.error("PRODUCTS_LIST_ERROR:", err);
      return res.status(500).json({ error: "Error listando productos" });
    }
  }

  // === STUB (si faltan envs) ===
  try {
    const DATASET_SIZE = 200;
    const decode = (c) => {
      try {
        const json = Buffer.from(c, "base64").toString("utf8");
        const obj = JSON.parse(json);
        return typeof obj.offset === "number" ? obj.offset : 0;
      } catch {
        return 0;
      }
    };
    const encode = (offset) =>
      Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64");

    const base = {
      name: q ? `Demo ${q}` : "Demo Product",
      sku: "DEMO-001",
      price: 123.45,
      url: "https://example.com/product/demo",
      imageUrl: "",
      tipo: category ? String(category) : null,
      inStock: inStock === null ? null : inStock === "true",
    };

    let offset = 0;
    if (cursor) offset = decode(cursor);
    else if (page > 1) offset = (page - 1) * pageSize;

    const end = Math.min(DATASET_SIZE, offset + pageSize);
    const items = Array.from({ length: Math.max(0, end - offset) }, (_, i) => ({
      id: `stub-${offset + i + 1}`,
      ...base,
    }));

    const hasMore = end < DATASET_SIZE;
    const nextCursor = hasMore ? encode(end) : null;

    return res.json({
      items,
      total: null,
      page: cursor ? null : page,
      pageSize,
      cursor: cursor || null,
      nextCursor,
    });
  } catch (err) {
    console.error("PRODUCTS_LIST_STUB_ERROR:", err);
    res.status(500).json({ error: "Error listando productos (stub)" });
  }
}

export async function getProduct(req, res) {
  if (!HAS_NOTION) {
    const { id } = req.params;
    return res.json({
      id,
      name: "Demo Product",
      sku: "DEMO-001",
      price: 123.45,
      url: "https://example.com/product/demo",
      imageUrl: "",
      tipo: "Nuevo",
      inStock: true,
    });
  }

  try {
    const { id } = req.params; // page_id de Notion
    const page = await notion.pages.retrieve({ page_id: id });
    const product = mapNotionPageToProduct(page);
    return res.json(product);
  } catch (err) {
    console.error("PRODUCTS_GET_ERROR:", err);
    res.status(500).json({ error: "Error obteniendo producto" });
  }
}

export async function createProduct(req, res) {
  if (!HAS_NOTION) {
    return res.stats(503).json({ error: "Notion no esta conectado" });
  }
  try {
    const {
      type = "Modificar",
      name,
      description,
      priority,
      url,
      requestedBy,
      sku,
      price,
      imageUrl,
      inStock,
    } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Falta 'name'" });
    }
    const people = await resolvePeopleIds(requestedBy);
    const properties = {
      Name: { title: [{ text: { content: String(name) } }] },
      // Escribimos en "Type". El filtro de list soporta "Tipo" o "Type".
      Type: { select: { name: normalizeTipo(type) || "Modificar" } },
      ...(priority ? { Priority: { select: { name: String(priority) } } } : {}),
      ...(url ? { URL: { url: String(url) } } : {}),
      ...(sku
        ? { SKU: { rich_text: [{ text: { content: String(sku) } }] } }
        : {}),
      ...(typeof price === "number" ? { Price: { number: price } } : {}),
      ...(typeof inStock === "boolean"
        ? { InStock: { checkbox: inStock } }
        : {}),
      ...(people.length ? { "Requested by": { people } } : {}),
      ...(description
        ? {
            Description: {
              rich_text: [{ text: { content: String(description) } }],
            },
          }
        : {}),
    };
    const page = await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties,
      ...(imageUrl
        ? { cover: { type: "external", external: { url: String(imageUrl) } } }
        : {}),
    });
    const created = await notion.pages.retrieve({ page_id: page.id });
    const product = mapNotionPageToProduct(created);
    return res.status(201).json(product);
  } catch (err) {
    console.error("PRODUCTS_CREATE_ERROR:", err.body || err);
    return res.status(500).json({ error: "Error creando producto" });
  }
}
export async function updateProduct(req, res) {
  if (!HAS_NOTION) {
    return res.status(503).json({ error: "Notion no configurado" });
  }
  try {
    const { id } = req.params;
    const {
      type,
      name,
      description,
      priority,
      url,
      requestedBy,
      sku,
      price,
      imageUrl,
      inStock,
      status,
    } = req.body || {};

    const people = await resolvePeopleIds(requestedBy);

    const properties = {
      ...(name
        ? { Name: { title: [{ text: { content: String(name) } }] } }
        : {}),
      ...(type ? { Type: { select: { name: normalizeTipo(type) } } } : {}),
      ...(priority ? { Priority: { select: { name: String(priority) } } } : {}),
      ...(typeof price === "number" ? { Price: { number: price } } : {}),
      ...(typeof inStock === "boolean"
        ? { InStock: { checkbox: inStock } }
        : {}),
      ...(url ? { URL: { url: String(url) } } : {}),
      ...(sku
        ? { SKU: { rich_text: [{ text: { content: String(sku) } }] } }
        : {}),
      ...(typeof status === "string"
        ? { Status: { status: { name: status } } }
        : {}),
      ...(people.length ? { "Requested by": { people } } : {}),
      ...(description
        ? {
            Description: {
              rich_text: [{ text: { content: String(description) } }],
            },
          }
        : {}),
    };

    const payload = { page_id: id, properties };
    if (imageUrl)
      payload.cover = { type: "external", external: { url: String(imageUrl) } };

    await notion.pages.update(payload);
    const updated = await notion.pages.retrieve({ page_id: id });
    const product = mapNotionPageToProduct(updated);
    return res.json(product);
  } catch (err) {
    console.error("PRODUCTS_UPDATE_ERROR:", err.body || err);
    return res.status(500).json({ error: "Error actualizando producto" });
  }
}
export async function deleteProduct(_req, res) {
  if (!HAS_NOTION) {
    return res.status(503).json({ error: "Notion no configurado" });
  }
  try {
    const { id } = _req.params;
    await notion.pages.update({ page_id: id, archived: true });
    return res.json({ id, archived: true });
  } catch (err) {
    console.error("PRODUCTS_DELETE_ERROR:", err.body || err);
    return res.status(500).json({ error: "Error archivando producto" });
  }
}

export async function getNotionSchema(_req, res) {
  try {
    if (!HAS_NOTION) {
      return res.status(503).json({ error: "Notion no configurado" });
    }
    const db = await notion.databases.retrieve({ database_id: NOTION_DB_ID });

    // Armamos una vista compacta: nombre -> tipo
    const props = db.properties || {};
    const compact = Object.fromEntries(
      Object.entries(props).map(([name, def]) => {
        const type = def?.type || "unknown";
        // Tip extra: para selects/status devolvemos sus opciones
        let meta = undefined;
        if (type === "select" || type === "multi_select") {
          meta = {
            options: (def[type]?.options || []).map((o) => ({
              name: o.name,
              id: o.id,
              color: o.color,
            })),
          };
        }
        if (type === "status") {
          meta = {
            options: (def.status?.options || []).map((o) => ({
              name: o.name,
              id: o.id,
              color: o.color,
            })),
            groups: (def.status?.groups || []).map((g) => ({
              name: g.name,
              option_ids: g.option_ids,
            })),
          };
        }
        return [name, meta ? { type, meta } : { type }];
      })
    );

    res.json({
      database: {
        id: db.id,
        title: db.title?.[0]?.plain_text || null,
        url: db.url || null,
      },
      properties: compact,
    });
  } catch (err) {
    console.error("NOTION_SCHEMA_ERROR:", err?.body || err);
    res.status(500).json({ error: "No se pudo obtener el esquema de Notion" });
  }
}
