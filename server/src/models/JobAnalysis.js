import mongoose from 'mongoose';

const jobAnalysisSchema = new mongoose.Schema({
  jobBoard: { type: mongoose.Schema.Types.ObjectId, ref: 'JobBoard', required: true, unique: true },
  source: { type: String, enum: ['ai', 'keyword'], required: true },
  summary: { type: String, default: '' },
  requiredTechnicalSkills: { type: [String], default: [] },
  programmingLanguages: { type: [String], default: [] },
  frameworksAndTechnologies: { type: [String], default: [] },
  dataStructuresAndAlgorithms: { type: [String], default: [] },
  databases: { type: [String], default: [] },
  systemDesign: { type: [String], default: [] },
  projectsAndExperience: { type: [String], default: [] },
  softSkills: { type: [String], default: [] },
  preferredQualifications: { type: [String], default: [] },
  importantKeywords: { type: [String], default: [] },
  note: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('JobAnalysis', jobAnalysisSchema);
