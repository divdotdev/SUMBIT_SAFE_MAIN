import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
export function auth(store, config) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    let payload;
    try { payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'submitsafe', audience: 'submitsafe-api' }); }
    catch { throw new AppError(401, 'Invalid or expired token', 'UNAUTHORIZED'); }
    if (!/^[a-f\d]{24}$/i.test(payload.sub || '')) throw new AppError(401, 'Invalid token', 'UNAUTHORIZED');
    req.user = await store.one('User', { _id: payload.sub });
    if (!req.user) throw new AppError(401, 'User no longer exists', 'UNAUTHORIZED');
    next();
  };
}
export function publicUser(user) { const { passwordHash, __v, ...result } = user; return result; }
export function signToken(user, config) { return jwt.sign({}, config.jwtSecret, { subject: user._id, algorithm: 'HS256', expiresIn: '2h', issuer: 'submitsafe', audience: 'submitsafe-api' }); }
