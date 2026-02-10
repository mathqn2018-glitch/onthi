import { UserProfile, RoadmapData, StudySession, Note, Bookmark, Achievement, ReviewSchedule } from '../types';

// Storage keys
const KEYS = {
    API_KEY: 'gemini_api_key',
    ROADMAP: 'math_roadmap',
    PROFILE: 'user_profile',
    SESSIONS: 'study_sessions',
    NOTES: 'study_notes',
    BOOKMARKS: 'study_bookmarks',
    ACHIEVEMENTS: 'user_achievements',
    REVIEW_SCHEDULES: 'review_schedules',
    VERSION: 'data_version'
};

const CURRENT_VERSION = '2.0';

// --- Data Migration ---
export const migrateData = (): void => {
    const version = localStorage.getItem(KEYS.VERSION);

    if (version === CURRENT_VERSION) return;

    console.log('Migrating data from version', version, 'to', CURRENT_VERSION);

    // Migrate UserProfile
    const profileStr = localStorage.getItem(KEYS.PROFILE);
    if (profileStr) {
        try {
            const profile = JSON.parse(profileStr);
            const migratedProfile: UserProfile = {
                ...profile,
                studyStreak: profile.studyStreak || 0,
                longestStreak: profile.longestStreak || 0,
                totalStudyTime: profile.totalStudyTime || 0,
                lastStudyDate: profile.lastStudyDate || new Date().toISOString().split('T')[0],
                achievements: profile.achievements || [],
                preferences: profile.preferences || {
                    darkMode: false,
                    notifications: false,
                    dailyGoal: 30
                }
            };
            localStorage.setItem(KEYS.PROFILE, JSON.stringify(migratedProfile));
        } catch (e) {
            console.error('Profile migration failed:', e);
        }
    }

    // Migrate Roadmap Items
    const roadmapStr = localStorage.getItem(KEYS.ROADMAP);
    if (roadmapStr) {
        try {
            const roadmap = JSON.parse(roadmapStr);
            const migratedItems = roadmap.items.map((item: any) => ({
                ...item,
                reviewCount: item.reviewCount || 0,
                mastery: item.mastery || 0,
                totalStudyTime: item.totalStudyTime || 0,
                bestScore: item.bestScore || 0,
                averageScore: item.averageScore || 0
            }));
            roadmap.items = migratedItems;
            localStorage.setItem(KEYS.ROADMAP, JSON.stringify(roadmap));
        } catch (e) {
            console.error('Roadmap migration failed:', e);
        }
    }

    localStorage.setItem(KEYS.VERSION, CURRENT_VERSION);
};

// --- Storage Functions ---

export const saveProfile = (profile: UserProfile): void => {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
};

export const loadProfile = (): UserProfile | null => {
    const data = localStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
};

export const saveRoadmap = (roadmap: RoadmapData): void => {
    localStorage.setItem(KEYS.ROADMAP, JSON.stringify(roadmap));
};

export const loadRoadmap = (): RoadmapData | null => {
    const data = localStorage.getItem(KEYS.ROADMAP);
    return data ? JSON.parse(data) : null;
};

export const saveSessions = (sessions: StudySession[]): void => {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
};

export const loadSessions = (): StudySession[] => {
    const data = localStorage.getItem(KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
};

export const saveNotes = (notes: Note[]): void => {
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
};

export const loadNotes = (): Note[] => {
    const data = localStorage.getItem(KEYS.NOTES);
    return data ? JSON.parse(data) : [];
};

export const saveBookmarks = (bookmarks: Bookmark[]): void => {
    localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
};

export const loadBookmarks = (): Bookmark[] => {
    const data = localStorage.getItem(KEYS.BOOKMARKS);
    return data ? JSON.parse(data) : [];
};

export const saveAchievements = (achievements: Achievement[]): void => {
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
};

export const loadAchievements = (): Achievement[] => {
    const data = localStorage.getItem(KEYS.ACHIEVEMENTS);
    return data ? JSON.parse(data) : [];
};

export const saveReviewSchedules = (schedules: ReviewSchedule[]): void => {
    localStorage.setItem(KEYS.REVIEW_SCHEDULES, JSON.stringify(schedules));
};

export const loadReviewSchedules = (): ReviewSchedule[] => {
    const data = localStorage.getItem(KEYS.REVIEW_SCHEDULES);
    return data ? JSON.parse(data) : [];
};

// --- Export/Import ---

export const exportAllData = (): string => {
    const data = {
        version: CURRENT_VERSION,
        profile: loadProfile(),
        roadmap: loadRoadmap(),
        sessions: loadSessions(),
        notes: loadNotes(),
        bookmarks: loadBookmarks(),
        achievements: loadAchievements(),
        reviewSchedules: loadReviewSchedules(),
        exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);

        if (data.profile) saveProfile(data.profile);
        if (data.roadmap) saveRoadmap(data.roadmap);
        if (data.sessions) saveSessions(data.sessions);
        if (data.notes) saveNotes(data.notes);
        if (data.bookmarks) saveBookmarks(data.bookmarks);
        if (data.achievements) saveAchievements(data.achievements);
        if (data.reviewSchedules) saveReviewSchedules(data.reviewSchedules);

        return true;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
};

export const clearAllData = (): void => {
    Object.values(KEYS).forEach(key => {
        if (key !== KEYS.API_KEY) { // Keep API key
            localStorage.removeItem(key);
        }
    });
};
