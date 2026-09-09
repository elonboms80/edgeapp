export type Metric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  change: number;
  percentile: number;
  trend: number[];
};

export const metrics: Metric[] = [
  { key: 'speed', label: 'Top Speed', value: 19.8, unit: 'mph', change: 8, percentile: 84, trend: [18.2,18.6,18.4,19.0,18.8,19.3,19.1,19.8] },
  { key: 'acceleration', label: 'Acceleration', value: 8.7, unit: '/10', change: 12, percentile: 78, trend: [7.1,7.4,7.3,7.7,8.0,8.1,8.4,8.7] },
  { key: 'workRate', label: 'Work Rate', value: 92, unit: '%', change: 6, percentile: 91, trend: [83,84,87,87,89,90,91,92] },
  { key: 'repeatEffort', label: 'Repeat Effort', value: 7.1, unit: '/10', change: 3, percentile: 63, trend: [7.8,7.6,7.7,7.5,7.4,7.3,7.0,7.1] },
  { key: 'distance', label: 'Total Distance', value: 4.8, unit: 'mi', change: 12, percentile: 72, trend: [4.0,4.2,4.1,4.4,4.5,4.4,4.6,4.8] },
  { key: 'highIntensity', label: 'High-Intensity Distance', value: 1.9, unit: 'mi', change: 9, percentile: 68, trend: [1.5,1.6,1.6,1.7,1.8,1.7,1.8,1.9] }
];

export const extracted = [
  ['Top Speed','19.8','mph'],
  ['Average Speed','11.2','mph'],
  ['Total Distance','4.8','miles'],
  ['High-Intensity Distance','1.9','miles'],
  ['Sprints (>18 mph)','27',''],
  ['Accelerations (>2 mph/s)','48',''],
  ['Decelerations (>2 mph/s)','44',''],
  ['Average Shift Length','37','seconds'],
  ['Work Rate','92','%']
] as const;

export const drills = [
  { title: 'Resisted First-Three-Stride Starts', prescription: '5 × starts · full recovery', why: 'Targets explosive first-step force without adding unnecessary conditioning volume.' },
  { title: 'Lateral Crossover Acceleration', prescription: '4 reps each direction', why: 'Builds game-relevant acceleration after edge changes and lateral movement.' },
  { title: 'Broad-Jump Power Series', prescription: '3 × 5 reps', why: 'Develops horizontal force production that transfers well to initial skating acceleration.' },
  { title: 'Endurance Acceleration Intervals', prescription: '6 × 20 sec · 40 sec rest', why: 'Targets the late-session repeat-effort drop visible in the current trend data.' }
];
