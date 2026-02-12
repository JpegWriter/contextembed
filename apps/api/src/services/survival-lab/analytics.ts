/**
 * Survival Lab — Analytics Service
 *
 * Aggregates comparison data into platform-level stats and trends.
 * Called after each scenario upload to keep stats current.
 *
 * DESIGN RULES:
 *   1.  Idempotent — re-running updatePlatformStats produces same result.
 *   2.  Non-blocking — errors in analytics never fail the upload.
 *   3.  Uses raw SQL aggregation for accuracy.
 */

import { prisma } from '@contextembed/db';
import {
  survivalPlatformStatsRepository,
  survivalPlatformTrendRepository,
  survivalComparisonRepository,
} from '@contextembed/db';

// ─── Types ─────────────────────────────────────────────────────

export interface PlatformAnalyticsSummary {
  platformId: string;
  platformSlug: string;
  platformName: string;
  platformCategory: string;
  totalRuns: number;
  totalScenarios: number;
  avgScore: number;
  avgScoreV2: number;
  bestScore: number;
  worstScore: number;
  exifRetention: number;
  xmpRetention: number;
  iptcRetention: number;
  fieldSurvival: {
    creator: { survived: number; total: number; rate: number };
    copyright: { survived: number; total: number; rate: number };
    credit: { survived: number; total: number; rate: number };
    description: { survived: number; total: number; rate: number };
  };
}

export interface AnalyticsDashboardData {
  totalPlatforms: number;
  totalRuns: number;
  totalScenarios: number;
  globalAvgScore: number;
  globalAvgScoreV2: number;
  platforms: PlatformAnalyticsSummary[];
}

export interface TrendPoint {
  id: string;
  score: number;
  scoreV2: number | null;
  survivalClass: string | null;
  scenario: string;
  createdAt: string;
}

// ─── Update Stats After Scenario Upload ───────────────────────

/**
 * Recompute the aggregated stats for a specific platform.
 * Should be called after every scenario upload for that platform's test run.
 */
export async function updatePlatformStats(platformId: string): Promise<void> {
  try {
    // Get all comparisons for this platform via test runs
    const comparisons = await prisma.survivalComparison.findMany({
      where: {
        scenarioUpload: {
          testRun: { platformId },
        },
      },
      select: {
        survivalScore: true,
        scoreV2: true,
        creatorOk: true,
        rightsOk: true,
        creditOk: true,
        descriptionOk: true,
      },
    });

    if (comparisons.length === 0) return;

    // Count distinct test runs
    const runCount = await prisma.survivalTestRun.count({
      where: { platformId },
    });

    // Aggregate scores
    const scores = comparisons.map(c => c.survivalScore);
    const scoresV2 = comparisons.map(c => c.scoreV2).filter((s): s is number => s !== null);

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const avgScoreV2 = scoresV2.length > 0
      ? scoresV2.reduce((a, b) => a + b, 0) / scoresV2.length
      : 0;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    // Container retention — use scenario upload metadata reports
    const scenarioReports = await prisma.survivalMetadataReport.findMany({
      where: {
        fileKind: 'scenario',
        scenarioUpload: {
          testRun: { platformId },
        },
      },
      select: {
        exifPresent: true,
        xmpPresent: true,
        iptcPresent: true,
        baselineImageId: true,
      },
    });

    const baselineReports = await prisma.survivalMetadataReport.findMany({
      where: {
        fileKind: 'baseline',
        baselineImage: {
          testRunAssets: {
            some: { testRun: { platformId } },
          },
        },
      },
      select: {
        exifPresent: true,
        xmpPresent: true,
        iptcPresent: true,
        baselineImageId: true,
      },
    });

    // Build baseline presence map
    const baselinePresence = new Map<string, { exif: boolean; xmp: boolean; iptc: boolean }>();
    for (const br of baselineReports) {
      baselinePresence.set(br.baselineImageId, {
        exif: br.exifPresent,
        xmp: br.xmpPresent,
        iptc: br.iptcPresent,
      });
    }

    // Calculate container retention
    let exifTotal = 0, exifSurvived = 0;
    let xmpTotal = 0, xmpSurvived = 0;
    let iptcTotal = 0, iptcSurvived = 0;

    for (const sr of scenarioReports) {
      const bl = baselinePresence.get(sr.baselineImageId);
      if (!bl) continue;

      if (bl.exif) { exifTotal++; if (sr.exifPresent) exifSurvived++; }
      if (bl.xmp) { xmpTotal++; if (sr.xmpPresent) xmpSurvived++; }
      if (bl.iptc) { iptcTotal++; if (sr.iptcPresent) iptcSurvived++; }
    }

    // Field survival
    const total = comparisons.length;
    const creatorSurvived = comparisons.filter(c => c.creatorOk).length;
    const copyrightSurvived = comparisons.filter(c => c.rightsOk).length;
    const creditSurvived = comparisons.filter(c => c.creditOk).length;
    const descSurvived = comparisons.filter(c => c.descriptionOk).length;

    await survivalPlatformStatsRepository.upsert(platformId, {
      totalRuns: runCount,
      totalScenarios: comparisons.length,
      avgScore: Math.round(avgScore * 10) / 10,
      avgScoreV2: Math.round(avgScoreV2 * 10) / 10,
      bestScore,
      worstScore,
      exifRetention: exifTotal > 0 ? Math.round((exifSurvived / exifTotal) * 100) / 100 : 0,
      xmpRetention: xmpTotal > 0 ? Math.round((xmpSurvived / xmpTotal) * 100) / 100 : 0,
      iptcRetention: iptcTotal > 0 ? Math.round((iptcSurvived / iptcTotal) * 100) / 100 : 0,
      creatorSurvived,
      creatorTotal: total,
      copyrightSurvived,
      copyrightTotal: total,
      creditSurvived,
      creditTotal: total,
      descSurvived,
      descTotal: total,
    });
  } catch (err) {
    console.error(`[Survival Analytics] Failed to update stats for platform ${platformId}:`, err);
    // Non-fatal — don't fail the upload
  }
}

