import mongoose from 'mongoose';
import { READINESS_DIMENSIONS } from '../services/readinessDimensions.js';

const skillAssessmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobBoard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobBoard', required: true, index: true },
  boardVersion: { type: Number, required: true, min: 1 },
  evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'AnswerEvaluation', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true },
  dimension: { type: String, required: true, enum: READINESS_DIMENSIONS.map((item) => item.key) },
  score: { type: Number, required: true, min: 0, max: 100 },
  questionKey: { type: String, required: true },
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  category: { type: String, required: true },
  requirement: { type: String, required: true },
  assessedAt: { type: Date, required: true },
}, { timestamps: true });

skillAssessmentSchema.index({ evaluation: 1, dimension: 1 }, { unique: true });
skillAssessmentSchema.index({ user: 1, jobBoard: 1, boardVersion: 1, dimension: 1, assessedAt: -1 });

export default mongoose.model('SkillAssessment', skillAssessmentSchema);
