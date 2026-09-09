import type { StoredSession } from './types';

const KEY = 'edge.hockey.sessions.v1';

export function getLocalSessions(): StoredSession[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || '[]') as StoredSession[]; }
  catch { return []; }
}

export function saveLocalSession(session: StoredSession) {
  const current = getLocalSessions();
  const next = [...current.filter(s => s.id !== session.id), session].sort((a,b) => a.sessionDate.localeCompare(b.sessionDate));
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
