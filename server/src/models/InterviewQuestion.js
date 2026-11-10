import mongoose from 'mongoose';

export const QUESTION_CATEGORIES = [
  'Technical fundamentals', 'Programming and coding', 'Data structures and algorithms',
  'Database and SQL', 'Framework-specific', 'Project-based', 'Real-world scenarios',
  'System design', 'Behavioral', 'HR interview',
];
export const QUESTION_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

const interviewQuestionSchema = new mongoose.Schema({
  jobBoard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobBoard', required: true, index: true },
  generationId: { type: String, required: true },
  category: { type: String, required: true, enum: QUESTION_CATEGORIES },
  difficulty: { type: String, required: true, enum: QUESTION_DIFFICULTIES },
  requirement: { type: String, required: true, maxlength: 160 },
  requirementArea: { type: String, required: true },
  jdExcerpt: { type: String, default: '', maxlength: 300 },
  prompt: { type: String, required: true, maxlength: 600 },
  source: { type: String, required: true, enum: ['ai', 'template'] },
  order: { type: Number, required: true, min: 0 },
}, { timestamps: true });

interviewQuestionSchema.index({ jobBoard: 1, generationId: 1, order: 1 });

export default mongoose.model('InterviewQuestion', interviewQuestionSchema);
