import type { PreferredLanguage } from '@intellifarm/contracts';

export const languages = [
  { code: 'en', label: 'English', nativeLabel: 'English', enabled: true },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', enabled: true },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', enabled: false },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', enabled: false },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', enabled: false },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', enabled: false },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', enabled: false },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', enabled: false },
] as const;

export const defaultLanguage: PreferredLanguage = 'en';

export const irrigationOptions = [
  { value: 'RAIN_FED', label: 'Rainfed' },
  { value: 'DRIP', label: 'Drip' },
  { value: 'SPRINKLER', label: 'Sprinkler' },
  { value: 'FLOOD', label: 'Flood' },
  { value: 'MANUAL', label: 'Manual' },
] as const;

export const soilOptions = [
  { value: 'ALLUVIAL', label: 'Alluvial' },
  { value: 'BLACK_REGUR', label: 'Black Regur' },
  { value: 'RED', label: 'Red' },
  { value: 'LATERITE', label: 'Laterite' },
  { value: 'SANDY', label: 'Sandy' },
  { value: 'CLAY_HEAVY', label: 'Clay Heavy' },
  { value: 'LOAMY_MIXED', label: 'Loamy Mixed' },
  { value: 'NOT_SURE', label: 'Not sure' },
] as const;

export const seasonKeyOptions = [
  { value: 'KHARIF', label: 'Kharif (Jun–Oct)', description: 'Monsoon crop season' },
  { value: 'RABI', label: 'Rabi (Nov–Mar)', description: 'Winter crop season' },
  { value: 'ZAID', label: 'Zaid (Mar–Jun)', description: 'Summer crop season' },
] as const;

export const waterSupplyOptions = [
  { value: 'PLENTY', label: 'Plenty', description: 'Canal, well, or bore — reliable year-round' },
  { value: 'MODERATE', label: 'Moderate', description: 'Available but seasonal gaps possible' },
  { value: 'LIMITED', label: 'Limited', description: 'Depends on monsoon, manual sometimes' },
  { value: 'SCARCE', label: 'Scarce', description: 'Mostly rain-fed, limited irrigation' },
] as const;

export const assistantPrompts = [
  'Should I irrigate today?',
  'What is the mandi price of soybean nearby?',
  'My leaves are turning yellow. What should I check first?',
  'Which scheme may fit my farm right now?',
];

export const storageKeys = {
  language: 'intellifarm.language',
  assistantConversations: 'intellifarm.assistant-conversations',
  assistantActiveConversationId: 'intellifarm.assistant-active-conversation-id',
  selectedSeasonId: 'intellifarm.selected-season-id',
  pendingDiseaseReports: 'intellifarm.pending-disease-reports',
  communityComposerDraft: 'intellifarm.community-composer-draft',
  communityNotice: 'intellifarm.community-notice',
  expenseEntries: 'intellifarm.expense-entries',
  pendingExpenseMutations: 'intellifarm.pending-expense-mutations',
  homeTasks: 'intellifarm.home-tasks',
  marketPinnedCrops: 'intellifarm.market-pinned-crops',
  profileSettingsNotice: 'intellifarm.profile-settings-notice',
} as const;
