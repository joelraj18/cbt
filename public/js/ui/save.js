// Saving exercise entries (shared by forms and widgets).
import { store } from '../core/store.js';

export function computeMetrics(ex, data) {
  try { return ex.metrics ? ex.metrics(data) : {}; } catch (e) { console.warn('metrics failed', e); return {}; }
}

export async function saveExercise(ex, data, { id } = {}) {
  const metrics = computeMetrics(ex, data);
  if (id) return store.update(id, { data, metrics });
  return store.add({ kind: 'exercise', type: ex.id, area: ex.area, data, metrics });
}
