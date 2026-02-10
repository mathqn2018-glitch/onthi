import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, RoadmapData, AppView, RoadmapItem, QuizConfig, Question, QuizResult, Difficulty, QuestionType, StudySession, Note, Bookmark, Achievement, StudyStats } from './types';
import * as GeminiService from './services/geminiService';
import * as Storage from './services/storage';
import * as SpacedRepetition from './services/spacedRepetition';
import * as Analytics from './services/analytics';
import * as AchievementService from './services/achievements';
import { GRADE_CONTENT, getGradeDisplayName } from './services/gradeContent';
import * as WordExport from './services/wordExport';
import * as ErrorAnalysis from './services/errorAnalysis';
import MathRenderer from './components/MathRenderer';
import ApiKeyModal from './components/ApiKeyModal';
import ThemeToggle from './components/ThemeToggle';
import ProgressDashboard from './components/ProgressDashboard';
import { useDarkMode } from './hooks/useDarkMode';

// --- Components ---

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-600 text-lg">
        <i className="fa-solid fa-brain"></i>
      </div>
    </div>
    <p className="text-slate-500 font-medium mt-4 animate-pulse">AI đang thiết kế bài học...</p>
  </div>
);

const ViewContainer: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 relative overflow-hidden ${className}`}>
    {/* Decorative blobs */}
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl mix-blend-multiply filter animate-bounce-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200/30 rounded-full blur-3xl mix-blend-multiply filter animate-bounce-slow" style={{ animationDelay: '2s' }}></div>
    </div>
    <div className="relative z-10 w-full">
      {children}
    </div>
  </div>
);

type PracticePhase = 'SETUP' | 'TAKING' | 'REVIEW';

const App: React.FC = () => {
  // --- State ---
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.ONBOARDING);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  // Dark Mode
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  // User & Roadmap Data
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    gradeLevel: '11', // Default to grade 11
    currentLevel: '',
    targetExam: '',
    targetScore: '',
    startDate: new Date().toISOString().split('T')[0],
    examDate: '',
    studyStreak: 0,
    longestStreak: 0,
    totalStudyTime: 0,
    lastStudyDate: new Date().toISOString().split('T')[0],
    achievements: [],
    preferences: {
      darkMode: false,
      notifications: false,
      dailyGoal: 30
    }
  });
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);

  // Practice State
  const [activeTopic, setActiveTopic] = useState<RoadmapItem | null>(null);

  // Quiz State
  const [practicePhase, setPracticePhase] = useState<PracticePhase>('SETUP');
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    difficulty: 'Trung bình',
    questionTypes: [
      { type: 'multiple_choice', count: 3, enabled: true },
      { type: 'true_false', count: 2, enabled: true },
      { type: 'short_answer', count: 0, enabled: false }
    ],
    timerEnabled: false,
    timerDuration: 45 // default 45 minutes
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // Timer State
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // New State for Enhanced Features
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [stats, setStats] = useState<StudyStats | null>(null);

  // --- Effects ---

  useEffect(() => {
    // Migrate data first
    Storage.migrateData();

    const savedKey = localStorage.getItem('gemini_api_key');
    const savedRoadmap = Storage.loadRoadmap();
    const savedProfile = Storage.loadProfile();

    if (savedKey) setApiKey(savedKey);
    else setShowKeyModal(true);

    if (savedRoadmap && savedProfile) {
      setRoadmap(savedRoadmap);
      setUserProfile(savedProfile);
      setCurrentView(AppView.DASHBOARD);

      // Load all additional data
      setStudySessions(Storage.loadSessions());
      setNotes(Storage.loadNotes());
      setBookmarks(Storage.loadBookmarks());
      setAchievements(Storage.loadAchievements());

      // Calculate initial stats
      const initialStats = Analytics.calculateStudyStats(
        savedRoadmap.items,
        Storage.loadSessions(),
        savedProfile.lastStudyDate
      );
      setStats(initialStats);
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Timer Effect
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            // Auto-submit when time runs out
            if (practicePhase === 'TAKING') {
              showToast('⏰ Hết giờ! Tự động nộp bài.', 'error');
              handleSubmitQuiz();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerActive, timeRemaining, practicePhase]);

  // --- Helper Functions ---

  const startStudySession = (topicId: number) => {
    const session: StudySession = {
      id: Date.now().toString(),
      topicId,
      startTime: new Date().toISOString(),
      duration: 0,
      questionsAttempted: 0
    };
    setCurrentSession(session);
  };

  const endStudySession = (quizScore?: number, questionsAttempted?: number) => {
    if (!currentSession) return;

    const endTime = new Date().toISOString();
    const duration = Math.round((new Date(endTime).getTime() - new Date(currentSession.startTime).getTime()) / 60000);

    const completedSession: StudySession = {
      ...currentSession,
      endTime,
      duration,
      quizScore,
      questionsAttempted: questionsAttempted || currentSession.questionsAttempted
    };

    const updatedSessions = [...studySessions, completedSession];
    setStudySessions(updatedSessions);
    Storage.saveSessions(updatedSessions);
    setCurrentSession(null);

    // Update user profile
    updateUserStats(duration);

    // Check for new achievements
    checkAndUnlockAchievements(quizScore);
  };

  const updateUserStats = (minutesStudied: number) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedProfile = { ...userProfile };

    updatedProfile.totalStudyTime += minutesStudied;

    // Update streak
    if (updatedProfile.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (updatedProfile.lastStudyDate === yesterday) {
        updatedProfile.studyStreak += 1;
      } else {
        updatedProfile.studyStreak = 1;
      }
      updatedProfile.lastStudyDate = today;
    }

    updatedProfile.longestStreak = Math.max(updatedProfile.longestStreak, updatedProfile.studyStreak);

    setUserProfile(updatedProfile);
    Storage.saveProfile(updatedProfile);
  };

  const checkAndUnlockAchievements = (quizScore?: number) => {
    if (!roadmap) return;

    const currentHour = new Date().getHours();
    const masteryTopics = roadmap.items.filter(item => item.mastery >= 80).length;

    const achievementStats = {
      quizzesTaken: studySessions.filter(s => s.quizScore !== undefined).length + 1,
      perfectScores: quizScore === 100 ? 1 : 0,
      streak: userProfile.studyStreak,
      topicsCompleted: roadmap.items.filter(i => i.status === 'completed').length,
      totalStudyTime: userProfile.totalStudyTime,
      masteryTopics,
      currentHour
    };

    const newAchievements = AchievementService.checkAchievements(
      userProfile.achievements,
      achievementStats
    );

    if (newAchievements.length > 0) {
      const updatedAchievements = [...achievements, ...newAchievements];
      setAchievements(updatedAchievements);
      Storage.saveAchievements(updatedAchievements);

      const updatedProfile = {
        ...userProfile,
        achievements: [...userProfile.achievements, ...newAchievements.map(a => a.id)]
      };
      setUserProfile(updatedProfile);
      Storage.saveProfile(updatedProfile);

      // Show achievement notification
      newAchievements.forEach(achievement => {
        showToast(`🎉 Mở khóa: ${achievement.title}!`, 'success');
      });
    }
  };

  const updateStatsData = () => {
    if (!roadmap) return;

    const updatedStats = Analytics.calculateStudyStats(
      roadmap.items,
      studySessions,
      userProfile.lastStudyDate
    );
    setStats(updatedStats);
  };

  // Quiz Config Helper Functions
  const getTotalQuestions = (config: QuizConfig): number => {
    return config.questionTypes
      .filter(qt => qt.enabled && qt.count > 0)
      .reduce((sum, qt) => sum + qt.count, 0);
  };

  const updateQuestionType = (index: number, field: 'enabled' | 'count', value: boolean | number) => {
    const updated = [...quizConfig.questionTypes];
    if (field === 'enabled') {
      updated[index].enabled = value as boolean;
      if (!value) updated[index].count = 0;
    } else {
      updated[index].count = value as number;
    }
    setQuizConfig({ ...quizConfig, questionTypes: updated });
  };

  const adjustQuestionCount = (index: number, delta: number) => {
    const updated = [...quizConfig.questionTypes];
    const newCount = Math.max(0, Math.min(20, updated[index].count + delta));
    updated[index].count = newCount;
    setQuizConfig({ ...quizConfig, questionTypes: updated });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Export & Analysis Handlers
  const handleExportQuiz = async (includeAnswers: boolean) => {
    if (!activeTopic || questions.length === 0) {
      showToast('Không có bài thi để xuất!', 'error');
      return;
    }

    try {
      await WordExport.exportQuizToWord(
        activeTopic.topic,
        questions,
        quizConfig,
        includeAnswers
      );
      showToast('✅ Đã xuất file Word thành công!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('❌ Lỗi khi xuất file Word', 'error');
    }
  };

  const handleAnalyzeErrors = async () => {
    if (!activeTopic || questions.length === 0 || !quizResult) {
      showToast('Chưa có kết quả để phân tích!', 'error');
      return;
    }

    setLoading(true);
    try {
      const report = await ErrorAnalysis.analyzeQuizErrors(
        apiKey,
        activeTopic.topic,
        questions,
        userAnswers
      );

      // Save report
      Storage.saveAnalysisReport(report);

      // Update quiz result
      setQuizResult({
        ...quizResult,
        analysisReport: report
      });

      showToast('✅ Phân tích hoàn tất!', 'success');
    } catch (error: any) {
      console.error('Analysis error:', error);
      showToast(error.message || '❌ Lỗi khi phân tích', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleSaveKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setShowKeyModal(false);
    showToast('Đã lưu API Key thành công!', 'success');
  };

  const handleCreateRoadmap = async () => {
    if (!userProfile.name || !userProfile.targetExam || !userProfile.examDate || !userProfile.startDate) {
      showToast('Vui lòng điền đầy đủ thông tin!', 'error');
      return;
    }

    if (new Date(userProfile.startDate) > new Date(userProfile.examDate)) {
      showToast('Ngày bắt đầu phải trước ngày thi!', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await GeminiService.generateStudyRoadmap(apiKey, userProfile);
      setRoadmap(data);
      localStorage.setItem('math_roadmap', JSON.stringify(data));
      localStorage.setItem('user_profile', JSON.stringify(userProfile));
      setCurrentView(AppView.DASHBOARD);
      triggerConfetti();
    } catch (error: any) {
      showToast(error.message || 'Lỗi khi tạo lộ trình', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startPracticeSession = (item: RoadmapItem) => {
    setActiveTopic(item);
    setCurrentView(AppView.PRACTICE);
    setPracticePhase('SETUP');
    setQuestions([]);
    setUserAnswers({});
    setQuizResult(null);

    // Start tracking study session
    startStudySession(item.id);
  };

  const handleGenerateQuiz = async () => {
    if (quizConfig.selectedTypes.length === 0) {
      showToast('Vui lòng chọn ít nhất một dạng bài tập', 'error');
      return;
    }

    setLoading(true);
    try {
      const generatedQuestions = await GeminiService.generateQuiz(apiKey, activeTopic?.topic || "", quizConfig);
      setQuestions(generatedQuestions);
      setPracticePhase('TAKING');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(userAnswers).length < questions.length) {
      if (!confirm("Bạn chưa hoàn thành tất cả câu hỏi. Bạn có chắc muốn nộp bài?")) return;
    }

    setLoading(true);
    try {
      const result = await GeminiService.evaluateQuiz(apiKey, activeTopic?.topic || "", questions, userAnswers);
      setQuizResult(result);
      setPracticePhase('REVIEW');
      if (result.score / result.totalQuestions >= 0.7) {
        triggerConfetti();
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  };

  const triggerConfetti = () => {
    // @ts-ignore
    if (window.confetti) {
      // @ts-ignore
      window.confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#f59e0b', '#10b981']
      });
    }
  };

  const resetData = () => {
    if (confirm("Bạn có chắc muốn xóa toàn bộ lộ trình và bắt đầu lại?")) {
      localStorage.removeItem('math_roadmap');
      localStorage.removeItem('user_profile');
      setRoadmap(null);
      setCurrentView(AppView.ONBOARDING);
    }
  }

  // --- Render Views ---

  const renderOnboarding = () => (
    <ViewContainer className="flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side: Hero Text */}
        <div className="text-center lg:text-left space-y-6 animate-slide-up">
          <div className="inline-block px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-sm font-semibold mb-2 shadow-sm">
            ✨ Trợ lý học tập AI thông minh
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-800 leading-tight">
            Chinh phục môn Toán cùng <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-accent">MathPath AI</span>
          </h1>
          <p className="text-lg text-slate-600">
            Lộ trình ôn thi được cá nhân hóa 100% dựa trên năng lực và mục tiêu của bạn. Sử dụng công nghệ Gemini AI mới nhất.
          </p>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            <div className="flex items-center gap-2 text-slate-500">
              <i className="fa-solid fa-check-circle text-green-500"></i> Lộ trình chi tiết
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <i className="fa-solid fa-check-circle text-green-500"></i> Đề thi sát thực tế
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <i className="fa-solid fa-check-circle text-green-500"></i> Chấm điểm tức thì
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="glass-card rounded-3xl shadow-2xl p-8 animate-fade-in relative z-20">
          <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="bg-brand-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">
              <i className="fa-solid fa-rocket"></i>
            </span>
            Thiết lập hồ sơ
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Họ và tên</label>
              <div className="relative">
                <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all bg-white/50"
                  value={userProfile.name}
                  onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
            </div>

            {/* Grade Level Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                <i className="fa-solid fa-graduation-cap text-brand-500 mr-2"></i>
                Bạn đang học lớp mấy?
              </label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {(['10', '11', '12'] as GradeLevel[]).map(grade => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setUserProfile({ ...userProfile, gradeLevel: grade })}
                    className={`p-4 rounded-xl border-2 transition-all ${userProfile.gradeLevel === grade
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-md'
                      : 'border-slate-200 bg-white hover:border-brand-300 text-slate-600'
                      }`}
                  >
                    <div className="text-2xl font-bold">Lớp {grade}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {GRADE_CONTENT[grade].topics.length} chủ đề
                    </div>
                  </button>
                ))}
              </div>

              {/* Foundation Level Option */}
              <button
                type="button"
                onClick={() => setUserProfile({ ...userProfile, gradeLevel: 'foundation' })}
                className={`w-full p-3 rounded-xl border-2 transition-all text-sm ${userProfile.gradeLevel === 'foundation'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
                  : 'border-slate-200 bg-white hover:border-orange-300 text-slate-600'
                  }`}
              >
                <i className="fa-solid fa-book mr-2"></i>
                Mất gốc - Học lại từ đầu (THCS)
              </button>

              {/* Content Preview */}
              {userProfile.gradeLevel && (
                <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200 animate-fade-in">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    📚 {GRADE_CONTENT[userProfile.gradeLevel].description}
                  </p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    <strong>Nội dung:</strong> {GRADE_CONTENT[userProfile.gradeLevel].topics.slice(0, 4).join(', ')}
                    {GRADE_CONTENT[userProfile.gradeLevel].topics.length > 4 && '...'}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Trình độ</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white/50"
                  value={userProfile.currentLevel}
                  onChange={e => setUserProfile({ ...userProfile, currentLevel: e.target.value })}
                >
                  <option value="">Chọn...</option>
                  <option value="Mất gốc">Mất gốc</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Khá">Khá</option>
                  <option value="Giỏi">Giỏi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Mục tiêu</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white/50"
                  value={userProfile.targetScore}
                  onChange={e => setUserProfile({ ...userProfile, targetScore: e.target.value })}
                  placeholder="VD: 8.5+"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Kỳ thi mục tiêu</label>
              <div className="relative">
                <i className="fa-solid fa-bullseye absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white/50"
                  value={userProfile.targetExam}
                  onChange={e => setUserProfile({ ...userProfile, targetExam: e.target.value })}
                  placeholder="VD: THPT Quốc Gia 2025"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bắt đầu</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white/50"
                  value={userProfile.startDate}
                  onChange={e => setUserProfile({ ...userProfile, startDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ngày thi</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white/50"
                  value={userProfile.examDate}
                  onChange={e => setUserProfile({ ...userProfile, examDate: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <button
                  onClick={handleCreateRoadmap}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
                >
                  <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform"></i>
                  Tạo Lộ Trình Ngay
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-slate-400 text-xs">
            Được phát triển bởi <span className="font-semibold text-brand-600">Ngọc Ngọc - Gia Lai</span>
          </div>
        </div>
      </div>
    </ViewContainer>
  );

  const renderDashboard = () => (
    <ViewContainer>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Dashboard */}
        <div className="glass-card rounded-2xl p-6 mb-10 shadow-lg border border-white/60 animate-fade-in flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg font-bold">
              {userProfile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Xin chào, {userProfile.name}! 👋</h2>
              <div className="flex gap-4 mt-2 text-sm text-slate-600">
                <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                  <i className="fa-regular fa-calendar text-brand-500"></i>
                  {new Date(userProfile.examDate).toLocaleDateString('vi-VN')}
                </span>
                <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                  <i className="fa-solid fa-bullseye text-brand-accent"></i>
                  Mục tiêu: {userProfile.targetScore}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <ThemeToggle isDark={isDark} onToggle={toggleDarkMode} />
            <button
              onClick={() => {
                updateStatsData();
                setCurrentView(AppView.ANALYTICS);
              }}
              className="px-4 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-chart-line"></i> Thống kê
            </button>
            <button
              onClick={() => setCurrentView(AppView.REVIEW)}
              className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate-left"></i> Ôn tập
            </button>
            <button
              onClick={resetData}
              className="px-4 py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-trash"></i> Làm lại
            </button>
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-4 py-2 text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors font-medium text-sm shadow-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-key"></i> API Key
            </button>
          </div>
        </div>

        {/* Streak Counter */}
        {userProfile.studyStreak > 0 && (
          <div className="glass-card rounded-2xl p-4 mb-6 border border-white/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔥</div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Streak hiện tại: {userProfile.studyStreak} ngày</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Kỷ lục: {userProfile.longestStreak} ngày</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">Tổng thời gian học</p>
              <p className="font-bold text-brand-600 dark:text-brand-400">{Math.floor(userProfile.totalStudyTime / 60)}h {userProfile.totalStudyTime % 60}m</p>
            </div>
          </div>
        )}

        {/* Roadmap Title */}
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-slate-800 inline-block relative">
            Lộ Trình Ôn Tập
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-brand-accent rounded-full"></div>
          </h3>
        </div>

        {/* Roadmap Timeline */}
        <div className="space-y-12 relative max-w-4xl mx-auto pb-20">
          {/* Main Connector Line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-200 via-brand-100 to-transparent -translate-x-1/2 rounded-full"></div>

          {roadmap?.items.map((item, index) => (
            <div key={item.id} className="relative z-10 group">
              <div className={`flex flex-col md:flex-row items-center justify-between gap-8 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>

                {/* Content Card */}
                <div className="w-full md:w-[45%]">
                  <div className={`relative bg-white p-6 rounded-2xl transition-all duration-300 border
                    ${item.status === 'completed' ? 'border-green-400 shadow-[0_4px_20px_-5px_rgba(16,185,129,0.2)]' :
                      item.status === 'active' ? 'border-brand-500 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] scale-[1.02] ring-4 ring-brand-50' :
                        'border-slate-100 shadow-sm opacity-80 grayscale'}`}
                  >
                    {/* Floating Badge */}
                    <div className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                       ${item.status === 'active' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      Tuần {item.week}
                    </div>

                    <div className="mt-2 mb-4">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xl font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                          {item.topic}
                        </h4>
                        {item.status === 'completed' && <i className="fa-solid fa-circle-check text-green-500 text-xl"></i>}
                        {item.status === 'active' && <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></div>}
                      </div>
                      <p className="text-slate-600 text-sm mt-2 line-clamp-2">{item.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {item.keyConcepts.slice(0, 3).map((concept, idx) => (
                        <span key={idx} className="text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
                          {concept}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => startPracticeSession(item)}
                      disabled={item.status === 'locked'}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                        ${item.status === 'locked'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg hover:shadow-brand-200 hover:-translate-y-1'}`}
                    >
                      {item.status === 'completed' ? 'Ôn tập lại' : 'Bắt đầu học'}
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                </div>

                {/* Center Node */}
                <div className={`hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-4 shadow-lg z-10 items-center justify-center transition-all duration-500
                   ${item.status === 'active' ? 'bg-white border-brand-500 scale-125' :
                    item.status === 'completed' ? 'bg-green-500 border-white' : 'bg-slate-200 border-white'}`}>
                  {item.status === 'completed' ? (
                    <i className="fa-solid fa-check text-white text-sm"></i>
                  ) : (
                    <span className={`text-xs font-bold ${item.status === 'active' ? 'text-brand-600' : 'text-slate-500'}`}>{item.week}</span>
                  )}
                </div>

                {/* Spacer */}
                <div className="w-full md:w-[45%] hidden md:block"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-400 text-sm">
            Được phát triển bởi <span className="font-semibold text-brand-600">Ngọc Ngọc - Gia Lai</span>
          </p>
        </div>
      </div>
    </ViewContainer>
  );

  const renderReviewView = () => {
    if (!roadmap) return null;

    const itemsDue = SpacedRepetition.getItemsDueForReview(roadmap.items);

    return (
      <ViewContainer>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Ôn Tập</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Các chủ đề cần ôn lại hôm nay</p>
            </div>
            <button
              onClick={() => setCurrentView(AppView.DASHBOARD)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i> Quay lại
            </button>
          </div>

          {itemsDue.length > 0 ? (
            <div className="space-y-4">
              {itemsDue.map(item => (
                <div key={item.id} className="glass-card rounded-2xl p-6 border border-white/60 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{item.topic}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{item.description}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{item.mastery}%</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Độ thành thạo</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      Ôn lần {item.reviewCount}
                    </span>
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      Điểm cao nhất: {item.bestScore}%
                    </span>
                  </div>

                  <button
                    onClick={() => startPracticeSession(item)}
                    className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-brand-200 hover:-translate-y-1 transition-all"
                  >
                    Bắt đầu ôn tập <i className="fa-solid fa-arrow-right ml-2"></i>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Tuyệt vời!</h3>
              <p className="text-slate-500 dark:text-slate-400">Không có chủ đề nào cần ôn hôm nay.</p>
            </div>
          )}
        </div>
      </ViewContainer>
    );
  };

  const renderPracticeSetup = () => (
    <div className="max-w-3xl mx-auto p-4 pt-10">
      <div className="glass-card rounded-3xl shadow-2xl p-8 border border-white/60 animate-fade-in">
        <div className="text-center mb-8">
          <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Cấu hình bài tập
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 mt-3">{activeTopic?.topic}</h2>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-brand-500"></i> Độ khó
          </label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {(['Dễ', 'Trung bình', 'Khá', 'Khó', 'Cực khó'] as Difficulty[]).map(diff => (
              <button
                key={diff}
                onClick={() => setQuizConfig({ ...quizConfig, difficulty: diff })}
                className={`px-2 py-3 rounded-xl text-sm font-semibold transition-all border
                  ${quizConfig.difficulty === diff
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md transform scale-105'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:bg-brand-50'}`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-4 flex justify-between">
            <span><i className="fa-solid fa-list-ol text-brand-500 mr-2"></i> Số lượng câu hỏi</span>
            <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-brand-600">{quizConfig.questionCount} câu</span>
          </label>
          <input
            type="range"
            min="3" max="20" step="1"
            value={quizConfig.questionCount}
            onChange={(e) => setQuizConfig({ ...quizConfig, questionCount: parseInt(e.target.value) })}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
            style={{
              backgroundImage: `linear-gradient(to right, #2563eb 0%, #2563eb ${(quizConfig.questionCount - 3) / 17 * 100}%, #e2e8f0 ${(quizConfig.questionCount - 3) / 17 * 100}%, #e2e8f0 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
            <span>3 câu</span>
            <span>20 câu</span>
          </div>
        </div>

        {/* Question Types */}
        <div className="mb-10">
          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <i className="fa-solid fa-shapes text-brand-500"></i> Dạng bài tập
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'multiple_choice', label: 'Trắc nghiệm', icon: 'fa-list-ul' },
              { id: 'true_false', label: 'Đúng / Sai', icon: 'fa-check-double' },
              { id: 'short_answer', label: 'Điền đáp số', icon: 'fa-pencil' }
            ].map(type => (
              <label key={type.id} className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all h-24
                 ${quizConfig.selectedTypes.includes(type.id as QuestionType)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-100 bg-white text-slate-500 hover:border-brand-200'}`}>
                <input
                  type="checkbox"
                  checked={quizConfig.selectedTypes.includes(type.id as QuestionType)}
                  onChange={(e) => {
                    const newTypes = e.target.checked
                      ? [...quizConfig.selectedTypes, type.id as QuestionType]
                      : quizConfig.selectedTypes.filter(t => t !== type.id);
                    setQuizConfig({ ...quizConfig, selectedTypes: newTypes });
                  }}
                  className="hidden"
                />
                <i className={`fa-solid ${type.icon} text-xl mb-2`}></i>
                <span className="font-semibold text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <button
            onClick={handleGenerateQuiz}
            className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-xl hover:shadow-brand-500/40 hover:-translate-y-1 transition-all text-lg flex items-center justify-center gap-3"
          >
            Bắt đầu làm bài <i className="fa-solid fa-play"></i>
          </button>
        )}
      </div>
    </div>
  );

  const renderTakingQuiz = () => (
    <div className="max-w-5xl mx-auto p-4 pt-4 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-4 z-30 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 mb-8 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-regular fa-clock text-brand-500"></i> {activeTopic?.topic}
          </h2>
          <span className="font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-lg text-sm">
            {Object.keys(userAnswers).length}/{questions.length} câu
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${(Object.keys(userAnswers).length / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex gap-4 mb-6">
              <span className="flex-shrink-0 w-10 h-10 bg-brand-50 text-brand-600 font-extrabold rounded-xl flex items-center justify-center text-lg shadow-sm border border-brand-100">
                {index + 1}
              </span>
              <div className="flex-1 pt-1">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <MathRenderer content={q.content} className="text-lg font-medium text-slate-800" />
                </div>
              </div>
            </div>

            <div className="pl-0 md:pl-14">
              {q.type === 'multiple_choice' && q.options && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, i) => (
                    <label key={i} className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all group
                      ${userAnswers[q.id] === ['A', 'B', 'C', 'D'][i]
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-100 hover:border-brand-200 hover:bg-slate-50'}`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 transition-colors
                         ${userAnswers[q.id] === ['A', 'B', 'C', 'D'][i] ? 'border-brand-500 bg-brand-500' : 'border-slate-300 group-hover:border-brand-400'}`}>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={['A', 'B', 'C', 'D'][i]}
                        checked={userAnswers[q.id] === ['A', 'B', 'C', 'D'][i]}
                        onChange={() => setUserAnswers({ ...userAnswers, [q.id]: ['A', 'B', 'C', 'D'][i] })}
                        className="hidden"
                      />
                      <div className="text-slate-700 w-full">
                        <span className="font-bold mr-2 text-slate-400 group-hover:text-brand-500">{['A', 'B', 'C', 'D'][i]}.</span>
                        <MathRenderer content={opt} className="inline-block" />
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="flex gap-4">
                  {['Đúng', 'Sai'].map((opt) => (
                    <label key={opt} className={`flex-1 flex items-center justify-center p-5 border-2 rounded-2xl cursor-pointer transition-all
                      ${userAnswers[q.id] === opt
                        ? (opt === 'Đúng' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700')
                        : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={userAnswers[q.id] === opt}
                        onChange={() => setUserAnswers({ ...userAnswers, [q.id]: opt })}
                        className="hidden"
                      />
                      <span className="font-bold text-lg">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'short_answer' && (
                <div>
                  <input
                    type="text"
                    placeholder="Nhập đáp số của bạn..."
                    value={userAnswers[q.id] || ''}
                    onChange={(e) => setUserAnswers({ ...userAnswers, [q.id]: e.target.value })}
                    className="w-full p-4 border-2 border-slate-200 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none text-lg"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-600">Đã hoàn thành {Object.keys(userAnswers).length}/{questions.length}</p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-brand-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-100">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Đang chấm bài...
            </div>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              className="bg-gradient-to-r from-brand-accent to-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-orange-500/30 hover:-translate-y-1 transition-all w-full md:w-auto flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-paper-plane"></i> Nộp Bài
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderQuizReview = () => {
    if (!quizResult) return null;

    const percentage = Math.round((quizResult.score / quizResult.totalQuestions) * 100);
    const resultColor = percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-orange-500' : 'text-red-500';

    return (
      <ViewContainer>
        <div className="max-w-4xl mx-auto p-4 pt-8 pb-20">
          {/* Score Card */}
          <div className="glass-card rounded-3xl shadow-xl p-8 mb-10 text-center border border-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-accent"></div>

            <h2 className="text-lg text-slate-500 font-bold uppercase tracking-wider mb-4">Kết quả bài làm</h2>

            <div className="flex justify-center mb-6">
              <div className={`w-40 h-40 rounded-full border-8 flex items-center justify-center bg-white shadow-inner
                   ${percentage >= 80 ? 'border-green-100' : percentage >= 50 ? 'border-orange-100' : 'border-red-100'}`}>
                <div className="text-center">
                  <div className={`text-5xl font-extrabold ${resultColor}`}>
                    {quizResult.score}<span className="text-2xl text-slate-300">/</span>{quizResult.totalQuestions}
                  </div>
                  <div className="text-xs font-bold text-slate-400 mt-1">ĐIỂM SỐ</div>
                </div>
              </div>
            </div>

            <div className="bg-brand-50/80 rounded-2xl p-6 text-left border border-brand-100 inline-block w-full">
              <h3 className="font-bold text-brand-800 mb-2 flex items-center text-lg">
                <span className="bg-brand-200 text-brand-700 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                  <i className="fa-solid fa-lightbulb"></i>
                </span>
                Nhận xét từ AI Mentor
              </h3>
              <MathRenderer content={quizResult.generalAdvice} className="text-slate-700 leading-relaxed" />
            </div>

            <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
              <button
                onClick={() => setPracticePhase('SETUP')}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                <i className="fa-solid fa-rotate-left mr-2"></i> Làm đề khác
              </button>
              <button
                onClick={() => setCurrentView(AppView.DASHBOARD)}
                className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30"
              >
                <i className="fa-solid fa-house mr-2"></i> Về lộ trình
              </button>
            </div>
          </div>

          {/* Detailed Feedback */}
          <h3 className="text-2xl font-bold text-slate-800 mb-6 pl-2 border-l-4 border-brand-500 ml-2">Chi tiết lời giải</h3>
          <div className="space-y-6">
            {quizResult.feedbacks.map((fb, index) => {
              const question = questions.find(q => q.id === fb.questionId);
              return (
                <div key={index} className={`p-6 rounded-2xl border bg-white shadow-sm overflow-hidden relative
                       ${fb.isCorrect ? 'border-green-200' : 'border-red-200'}`}>

                  {/* Status Badge */}
                  <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-xs font-bold uppercase text-white
                          ${fb.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                    {fb.isCorrect ? 'Chính xác' : 'Chưa đúng'}
                  </div>

                  <div className="flex gap-4 mb-4 mt-2">
                    <div className="flex-1">
                      <p className="text-sm text-slate-400 font-bold uppercase mb-1">Câu hỏi {index + 1}</p>
                      {question && <MathRenderer content={question.content} className="font-bold text-slate-800 text-lg" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className={`p-4 rounded-xl border ${fb.isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <span className="block text-xs font-bold uppercase opacity-60 mb-1">Bài làm của bạn</span>
                      <div className={`font-semibold ${fb.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        <MathRenderer content={fb.userAnswer || "(Bỏ trống)"} />
                      </div>
                    </div>
                    {!fb.isCorrect && (
                      <div className="p-4 rounded-xl border bg-green-50 border-green-100">
                        <span className="block text-xs font-bold uppercase opacity-60 mb-1 text-green-800">Đáp án đúng</span>
                        <div className="font-semibold text-green-700">
                          <MathRenderer content={fb.correctAnswer} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <span className="font-bold text-brand-600 block mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-chalkboard-user"></i> Giải thích chi tiết:
                    </span>
                    <MathRenderer content={fb.explanation} className="text-slate-700" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </ViewContainer>
    );
  };

  const renderPractice = () => (
    <ViewContainer className="flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView(AppView.DASHBOARD)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h2 className="font-bold text-slate-800 line-clamp-1 text-lg">{activeTopic?.topic}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {practicePhase === 'SETUP' && renderPracticeSetup()}
        {practicePhase === 'TAKING' && renderTakingQuiz()}
        {practicePhase === 'REVIEW' && renderQuizReview()}
      </div>

      <div className="py-4 text-center text-slate-400 text-xs bg-slate-50 border-t border-slate-200">
        AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng. • Được phát triển bởi <span className="font-semibold text-brand-600">Ngọc Ngọc - Gia Lai</span>
      </div>
    </ViewContainer>
  );

  // --- Main Render ---
  return (
    <div className="font-sans text-slate-800">
      <ApiKeyModal
        isOpen={showKeyModal}
        onSave={handleSaveKey}
        onClose={() => setShowKeyModal(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-[70] flex items-center gap-4 animate-fade-in border-l-4
          ${toast.type === 'success' ? 'bg-white border-green-500 text-slate-800' : 'bg-white border-red-500 text-slate-800'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-check' : 'fa-exclamation'}`}></i>
          </div>
          <span className="font-medium text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Views */}
      {currentView === AppView.ONBOARDING && renderOnboarding()}
      {currentView === AppView.DASHBOARD && renderDashboard()}
      {currentView === AppView.PRACTICE && renderPractice()}
      {currentView === AppView.ANALYTICS && stats && (
        <ProgressDashboard
          stats={stats}
          onClose={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}
      {currentView === AppView.REVIEW && renderReviewView()}
    </div>
  );
};

export default App;
