import { ReviewSchedule, RoadmapItem } from '../types';

/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo 2 algorithm
 */

const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;

interface PerformanceRating {
    score: number; // 0-100
    quality: number; // 0-5 for SM-2
}

/**
 * Convert quiz score (0-100) to SM-2 quality (0-5)
 * 0-40: 0 (complete blackout)
 * 40-60: 1-2 (incorrect, but familiar)
 * 60-75: 3 (correct with difficulty)
 * 75-90: 4 (correct with hesitation)
 * 90-100: 5 (perfect recall)
 */
const scoreToQuality = (score: number): number => {
    if (score < 40) return 0;
    if (score < 50) return 1;
    if (score < 60) return 2;
    if (score < 75) return 3;
    if (score < 90) return 4;
    return 5;
};

/**
 * Calculate next review interval using SM-2 algorithm
 */
export const calculateNextReview = (
    schedule: ReviewSchedule,
    performanceScore: number
): ReviewSchedule => {
    const quality = scoreToQuality(performanceScore);

    let { easeFactor, repetitions, interval } = schedule;

    // Update ease factor
    easeFactor = Math.max(
        MIN_EASE_FACTOR,
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculate next interval
    if (quality < 3) {
        // Failed - restart
        repetitions = 0;
        interval = 1;
    } else {
        repetitions += 1;

        if (repetitions === 1) {
            interval = 1;
        } else if (repetitions === 2) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
    }

    return {
        ...schedule,
        easeFactor,
        repetitions,
        interval
    };
};

/**
 * Initialize review schedule for a new item
 */
export const initializeReviewSchedule = (itemId: number): ReviewSchedule => {
    return {
        itemId,
        interval: 1,
        easeFactor: INITIAL_EASE_FACTOR,
        repetitions: 0
    };
};

/**
 * Get next review date
 */
export const getNextReviewDate = (interval: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + interval);
    return date.toISOString();
};

/**
 * Check if item is due for review
 */
export const isDueForReview = (item: RoadmapItem): boolean => {
    if (!item.nextReview) return item.status === 'completed';

    const now = new Date();
    const reviewDate = new Date(item.nextReview);

    return now >= reviewDate;
};

/**
 * Get all items due for review
 */
export const getItemsDueForReview = (items: RoadmapItem[]): RoadmapItem[] => {
    return items.filter(item => isDueForReview(item));
};

/**
 * Update item mastery based on quiz performance
 * Mastery is a weighted average favoring recent performance
 */
export const updateMastery = (
    currentMastery: number,
    newScore: number,
    weight: number = 0.3
): number => {
    // Weighted average: 70% old mastery, 30% new score
    const updatedMastery = currentMastery * (1 - weight) + newScore * weight;
    return Math.round(Math.min(100, Math.max(0, updatedMastery)));
};

/**
 * Calculate optimal review intervals for upcoming week
 */
export const getWeeklyReviewPlan = (items: RoadmapItem[]): {
    date: string;
    items: RoadmapItem[];
}[] => {
    const plan: { date: string; items: RoadmapItem[] }[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dueItems = items.filter(item => {
            if (!item.nextReview) return false;
            const reviewDate = new Date(item.nextReview).toISOString().split('T')[0];
            return reviewDate === dateStr;
        });

        if (dueItems.length > 0) {
            plan.push({ date: dateStr, items: dueItems });
        }
    }

    return plan;
};
