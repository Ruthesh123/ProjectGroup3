import { useEffect, useState } from 'react';
import { Job } from '../types';
import { subscribeSavedJobIds, toggleSave } from '../lib/savedJobs';

export function useSavedJobs(uid?: string | null) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) { setIds(new Set()); return; }
    const unsub = subscribeSavedJobIds(uid, setIds);
    return () => unsub();
  }, [uid]);

  const isSaved = (jobId: string) => ids.has(jobId);

  const toggle = async (uid: string, job: Job) => {
    if (busy.has(job.id)) return;
    setBusy(prev => new Set(prev).add(job.id));
    try { await toggleSave(uid, job, ids.has(job.id)); }
    finally {
      setBusy(prev => { const n = new Set(prev); n.delete(job.id); return n; });
    }
  };

  return { isSaved, toggle, ids, busy };
}
