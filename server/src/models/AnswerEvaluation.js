import mongoose from 'mongoose';
import { INTERVIEW_MODES } from './InterviewSession.js';

const scoresSchema = new mongoose.Schema({
  technicalCorrectness: { type: Number, min: 0, max: 100 },
  depth: { type: Number, min: 0, max: 100 },
  practicalApplicability: { type: Number, min: 0, max: 100 },
  completeness: { type: Number, min: 0, max: 100 },
  clarity: { type: Number, min: 0, max: 100 },
  algorithmSelection: { type: Number, min: 0, max: 100 },
  timeComplexity: { type: Number, min: 0, max: 100 },
  spaceComplexity: { type: Number, min: 0, max: 100 },
  edgeCases: { type: Number, min: 0, max: 100 },
  codeCorrectness: { type: Number, min: 0, max: 100 },
}, { _id: false });

const answerEvaluationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobBoard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobBoard', required: true, index: true },
  boardVersion: { type: Number, required: true, min: 1 },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
  mode: { type: String, enum: INTERVIEW_MODES, required: true },
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, required: true },
  requirement: { type: String, required: true },
  requirementArea: { type: String, required: true },
  answer: { type: String, required: true, maxlength: 10000 },
  source: { type: String, enum: ['ai', 'unscored'], required: true },
  assessed: { type: Boolean, required: true },
  score: { type: Number, min: 0, max: 100, default: null },
  scores: { type: scoresSchema, default: null },
  correctPoints: { type: [String], default: [] },
  missingConcepts: { type: [String], default: [] },
  incorrectClaims: { type: [String], default: [] },
  idealAnswer: { type: String, default: '' },
  improvements: { type: [String], default: [] },
  followUpQuestion: { type: String, default: '' },
  note: { type: String, default: '' },
}, { timestamps: true });

answerEvaluationSchema.index({ user: 1, jobBoard: 1, createdAt: -1 });

export default mongoose.model('AnswerEvaluation', answerEvaluationSchema);
