/**
 * Database Repositories
 * Type-safe data access layer
 */

import { prisma } from './client';
import { Prisma, User, UserProfile, Project, OnboardingProfile, Asset, Job, VisionResult, MetadataResult, EmbedResult, Export, ProjectGoal, AssetStatus, JobStatus, JobType } from '@prisma/client';

// Type alias for JSON input values (for create/update operations)
type JsonInput = Prisma.InputJsonValue;

// ============================================
// User Repository
// ============================================

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },
  
  async findByIdWithProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  },
  
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },
  
  async create(data: { email: string; name?: string; avatarUrl?: string }): Promise<User> {
    return prisma.user.create({ data });
  },
  
  async update(id: string, data: { name?: string; avatarUrl?: string }): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },
};

// ============================================
// User Profile Repository (Business Defaults)
// ============================================

export const userProfileRepository = {
  async findByUserId(userId: string): Promise<UserProfile | null> {
    return prisma.userProfile.findUnique({ where: { userId } });
  },
  
  async create(userId: string): Promise<UserProfile> {
    return prisma.userProfile.create({
      data: { userId },
    });
  },
  
  async update(userId: string, data: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserProfile> {
    return prisma.userProfile.update({
      where: { userId },
      data,
    });
  },
  
  async upsert(userId: string, data: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserProfile> {
    return prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
  
  async completeOnboarding(userId: string): Promise<UserProfile> {
    return prisma.userProfile.update({
      where: { userId },
      data: {
        onboardingCompleted: true,
        completedAt: new Date(),
      },
    });
  },
  
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { onboardingCompleted: true },
    });
    return profile?.onboardingCompleted ?? false;
  },
};

// ============================================
// Project Repository
// ============================================

export const projectRepository = {
  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({ where: { id } });
  },
  
  async findByIdWithProfile(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: { onboardingProfile: true },
    });
  },
  
  async findByUser(userId: string): Promise<Project[]> {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Find projects with their cover image (first asset's thumbnail)
   */
  async findByUserWithCover(userId: string): Promise<(Project & { coverAssetId?: string })[]> {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assets: {
          where: { thumbnailPath: { not: null } },
          select: { id: true },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    return projects.map(p => ({
      ...p,
      coverAssetId: p.assets[0]?.id,
      assets: undefined, // Remove assets array from response
    })) as (Project & { coverAssetId?: string })[];
  },
  
  async create(data: { 
    userId: string; 
    name: string; 
    goal: ProjectGoal;
    workspaceId?: string;
    primaryDomain?: string;
    retentionPolicy?: 'free_24h' | 'pro_7d' | 'agency_14d' | 'unlimited';
    retentionHours?: number;
    expiresAt?: Date;
  }): Promise<Project> {
    return prisma.project.create({ data });
  },
  
  async update(id: string, data: Partial<Pick<Project, 'name' | 'goal' | 'onboardingCompleted' | 'visualAuthenticityPolicy' | 'startupModeEnabled' | 'workspaceId' | 'primaryDomain' | 'retentionPolicy' | 'retentionHours' | 'expiresAt' | 'lastActivityAt'>>): Promise<Project> {
    return prisma.project.update({ where: { id }, data });
  },
  
  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  },
  
  async enableStartupMode(id: string): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: {
        startupModeEnabled: true,
        visualAuthenticityPolicy: 'deny_ai_proof',
      },
    });
  },
  
  async getEffectivePolicy(id: string): Promise<'conditional' | 'deny_ai_proof' | 'allow'> {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new Error('Project not found');
    
    // NULL = 'conditional' in code
    return project.visualAuthenticityPolicy ?? 'conditional';
  },
};

// ============================================
// Onboarding Profile Repository
// ============================================

