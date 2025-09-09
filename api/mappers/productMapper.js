function pick(props, names) {
  for (const n of names) if (props?.[n]) return props[n];
  return undefined;
}
function firstTitleText(p) {
  return p?.title?.[0]?.plain_text ?? null;
}
function firstRichText(p) {
  return p?.rich_text?.[0]?.plain_text ?? null;
}
function firstRichHref(p) {
  return p?.rich_text?.[0]?.href ?? null;
}
function uniqueIdToString(p) {
  const u = p?.unique_id;
  if (!u) return null;
  const prefix = u.prefix ?? "";
  const num = u.number ?? "";
  const joined = `${prefix}${num}`;
  return joined || null;
}

export function mapNotionPageToProduct(page) {
  const props = page?.properties || {};
  const nameP = pick(props, ["Name", "Nombre", "Title", "Título", "Titulo"]);
  const skuP = pick(props, ["SKU", "Sku", "Código", "Codigo"]);
  const priceP = pick(props, ["Price", "Precio"]);
  const urlP = pick(props, ["URL", "Url", "Link", "Enlace"]);
  const imgP = pick(props, ["Image", "Imagen", "Foto", "Cover"]);
  const typeP = pick(props, [
    "Tipo",
    "Type",
    "Category",
    "Categoría",
    "Categoria",
  ]);
  const stockP = pick(props, ["InStock", "Stock", "Disponible"]);
  const name = firstTitleText(nameP) ?? firstRichText(nameP) ?? "Sin nombre";

  const sku = firstRichText(skuP) ?? uniqueIdToString(skuP) ?? null;

  const price = typeof priceP?.number === "number" ? priceP.number : null;

  const url = urlP?.url ?? firstRichHref(urlP) ?? firstRichText(urlP) ?? null;

  let imageUrl = null;
  const files = imgP?.files;
  if (Array.isArray(files) && files.length) {
    const f = files[0];
    imageUrl = f.type === "file" ? f.file?.url : f.external?.url;
  }
  if (!imageUrl) {
    imageUrl = page?.cover?.external?.url || page?.cover?.file?.url || null;
  }

  const tipo = typeP?.select?.name ?? null;
  const inStock =
    typeof stockP?.checkbox === "boolean" ? stockP.checkbox : null;

  return {
    id: page.id,
    name,
    sku,
    price,
    url,
    imageUrl,
    tipo,
    inStock,
    lastEdited: page?.last_edited_time ?? null,
  };
}
