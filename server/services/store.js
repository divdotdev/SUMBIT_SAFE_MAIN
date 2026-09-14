import mongoose from 'mongoose';
import { models } from '../models/index.js';
import { AppError } from '../utils/errors.js';

// Both backends run the same Mongoose schema validation. MEMORY is deliberately ephemeral.
export class Store {
  constructor(config) { this.config = config; this.tables = new Map(); this.databaseStatus = 'disconnected'; }
  async connect() {
    if (this.config.databaseMode === 'MONGODB') {
      await mongoose.connect(this.config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      await Promise.all(Object.values(models).map(model => model.init()));
      this.databaseStatus = 'connected';
    } else this.databaseStatus = 'mock-memory';
  }
  async close() { if (this.config.databaseMode === 'MONGODB') await mongoose.disconnect(); this.databaseStatus = 'disconnected'; }
  getStatus() { return this.config.databaseMode === 'MONGODB' ? (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected') : this.databaseStatus; }
  table(name) { if (!this.tables.has(name)) this.tables.set(name, new Map()); return this.tables.get(name); }
  async find(name, filter = {}) {
    if (this.config.databaseMode === 'MONGODB') return JSON.parse(JSON.stringify(await models[name].find(filter).lean()));
    return structuredClone([...this.table(name).values()].filter(row => Object.entries(filter).every(([key, val]) => String(row[key]) === String(val))));
  }
  async one(name, filter) { return (await this.find(name, filter))[0] || null; }
  async create(name, values) {
    if (this.config.databaseMode === 'MONGODB') return JSON.parse(JSON.stringify(await models[name].create(values)));
    const model = new models[name](values); await model.validate();
    const row = JSON.parse(JSON.stringify(model)); row.createdAt = new Date().toISOString(); row.updatedAt = row.createdAt;
    const uniqueFields = { User: 'email', LoanProduct: 'slug', Scheme: 'slug', Agent: 'slug', LoanApplication: 'applicationCode', DocumentAnalysis: 'documentId' };
    const key = uniqueFields[name];
    if (key && [...this.table(name).values()].some(old => old[key] === row[key])) throw new AppError(409, 'Record already exists', 'CONFLICT');
    this.table(name).set(row._id, row); return structuredClone(row);
  }
  async update(name, id, values) {
    if (this.config.databaseMode === 'MONGODB') return JSON.parse(JSON.stringify(await models[name].findByIdAndUpdate(id, { $set: values }, { new: true, runValidators: true }).lean()));
    const old = this.table(name).get(id); if (!old) return null;
    const model = new models[name]({ ...old, ...values }); await model.validate();
    const row = JSON.parse(JSON.stringify(model)); row.updatedAt = new Date().toISOString(); this.table(name).set(id, row); return structuredClone(row);
  }
  async remove(name, id) {
    if (this.config.databaseMode === 'MONGODB') await models[name].deleteOne({ _id: id });
    else this.table(name).delete(id);
  }
}
