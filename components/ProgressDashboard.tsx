import React from 'react';
import { StudyStats, TopicPerformance } from '../types';
import { formatStudyTime } from '../services/analytics';

interface ProgressDashboardProps {
    stats: StudyStats;
    onClose: () => void;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ stats, onClose }) => {
    const getStreakEmoji = (streak: number): string => {
        if (streak >= 30) return '🔥🔥🔥';
        if (streak >= 7) return '🔥🔥';
        if (streak >= 3) return '🔥';
        return '💪';
    };

    const getScoreColor = (score: number): string => {
        if (score >= 85) return 'text-green-600';
        if (score >= 70) return 'text-orange-600';
        return 'text-red-600';
    };

    const getMasteryColor = (mastery: number): string => {
        if (mastery >= 80) return 'bg-green-500';
        if (mastery >= 60) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 pb-20">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Thống Kê Học Tập</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Phân tích chi tiết tiến độ của bạn</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                    >
                        <i className="fa-solid fa-xmark text-slate-600 dark:text-slate-300"></i>
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                                <i className="fa-solid fa-fire text-brand-600 dark:text-brand-400"></i>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Streak</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.currentStreak}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {getStreakEmoji(stats.currentStreak)} Cao nhất: {stats.longestStreak} ngày
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <i className="fa-solid fa-check-circle text-green-600 dark:text-green-400"></i>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Hoàn thành</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.topicsCompleted}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">chủ đề</p>
                    </div>

                    <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                <i className="fa-solid fa-clock text-purple-600 dark:text-purple-400"></i>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Thời gian</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                    {Math.floor(stats.totalStudyTime / 60)}h
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatStudyTime(stats.totalStudyTime)}</p>
                    </div>

                    <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                <i className="fa-solid fa-chart-line text-orange-600 dark:text-orange-400"></i>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Điểm TB</p>
                                <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)} dark:opacity-90`}>
                                    {stats.averageScore}%
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{stats.totalQuizzes} bài kiểm tra</p>
                    </div>
                </div>

                {/* Daily Progress Chart */}
                <div className="glass-card rounded-2xl p-6 mb-8 border border-white/60 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-calendar-days text-brand-500"></i>
                        Tiến độ 7 ngày qua
                    </h3>
                    <div className="flex items-end justify-between gap-2 h-48">
                        {stats.dailyProgress.map((day, idx) => {
                            const maxMinutes = Math.max(...stats.dailyProgress.map(d => d.minutes), 1);
                            const height = (day.minutes / maxMinutes) * 100;

                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="relative w-full flex flex-col items-center justify-end h-40">
                                        <div
                                            className="w-full bg-gradient-to-t from-brand-600 to-brand-400 dark:from-brand-500 dark:to-brand-300 rounded-t-lg transition-all hover:opacity-80 relative group"
                                            style={{ height: `${height}%`, minHeight: day.minutes > 0 ? '8px' : '0' }}
                                        >
                                            {day.minutes > 0 && (
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                    {day.minutes}m • {day.quizzes} quiz
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                        {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Weak & Strong Topics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Weak Topics */}
                    <div className="glass-card rounded-2xl p-6 border border-white/60 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                            Cần Ôn Lại
                        </h3>
                        {stats.weakTopics.length > 0 ? (
                            <div className="space-y-3">
                                {stats.weakTopics.map((topic, idx) => (
                                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{topic.topicName}</p>
                                            <span className="text-xs text-red-600 dark:text-red-400 font-bold">{topic.masteryLevel}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-red-100 dark:bg-red-900/40 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getMasteryColor(topic.masteryLevel)} transition-all`}
                                                style={{ width: `${topic.masteryLevel}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Điểm TB: {topic.averageScore}% • {topic.quizzesTaken} bài
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
                                Không có chủ đề nào cần ôn lại! 🎉
                            </p>
                        )}
                    </div>

                    {/* Strong Topics */}
                    <div className="glass-card rounded-2xl p-6 border border-white/60 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-trophy text-green-500"></i>
                            Thành Thạo
                        </h3>
                        {stats.strongTopics.length > 0 ? (
                            <div className="space-y-3">
                                {stats.strongTopics.map((topic, idx) => (
                                    <div key={idx} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm">{topic.topicName}</p>
                                            <span className="text-xs text-green-600 dark:text-green-400 font-bold">{topic.masteryLevel}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-green-100 dark:bg-green-900/40 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all"
                                                style={{ width: `${topic.masteryLevel}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Điểm TB: {topic.averageScore}% • {topic.quizzesTaken} bài
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
                                Hãy hoàn thành thêm bài kiểm tra! 💪
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressDashboard;
