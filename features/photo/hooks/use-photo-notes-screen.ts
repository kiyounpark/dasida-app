import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CloudNoteState } from '@/functions/src/photo-store-contract';

import { loadRemotePhotoNotes } from '../cloud/remote-note-store';
import { findNotesMissingOnServer, uploadMissingNotes } from '../cloud/upload-missing-notes';
import { readPhotoNotes } from '../note-store';
import type { PhotoNote } from '../types';

type GetRemoteAuthHeaders = (accountKey: string) => Promise<Record<string, string>>;

/** 서버 목록에서 쓰는 칸만 — ☁ 줄과 「올리기」 고르기 */
type RemoteSummary = { storedAt: string; hasPhoto: boolean; deleted: boolean };

/**
 * 지난 노트 화면의 상태 — 기기 노트 읽기 · 서버 노트 합치기(1.0.11 3줄) · 서버에 없는 노트 올리기(4).
 *
 * 올리기 버튼은 서버 목록을 읽은 뒤에만 낸다 — 못 읽었으면 무엇이 서버에 없는지 모르고, 올려도 어차피 실패한다.
 */
export function usePhotoNotesScreen({
  accountKey,
  getRemoteAuthHeaders,
}: {
  accountKey?: string | null;
  getRemoteAuthHeaders?: GetRemoteAuthHeaders | null;
}) {
  const [notes, setNotes] = useState<PhotoNote[] | null>(null);
  const [remotePending, setRemotePending] = useState(false);
  /** null = 서버 목록을 아직(또는 끝내) 못 읽음 */
  const [remote, setRemote] = useState<Map<string, RemoteSummary> | null>(null);
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const uploadingRef = useRef(false);
  const accountRef = useRef(accountKey);
  accountRef.current = accountKey;
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setRemote(null);
      const local = accountKey ? await readPhotoNotes(accountKey) : [];
      if (cancelled) return;

      setRemotePending(!!accountKey && !!getRemoteAuthHeaders);
      setNotes(local);
      if (!accountKey || !getRemoteAuthHeaders) return;

      await loadRemotePhotoNotes(accountKey, local, getRemoteAuthHeaders, {
        isCancelled: () => cancelled,
        onUpdate: (merged) => {
          if (!cancelled) setNotes(merged);
        },
        onRemoteDocs: (docs) => {
          if (cancelled) return;
          setRemote(
            new Map(
              docs.map((doc) => [
                doc.id,
                { storedAt: doc.storedAt, hasPhoto: doc.photoPath != null, deleted: !!doc.deletedAt },
              ]),
            ),
          );
        },
      });
      if (!cancelled) setRemotePending(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [accountKey, getRemoteAuthHeaders]);

  const missing = useMemo(
    () => (notes && remote ? findNotesMissingOnServer(notes, new Set(remote.keys())) : []),
    [notes, remote],
  );

  /**
   * 카드 ☁ 줄. 서버 목록이 말하는 게 먼저, 없으면 로컬 cloudStoredAt(둘 다 서버 응답에서 온 값).
   * 둘 다 없으면 undefined — 카드가 이번 실행의 올리기 상태(「저장 중」·「저장 못 함」)를 note.id로 읽는다.
   */
  const cloudOf = useCallback(
    (note: PhotoNote): CloudNoteState | undefined => {
      const server = remote?.get(note.id);
      if (server) {
        return server.deleted ? undefined : { kind: 'stored', storedAt: server.storedAt, hasPhoto: server.hasPhoto };
      }
      if (note.cloudStoredAt) return { kind: 'stored', storedAt: note.cloudStoredAt, hasPhoto: !!note.photoUri };
      return undefined;
    },
    [remote],
  );

  const uploadMissing = useCallback(async () => {
    if (uploadingRef.current || !accountKey || !getRemoteAuthHeaders || missing.length === 0) return;
    uploadingRef.current = true;
    setUpload({ done: 0, total: missing.length });

    const isGone = () => unmountedRef.current || accountRef.current !== accountKey;
    try {
      const results = await uploadMissingNotes({
        accountKey,
        notes: missing,
        getHeaders: getRemoteAuthHeaders,
        isCancelled: isGone,
        onProgress: (done, total) => {
          if (!isGone()) setUpload({ done, total });
        },
      });
      if (isGone()) return;
      setNotes((prev) =>
        prev
          ? prev.map((note) => {
              const state = results.get(note.id);
              return state?.kind === 'stored' ? { ...note, cloudStoredAt: state.storedAt } : note;
            })
          : prev,
      );
    } finally {
      uploadingRef.current = false;
      if (!unmountedRef.current) setUpload(null);
    }
  }, [accountKey, getRemoteAuthHeaders, missing]);

  return {
    notes,
    remotePending,
    cloudOf,
    missingCount: missing.length,
    upload,
    uploadMissing,
  };
}
