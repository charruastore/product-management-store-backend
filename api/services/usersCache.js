import { notion } from "./notionClient.js";

const USER_CACHE = new Map();
let loading = null;
let loadedOnce = false;

export async function loadUsersIntoCache() {
  if (loading) return loading;
  loading = (async () => {
    USER_CACHE.clear();
    let cursor;
    do {
      const resp = await notion.users.list({ start_cursor: cursor });
      for (const u of resp.results) {
        if (u.name) USER_CACHE.set(u.name.toLowerCase(), u.id);
        if (u.person?.email) USER_CACHE.set(u.person.email.toLowerCase(), u.id);
      }
      cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);
    loadedOnce = true;
    console.log(`[usersCache] users: ${USER_CACHE.size}`);
    loading = null;
  })();
  return loading;
}

loadUsersIntoCache().catch((err) => console.error("USER_CACHE_ERROR:", err));

export async function resolvePeopleIds(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  if (!loadedOnce || USER_CACHE.size === 0) {
    await loadUsersIntoCache();
  }
  const ids = [];
  for (const raw of arr) {
    const key = String(raw).trim().toLowerCase();
    const id = USER_CACHE.get(key);
    if (id) ids.push({ id });
  }
  return ids;
}

export async function listCachedUsers() {
  if (!loadedOnce) await loadUsersIntoCache();
  const out = [];
  for (const [key, id] of USER_CACHE.entries()) out.push({ key, id });
  return out;
}

export async function refreshUsersCache() {
  await loadUsersIntoCache();
  return { ok: true, size: USER_CACHE.size };
}
