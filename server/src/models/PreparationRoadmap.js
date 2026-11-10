import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  key: { type: String, required: true },
  topic: { type: String, required: true },
  title: { type: String, required: true },
  action: { type: String, required: true },
  reason: { type: String, required: true },
  score: { type: Number, min: 0, max: 100, default: null },
  priority: { type: String, enum: ['Focus', 'Unassessed', 'Review'], required: true },
  week: { type: Number, required: true, min: 1, max: 4 },
  day: { type: Number, required: true, min: 1, max: 7 },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
}, { _id: true });

const roadmapSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobBoard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobBoard', required: true, index: true },
  boardVersion: { type: Number, required: true, min: 1 },
  tasks: { type: [taskSchema], default: [] },
  generatedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

roadmapSchema.index({ user: 1, jobBoard: 1, boardVersion: 1 }, { unique: true });

export default mongoose.model('PreparationRoadmap', roadmapSchema);
