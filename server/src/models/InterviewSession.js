import mongoose from 'mongoose';

export const INTERVIEW_MODES = ['technical', 'coding', 'hr', 'full', 'challenge'];

const questionSnapshotSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sourceQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion', default: null },
  prompt: { type: String, required: true, maxlength: 600 },
  category: { type: String, required: true },
  difficulty: { type: String, required: true },
  requirement: { type: String, required: true, maxlength: 160 },
  requirementArea: { type: String, required: true },
  jdExcerpt: { type: String, default: '' },
  isFollowUp: { type: Boolean, default: false },
}, { _id: false });

const turnSchema = new mongoose.Schema({
  question: { type: questionSnapshotSchema, required: true },
  evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'AnswerEvaluation', required: true },
  answeredAt: { type: Date, default: Date.now },
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobBoard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobBoard', required: true, index: true },
  boardVersion: { type: Number, required: true, min: 1 },
  jobSnapshot: { company: String, role: String },
  mode: { type: String, required: true, enum: INTERVIEW_MODES },
  challengeDimension: { type: String, default: null },
  challengeBeforeScore: { type: Number, default: null },
  challengeBeforeEvidenceCount: { type: Number, default: null },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  questionCount: { type: Number, required: true, min: 1, max: 10 },
  currentQuestion: { type: questionSnapshotSchema, default: null },
  remainingQuestions: { type: [questionSnapshotSchema], default: [] },
  turns: { type: [turnSchema], default: [] },
  processing: { type: Boolean, default: false },
  processingStartedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

interviewSessionSchema.index({ user: 1, createdAt: -1 });
interviewSessionSchema.index({ user: 1, jobBoard: 1, createdAt: -1 });

export default mongoose.model('InterviewSession', interviewSessionSchema);
