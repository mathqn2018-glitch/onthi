import { StudySession, RoadmapItem, TopicPerformance, StudyStats } from '../types';

/**
 * Calculate study streak
 */
export const calculateStreak = (sessions: StudySession[], lastStudyDate: string): {
    currentStreak: number;
    longestStreak: number;
} => {
    if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Get unique study dates sorted descending
    const dates = Array.from(new Set(
        sessions.map(s => new Date(s.startTime).toISOString().split('T')[0])
    )).sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if studied today or yesterday for current streak
    if (dates[0] === today || dates[0] === yesterday) {
        currentStreak = 1;

        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

            if (diffDays === 1) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    // Calculate longest streak
    for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

        if (diffDays === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        } else {
            tempStreak = 1;
        }
    }

    longestStreak = Math.max(longestStreak, currentStreak, 1);

    return { currentStreak, longestStreak };
};

/**
 * Get topic performance statistics
 */
export const getTopicPerformance = (
    topicId: number,
    topicName: string,
    sessions: StudySession[],
    item: RoadmapItem
): TopicPerformance => {
    const topicSessions = sessions.filter(s => s.topicId === topicId);

    const scores = topicSessions
        .filter(s => s.quizScore !== undefined)
        .map(s => s.quizScore!);

    const averageScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    const timeSpent = topicSessions.reduce((total, s) => total + s.duration, 0);

    return {
        topicId,
        topicName,
        averageScore: Math.round(averageScore),
        timeSpent,
        masteryLevel: item.mastery,
        quizzesTaken: scores.length
    };
};

/**
 * Get weak topics (mastery < 60 or average score < 70)
 */
export const getWeakTopics = (
    items: RoadmapItem[],
    sessions: StudySession[]
): TopicPerformance[] => {
    const performances = items
        .filter(item => item.status === 'completed' || item.status === 'active')
        .map(item => getTopicPerformance(item.id, item.topic, sessions, item))
        .filter(p => p.masteryLevel < 60 || p.averageScore < 70)
        .sort((a, b) => a.masteryLevel - b.masteryLevel);

    return performances.slice(0, 5); // Top 5 weakest
};

/**
 * Get strong topics (mastery >= 80 and average score >= 85)
 */
export const getStrongTopics = (
    items: RoadmapItem[],
    sessions: StudySession[]
): TopicPerformance[] => {
    const performances = items
        .filter(item => item.status === 'completed')
        .map(item => getTopicPerformance(item.id, item.topic, sessions, item))
        .filter(p => p.masteryLevel >= 80 && p.averageScore >= 85)
        .sort((a, b) => b.masteryLevel - a.masteryLevel);

    return performances.slice(0, 5); // Top 5 strongest
};

/**
 * Get daily progress for last N days
 */
export const getDailyProgress = (sessions: StudySession[], days: number = 7): {
    date: string;
    minutes: number;
    quizzes: number;
}[] => {
    const result: { date: string; minutes: number; quizzes: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const daySessions = sessions.filter(s =>
            new Date(s.startTime).toISOString().split('T')[0] === dateStr
        );

        const minutes = daySessions.reduce((total, s) => total + s.duration, 0);
        const quizzes = daySessions.filter(s => s.quizScore !== undefined).length;

        result.push({ date: dateStr, minutes, quizzes });
    }

    return result;
};

/**
 * Calculate comprehensive study statistics
 */
export const calculateStudyStats = (
    items: RoadmapItem[],
    sessions: StudySession[],
    lastStudyDate: string
): StudyStats => {
    const { currentStreak, longestStreak } = calculateStreak(sessions, lastStudyDate);

    const totalStudyTime = sessions.reduce((total, s) => total + s.duration, 0);

    const quizSessions = sessions.filter(s => s.quizScore !== undefined);
    const averageScore = quizSessions.length > 0
        ? quizSessions.reduce((total, s) => total + s.quizScore!, 0) / quizSessions.length
        : 0;

    const topicsCompleted = items.filter(item => item.status === 'completed').length;

    return {
        totalStudyTime,
        averageScore: Math.round(averageScore),
        topicsCompleted,
        totalQuizzes: quizSessions.length,
        currentStreak,
        longestStreak,
        weakTopics: getWeakTopics(items, sessions),
        strongTopics: getStrongTopics(items, sessions),
        dailyProgress: getDailyProgress(sessions, 7)
    };
};

/**
 * Get study time by topic
 */
export const getStudyTimeByTopic = (
    items: RoadmapItem[],
    sessions: StudySession[]
): { topic: string; minutes: number }[] => {
    return items
        .map(item => ({
            topic: item.topic,
            minutes: sessions
                .filter(s => s.topicId === item.id)
                .reduce((total, s) => total + s.duration, 0)
        }))
        .filter(t => t.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);
};

/**
 * Format minutes to human readable string
 */
export const formatStudyTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} giờ`;
};

/**
 * Get study recommendation based on stats
 */
export const getStudyRecommendation = (stats: StudyStats): string => {
    if (stats.weakTopics.length > 0) {
        const weakest = stats.weakTopics[0];
        return `Hãy ôn lại "${weakest.topicName}" - độ thành thạo chỉ ${weakest.masteryLevel}%`;
    }

    if (stats.currentStreak === 0) {
        return 'Hãy bắt đầu streak mới hôm nay! 🔥';
    }

    if (stats.averageScore < 70) {
        return 'Điểm trung bình còn thấp. Hãy ôn lại các chủ đề đã học!';
    }

    return 'Bạn đang học rất tốt! Tiếp tục phát huy! 🌟';
};
