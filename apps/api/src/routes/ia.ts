/**
 * IA Admin API Routes
 * Handles plan import, validation, and export
 */

import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  parseIAPlan,
  validateIAPlan,
  runExtendedValidation,
  generateNextActions,
  analyzeLinkGraph,
  exportCalendarToCSV,
  exportPagesToCSV,
  exportLinkRulesToCSV,
  exportPlanSummary,
  exportSitemapEntries,
  planToRecords,
  IAPlan,
} from '@contextembed/core';
import { prisma, Prisma } from '@contextembed/db';

const router: RouterType = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Load plan from file
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultPlanPath(): string {
  // Navigate from apps/api to root
  return join(__dirname, '..', '..', '..', '..', 'data', 'ia', 'contextembed_ia_plan_v1.json');
}

function loadPlanFromFile(): { plan: IAPlan | null; error?: string } {
  const filePath = getDefaultPlanPath();
  
  if (!existsSync(filePath)) {
    return { plan: null, error: `Plan file not found at ${filePath}` };
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return { plan: data as IAPlan };
  } catch (error) {
    return { plan: null, error: error instanceof Error ? error.message : 'Failed to load plan' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia - Get current plan status and stats
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check if plan exists in file
    const { plan, error } = loadPlanFromFile();
    
    // Check database for imported plan
    const dbPlan = await prisma.iAPlan.findFirst({
      orderBy: { importedAt: 'desc' },
      include: {
        _count: {
          select: {
            pages: true,
            calendarItems: true,
            linkRules: true,
            mentionsPolicies: true,
          },
        },
      },
    });
    
    if (!plan) {
      return res.json({
        fileExists: false,
        fileError: error,
        dbPlan: dbPlan ? {
          id: dbPlan.id,
          version: dbPlan.version,
          productName: dbPlan.productName,
          coverageScore: dbPlan.coverageScore,
          importedAt: dbPlan.importedAt,
          counts: dbPlan._count,
        } : null,
      });
    }
    
    // Validate plan
    const validation = validateIAPlan(plan);
    const summary = exportPlanSummary(plan);
    
    return res.json({
      fileExists: true,
      filePath: getDefaultPlanPath(),
      summary,
      validation: {
        valid: validation.valid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        coverageScore: validation.coverageScore,
      },
      dbPlan: dbPlan ? {
        id: dbPlan.id,
        version: dbPlan.version,
        productName: dbPlan.productName,
        coverageScore: dbPlan.coverageScore,
        importedAt: dbPlan.importedAt,
        counts: dbPlan._count,
      } : null,
    });
  } catch (error) {
    console.error('Error getting IA status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/ia/validate - Full validation with details
// ─────────────────────────────────────────────────────────────────────────────

router.post('/validate', async (req: Request, res: Response) => {
  try {
    let plan: IAPlan;
    
    // Accept plan from body or load from file
    if (req.body && Object.keys(req.body).length > 0 && req.body.planVersion) {
      const parsed = parseIAPlan(JSON.stringify(req.body));
      if (!parsed.plan) {
        return res.status(400).json({
          valid: false,
          errors: parsed.validation.errors,
        });
      }
      plan = parsed.plan;
    } else {
      const { plan: filePlan, error } = loadPlanFromFile();
      if (!filePlan) {
        return res.status(404).json({ error: error || 'Plan not found' });
      }
      plan = filePlan;
    }
    
    // Run extended validation
    const validation = runExtendedValidation(plan);
    const linkAnalysis = analyzeLinkGraph(plan);
    const suggestions = generateNextActions(plan);
    
    return res.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      stats: validation.stats,
      coverageScore: validation.coverageScore,
      suggestions: [...validation.suggestions, ...suggestions],
      linkAnalysis: {
        orphanedPages: linkAnalysis.orphanedPages,
        highlyLinkedPages: linkAnalysis.highlyLinkedPages,
      },
    });
  } catch (error) {
    console.error('Error validating plan:', error);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/ia/import - Import plan to database
// ─────────────────────────────────────────────────────────────────────────────

router.post('/import', async (req: Request, res: Response) => {
  try {
    let plan: IAPlan;
    
    // Accept plan from body or load from file
    if (req.body && Object.keys(req.body).length > 0 && req.body.planVersion) {
      const parsed = parseIAPlan(JSON.stringify(req.body));
      if (!parsed.plan) {
        return res.status(400).json({
          success: false,
          errors: parsed.validation.errors,
        });
      }
      plan = parsed.plan;
    } else {
      const { plan: filePlan, error } = loadPlanFromFile();
      if (!filePlan) {
        return res.status(404).json({ error: error || 'Plan not found' });
      }
      plan = filePlan;
    }
    
    // Validate first
    const validation = validateIAPlan(plan);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
        message: 'Plan validation failed',
      });
    }
    
    // Convert to records
    const planId = `plan_${Date.now()}`;
    const records = planToRecords(plan, planId);
    
    // Transaction: Delete old plans and insert new
    // Note: After running `prisma generate`, you can type tx as Prisma.TransactionClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      // Delete existing plans (single active plan for now)
      await tx.iAMentionsPolicy.deleteMany({});
      await tx.iAInternalLinkRule.deleteMany({});
      await tx.iACalendarItem.deleteMany({});
      await tx.iAPage.deleteMany({});
      await tx.iAPlan.deleteMany({});
      
      // Create new plan
      const createdPlan = await tx.iAPlan.create({
        data: {
          version: records.planRecord.version,
          productName: records.planRecord.productName,
          oneLiner: records.planRecord.oneLiner,
          corePromise: records.planRecord.corePromise,
          differentiators: records.planRecord.differentiators,
          guardrails: records.planRecord.guardrails,
          cadenceConfig: records.planRecord.cadenceConfig,
          roleDefinitions: records.planRecord.roleDefinitions,
          brandMentionGoal: records.planRecord.brandMentionGoal,
          brandMentionRules: records.planRecord.brandMentionRules,
          allowedMentions: records.planRecord.allowedMentions,
          timezone: records.planRecord.timezone,
          startMonth: records.planRecord.startMonth,
          coverageScore: validation.coverageScore,
        },
      });
      
      // Create pages
      for (const page of records.pageRecords) {
        await tx.iAPage.create({
          data: {
            planId: createdPlan.id,
            pageId: page.pageId,
            role: page.role as any,
            title: page.title,
            slug: page.slug,
            primaryIntent: page.primaryIntent,
            cta: page.cta,
            goal: page.goal,
            supportingTopics: page.supportingTopics || [],
            moneyLinkTarget: page.moneyLinkTarget,
            internalLinksOut: page.internalLinksOut,
          },
        });
      }
      
      // Create calendar items
      for (const item of records.calendarRecords) {
        await tx.iACalendarItem.create({
          data: {
            planId: createdPlan.id,
            month: item.month,
            theme: item.theme,
            week: item.week,
            type: item.type as any,
            title: item.title,
            slug: item.slug,
            primaryLinks: item.primaryLinks,
            adobeMention: item.adobeMention,
            mentionNote: item.mentionNote,
          },
        });
      }
      
      // Create link rules
      for (const rule of records.linkRules) {
        await tx.iAInternalLinkRule.create({
          data: {
            planId: createdPlan.id,
            ruleType: rule.ruleType as any,
            sourcePageId: rule.sourcePageId,
            targetPageId: rule.targetPageId,
            required: rule.required,
            minLinks: rule.minLinks,
            description: rule.description,
          },
        });
      }
      
      // Create mentions policies
      for (const policy of records.mentionsPolicies) {
        await tx.iAMentionsPolicy.create({
          data: {
            planId: createdPlan.id,
            brand: policy.brand,
            maxPerMonth: policy.maxPerMonth,
            allowedContexts: policy.allowedContexts,
            rules: policy.rules,
          },
        });
      }
    });
    
    return res.json({
      success: true,
      message: 'Plan imported successfully',
      stats: {
        pages: records.pageRecords.length,
        calendarItems: records.calendarRecords.length,
        linkRules: records.linkRules.length,
        mentionsPolicies: records.mentionsPolicies.length,
        coverageScore: validation.coverageScore,
      },
    });
  } catch (error) {
    console.error('Error importing plan:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/pages - List all pages
// ─────────────────────────────────────────────────────────────────────────────

router.get('/pages', async (req: Request, res: Response) => {
  try {
    const { role, status } = req.query;
    
    const where: any = {};
    if (role) where.role = role;
    if (status) where.contentStatus = status;
    
    const pages = await prisma.iAPage.findMany({
      where,
      orderBy: [{ role: 'asc' }, { title: 'asc' }],
    });
    
    return res.json({ pages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/pages/:id - Get page details
// ─────────────────────────────────────────────────────────────────────────────

router.get('/pages/:id', async (req: Request, res: Response) => {
  try {
    const page = await prisma.iAPage.findUnique({
      where: { id: req.params.id },
    });
    
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    return res.json({ page });
  } catch (error) {
    console.error('Error fetching page:', error);
    return res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/ia/pages/:id - Update page
// ─────────────────────────────────────────────────────────────────────────────

router.put('/pages/:id', async (req: Request, res: Response) => {
  try {
    const { title, slug, contentStatus, draftPath, publishedUrl } = req.body;
    
    const page = await prisma.iAPage.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(contentStatus && { contentStatus }),
        ...(draftPath !== undefined && { draftPath }),
        ...(publishedUrl !== undefined && { publishedUrl }),
      },
    });
    
    return res.json({ page });
  } catch (error) {
    console.error('Error updating page:', error);
    return res.status(500).json({ error: 'Failed to update page' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/calendar - List calendar items
// ─────────────────────────────────────────────────────────────────────────────

router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const { month, type, status } = req.query;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, string> = {};
    if (typeof month === 'string') where.month = month;
    if (typeof type === 'string') where.type = type;
    if (typeof status === 'string') where.contentStatus = status;
    
    const items = await prisma.iACalendarItem.findMany({
      where,
      orderBy: [{ month: 'asc' }, { week: 'asc' }],
    });
    
    // Group by month
    const grouped: Record<string, { month: string; theme: string; items: typeof items }> = {};
    for (const item of items) {
      if (!grouped[item.month]) {
        grouped[item.month] = { month: item.month, theme: item.theme, items: [] };
      }
      grouped[item.month].items.push(item);
    }
    
    const months: string[] = [];
    for (const item of items) {
      if (!months.includes(item.month)) {
        months.push(item.month);
      }
    }
    
    return res.json({ 
      items,
      grouped: Object.values(grouped),
      months,
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/ia/calendar/:id - Update calendar item
// ─────────────────────────────────────────────────────────────────────────────

router.put('/calendar/:id', async (req: Request, res: Response) => {
  try {
    const { title, slug, contentStatus, draftPath, publishedUrl, publishedAt } = req.body;
    
    const item = await prisma.iACalendarItem.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(contentStatus && { contentStatus }),
        ...(draftPath !== undefined && { draftPath }),
        ...(publishedUrl !== undefined && { publishedUrl }),
        ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
      },
    });
    
    return res.json({ item });
  } catch (error) {
    console.error('Error updating calendar item:', error);
    return res.status(500).json({ error: 'Failed to update calendar item' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/link-rules - List link rules
// ─────────────────────────────────────────────────────────────────────────────

router.get('/link-rules', async (_req: Request, res: Response) => {
  try {
    const rules = await prisma.iAInternalLinkRule.findMany({
      orderBy: [{ ruleType: 'asc' }, { createdAt: 'asc' }],
    });
    
    return res.json({ rules });
  } catch (error) {
    console.error('Error fetching link rules:', error);
    return res.status(500).json({ error: 'Failed to fetch link rules' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/mentions-policies - List mentions policies
// ─────────────────────────────────────────────────────────────────────────────

router.get('/mentions-policies', async (_req: Request, res: Response) => {
  try {
    const policies = await prisma.iAMentionsPolicy.findMany({
      orderBy: { brand: 'asc' },
    });
    
    return res.json({ policies });
  } catch (error) {
    console.error('Error fetching mentions policies:', error);
    return res.status(500).json({ error: 'Failed to fetch mentions policies' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/export/calendar - Export calendar as CSV
// ─────────────────────────────────────────────────────────────────────────────

router.get('/export/calendar', async (_req: Request, res: Response) => {
  try {
    const { plan, error } = loadPlanFromFile();
    if (!plan) {
      return res.status(404).json({ error: error || 'Plan not found' });
    }
    
    const csv = exportCalendarToCSV(plan);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ia-calendar.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting calendar:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/export/pages - Export pages as CSV
// ─────────────────────────────────────────────────────────────────────────────

router.get('/export/pages', async (_req: Request, res: Response) => {
  try {
    const { plan, error } = loadPlanFromFile();
    if (!plan) {
      return res.status(404).json({ error: error || 'Plan not found' });
    }
    
    const csv = exportPagesToCSV(plan);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ia-pages.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting pages:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/export/link-rules - Export link rules as CSV
// ─────────────────────────────────────────────────────────────────────────────

router.get('/export/link-rules', async (_req: Request, res: Response) => {
  try {
    const { plan, error } = loadPlanFromFile();
    if (!plan) {
      return res.status(404).json({ error: error || 'Plan not found' });
    }
    
    const csv = exportLinkRulesToCSV(plan);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ia-link-rules.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting link rules:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia/sitemap - Get sitemap entries
// ─────────────────────────────────────────────────────────────────────────────

router.get('/sitemap', async (req: Request, res: Response) => {
  try {
    const { plan, error } = loadPlanFromFile();
    if (!plan) {
      return res.status(404).json({ error: error || 'Plan not found' });
    }
    
    const baseUrl = (req.query.baseUrl as string) || '';
    const entries = exportSitemapEntries(plan, baseUrl);
    
    return res.json({ entries });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return res.status(500).json({ error: 'Sitemap generation failed' });
  }
});

export default router;
