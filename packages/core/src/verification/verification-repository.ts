/**
 * Verification Repository
 * 
 * Database operations for public verification tokens.
 * Implements token generation, revocation, and rotation with uniqueness guarantees.
 */

import { generateVerificationToken } from './token-utils';

export interface VerificationTokenData {
  token: string;
  createdAt: Date;
  revokedAt: Date | null;
  lastCheckedAt: Date | null;
  enabled: boolean | null;
}

export interface CreateTokenResult {
  success: boolean;
  token?: string;
  createdAt?: Date;
  error?: string;
}

export interface RevokeTokenResult {
  success: boolean;
  revokedAt?: Date;
  error?: string;
}

export interface RotateTokenResult {
  success: boolean;
  oldToken?: string;
  newToken?: string;
  createdAt?: Date;
  error?: string;
}

/**
 * Create verification token operations for a given Prisma client
 * This is injected at runtime to avoid circular dependencies
 */
export function createVerificationOperations(prisma: any) {
  return {
    /**
     * Create a new verification token for an asset.
     * Retries once on collision (extremely rare with UUIDv4).
     */
    async createVerificationToken(assetId: string): Promise<CreateTokenResult> {
      const maxRetries = 2;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const { token, createdAt } = generateVerificationToken();
          
          await prisma.growthImage.update({
            where: { id: assetId },
            data: {
              verificationToken: token,
              verificationCreatedAt: createdAt,
              verificationRevokedAt: null, // Clear any previous revocation
              publicVerificationEnabled: true,
            },
          });
          
          return { success: true, token, createdAt };
        } catch (error: any) {
          // Check for unique constraint violation (token collision)
          if (error.code === 'P2002' && attempt < maxRetries - 1) {
            console.warn(`Verification token collision, retrying (attempt ${attempt + 1})`);
            continue;
          }
          return { success: false, error: error.message };
        }
      }
      
      return { success: false, error: 'Failed to generate unique token after retries' };
    },

    /**
     * Revoke a verification token (keeps token for audit trail, sets revokedAt).
     * Does NOT delete logs.
     */
    async revokeVerificationToken(assetId: string): Promise<RevokeTokenResult> {
      try {
        const revokedAt = new Date();
        
        await prisma.growthImage.update({
          where: { id: assetId },
          data: {
            verificationRevokedAt: revokedAt,
            publicVerificationEnabled: false,
          },
        });
        
        return { success: true, revokedAt };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Rotate a verification token: revoke old + issue new.
     */
    async rotateVerificationToken(assetId: string): Promise<RotateTokenResult> {
      try {
        // Get current token first
        const asset = await prisma.growthImage.findUnique({
          where: { id: assetId },
          select: { verificationToken: true },
        });
        
        const oldToken = asset?.verificationToken || undefined;
        const { token: newToken, createdAt } = generateVerificationToken();
        
        await prisma.growthImage.update({
          where: { id: assetId },
          data: {
            verificationToken: newToken,
            verificationCreatedAt: createdAt,
            verificationRevokedAt: null,
            publicVerificationEnabled: true,
          },
        });
        
        // Log the rotation event (old token is now invalid)
        if (oldToken) {
          await prisma.verificationLog.create({
            data: {
              verificationToken: oldToken,
              assetId,
              ipHash: 'system-rotation',
              result: 'revoked',
              userAgent: 'ContextEmbed Token Rotation',
            },
          });
        }
        
        return { success: true, oldToken, newToken, createdAt };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Enable verification for an asset (creates token if needed)
     */
    async enableVerification(assetId: string): Promise<CreateTokenResult> {
      const asset = await prisma.growthImage.findUnique({
        where: { id: assetId },
        select: { 
          verificationToken: true, 
          verificationRevokedAt: true,
          verificationCreatedAt: true,
        },
      });
      
      // If token exists and not revoked, just re-enable
      if (asset?.verificationToken && !asset.verificationRevokedAt) {
        await prisma.growthImage.update({
          where: { id: assetId },
          data: { publicVerificationEnabled: true },
        });
        return { 
          success: true, 
          token: asset.verificationToken, 
          createdAt: asset.verificationCreatedAt || undefined 
        };
      }
      
      // Otherwise create new token
      return this.createVerificationToken(assetId);
    },

    /**
     * Disable verification (sets revokedAt, keeps token)
     */
    async disableVerification(assetId: string): Promise<RevokeTokenResult> {
      return this.revokeVerificationToken(assetId);
    },

    /**
     * Get verification state for an asset
     */
    async getVerificationState(assetId: string): Promise<VerificationTokenData | null> {
      const asset = await prisma.growthImage.findUnique({
        where: { id: assetId },
        select: {
          verificationToken: true,
          verificationCreatedAt: true,
          verificationRevokedAt: true,
          verificationLastCheckedAt: true,
          publicVerificationEnabled: true,
        },
      });
      
      if (!asset) return null;
      
      return {
        token: asset.verificationToken || '',
        createdAt: asset.verificationCreatedAt || new Date(),
        revokedAt: asset.verificationRevokedAt,
        lastCheckedAt: asset.verificationLastCheckedAt,
        enabled: asset.publicVerificationEnabled,
      };
    },

    /**
     * Update project verification defaults
     */
    async updateProjectVerificationDefault(
      projectId: string, 
      enabled: boolean
    ): Promise<{ success: boolean; error?: string }> {
      try {
        await prisma.project.update({
          where: { id: projectId },
          data: { publicVerificationDefaultEnabled: enabled },
        });
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Update project embed verification link setting
     */
    async updateProjectEmbedVerificationLink(
      projectId: string, 
      enabled: boolean
    ): Promise<{ success: boolean; error?: string }> {
      try {
        await prisma.project.update({
          where: { id: projectId },
          data: { embedVerificationLink: enabled },
        });
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Find asset by verification token (for public endpoint)
     */
    async findByVerificationToken(token: string) {
      return prisma.growthImage.findUnique({
        where: { verificationToken: token },
        include: {
          project: {
            include: {
              user: {
                include: {
                  profile: {
                    select: { businessName: true },
                  },
                },
              },
            },
          },
        },
      });
    },

    /**
     * Log a verification attempt
     */
    async logVerificationAttempt(data: {
      verificationToken: string;
      assetId: string;
      projectId?: string;
      ipHash: string;
      userAgent?: string;
      result: 'verified' | 'revoked' | 'not_found' | 'rate_limited';
      checksumProvided?: boolean;
      checksumMatched?: boolean;
    }) {
      return prisma.verificationLog.create({ data });
    },

    /**
     * Update last checked timestamp
     */
    async updateLastChecked(assetId: string) {
      return prisma.growthImage.update({
        where: { id: assetId },
        data: { verificationLastCheckedAt: new Date() },
      });
    },

    /**
     * Check rate limit (count recent requests)
     */
    async checkRateLimit(
      ipHash: string, 
      token: string, 
      windowMs: number
    ): Promise<{ byIP: number; byToken: number }> {
      const since = new Date(Date.now() - windowMs);
      
      const [byIP, byToken] = await Promise.all([
        prisma.verificationLog.count({
          where: {
            ipHash,
            checkedAt: { gte: since },
          },
        }),
        prisma.verificationLog.count({
          where: {
            verificationToken: token,
            checkedAt: { gte: since },
          },
        }),
      ]);
      
      return { byIP, byToken };
    },
  };
}

export type VerificationOperations = ReturnType<typeof createVerificationOperations>;
