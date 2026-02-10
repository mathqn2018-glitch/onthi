import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, RoadmapData, QuizConfig, Question, QuizResult } from "../types";

// Helper to get client (assumes API key is managed in App state, but we need to instantiate per call or reuse)
const getClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

export const generateStudyRoadmap = async (
  apiKey: string,
  profile: UserProfile
): Promise<RoadmapData> => {
  const ai = getClient(apiKey);
  
  const prompt = `
    Đóng vai một chuyên gia giáo dục môn Toán hàng đầu Việt Nam.
    Hãy tạo một lộ trình ôn thi chi tiết cho học sinh này:
    - Tên: ${profile.name}
    - Trình độ hiện tại: ${profile.currentLevel}
    - Kỳ thi mục tiêu: ${profile.targetExam}
    - Điểm số mong muốn: ${profile.targetScore}
    - Ngày bắt đầu ôn tập: ${profile.startDate}
    - Ngày thi dự kiến: ${profile.examDate}
    
    Hãy tính toán khoảng thời gian từ ngày bắt đầu đến ngày thi để chia lộ trình phù hợp theo từng tuần.
    Trả về dữ liệu dưới dạng JSON thuần túy (không có markdown code block).
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            week: { type: Type.INTEGER },
            topic: { type: Type.STRING },
            description: { type: Type.STRING },
            status: { type: Type.STRING, enum: ['locked', 'active', 'completed'] },
            keyConcepts: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['id', 'week', 'topic', 'description', 'status', 'keyConcepts']
        }
      },
      generatedAt: { type: Type.STRING }
    },
    required: ['items', 'generatedAt']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Bạn là gia sư toán nhiệt tình, trả về JSON chính xác.",
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as RoadmapData;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Không thể tạo lộ trình. Vui lòng kiểm tra API Key và thử lại.");
  }
};

// --- New Function: Generate Quiz ---
export const generateQuiz = async (
  apiKey: string,
  topic: string,
  config: QuizConfig
): Promise<Question[]> => {
  const ai = getClient(apiKey);

  const prompt = `
    Tạo một bài kiểm tra toán về chủ đề: "${topic}".
    Độ khó: ${config.difficulty}.
    Số lượng câu: ${config.questionCount}.
    Các dạng bài: ${config.selectedTypes.join(', ')}.
    
    Yêu cầu:
    1. Trả về JSON mảng các câu hỏi.
    2. Sử dụng LaTeX cho công thức toán (đặt trong dấu $...$).
    3. Với trắc nghiệm (multiple_choice), cung cấp 4 đáp án trong mảng 'options'.
    4. Với đúng sai (true_false), không cần 'options'.
    5. Với trả lời ngắn (short_answer), không cần 'options'.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        type: { type: Type.STRING, enum: ['multiple_choice', 'true_false', 'short_answer'] },
        content: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
      },
      required: ['id', 'type', 'content']
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    return JSON.parse(response.text || "[]") as Question[];
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    throw new Error("Không thể tạo bài tập. Vui lòng thử lại.");
  }
};

// --- New Function: Evaluate Quiz ---
export const evaluateQuiz = async (
  apiKey: string,
  topic: string,
  questions: Question[],
  userAnswers: Record<number, string>
): Promise<QuizResult> => {
  const ai = getClient(apiKey);

  // Prepare data for AI analysis
  const submissionData = questions.map(q => ({
    question: q.content,
    type: q.type,
    options: q.options,
    studentAnswer: userAnswers[q.id] || "Không trả lời"
  }));

  const prompt = `
    Chủ đề bài kiểm tra: ${topic}.
    Dưới đây là danh sách câu hỏi và câu trả lời của học sinh.
    Hãy chấm điểm và phân tích chi tiết.

    Dữ liệu bài làm:
    ${JSON.stringify(submissionData, null, 2)}

    Yêu cầu output JSON:
    - score: Số câu đúng.
    - totalQuestions: Tổng số câu.
    - generalAdvice: Nhận xét tổng quan, phân tích điểm yếu và lời khuyên rút kinh nghiệm.
    - feedbacks: Mảng chi tiết từng câu (đúng/sai, đáp án đúng, giải thích chi tiết dùng LaTeX).
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      totalQuestions: { type: Type.INTEGER },
      generalAdvice: { type: Type.STRING },
      feedbacks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionId: { type: Type.INTEGER },
            isCorrect: { type: Type.BOOLEAN },
            userAnswer: { type: Type.STRING },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ['questionId', 'isCorrect', 'userAnswer', 'correctAnswer', 'explanation']
        }
      }
    },
    required: ['score', 'totalQuestions', 'generalAdvice', 'feedbacks']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Map feedbacks back to original question IDs if AI messes up indexing (simple safeguard)
    const mappedFeedbacks = result.feedbacks.map((fb: any, index: number) => ({
        ...fb,
        questionId: questions[index]?.id || fb.questionId
    }));

    return { ...result, feedbacks: mappedFeedbacks } as QuizResult;
  } catch (error) {
    console.error("Quiz Evaluation Error:", error);
    throw new Error("Lỗi khi chấm bài.");
  }
};
