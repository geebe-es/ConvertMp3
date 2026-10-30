import { Store } from './Store';
import type { Job } from '../../shared/types';
export class HistoryService {
  constructor(private store: Store) {}
  get() { return this.store.data.history; }
  add(job: Job) { this.store.data.history = [structuredClone(job), ...this.get().filter(j => j.id !== job.id)].slice(0, 3000); this.store.save(); }
  remove(id?: string) { this.store.data.history = id ? this.get().filter(j => j.id !== id) : []; this.store.save(); }
}
