"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticPeerPresenceStore = void 0;
class StaticPeerPresenceStore {
    previewSnapshot = null;
    async load() {
        return this.previewSnapshot;
    }
    async setPreviewSnapshot(snapshot) {
        this.previewSnapshot = snapshot;
    }
    async clearPreviewSnapshot() {
        this.previewSnapshot = null;
    }
}
exports.StaticPeerPresenceStore = StaticPeerPresenceStore;
