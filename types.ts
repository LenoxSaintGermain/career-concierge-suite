export type SuiteModuleId = 'intake' | 'brief' | 'profile' | 'ai_profile' | 'gaps' | 'plan' | 'assets';
export type SuiteModuleKind = 'flow' | 'artifact' | 'collection';

export interface SuiteModule {
  id: SuiteModuleId;
  index: string; // e.g. "01"
  title: string;
  subtitle: string;
  kind: SuiteModuleKind;
  relatedIds?: SuiteModuleId[];
}

export type ClientIntent = 'current_role' | 'target_role' | 'not_sure';
export type PacePreference = 'straight' | 'standard' | 'story';
export type FocusPreference = 'job_search' | 'skills' | 'leadership';

export type IntakeAnswers = Record<string, string>;

export interface ClientPreferences {
  pace: PacePreference;
  focus: FocusPreference;
}

export interface ClientDoc {
  uid: string;
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp

  intro_seen_at?: any; // Firestore Timestamp

  intent?: ClientIntent;
  preferences?: ClientPreferences;
  intake?: {
    answers: IntakeAnswers;
    completed_at?: any; // Firestore Timestamp
  };
}

export type ArtifactType = 'brief' | 'profile' | 'ai_profile' | 'gaps' | 'plan';

export interface BriefContent {
  learned: string[]; // 3 bullets
  needle: string[]; // 3 bullets
  next_72_hours: { id: string; label: string; done: boolean }[];
}

export interface PlanContent {
  next_72_hours: { id: string; label: string; done: boolean }[];
  next_2_weeks: { goal: string; cadence: string[] };
  needs_from_you: string[];
}

export interface ArtifactDoc<T = unknown> {
  id: string; // Firestore document id
  type: ArtifactType;
  title: string;
  version: number;
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp
  content: T;
}
