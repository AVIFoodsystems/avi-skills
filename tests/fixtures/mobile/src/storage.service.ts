import { Preferences } from '@capacitor/preferences';
import { Attachment } from './attachment.model';
export class AttachmentStorageService {
  async save(attachment: Attachment) { await Preferences.set({ key: attachment.syncId, value: JSON.stringify(attachment) }); }
}