export const onboardingProfileRepository = {
  async findByProjectId(projectId: string): Promise<OnboardingProfile | null> {
    return prisma.onboardingProfile.findUnique({ where: { projectId } });
  },
  
  async create(data: {
    projectId: string;
    projectName: string;
    primaryGoal: ProjectGoal;
    confirmedContext: JsonInput;
    rights: JsonInput;
    preferences: JsonInput;
  }): Promise<OnboardingProfile> {
    return prisma.onboardingProfile.create({ data });
  },
  
  async update(projectId: string, data: Partial<{
    websiteUrl: string;
    urlAuditResult: JsonInput;
    confirmedContext: JsonInput;
    rights: JsonInput;
    preferences: JsonInput;
    completenessScore: number;
    isComplete: boolean;
    version: number;
  }>): Promise<OnboardingProfile> {
    return prisma.onboardingProfile.update({ 
      where: { projectId }, 
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  },

  async upsertForUrlAudit(projectId: string, projectName: string, primaryGoal: ProjectGoal, websiteUrl: string, urlAuditResult: JsonInput): Promise<OnboardingProfile> {
    return prisma.onboardingProfile.upsert({
      where: { projectId },
      update: {
        websiteUrl,
        urlAuditResult,
        version: { increment: 1 },
      },
      create: {
        projectId,
        projectName,
        primaryGoal,
        websiteUrl,
        urlAuditResult,
        confirmedContext: { brandName: '' },
        rights: {
          creatorName: '',
          copyrightTemplate: '',
          creditTemplate: '',
        },
        preferences: {
          primaryLanguage: 'en',
          keywordStyle: 'mixed',
          maxKeywords: 25,
          locationBehavior: 'strict',
          overwriteOriginals: false,
          includeReasoning: true,
          outputFormat: 'copy',
        },
      },
    });
  },

  async upsertInitial(data: {
    projectId: string;
    projectName: string;
    primaryGoal?: ProjectGoal;
    confirmedContext?: JsonInput;
  }): Promise<OnboardingProfile> {
    return prisma.onboardingProfile.upsert({
      where: { projectId: data.projectId },
      update: {
        confirmedContext: data.confirmedContext || undefined,
        version: { increment: 1 },
      },
      create: {
        projectId: data.projectId,
        projectName: data.projectName,
        primaryGoal: data.primaryGoal || 'seo_aeo',
        confirmedContext: data.confirmedContext || { brandName: data.projectName },
        rights: {
          creatorName: '',
          copyrightTemplate: '',
          creditTemplate: '',
        },
        preferences: {
          primaryLanguage: 'en',
          keywordStyle: 'mixed',
          maxKeywords: 25,
          locationBehavior: 'strict',
          overwriteOriginals: false,
          includeReasoning: true,
          outputFormat: 'copy',
        },
      },
    });
  },
};

// ============================================
// Asset Repository
// ============================================

export const assetRepository = {
  async findById(id: string): Promise<Asset | null> {
    return prisma.asset.findUnique({ where: { id } });
  },
  
  async findByIdWithResults(id: string) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        visionResults: { orderBy: { createdAt: 'desc' }, take: 1 },
        metadataResults: { orderBy: { createdAt: 'desc' }, take: 1 },
        embedResults: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  },
  
  async findByProject(projectId: string, status?: AssetStatus): Promise<Asset[]> {
    return prisma.asset.findMany({
      where: { projectId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async findByHash(projectId: string, hash: string): Promise<Asset | null> {
    return prisma.asset.findFirst({ where: { projectId, hash } });
  },
  
  async create(data: {
    projectId: string;
    filename: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    hash: string;
    storagePath: string;
    width?: number;
    height?: number;
  }): Promise<Asset> {
    return prisma.asset.create({ data });
  },
  
  async update(id: string, data: Partial<{
    status: AssetStatus;
    thumbnailPath: string;
    previewPath: string;
    analysisPath: string;
    userComment: string;
    width: number;
    height: number;
  }>): Promise<Asset> {
    return prisma.asset.update({ where: { id }, data });
  },
  
  async delete(id: string): Promise<void> {
    await prisma.asset.delete({ where: { id } });
  },
  
  async countByProject(projectId: string): Promise<number> {
    return prisma.asset.count({ where: { projectId } });
  },
  
  async countByStatus(projectId: string): Promise<Record<AssetStatus, number>> {
    const counts = await prisma.asset.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { status: true },
    });
    
    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.status] = c._count.status;
    }
    return result as Record<AssetStatus, number>;
  },
};

// ============================================
// Job Repository
// ============================================

export const jobRepository = {
  async findById(id: string): Promise<Job | null> {
    return prisma.job.findUnique({ where: { id } });
  },
  
  async findPending(limit: number = 10): Promise<Job[]> {
    return prisma.job.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },
  
  async findByProject(projectId: string, status?: JobStatus): Promise<Job[]> {
    return prisma.job.findMany({
      where: { projectId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async findByAsset(assetId: string): Promise<Job[]> {
    return prisma.job.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async create(data: {
    projectId: string;
    assetId?: string;
    type: JobType;
    metadata?: JsonInput;
  }): Promise<Job> {
    return prisma.job.create({ data });
  },
  
  async createMany(data: Array<{
    projectId: string;
    assetId?: string;
    type: JobType;
    metadata?: JsonInput;
  }>): Promise<number> {
    const result = await prisma.job.createMany({ data });
    return result.count;
  },
  
  async update(id: string, data: Partial<{
    status: JobStatus;
    progress: number;
    error: string;
    startedAt: Date;
    completedAt: Date;
  }>): Promise<Job> {
    return prisma.job.update({ where: { id }, data });
  },
  
  async markStarted(id: string): Promise<Job> {
    return prisma.job.update({
      where: { id },
      data: { status: 'running', startedAt: new Date() },
    });
  },
  
  async markCompleted(id: string): Promise<Job> {
    return prisma.job.update({
      where: { id },
      data: { status: 'completed', progress: 100, completedAt: new Date() },
    });
  },
  
  async markFailed(id: string, error: string): Promise<Job> {
    return prisma.job.update({
      where: { id },
      data: { status: 'failed', error, completedAt: new Date() },
    });
  },
};

// ============================================
// Vision Result Repository
// ============================================

export const visionResultRepository = {
  async findByAsset(assetId: string): Promise<VisionResult[]> {
    return prisma.visionResult.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async findLatestByAsset(assetId: string): Promise<VisionResult | null> {
    return prisma.visionResult.findFirst({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async create(data: {
    assetId: string;
    modelId: string;
    promptVersion: string;
    inputHash: string;
    result: JsonInput;
    tokensUsed: number;
    processingTimeMs: number;
  }): Promise<VisionResult> {
    return prisma.visionResult.create({ data });
  },
};

// ============================================
// Metadata Result Repository
// ============================================

export const metadataResultRepository = {
  async findByAsset(assetId: string): Promise<MetadataResult[]> {
    return prisma.metadataResult.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async findLatestByAsset(assetId: string): Promise<MetadataResult | null> {
    return prisma.metadataResult.findFirst({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async create(data: {
    assetId: string;
    visionResultId: string;
    onboardingProfileId: string;
    modelId: string;
    promptVersion: string;
    inputHash: string;
    result: JsonInput;
    tokensUsed: number;
    processingTimeMs: number;
  }): Promise<MetadataResult> {
    return prisma.metadataResult.create({ data });
  },

  async update(id: string, data: { result?: JsonInput }): Promise<MetadataResult> {
    return prisma.metadataResult.update({ where: { id }, data });
  },
};

// ============================================
// Embed Result Repository
// ============================================

export const embedResultRepository = {
  async findByAsset(assetId: string): Promise<EmbedResult[]> {
    return prisma.embedResult.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async findLatestByAsset(assetId: string): Promise<EmbedResult | null> {
    return prisma.embedResult.findFirst({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async create(data: {
    assetId: string;
    metadataResultId: string;
    embeddedPath: string;
    embeddedStorageUrl?: string | null;
    fieldsWritten: string[];
    exiftoolLogs: string;
    verified: boolean;
    verificationDetails?: JsonInput;
  }): Promise<EmbedResult> {
    return prisma.embedResult.create({ data });
  },
};

// ============================================
// Export Repository
// ============================================

export const exportRepository = {
  async findById(id: string): Promise<Export | null> {
    return prisma.export.findUnique({
      where: { id },
      include: { exportAssets: { include: { asset: true } } },
    });
  },
  
  async findByProject(projectId: string): Promise<Export[]> {
    return prisma.export.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async create(data: {
    projectId: string;
    destinationType: 'download' | 'folder' | 'cloud';
    assetIds: string[];
    destinationConfig?: JsonInput;
  }): Promise<Export> {
    return prisma.export.create({
      data: {
        projectId: data.projectId,
        destinationType: data.destinationType,
        destinationConfig: data.destinationConfig,
        exportAssets: {
          create: data.assetIds.map(assetId => ({ assetId })),
        },
      },
      include: { exportAssets: true },
    });
  },
  
  async update(id: string, data: Partial<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    outputPath: string;
    error: string;
    completedAt: Date;
  }>): Promise<Export> {
    return prisma.export.update({ where: { id }, data });
  },
};

// ============================================
// Growth Image Repository
// ============================================

export const growthImageRepository = {
  async findById(id: string) {
    return prisma.growthImage.findUnique({ where: { id } });
  },
  
  async findByProject(projectId: string) {
    return prisma.growthImage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  async create(data: {
    projectId: string;
    filename: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    storagePath: string;
    role?: 'proof' | 'hero' | 'decorative' | 'stock';
  }) {
    return prisma.growthImage.create({ data });
  },
  
  async updateRole(id: string, role: 'proof' | 'hero' | 'decorative' | 'stock', reason: string) {
    const image = await prisma.growthImage.findUnique({ where: { id } });
    if (!image) throw new Error('Image not found');
    
    const decisionLog = (image.decisionLog as any[]) || [];
    decisionLog.push({
      ts: new Date().toISOString(),
      action: 'role_change',
      previousRole: image.role,
      newRole: role,
      reason,
    });
    
    return prisma.growthImage.update({
      where: { id },
      data: { 
        role,
        decisionLog,
        governanceStatus: 'pending', // Reset governance for re-evaluation
      },
    });
  },
  
  async updateGovernance(id: string, data: {
    governanceStatus: 'pending' | 'approved' | 'blocked' | 'warning';
    governanceReason?: string;
    aiGenerated?: boolean;
    aiConfidence?: number;
    aiDetectionModel?: string;
  }) {
    const image = await prisma.growthImage.findUnique({ where: { id } });
    if (!image) throw new Error('Image not found');
    
    const decisionLog = (image.decisionLog as any[]) || [];
    decisionLog.push({
      ts: new Date().toISOString(),
      action: 'governance_decision',
      status: data.governanceStatus,
      reason: data.governanceReason,
      aiGenerated: data.aiGenerated,
      aiConfidence: data.aiConfidence,
    });
    
    return prisma.growthImage.update({
      where: { id },
      data: {
        ...data,
        decisionLog,
      },
    });
  },
  
  async delete(id: string) {
    await prisma.growthImage.delete({ where: { id } });
  },
};

// ============================================
// Authorship Integrity Engine — CE Image Repository
// ============================================

export const ceImageRepository = {
  async findById(id: string) {
    return prisma.ceImage.findUnique({ where: { id } });
  },

  async findByAssetId(assetId: string) {
    return prisma.ceImage.findUnique({ where: { assetId } });
  },

  async findByProject(projectId: string) {
    return prisma.ceImage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByUser(userId: string) {
    return prisma.ceImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async upsertByAssetId(data: {
    assetId: string;
    userId: string;
    projectId?: string;
    sha256: string;
    sourceType?: string;
    authorshipStatus: 'VERIFIED_ORIGINAL' | 'DECLARED_BY_USER' | 'UNVERIFIED' | 'SYNTHETIC_AI';
    authorshipEvidence: any;
    userDeclared: boolean;
    syntheticConfidence?: number;
    classifiedBy?: string;
  }) {
    const { assetId, ...rest } = data;
    return prisma.ceImage.upsert({
      where: { assetId },
      create: {
        assetId,
        ...rest,
        classifiedAt: new Date(),
      },
      update: {
        ...rest,
        classifiedAt: new Date(),
      },
    });
  },

  async updateAuthorshipStatus(id: string, data: {
    authorshipStatus: 'VERIFIED_ORIGINAL' | 'DECLARED_BY_USER' | 'UNVERIFIED' | 'SYNTHETIC_AI';
    authorshipEvidence: any;
    userDeclared: boolean;
    classifiedBy?: string;
  }) {
    return prisma.ceImage.update({
      where: { id },
      data: {
        ...data,
        classifiedAt: new Date(),
      },
    });
  },
};

// ============================================
// Authorship Integrity Engine — CE Export Repository
// ============================================

export const ceExportRepository = {
  async findById(id: string) {
    return prisma.ceExport.findUnique({ where: { id } });
  },

  async findByProject(projectId: string) {
    return prisma.ceExport.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    userId: string;
    projectId?: string;
    exportType: string;
    payloadHash?: string;
  }) {
    return prisma.ceExport.create({ data });
  },

  async updateStatus(id: string, data: {
    status: string;
    reasonCodes?: string[];
    resultRefs?: any;
  }) {
    return prisma.ceExport.update({
      where: { id },
      data,
    });
  },
};

// ============================================
// Authorship Integrity Engine — CE Event Log Repository
// ============================================

export const ceEventLogRepository = {
  async create(data: {
    userId: string;
    projectId?: string;
    imageId?: string;
    exportId?: string;
    eventType: string;
    details?: any;
  }) {
    return prisma.ceEventLog.create({
      data: {
        ...data,
        details: data.details || {},
      },
    });
  },

  async findByImage(imageId: string, limit = 50) {
    return prisma.ceEventLog.findMany({
      where: { imageId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findByExport(exportId: string, limit = 50) {
    return prisma.ceEventLog.findMany({
      where: { exportId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findByProject(projectId: string, limit = 100) {
    return prisma.ceEventLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findByUser(userId: string, limit = 100) {
    return prisma.ceEventLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /** Get recent events with optional event type filtering */
  async findRecentByUser(userId: string, options?: {
    limit?: number;
    eventTypes?: string[];
  }) {
    const { limit = 50, eventTypes } = options ?? {};
    return prisma.ceEventLog.findMany({
      where: {
        userId,
        ...(eventTypes?.length ? { eventType: { in: eventTypes } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /** Get last error event for a user */
  async findLastError(userId: string) {
    return prisma.ceEventLog.findFirst({
      where: {
        userId,
        eventType: { contains: 'error' },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Get last action for a user (non-error events) */
  async findLastAction(userId: string) {
    return prisma.ceEventLog.findFirst({
      where: {
        userId,
        NOT: { eventType: { contains: 'error' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};

// ============================================
// WordPress Config Repository
// ============================================

export const wordpressConfigRepository = {
  async findByProjectId(projectId: string) {
    return prisma.wordPressConfig.findUnique({
      where: { projectId },
    });
  },

  async upsert(
    projectId: string,
    data: {
      siteUrl: string;
      authMethod?: string;
      username: string;
      encryptedPassword: string;
      autoInjectAltText?: boolean;
      altStrategy?: string;
    },
  ) {
    return prisma.wordPressConfig.upsert({
      where: { projectId },
      create: {
        projectId,
        siteUrl: data.siteUrl,
        authMethod: data.authMethod || 'application_password',
        username: data.username,
        encryptedPassword: data.encryptedPassword,
        autoInjectAltText: data.autoInjectAltText ?? true,
        altStrategy: data.altStrategy || 'seo_optimized',
      },
      update: {
        siteUrl: data.siteUrl,
        authMethod: data.authMethod || 'application_password',
        username: data.username,
        encryptedPassword: data.encryptedPassword,
        autoInjectAltText: data.autoInjectAltText ?? true,
        altStrategy: data.altStrategy || 'seo_optimized',
      },
    });
  },

  async updateToggle(projectId: string, autoInjectAltText: boolean) {
    return prisma.wordPressConfig.update({
      where: { projectId },
      data: { autoInjectAltText },
    });
  },

  async updateStrategy(projectId: string, altStrategy: string) {
    return prisma.wordPressConfig.update({
      where: { projectId },
      data: { altStrategy },
    });
  },

  async updateHealthStatus(projectId: string, healthy: boolean, error?: string) {
    return prisma.wordPressConfig.update({
      where: { projectId },
      data: {
        lastHealthCheck: new Date(),
        lastHealthStatus: healthy,
        lastError: error || null,
      },
    });
  },

  async delete(projectId: string) {
    return prisma.wordPressConfig.delete({
      where: { projectId },
    });
  },
};

// ============================================
// SURVIVAL LAB Repositories
// ============================================

export const survivalPlatformRepository = {
  async findAll() {
    return prisma.survivalPlatform.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.survivalPlatform.findUnique({ where: { id } });
  },

  async findBySlug(slug: string) {
    return prisma.survivalPlatform.findUnique({ where: { slug } });
  },

  async upsert(data: { slug: string; name: string; category: string; freeTier: boolean; notes?: string }) {
    return prisma.survivalPlatform.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });
  },
};

export const survivalBaselineRepository = {
  async findByUser(userId: string) {
    return prisma.survivalBaselineImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.survivalBaselineImage.findUnique({ where: { id } });
  },

  async findByIdWithReports(id: string) {
    return prisma.survivalBaselineImage.findUnique({
      where: { id },
      include: { metadataReports: { where: { fileKind: 'baseline' } } },
    });
  },

  async create(data: {
    userId: string;
    label: string;
    originalFilename: string;
    storagePath: string;
    sha256: string;
    bytes: bigint;
    width: number;
    height: number;
  }) {
    return prisma.survivalBaselineImage.create({ data });
  },

  async delete(id: string) {
    return prisma.survivalBaselineImage.delete({ where: { id } });
  },
};

export const survivalTestRunRepository = {
  async findByUser(userId: string) {
    return prisma.survivalTestRun.findMany({
      where: { userId },
      include: { platform: true, assets: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.survivalTestRun.findUnique({
      where: { id },
      include: { platform: true, assets: { include: { baselineImage: true } }, uploads: true },
    });
  },

  async findByIdWithResults(id: string) {
    return prisma.survivalTestRun.findUnique({
      where: { id },
      include: {
        platform: true,
        assets: {
          include: {
            baselineImage: {
              include: { metadataReports: { where: { fileKind: 'baseline' } } },
            },
          },
        },
        uploads: {
          include: {
            baselineImage: true,
            metadataReports: { where: { fileKind: 'scenario' } },
            comparisons: true,
          },
        },
      },
    });
  },

  async create(data: {
    userId: string;
    platformId: string;
    title: string;
    accountType?: string;
    status?: string;
  }) {
    return prisma.survivalTestRun.create({ data });
  },

  async updateStatus(id: string, status: string) {
    return prisma.survivalTestRun.update({ where: { id }, data: { status } });
  },

  async delete(id: string) {
    return prisma.survivalTestRun.delete({ where: { id } });
  },
};

export const survivalTestRunAssetRepository = {
  async attach(testRunId: string, baselineImageIds: string[]) {
    const data = baselineImageIds.map(baselineImageId => ({
      testRunId,
      baselineImageId,
    }));
    return prisma.survivalTestRunAsset.createMany({
      data,
      skipDuplicates: true,
    });
  },

  async detach(testRunId: string, baselineImageId: string) {
    return prisma.survivalTestRunAsset.delete({
      where: { testRunId_baselineImageId: { testRunId, baselineImageId } },
    });
  },
};

export const survivalScenarioUploadRepository = {
  async findByTestRun(testRunId: string) {
    return prisma.survivalScenarioUpload.findMany({
      where: { testRunId },
      include: { baselineImage: true, metadataReports: true, comparisons: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.survivalScenarioUpload.findUnique({
      where: { id },
      include: { baselineImage: true, metadataReports: true, comparisons: true },
    });
  },

  async create(data: {
    testRunId: string;
    baselineImageId: string;
    scenario: string;
    originalFilename: string;
    storagePath: string;
    sha256: string;
    bytes: bigint;
    width: number;
    height: number;
  }) {
    return prisma.survivalScenarioUpload.create({ data });
  },
};

export const survivalMetadataReportRepository = {
  async findByBaseline(baselineImageId: string) {
    return prisma.survivalMetadataReport.findMany({
      where: { baselineImageId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    fileKind: string;
    baselineImageId: string;
    scenarioUploadId?: string;
    exifPresent: boolean;
    xmpPresent: boolean;
    iptcPresent: boolean;
    creatorValue?: string;
    rightsValue?: string;
    creditValue?: string;
    descriptionValue?: string;
    encodingOk?: boolean;
    notes?: string;
    rawJson?: object;
  }) {
    return prisma.survivalMetadataReport.create({
      data: {
        ...data,
        rawJson: data.rawJson ?? {},
      },
    });
  },
};

export const survivalComparisonRepository = {
  async findByScenarioUpload(scenarioUploadId: string) {
    return prisma.survivalComparison.findUnique({
      where: { scenarioUploadId },
    });
  },

  async findByTestRun(testRunId: string) {
    return prisma.survivalComparison.findMany({
      where: { scenarioUpload: { testRunId } },
      include: { baselineImage: true, scenarioUpload: true },
    });
  },

  async create(data: {
    baselineImageId: string;
    scenarioUploadId: string;
    survivalScore: number;
    creatorOk: boolean;
    rightsOk: boolean;
    creditOk: boolean;
    descriptionOk: boolean;
    dimsChanged: boolean;
    filenameChanged: boolean;
    fieldsMissing?: string[];
    scoreV2?: number;
    survivalClass?: string;
    diffReport?: object;
  }) {
    return prisma.survivalComparison.create({
      data: {
        ...data,
        fieldsMissing: data.fieldsMissing ?? [],
        diffReport: data.diffReport ?? undefined,
      },
    });
  },
};

// ============================================
// Survival Lab — Platform Stats & Trends
// ============================================

export const survivalPlatformStatsRepository = {
  async findByPlatformId(platformId: string) {
    return prisma.survivalPlatformStats.findUnique({
      where: { platformId },
    });
  },

  async findAll() {
    return prisma.survivalPlatformStats.findMany({
      include: { platform: true },
      orderBy: { avgScoreV2: 'desc' },
    });
  },

  async upsert(platformId: string, data: {
    totalRuns: number;
    totalScenarios: number;
    avgScore: number;
    avgScoreV2: number;
    bestScore: number;
    worstScore: number;
    exifRetention: number;
    xmpRetention: number;
    iptcRetention: number;
    creatorSurvived: number;
    creatorTotal: number;
    copyrightSurvived: number;
    copyrightTotal: number;
    creditSurvived: number;
    creditTotal: number;
    descSurvived: number;
    descTotal: number;
  }) {
    return prisma.survivalPlatformStats.upsert({
      where: { platformId },
      create: { platformId, ...data },
      update: data,
    });
  },
};

export const survivalPlatformTrendRepository = {
  async findByPlatform(platformId: string, limit = 100) {
    return prisma.survivalPlatformTrend.findMany({
      where: { platformId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async create(data: {
    platformId: string;
    scenarioUploadId: string;
    score: number;
    scoreV2?: number;
    survivalClass?: string;
    scenario: string;
  }) {
    return prisma.survivalPlatformTrend.create({ data });
  },
};

// ============================================
// Support Operator — Ticket Repository
// ============================================

export const ceSupportTicketRepository = {
  async create(data: {
    userId: string;
    category?: string;
    userMessage: string;
    matchedPlaybook?: string;
    contextSnapshot?: any;
    environment?: any;
  }) {
    return prisma.ceSupportTicket.create({
      data: {
        ...data,
        contextSnapshot: data.contextSnapshot ?? {},
        environment: data.environment ?? {},
      },
    });
  },

  async findByUser(userId: string, limit = 20) {
    return prisma.ceSupportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findById(id: string) {
    return prisma.ceSupportTicket.findUnique({
      where: { id },
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.ceSupportTicket.update({
      where: { id },
      data: { status },
    });
  },
};

// ============================================
// Workspace Repository
// ============================================

export const workspaceRepository = {
  async findById(id: string) {
    return prisma.workspace.findUnique({
      where: { id },
      include: {
        subscription: true,
        members: true,
      },
    });
  },

  async findByOwnerId(userId: string) {
    return prisma.workspace.findFirst({
      where: { ownerUserId: userId },
      include: {
        subscription: true,
        members: true,
      },
    });
  },

  async findByMemberId(userId: string) {
    return prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        subscription: true,
        members: true,
      },
    });
  },

  async create(data: { ownerUserId: string; name?: string }) {
    return prisma.workspace.create({
      data: {
        ownerUserId: data.ownerUserId,
        name: data.name || 'My Workspace',
        members: {
          create: {
            userId: data.ownerUserId,
            role: 'owner',
          },
        },
        subscription: {
          create: {
            plan: 'free',
            status: 'inactive',
          },
        },
      },
      include: {
        subscription: true,
        members: true,
      },
    });
  },

  async addMember(workspaceId: string, userId: string, role: 'admin' | 'member' = 'member') {
    return prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role,
      },
    });
  },

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    return Boolean(member);
  },

  async getMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    return member?.role ?? null;
  },
};

// ============================================
// Subscription Repository
// ============================================

export const subscriptionRepository = {
  async findByWorkspaceId(workspaceId: string) {
    return prisma.subscription.findUnique({
      where: { workspaceId },
    });
  },

  async findByStripeCustomerId(stripeCustomerId: string) {
    return prisma.subscription.findFirst({
      where: { stripeCustomerId },
    });
  },

  async findByStripeSubscriptionId(stripeSubscriptionId: string) {
    return prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
    });
  },

  async update(workspaceId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status?: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
    plan?: 'free' | 'pro' | 'agency';
    currentPeriodEnd?: Date | null;
  }) {
    return prisma.subscription.update({
      where: { workspaceId },
      data,
    });
  },

  async upsert(workspaceId: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status?: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
    plan?: 'free' | 'pro' | 'agency';
    currentPeriodEnd?: Date | null;
  }) {
    return prisma.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        ...data,
      },
      update: data,
    });
  },
};

// ============================================
// Domain Usage Repository
// ============================================

export const domainUsageRepository = {
  async findByWorkspaceAndDomain(workspaceId: string, registrableDomain: string) {
    return prisma.domainUsage.findUnique({
      where: {
        workspaceId_registrableDomain: { workspaceId, registrableDomain },
      },
    });
  },

  async findByWorkspace(workspaceId: string) {
    return prisma.domainUsage.findMany({
      where: { workspaceId },
      orderBy: { lastSeenAt: 'desc' },
    });
  },

  async upsert(workspaceId: string, userId: string, registrableDomain: string) {
    return prisma.domainUsage.upsert({
      where: {
        workspaceId_registrableDomain: { workspaceId, registrableDomain },
      },
      create: {
        workspaceId,
        userId,
        registrableDomain,
        freeUsesConsumed: 0,
      },
      update: {
        lastSeenAt: new Date(),
      },
    });
  },

  async incrementUsage(workspaceId: string, registrableDomain: string, data?: {
    lastIpHash?: string;
    lastDeviceId?: string;
  }) {
    return prisma.domainUsage.update({
      where: {
        workspaceId_registrableDomain: { workspaceId, registrableDomain },
      },
      data: {
        freeUsesConsumed: { increment: 1 },
        lastSeenAt: new Date(),
        lastIpHash: data?.lastIpHash,
        lastDeviceId: data?.lastDeviceId,
      },
    });
  },

  async setStatus(workspaceId: string, registrableDomain: string, status: 'active' | 'throttled' | 'blocked', reason?: string) {
    return prisma.domainUsage.update({
      where: {
        workspaceId_registrableDomain: { workspaceId, registrableDomain },
      },
      data: {
        status,
        blockReason: reason,
      },
    });
  },
};

// ============================================
// Usage Events Repository
// ============================================

export const usageEventRepository = {
  async create(data: {
    workspaceId: string;
    userId: string;
    projectId?: string;
    action: 'run_ce' | 'export' | 'web_pack' | 'survival';
    registrableDomain?: string;
    imagesCount?: number;
    bytesTotal?: bigint;
    success?: boolean;
    errorCode?: string;
  }) {
    return prisma.usageEvent.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        projectId: data.projectId,
        action: data.action,
        registrableDomain: data.registrableDomain,
        imagesCount: data.imagesCount,
        bytesTotal: data.bytesTotal,
        success: data.success ?? false,
        errorCode: data.errorCode,
      },
    });
  },

  async markSuccess(id: string) {
    return prisma.usageEvent.update({
      where: { id },
      data: { success: true },
    });
  },

  async findByWorkspace(workspaceId: string, limit = 100) {
    return prisma.usageEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async findByProject(projectId: string, limit = 100) {
    return prisma.usageEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async countByActionInPeriod(workspaceId: string, action: 'run_ce' | 'export' | 'web_pack' | 'survival', since: Date) {
    return prisma.usageEvent.count({
      where: {
        workspaceId,
        action,
        success: true,
        createdAt: { gte: since },
      },
    });
  },
};
