import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// JWT options
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'trading-farm-secret', // Use environment variable in production
};

// Setup JWT strategy
passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      // Find user by id from JWT payload
      const user = await prisma.user.findUnique({
        where: { id: jwtPayload.id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      // Return user if found
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Middleware for requiring authentication
export const requireAuth = passport.authenticate('jwt', { session: false });

export default passport; 