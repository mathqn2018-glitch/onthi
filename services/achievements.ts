import { Achievement } from '../types';

/**
 * Predefined achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_quiz',
        title: 'Bước Đầu Tiên',
        description: 'Hoàn thành bài kiểm tra đầu tiên',
        icon: 'fa-rocket',
        category: 'completion',
        requirement: { type: 'custom', value: 1 }
    },
    {
        id: 'perfect_score',
        title: 'Hoàn Hảo',
        description: 'Đạt 100% trong một bài kiểm tra',
        icon: 'fa-star',
        category: 'score',
        requirement: { type: 'perfect_score', value: 100 }
    },
    {
        id: 'streak_3',
        title: 'Kiên Trì 3 Ngày',
        description: 'Học liên tục 3 ngày',
        icon: 'fa-fire',
        category: 'streak',
        requirement: { type: 'streak', value: 3 }
    },
    {
        id: 'streak_7',
        title: 'Chiến Binh Tuần',
        description: 'Học liên tục 7 ngày',
        icon: 'fa-fire-flame-curved',
        category: 'streak',
        requirement: { type: 'streak', value: 7 }
    },
    {
        id: 'streak_30',
        title: 'Huyền Thoại Tháng',
        description: 'Học liên tục 30 ngày',
        icon: 'fa-crown',
        category: 'streak',
        requirement: { type: 'streak', value: 30 }
    },
    {
        id: 'complete_5',
        title: 'Người Mới',
        description: 'Hoàn thành 5 chủ đề',
        icon: 'fa-graduation-cap',
        category: 'completion',
        requirement: { type: 'complete_topics', value: 5 }
    },
    {
        id: 'complete_10',
        title: 'Học Giả',
        description: 'Hoàn thành 10 chủ đề',
        icon: 'fa-book-open',
        category: 'completion',
        requirement: { type: 'complete_topics', value: 10 }
    },
    {
        id: 'complete_all',
        title: 'Bậc Thầy',
        description: 'Hoàn thành toàn bộ lộ trình',
        icon: 'fa-trophy',
        category: 'completion',
        requirement: { type: 'custom', value: 1 }
    },
    {
        id: 'study_10h',
        title: 'Chăm Chỉ',
        description: 'Học tổng cộng 10 giờ',
        icon: 'fa-clock',
        category: 'special',
        requirement: { type: 'total_time', value: 600 }
    },
    {
        id: 'study_50h',
        title: 'Cực Kỳ Chăm Chỉ',
        description: 'Học tổng cộng 50 giờ',
        icon: 'fa-hourglass-end',
        category: 'special',
        requirement: { type: 'total_time', value: 3000 }
    },
    {
        id: 'mastery_80',
        title: 'Thành Thạo',
        description: 'Đạt 80% mastery trên 5 chủ đề',
        icon: 'fa-medal',
        category: 'mastery',
        requirement: { type: 'custom', value: 5 }
    },
    {
        id: 'night_owl',
        title: 'Cú Đêm',
        description: 'Học sau 10 giờ tối',
        icon: 'fa-moon',
        category: 'special',
        requirement: { type: 'custom', value: 1 }
    },
    {
        id: 'early_bird',
        title: 'Chim Sớm',
        description: 'Học trước 6 giờ sáng',
        icon: 'fa-sun',
        category: 'special',
        requirement: { type: 'custom', value: 1 }
    }
];

/**
 * Check and unlock achievements based on user stats
 */
export const checkAchievements = (
    currentAchievements: string[],
    stats: {
        quizzesTaken: number;
        perfectScores: number;
        streak: number;
        topicsCompleted: number;
        totalStudyTime: number;
        masteryTopics: number;
        currentHour?: number;
    }
): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];

    ACHIEVEMENTS.forEach(achievement => {
        // Skip if already unlocked
        if (currentAchievements.includes(achievement.id)) return;

        let shouldUnlock = false;

        switch (achievement.requirement.type) {
            case 'perfect_score':
                shouldUnlock = stats.perfectScores >= 1;
                break;
            case 'streak':
                shouldUnlock = stats.streak >= achievement.requirement.value;
                break;
            case 'complete_topics':
                shouldUnlock = stats.topicsCompleted >= achievement.requirement.value;
                break;
            case 'total_time':
                shouldUnlock = stats.totalStudyTime >= achievement.requirement.value;
                break;
            case 'custom':
                // Custom logic for specific achievements
                if (achievement.id === 'first_quiz') {
                    shouldUnlock = stats.quizzesTaken >= 1;
                } else if (achievement.id === 'complete_all') {
                    // This would need total topics count from roadmap
                    shouldUnlock = false; // Handle in App.tsx with roadmap data
                } else if (achievement.id === 'mastery_80') {
                    shouldUnlock = stats.masteryTopics >= 5;
                } else if (achievement.id === 'night_owl') {
                    shouldUnlock = stats.currentHour !== undefined && stats.currentHour >= 22;
                } else if (achievement.id === 'early_bird') {
                    shouldUnlock = stats.currentHour !== undefined && stats.currentHour < 6;
                }
                break;
        }

        if (shouldUnlock) {
            newlyUnlocked.push({
                ...achievement,
                unlockedAt: new Date().toISOString()
            });
        }
    });

    return newlyUnlocked;
};

/**
 * Get achievement by ID
 */
export const getAchievement = (id: string): Achievement | undefined => {
    return ACHIEVEMENTS.find(a => a.id === id);
};

/**
 * Get achievements by category
 */
export const getAchievementsByCategory = (category: Achievement['category']): Achievement[] => {
    return ACHIEVEMENTS.filter(a => a.category === category);
};

/**
 * Calculate achievement progress
 */
export const getAchievementProgress = (
    achievement: Achievement,
    stats: {
        streak: number;
        topicsCompleted: number;
        totalStudyTime: number;
        perfectScores: number;
        quizzesTaken: number;
    }
): number => {
    let current = 0;
    const target = achievement.requirement.value;

    switch (achievement.requirement.type) {
        case 'streak':
            current = stats.streak;
            break;
        case 'complete_topics':
            current = stats.topicsCompleted;
            break;
        case 'total_time':
            current = stats.totalStudyTime;
            break;
        case 'perfect_score':
            current = stats.perfectScores;
            break;
        case 'custom':
            if (achievement.id === 'first_quiz') {
                current = Math.min(stats.quizzesTaken, 1);
            }
            break;
    }

    return Math.min(100, Math.round((current / target) * 100));
};
