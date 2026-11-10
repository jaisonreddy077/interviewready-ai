import mongoose from 'mongoose';

const jobBoardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  experienceLevel: { type: String, required: true, enum: ['Internship', 'Entry level', 'Mid level', 'Senior'] },
  jdText: { type: String, default: '', maxlength: 20000 },
  jdFilename: { type: String, default: '' },
  questionGenerationId: { type: String, default: '' },
  questionGenerationSource: { type: String, enum: ['', 'ai', 'template'], default: '' },
  questionGenerationNote: { type: String, default: '' },
  questionGeneratedAt: { type: Date, default: null },
  assessmentVersion: { type: Number, default: 1, min: 1 },
}, { timestamps: true });

jobBoardSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('JobBoard', jobBoardSchema);
