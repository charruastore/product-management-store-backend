const store = new Map();

export function save(task) {
  store.set(task.id, task);
}
export function get(id) {
  return store.get(id) || null;
}
export function all() {
  return Array.from(store.values());
}
