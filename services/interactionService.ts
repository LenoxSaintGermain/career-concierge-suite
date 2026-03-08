import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { InteractionLog } from '../types';

const interactionRef = (uid: string, id: string) => doc(db, 'clients', uid, 'interactions', id);

export const logClientInteraction = async (
  uid: string,
  payload: Omit<InteractionLog, 'created_at' | 'updated_at'>
) => {
  const now = Timestamp.now();
  await setDoc(
    interactionRef(uid, payload.id),
    {
      ...payload,
      created_at: now,
      updated_at: now,
    },
    { merge: true }
  );
};
