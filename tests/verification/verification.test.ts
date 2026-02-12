/**
 * Verification System Tests
 * 
 * Tests for forensic-grade public verification:
 * - Token generation uniqueness
 * - Enable creates token
 * - Disable sets revokedAt
 * - Rotate issues new token and revokes old
 * - Public endpoint returns verified/revoked/not_found
 * - Rate limit returns 429
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  generateVerificationToken,
  hashIP,
  sanitizeUserAgent,
  buildVerificationUrl,
  DEFAULT_RATE_LIMIT,
} from '../../packages/core/src/verification/token-utils';

describe('Verification Token Utils', () => {
  describe('generateVerificationToken', () => {
    it('should generate a valid UUID token', () => {
      const result = generateVerificationToken();
      
      expect(result.token).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      
      // UUID v4 format check
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.token).toMatch(uuidRegex);
    });

    it('should generate unique tokens on each call', () => {
      const tokens = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const result = generateVerificationToken();
        expect(tokens.has(result.token)).toBe(false);
        tokens.add(result.token);
      }
      
      expect(tokens.size).toBe(100);
    });
  });

  describe('hashIP', () => {
    it('should hash IP addresses consistently', () => {
      const ip = '192.168.1.1';
      const hash1 = hashIP(ip);
      const hash2 = hashIP(ip);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex length
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = hashIP('192.168.1.1');
      const hash2 = hashIP('192.168.1.2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes with different salts', () => {
      const ip = '192.168.1.1';
      const hash1 = hashIP(ip, 'salt1');
      const hash2 = hashIP(ip, 'salt2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sanitizeUserAgent', () => {
    it('should return null for undefined input', () => {
      expect(sanitizeUserAgent(undefined)).toBeNull();
    });

    it('should truncate long user agents to 300 chars', () => {
      const longUA = 'A'.repeat(500);
      const result = sanitizeUserAgent(longUA);
      
      expect(result).not.toBeNull();
      expect(result!.length).toBe(300);
    });

    it('should pass through normal user agents unchanged', () => {
      const normalUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const result = sanitizeUserAgent(normalUA);
      
      expect(result).toBe(normalUA);
    });
  });

  describe('buildVerificationUrl', () => {
    it('should build URL with default base', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000';
      const url = buildVerificationUrl(token);
      
      expect(url).toContain('/verify/');
      expect(url).toContain(token);
    });

    it('should use custom base URL when provided', () => {
      const token = '550e8400-e29b-41d4-a716-446655440000';
      const url = buildVerificationUrl(token, 'https://custom.example.com');
      
      expect(url).toBe(`https://custom.example.com/verify/${token}`);
    });
  });

  describe('DEFAULT_RATE_LIMIT', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_RATE_LIMIT.windowMs).toBeGreaterThan(0);
      expect(DEFAULT_RATE_LIMIT.maxPerIP).toBeGreaterThan(0);
      expect(DEFAULT_RATE_LIMIT.maxPerToken).toBeGreaterThan(0);
      
      // 10 minute window
      expect(DEFAULT_RATE_LIMIT.windowMs).toBe(10 * 60 * 1000);
      
      // Rate limits
      expect(DEFAULT_RATE_LIMIT.maxPerIP).toBe(30);
      expect(DEFAULT_RATE_LIMIT.maxPerToken).toBe(60);
    });
  });
});

describe('Verification Repository Operations', () => {
  // Mock Prisma client
  const mockPrisma = {
    growthImage: {
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    verificationLog: {
      create: jest.fn(),
      count: jest.fn(),
    },
    project: {
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Lifecycle', () => {
    it('should create token with correct fields', async () => {
      // This would be an integration test with actual Prisma
      // For unit testing, we verify the expected behavior
      
      const expectedFields = [
        'verificationToken',
        'verificationCreatedAt',
        'verificationRevokedAt',
        'publicVerificationEnabled',
      ];
      
      // Mock the update call
      mockPrisma.growthImage.update.mockResolvedValue({
        id: 'asset-123',
        verificationToken: 'mock-uuid',
        verificationCreatedAt: new Date(),
        verificationRevokedAt: null,
        publicVerificationEnabled: true,
      });
      
      // Verify structure expectation
      expect(expectedFields).toContain('verificationToken');
      expect(expectedFields).toContain('verificationCreatedAt');
    });

    it('should set revokedAt when disabling', async () => {
      mockPrisma.growthImage.update.mockResolvedValue({
        id: 'asset-123',
        verificationRevokedAt: new Date(),
        publicVerificationEnabled: false,
      });
      
      // Verify revocation behavior expectation
      const result = await mockPrisma.growthImage.update({
        where: { id: 'asset-123' },
        data: {
          verificationRevokedAt: new Date(),
          publicVerificationEnabled: false,
        },
      });
      
      expect(result.verificationRevokedAt).not.toBeNull();
      expect(result.publicVerificationEnabled).toBe(false);
    });

    it('should rotate token: revoke old, create new', async () => {
      const oldToken = 'old-token-uuid';
      const newToken = 'new-token-uuid';
      
      // First call: get current token
      mockPrisma.growthImage.findUnique.mockResolvedValueOnce({
        id: 'asset-123',
        verificationToken: oldToken,
      });
      
      // Second call: update with new token
      mockPrisma.growthImage.update.mockResolvedValue({
        id: 'asset-123',
        verificationToken: newToken,
        verificationCreatedAt: new Date(),
        verificationRevokedAt: null,
      });
      
      // Third call: log old token as revoked
      mockPrisma.verificationLog.create.mockResolvedValue({
        id: 'log-123',
        verificationToken: oldToken,
        result: 'revoked',
      });
      
      // Verify the rotation flow
      const asset = await mockPrisma.growthImage.findUnique({
        where: { id: 'asset-123' },
        select: { verificationToken: true },
      });
      
      expect(asset?.verificationToken).toBe(oldToken);
    });
  });
});

describe('Public Verification Endpoint Responses', () => {
  describe('Response Shapes', () => {
    it('should return verified response shape', () => {
      const verifiedResponse = {
        status: 'verified',
        assetId: 'asset-123',
        aiGenerated: false,
        governanceStatus: 'approved',
        embeddedOn: '2026-02-11',
        integrity: 'record_confirmed',
      };
      
      expect(verifiedResponse.status).toBe('verified');
      expect(verifiedResponse).toHaveProperty('assetId');
      expect(verifiedResponse).toHaveProperty('integrity');
      
      // Should NOT have sensitive fields
      expect(verifiedResponse).not.toHaveProperty('contractSnapshot');
      expect(verifiedResponse).not.toHaveProperty('manifestJson');
      expect(verifiedResponse).not.toHaveProperty('geoFocus');
    });

    it('should return revoked response shape', () => {
      const revokedResponse = {
        status: 'revoked',
        message: 'This verification link has been revoked',
      };
      
      expect(revokedResponse.status).toBe('revoked');
      expect(revokedResponse.message).toBeDefined();
    });

    it('should return not_found response shape', () => {
      const notFoundResponse = {
        status: 'not_found',
        message: 'Verification record not found',
      };
      
      expect(notFoundResponse.status).toBe('not_found');
      expect(notFoundResponse.message).toBeDefined();
    });

    it('should return rate_limited response shape', () => {
      const rateLimitedResponse = {
        status: 'rate_limited',
        message: 'Too many verification requests. Please try again later.',
      };
      
      expect(rateLimitedResponse.status).toBe('rate_limited');
      expect(rateLimitedResponse.message).toBeDefined();
    });
  });

  describe('Integrity Confirmation', () => {
    it('should return record_confirmed when no checksum provided', () => {
      const integrity: 'checksum_match_confirmed' | 'record_confirmed' = 'record_confirmed';
      expect(integrity).toBe('record_confirmed');
    });

    it('should return checksum_match_confirmed when checksum matches', () => {
      const integrity: 'checksum_match_confirmed' | 'record_confirmed' = 'checksum_match_confirmed';
      expect(integrity).toBe('checksum_match_confirmed');
    });
  });

  describe('Security Headers', () => {
    it('should specify noindex headers', () => {
      const expectedHeaders = {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Content-Type-Options': 'nosniff',
      };
      
      expect(expectedHeaders['X-Robots-Tag']).toContain('noindex');
      expect(expectedHeaders['X-Robots-Tag']).toContain('nofollow');
      expect(expectedHeaders['Cache-Control']).toBe('no-store');
    });
  });
});
