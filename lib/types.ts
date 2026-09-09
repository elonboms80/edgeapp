export type SessionType = 'practice' | 'game' | 'unknown';

export type ExtractedMetric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  confidence: number;
  sourceImage?: number;
  notes?: string;
};

export type ExtractionResult = {
  sessionType: SessionType;
  sessionDate?: string;
  durationMinutes?: number;
  opponent?: string;
  metrics: ExtractedMetric[];
  warnings: string[];
};

export type SessionAnalysis = {
  rating: 'Exceptional' | 'Strong' | 'Solid' | 'Mixed' | 'Development session';
  summary: string;
  strengths: string[];
  focusAreas: string[];
  trainingFocus: string;
  trendNotes: string[];
};

export type StoredSession = {
  id: string;
  createdAt: string;
  sessionType: SessionType;
  sessionDate: string;
  durationMinutes?: number;
  opponent?: string;
  metrics: ExtractedMetric[];
  analysis: SessionAnalysis;
};
