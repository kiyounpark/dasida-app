import type { PeerPresenceSnapshot } from './types';

export type PeerPresenceStore = {
  load(): Promise<PeerPresenceSnapshot | null>;
};

export type PreviewablePeerPresenceStore = PeerPresenceStore & {
  setPreviewSnapshot(snapshot: PeerPresenceSnapshot | null): Promise<void>;
  clearPreviewSnapshot(): Promise<void>;
};

export class StaticPeerPresenceStore implements PreviewablePeerPresenceStore {
  private previewSnapshot: PeerPresenceSnapshot | null = null;

  async load(): Promise<PeerPresenceSnapshot | null> {
    return this.previewSnapshot;
  }

  async setPreviewSnapshot(snapshot: PeerPresenceSnapshot | null): Promise<void> {
    this.previewSnapshot = snapshot;
  }

  async clearPreviewSnapshot(): Promise<void> {
    this.previewSnapshot = null;
  }
}