/**
 * Record a trend point for the platform.
 */
export async function recordTrend(
  platformId: string,
  scenarioUploadId: string,
  score: number,
  scoreV2: number | undefined,
  survivalClass: string | undefined,
  scenario: string,
): Promise<void> {
  try {
    await survivalPlatformTrendRepository.create({
      platformId,
      scenarioUploadId,
      score,
      scoreV2,
      survivalClass,
      scenario,
    });
  } catch (err) {
    console.error(`[Survival Analytics] Failed to record trend:`, err);
  }
}

// ─── Dashboard Data ────────────────────────────────────────────

/**
 * Get the full analytics dashboard summary across all platforms.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsDashboardData> {
  const allStats = await prisma.survivalPlatformStats.findMany({
    include: { platform: true },
    orderBy: { avgScoreV2: 'desc' },
  });

  const platforms: PlatformAnalyticsSummary[] = allStats.map(s => ({
    platformId: s.platformId,
    platformSlug: s.platform.slug,
    platformName: s.platform.name,
    platformCategory: s.platform.category,
    totalRuns: s.totalRuns,
    totalScenarios: s.totalScenarios,
    avgScore: s.avgScore,
    avgScoreV2: s.avgScoreV2,
    bestScore: s.bestScore,
    worstScore: s.worstScore,
    exifRetention: s.exifRetention,
    xmpRetention: s.xmpRetention,
    iptcRetention: s.iptcRetention,
    fieldSurvival: {
      creator: {
        survived: s.creatorSurvived,
        total: s.creatorTotal,
        rate: s.creatorTotal > 0 ? s.creatorSurvived / s.creatorTotal : 0,
      },
      copyright: {
        survived: s.copyrightSurvived,
        total: s.copyrightTotal,
        rate: s.copyrightTotal > 0 ? s.copyrightSurvived / s.copyrightTotal : 0,
      },
      credit: {
        survived: s.creditSurvived,
        total: s.creditTotal,
        rate: s.creditTotal > 0 ? s.creditSurvived / s.creditTotal : 0,
      },
      description: {
        survived: s.descSurvived,
        total: s.descTotal,
        rate: s.descTotal > 0 ? s.descSurvived / s.descTotal : 0,
      },
    },
  }));

  const totalPlatforms = allStats.length;
  const totalRuns = allStats.reduce((sum: number, p) => sum + p.totalRuns, 0);
  const totalScenarios = allStats.reduce((sum: number, p) => sum + p.totalScenarios, 0);

  const globalAvgScore = totalScenarios > 0
    ? Math.round(
        allStats.reduce((sum: number, p) => sum + p.avgScore * p.totalScenarios, 0) / totalScenarios * 10,
      ) / 10
    : 0;

  const globalAvgScoreV2 = totalScenarios > 0
    ? Math.round(
        allStats.reduce((sum: number, p) => sum + p.avgScoreV2 * p.totalScenarios, 0) / totalScenarios * 10,
      ) / 10
    : 0;

  return {
    totalPlatforms,
    totalRuns,
    totalScenarios,
    globalAvgScore,
    globalAvgScoreV2,
    platforms,
  };
}

/**
 * Get detailed analytics for a single platform including trend data.
 */
export async function getPlatformAnalytics(
  platformSlug: string,
): Promise<{ summary: PlatformAnalyticsSummary | null; trends: TrendPoint[] }> {
  const platform = await prisma.survivalPlatform.findUnique({
    where: { slug: platformSlug },
  });

  if (!platform) return { summary: null, trends: [] };

  const stats = await survivalPlatformStatsRepository.findByPlatformId(platform.id);
  const rawTrends = await survivalPlatformTrendRepository.findByPlatform(platform.id, 200);

  const summary: PlatformAnalyticsSummary | null = stats
    ? {
        platformId: stats.platformId,
        platformSlug: platform.slug,
        platformName: platform.name,
        platformCategory: platform.category,
        totalRuns: stats.totalRuns,
        totalScenarios: stats.totalScenarios,
        avgScore: stats.avgScore,
        avgScoreV2: stats.avgScoreV2,
        bestScore: stats.bestScore,
        worstScore: stats.worstScore,
        exifRetention: stats.exifRetention,
        xmpRetention: stats.xmpRetention,
        iptcRetention: stats.iptcRetention,
        fieldSurvival: {
          creator: {
            survived: stats.creatorSurvived,
            total: stats.creatorTotal,
            rate: stats.creatorTotal > 0 ? stats.creatorSurvived / stats.creatorTotal : 0,
          },
          copyright: {
            survived: stats.copyrightSurvived,
            total: stats.copyrightTotal,
            rate: stats.copyrightTotal > 0 ? stats.copyrightSurvived / stats.copyrightTotal : 0,
          },
          credit: {
            survived: stats.creditSurvived,
            total: stats.creditTotal,
            rate: stats.creditTotal > 0 ? stats.creditSurvived / stats.creditTotal : 0,
          },
          description: {
            survived: stats.descSurvived,
            total: stats.descTotal,
            rate: stats.descTotal > 0 ? stats.descSurvived / stats.descTotal : 0,
          },
        },
      }
    : null;

  const trends: TrendPoint[] = rawTrends.map(t => ({
    id: t.id,
    score: t.score,
    scoreV2: t.scoreV2,
    survivalClass: t.survivalClass,
    scenario: t.scenario,
    createdAt: t.createdAt.toISOString(),
  }));

  return { summary, trends };
}
