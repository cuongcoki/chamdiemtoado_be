/**
 * Node modules
 */
import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * Custom modules
 */
import config from '../config';

/**
 * Types
 */
import { Types } from 'mongoose';

/**
 * Interface cho JWT Payload
 */
export interface ITokenPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Interface cho Token Response
 */
export interface ITokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT Service Object
 */
export const jwtService = {
  /**
   * Generate cả Access Token và Refresh Token
   */
  async generateTokens(
    userId: Types.ObjectId | string,
    role: string
  ): Promise<ITokens> {
    // Tạo payload
    const payload: ITokenPayload = {
      userId: userId.toString(),
      role,
    };

    // Generate cả 2 tokens song song
    const [accessToken, refreshToken] = await Promise.all([
      new Promise<string>((resolve, reject) => {
        jwt.sign(
          payload,
          config.JWT_ACCESS_SECRET,
          { expiresIn: config.JWT_ACCESS_EXPIRE } as SignOptions,
          (err, token) => {
            if (err || !token) {
              reject(err || new Error('Failed to generate access token'));
            } else {
              resolve(token);
            }
          }
        );
      }),
      new Promise<string>((resolve, reject) => {
        jwt.sign(
          payload,
          config.JWT_REFRESH_SECRET,
          { expiresIn: config.JWT_REFRESH_EXPIRE } as SignOptions,
          (err, token) => {
            if (err || !token) {
              reject(err || new Error('Failed to generate refresh token'));
            } else {
              resolve(token);
            }
          }
        );
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  },

  /**
   * Generate Access Token
   */
  async generateAccessToken(
    userId: Types.ObjectId | string,
    role: string
  ): Promise<string> {
    const payload: ITokenPayload = {
      userId: userId.toString(),
      role,
    };

    return new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        config.JWT_ACCESS_SECRET,
        { expiresIn: config.JWT_ACCESS_EXPIRE } as SignOptions,
        (err, token) => {
          if (err || !token) {
            reject(err || new Error('Failed to generate access token'));
          } else {
            resolve(token);
          }
        }
      );
    });
  },

  /**
   * Generate Refresh Token
   */
  async generateRefreshToken(
    userId: Types.ObjectId | string,
    role: string
  ): Promise<string> {
    const payload: ITokenPayload = {
      userId: userId.toString(),
      role,
    };

    return new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        config.JWT_REFRESH_SECRET,
        { expiresIn: config.JWT_REFRESH_EXPIRE } as SignOptions,
        (err, token) => {
          if (err || !token) {
            reject(err || new Error('Failed to generate refresh token'));
          } else {
            resolve(token);
          }
        }
      );
    });
  },

  /**
   * Verify Access Token
   */
  verifyAccessToken(token: string): ITokenPayload {
   try {
    const decoded = jwt.verify(
      token,
      config.JWT_ACCESS_SECRET
    ) as ITokenPayload;
    return decoded;
  } catch (error) {
    // ✅ Throw lại error gốc, không wrap
    throw error;
  }
  },

  /**
   * Verify Refresh Token
   */
  verifyRefreshToken(token: string): ITokenPayload {
    try {
      const decoded = jwt.verify(
        token,
        config.JWT_REFRESH_SECRET
      ) as ITokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token đã hết hạn');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Refresh token không hợp lệ');
      }
      throw error;
    }
  },

  /**
   * Decode token không verify
   */
  decodeToken(token: string): ITokenPayload | null {
    try {
      const decoded = jwt.decode(token) as ITokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Generate new access token
      const newAccessToken = await this.generateAccessToken(
        decoded.userId,
        decoded.role
      );

      return newAccessToken;
    } catch (error) {
      throw new Error(
        'Không thể refresh access token: ' + (error as Error).message
      );
    }
  },
};