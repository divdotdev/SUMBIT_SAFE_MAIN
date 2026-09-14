import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { AppError, ProviderNotConfiguredError } from '../utils/errors.js';
import { publicUser, signToken } from '../middleware/auth.js';
import { audit } from '../services/access.js';
export function authController(store, config) {
  const challenges = new Map();
  return {
    register: async (req, res) => {
      const { password, ...input } = req.body;
      if (await store.one('User', { email: input.email })) throw new AppError(409, 'Email already registered', 'CONFLICT');
      const user = await store.create('User', { ...input, role: 'user', passwordHash: await bcrypt.hash(password, 12) });
      res.status(201).json({ user: publicUser(user), token: signToken(user, config) });
    },
    login: async (req, res) => {
      const user = await store.one('User', { email: req.body.email });
      const valid = await bcrypt.compare(req.body.password, user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
      if (!user || !valid) throw new AppError(401, 'Invalid email or password', 'UNAUTHORIZED');
      await audit(store, user._id, 'LOGIN');
      res.json({ user: publicUser(user), token: signToken(user, config) });
    },
    updateProfile: async (req, res) => {
      const user = await store.update('User', req.user._id, { name: req.body.name, profile: { ...req.user.profile, ...req.body.profile } });
      // Legacy per-document scores were computed against the old profile. Recheck explicitly.
      if (user.name !== req.user.name || user.profile.dob !== req.user.profile?.dob) {
        for (const doc of await store.find('Document', { userId: req.user._id })) {
          const analysis = await store.one('DocumentAnalysis', { documentId: doc._id });
          if (analysis) await store.remove('DocumentAnalysis', analysis._id);
          await store.update('Document', doc._id, { status: 'uploaded' });
        }
      }
      await audit(store, req.user._id, 'PROFILE_UPDATED', req.user._id);
      res.json({ user: publicUser(user) });
    },
    me: async (req, res) => res.json({ user: publicUser(req.user) }),
    sendOtp: async (req, res) => {
      if (config.appMode !== 'MOCK') throw new ProviderNotConfiguredError('SMSProvider');
      const now = Date.now();
      for (const [key, challenge] of challenges) if (challenge.expiresAt <= now) challenges.delete(key);
      const previous = challenges.get(req.body.phone);
      if (previous && now - previous.sentAt < 60000) throw new AppError(429, 'Wait 60 seconds before requesting another OTP');
      if (challenges.size >= 10000) throw new AppError(429, 'OTP capacity reached; try again later');
      const challengeId = randomUUID();
      challenges.set(req.body.phone, { challengeId, expiresAt: now + 300000, sentAt: now, attempts: 0 });
      res.json({ challengeId, expiresInSeconds: 300, dataMode: 'DEMO', message: 'Mock OTP is 123456. No SMS was sent.' });
    },
    verifyOtp: async (req, res) => {
      if (config.appMode !== 'MOCK') throw new ProviderNotConfiguredError('SMSProvider');
      const challenge = challenges.get(req.body.phone);
      if (!challenge || challenge.expiresAt <= Date.now() || challenge.challengeId !== req.body.challengeId) throw new AppError(400, 'Invalid or expired OTP challenge');
      challenge.attempts += 1;
      if (challenge.attempts > 5) { challenges.delete(req.body.phone); throw new AppError(429, 'OTP attempt limit reached'); }
      if (req.body.otp !== '123456') throw new AppError(400, 'Invalid OTP');
      challenges.delete(req.body.phone);
      res.json({ verified: true, dataMode: 'DEMO', message: 'Sandbox OTP challenge completed. This does not verify real phone ownership or create a login session.' });
    },
  };
}
