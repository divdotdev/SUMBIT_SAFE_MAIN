import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name, required = true) => ({ type: Schema.Types.ObjectId, ref: name, required });
export const statuses = ['Draft', 'Documents Pending', 'Ready', 'Submitted', 'Under Review', 'Completed'];
export const purposes = ['DOCUMENT_ANALYSIS', 'LENDER_DATA_SHARE', 'AGENT_ASSISTANCE', 'SCHEME_DOCUMENT_CHECK'];
export const documentTypes = ['AADHAAR', 'PAN', 'SALARY_SLIP', 'BANK_STATEMENT', 'DRIVING_LICENCE', 'ADMISSION_LETTER', 'FEE_SCHEDULE'];
const definitions = {
  User: {
    name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, phone: String,
    passwordHash: { type: String, required: true }, role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: { dob: String, city: String, employmentType: String, monthlyIncome: Number },
  },
  LoanProduct: {
    name: String, slug: { type: String, unique: true }, loanType: String, dataMode: { type: String, enum: ['DEMO', 'LIVE'] },
    interestRateMin: Number, interestRateMax: Number, apr: Number, processingFee: Number, minIncome: Number,
    minAge: Number, maxAge: Number, maxTenureYears: Number, maxLoan: Number, recommendedCreditScore: Number,
    employmentTypes: [String], prepaymentCharges: String, features: [String], documentsRequired: [String], officialUrl: String,
    partnerStatus: String, lastUpdated: Date,
  },
  LoanApplication: {
    userId: ref('User'), loanProductId: ref('LoanProduct'), loanType: String, loanAmount: Number, tenure: Number,
    status: { type: String, enum: statuses, default: 'Draft' }, readinessScore: Number, consentId: ref('Consent', false),
    applicationCode: { type: String, unique: true }, dataMode: String,
  },
  Document: {
    userId: ref('User'), documentType: { type: String, enum: documentTypes }, safeFileName: String,
    originalFileName: String, mimeType: String, size: Number, maskedIdentifier: String,
    status: { type: String, default: 'uploaded' },
  },
  DocumentAnalysis: {
    documentId: { ...ref('Document'), unique: true }, documentDetected: Boolean, readability: String,
    nameDetected: Boolean, nameMatch: { type: Boolean, default: null }, dobDetected: Boolean, dobMatch: { type: Boolean, default: null },
    identifierDetected: Boolean, maskedIdentifier: String, confidence: Number, warnings: [String], recommendations: [String],
    readinessScore: Number, dataMode: String, verificationMode: String, status: String, disclaimer: String,
    evidence: { schemaVersion: String, documentType: String, recognition: { status: String }, extraction: { status: String, method: String },
      consistency: { name: String, dob: String },
      fields: { name: String, dob: String, address: String, maskedIdentifier: String, identifierFormatValid: { type: Boolean, default: null }, issueDate: String, validUntil: String, vehicleClass: String, institution: String, course: String, totalFee: Number },
      sourceVerification: { status: { type: String, enum: ['SOURCE_VERIFIED', 'SOURCE_NOT_VERIFIED', 'VERIFICATION_FAILED', 'NOT_AVAILABLE'] }, provider: String, explanation: String },
      provenance: { method: String, origin: String } },
    extractedFields: { employeeDetected: Boolean, employerDetected: Boolean, monthDetected: Boolean,
      grossSalary: Number, netSalary: Number, bankNameDetected: Boolean, accountHolderDetected: Boolean,
      statementPeriodDetected: Boolean, monthsCovered: Number },
  },
  Scheme: { name: String, slug: { type: String, unique: true }, category: String, description: String, minAge: Number,
    maxAge: Number, maxAnnualIncome: Number, employmentTypes: [String], benefits: [String], documentsRequired: [String], dataMode: String },
  Agent: { name: String, slug: { type: String, unique: true }, city: String, languages: [String], specialties: [String], dataMode: String, description: String },
  Consent: { userId: ref('User'), purpose: { type: String, enum: purposes }, documentIds: [ref('Document')],
    sharedWith: String, version: String, timestamp: Date, revokedAt: { type: Date, default: null } },
  AuditLog: { userId: ref('User', false), action: String, resourceId: String, timestamp: Date },
  AgentRequest: { userId: ref('User'), agentId: ref('Agent'), consentId: ref('Consent'), status: String, dataMode: String },
};
export const models = Object.fromEntries(Object.entries(definitions).map(([name, definition]) => {
  const schema = new Schema(definition, { timestamps: true, strict: 'throw' });
  if (['Document', 'LoanApplication', 'Consent', 'AgentRequest', 'AuditLog'].includes(name)) schema.index({ userId: 1, createdAt: -1 });
  return [name, mongoose.models[name] || mongoose.model(name, schema)];
}));
