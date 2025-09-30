import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Job } from '../types';

export function subscribeSavedJobIds(uid: string, cb: (ids: Set<string>) => void): Unsubscribe {
  const colRef = collection(db, 'users', uid, 'savedJobs');
  return onSnapshot(colRef, (snap) => {
    const ids = new Set<string>();
    snap.forEach((d) => ids.add(d.id)); // doc id = jobId
    cb(ids);
  });
}

export async function toggleSave(uid: string, job: Job, alreadySaved: boolean) {
  const ref = doc(db, 'users', uid, 'savedJobs', job.id);
  if (alreadySaved) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, {
      jobId: job.id,
      title: job.title ?? '',
      companyName: job.companyName ?? '',
      location: job.location ?? '',
      type: job.type ?? '',
      savedAt: serverTimestamp(),
    }, { merge: true });
  }
}
