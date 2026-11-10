import mongoose from 'mongoose';

const categorySnapshotSchema = new mongoose.Schema({
  key: String,
  status: String,
  score: { type: Number, default: null },
  evidenceCount: Number,
}, { _id: false });

const readinessSnapshotSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobBoard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobBoard', required: true, index: true },
  boardVersion: { type: Number, required: true, min: 1 },
  signature: { type: String, required: true },
  readinessPercent: { type: Number, default: null },
  observedScore: { type: Number, default: null },
  coveragePercent: { type: Number, required: true },
  categories: { type: [categorySnapshotSchema], default: [] },
  scoredAnswerCount: { type: Number, required: true },
}, { timestamps: true });

readinessSnapshotSchema.index({ jobBoard: 1, boardVersion: 1, signature: 1 }, { unique: true });
readinessSnapshotSchema.index({ user: 1, jobBoard: 1, boardVersion: 1, createdAt: -1 });

export default mongoose.model('ReadinessSnapshot', readinessSnapshotSchema);
