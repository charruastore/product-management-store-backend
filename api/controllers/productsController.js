import { notion, HAS_NOTION, NOTION_DB_ID } from "../services/notionClient.js";
import { mapNotionPageToProduct } from "../mappers/productMapper.js";

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
  return input; // por si tu Notion usa otro label
}

/** Construye el filtro completo para Notion */
function buildFilter({ q, category, inStock }) {
  const blocks = [];

  // Filtro por tipo (Select "Tipo": "Nuevo" | "Modificar")
  const tipo = normalizeTipo(category);
  if (tipo) {
    blocks.push({ property: "Tipo", select: { equals: tipo } });
  }

  // Filtro por stock (checkbox)
  if (typeof inStock !== "undefined" && inStock !== null) {
    const val =
      typeof inStock === "string" ? inStock === "true" : Boolean(inStock);
    blocks.push({ property: "InStock", checkbox: { equals: val } });
  }

  // Búsqueda simple por Name/Nombre y SKU/Sku
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

/** GET /api/products — Cursor-first + compat con page */
export async function listProducts(req, res) {
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const q = String(req.query.q ?? "");
  const cursor = req.query.cursor || null;
  const page = Math.max(1, Number(req.query.page ?? 1)); // compat
  const category = req.query.category || null; // "nuevo" | "modificar"
  const inStock = req.query.inStock ?? null; // "true" | "false" | null

  // === NOTION REAL ===
  if (HAS_NOTION) {
    try {
      const filter = buildFilter({ q, category, inStock });

      // Con cursor explícito (paginación eficiente)
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
          total: null, // Notion no da total sin recorrer todo
          page: null, // con cursor no tiene sentido "page"
          pageSize,
          cursor,
          nextCursor: resp.has_more ? resp.next_cursor : null,
        });
      }

      // Sin cursor: avanzar internamente hasta la "page" pedida (compat)
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

/** GET /api/products/:id — page_id de Notion */
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

// Mutaciones (501 hasta definir escritura en Notion)
export async function createProduct(_req, res) {
  return res
    .status(501)
    .json({ error: "createProduct no implementado todavía" });
}
export async function updateProduct(_req, res) {
  return res
    .status(501)
    .json({ error: "updateProduct no implementado todavía" });
}
export async function deleteProduct(_req, res) {
  return res
    .status(501)
    .json({ error: "deleteProduct no implementado todavía" });
}
