import { db } from './firebase';
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { ArtifactDoc, ArtifactType } from '../types';

const CLIENTS_COLLECTION = 'clients';

const artifactRef = (uid: string, type: ArtifactType) =>
  doc(db, CLIENTS_COLLECTION, uid, 'artifacts', type);

export const getArtifact = async <T = unknown>(
  uid: string,
  type: ArtifactType
): Promise<ArtifactDoc<T> | null> => {
  const ref = artifactRef(uid, type);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<ArtifactDoc<T>, 'id'>;
  return { id: snap.id, ...(data as any) };
};

export const upsertArtifact = async <T = unknown>(
  uid: string,
  type: ArtifactType,
  title: string,
  content: T
): Promise<ArtifactDoc<T>> => {
  const ref = artifactRef(uid, type);
  const snap = await getDoc(ref);
  const now = Timestamp.now();

  const current = snap.exists() ? (snap.data() as any) : null;
  const nextVersion = (current?.version ?? 0) + 1;
  const createdAt = current?.created_at ?? now;

  const docData: Omit<ArtifactDoc<T>, 'id'> = {
    type,
    title,
    version: nextVersion,
    created_at: createdAt,
    updated_at: now,
    content,
  };

  await setDoc(ref, docData);
  return { id: type, ...docData };
};

export const listArtifacts = async (uid: string): Promise<ArtifactDoc[]> => {
  const col = collection(db, CLIENTS_COLLECTION, uid, 'artifacts');
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ArtifactDoc[];
};

