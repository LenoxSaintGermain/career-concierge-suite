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

const toText = (value: unknown) => String(value ?? '').trim();

const deriveDisplayName = (email?: string | null) => {
  const localPart = toText(email).split('@')[0] || '';
  const cleaned = localPart.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

export const getOrCreateClient = async (
  uid: string,
  profile?: { email?: string | null; displayName?: string | null },
): Promise<ClientDoc> => {
  const ref = doc(db, CLIENTS_COLLECTION, uid);
  const snap = await getDoc(ref);
  const email = toText(profile?.email) || undefined;
  const displayName = toText(profile?.displayName) || deriveDisplayName(email) || undefined;

  if (snap.exists()) {
    const data = snap.data() as Omit<ClientDoc, 'uid'>;
    const patch: Partial<ClientDoc> = {};
    if (!toText(data.email) && email) patch.email = email;
    if (!toText(data.display_name) && displayName) patch.display_name = displayName;
    if (Object.keys(patch).length) {
      await setDoc(
        ref,
        {
          ...patch,
          updated_at: Timestamp.now(),
        },
        { merge: true },
      );
    }
    return { uid, ...(data as any), ...patch } as ClientDoc;
  }

  const now = Timestamp.now();
  const initial: Omit<ClientDoc, 'uid'> = {
    ...(email ? { email } : {}),
    ...(displayName ? { display_name: displayName } : {}),
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
  // Persist preferred_name as display_name so wiki compiles with real name
  const preferredName = typeof payload.answers.preferred_name === 'string'
    ? payload.answers.preferred_name.trim()
    : '';
  const namePatch = preferredName ? { display_name: preferredName } : {};
  await setDoc(
    ref,
    {
      intent: payload.intent,
      preferences: payload.preferences,
      intake: { answers: payload.answers, completed_at: now },
      ...namePatch,
      updated_at: now,
    },
    { merge: true }
  );
};
