export interface UserProfile {
  name: string;
  currentLevel: string; // e.g., "Lớp 11", "Mất gốc"
  targetExam: string;   // e.g., "THPT Quốc Gia", "Đánh giá năng lực"
  targetScore: string;  // e.g., "8+", "9.0"
  startDate: string;    // YYYY-MM-DD
  examDate: string;     // YYYY-MM-DD
  // Enhanced tracking
  studyStreak: number;  // Current consecutive days
  longestStreak: number;
  totalStudyTime: number; // in minutes
  lastStudyDate: string; // YYYY-MM-DD
  achievements: string[]; // Achievement IDs
  preferences: {
    darkMode: boolean;
    notifications: boolean;
    dailyGoal: number; // minutes per day
    reminderTime?: string; // HH:MM format
  };
}

export interface RoadmapItem {
  id: number;
  week: number;
  topic: string;
  description: string;
  status: 'locked' | 'active' | 'completed';
  keyConcepts: string[];
  // Review & Mastery tracking
  reviewCount: number;
  lastReviewed?: string; // ISO date
  nextReview?: string; // ISO date
  mastery: number; // 0-100, based on quiz performance
  totalStudyTime: number; // minutes spent on this topic
  bestScore: number; // best quiz score (0-100)
  averageScore: number; // average quiz score
}

export interface RoadmapData {
  items: RoadmapItem[];
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  isThinking?: boolean;
}

export enum AppView {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  PRACTICE = 'PRACTICE',
  REVIEW = 'REVIEW',
  ANALYTICS = 'ANALYTICS',
  NOTES = 'NOTES',
  SETTINGS = 'SETTINGS'
}

// --- New Types for Quiz System ---

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type Difficulty = 'Dễ' | 'Trung bình' | 'Khá' | 'Khó' | 'Cực khó';

export interface Question {
  id: number;
  type: QuestionType;
  content: string; // Nội dung câu hỏi (có thể chứa LaTeX)
  options?: string[]; // Cho trắc nghiệm (A, B, C, D)
  correctAnswer?: string; // AI giữ đáp án để so sánh nội bộ (optional)
}

export interface QuizConfig {
  difficulty: Difficulty;
  questionCount: number;
  selectedTypes: QuestionType[];
}

export interface QuestionFeedback {
  questionId: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string; // Giải thích chi tiết
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  feedbacks: QuestionFeedback[];
  generalAdvice: string; // Nhận xét chung và rút kinh nghiệm
}

// --- Study Session & Review Types ---

export interface StudySession {
  id: string;
  topicId: number;
  startTime: string; // ISO timestamp
  endTime?: string;
  duration: number; // minutes
  quizScore?: number;
  questionsAttempted: number;
}

export interface ReviewSchedule {
  itemId: number;
  interval: number; // days until next review
  easeFactor: number; // SM-2 algorithm ease factor
  repetitions: number;
}

// --- Notes & Bookmarks ---

export interface Note {
  id: string;
  topicId: number;
  questionId?: number;
  content: string; // Markdown supported
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  questionId: number;
  topicId: number;
  questionContent: string;
  createdAt: string;
}

// --- Achievement System ---

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // FontAwesome class
  category: 'streak' | 'score' | 'completion' | 'mastery' | 'special';
  requirement: {
    type: 'streak' | 'perfect_score' | 'complete_topics' | 'total_time' | 'custom';
    value: number;
  };
  unlockedAt?: string;
}

// --- Analytics Types ---

export interface TopicPerformance {
  topicId: number;
  topicName: string;
  averageScore: number;
  timeSpent: number;
  masteryLevel: number;
  quizzesTaken: number;
}

export interface StudyStats {
  totalStudyTime: number;
  averageScore: number;
  topicsCompleted: number;
  totalQuizzes: number;
  currentStreak: number;
  longestStreak: number;
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  dailyProgress: {
    date: string;
    minutes: number;
    quizzes: number;
  }[];
}

