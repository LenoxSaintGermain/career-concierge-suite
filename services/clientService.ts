import { db } from './firebase';
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ClientDoc, ClientIntent, ClientPreferences, IntakeAnswers } from '../types';

const CLIENTS_COLLECTION = 'clients';

export const getOrCreateClient = async (uid: string): Promise<ClientDoc> => {
  const ref = doc(db, CLIENTS_COLLECTION, uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as Omit<ClientDoc, 'uid'>;
    return { uid, ...(data as any) } as ClientDoc;
  }

  const now = Timestamp.now();
  const initial: Omit<ClientDoc, 'uid'> = {
    created_at: now,
    updated_at: now,
  };

  await setDoc(ref, initial);
  return { uid, ...initial } as ClientDoc;
};

export const markIntroSeen = async (uid: string) => {
  const ref = doc(db, CLIENTS_COLLECTION, uid);
  const now = Timestamp.now();
  await updateDoc(ref, { intro_seen_at: now, updated_at: now });
};

export const saveIntake = async (uid: string, payload: {
  intent: ClientIntent;
  preferences: ClientPreferences;
  answers: IntakeAnswers;
}) => {
  const ref = doc(db, CLIENTS_COLLECTION, uid);
  const now = Timestamp.now();
  await setDoc(
    ref,
    {
      intent: payload.intent,
      preferences: payload.preferences,
      intake: { answers: payload.answers, completed_at: now },
      updated_at: now,
    },
    { merge: true }
  );
};

