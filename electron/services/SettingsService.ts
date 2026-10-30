import { Store } from './Store';
import { settingsSchema } from './validation';
export class SettingsService {
  constructor(private store: Store) {}
  get() { return this.store.data.settings; }
  update(input: unknown) { const settings = settingsSchema.parse(input); this.store.data.settings = settings; this.store.save(); return settings; }
}
