/**
 * Survival Lab — Evidence Pack Generator
 *
 * Builds a structured ZIP archive for a study session containing:
 *  - Baseline & scenario images (from Supabase Storage)
 *  - Metadata reports (JSON)
 *  - Comparison diffReports (JSON)
 *  - CSV summary
 *  - README.md with reproduction steps
 *
 * Design rules:
 *  - No path traversal in zip entry names
 *  - Non-fatal: errors on individual files skip the file, don't crash the pack
 *  - Streams where possible to keep memory footprint low
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import archiver from 'archiver';
import {
  survivalStudySessionRepository,
  survivalBaselineRepository,
  survivalScenarioUploadRepository,
  survivalComparisonRepository,
  survivalMetadataReportRepository,
  survivalTestRunRepository,
} from '@contextembed/db';
import { downloadToTempFile, uploadRawFile, getFileUrl, isStorageAvailable } from './storage';
import { deleteTempFile } from './metadata-extractor';

// ---- Types ----

export interface EvidencePackResult {
  signedUrl: string;
  storagePath: string;
  sizeBytes: number;
}

// ---- Helpers ----

/** Sanitise a string for use in a file/folder name */
function safeName(input: string): string {
  return input.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 120);
}

// ---- Main builder ----

export async function buildEvidencePack(
  sessionId: string,
  userId: string,
): Promise<EvidencePackResult> {
  // 1) Load session and validate ownership
  const session = await survivalStudySessionRepository.findById(userId, sessionId);
  if (!session) {
    throw new Error('Study session not found');
  }

  // 2) Load related data
  const scenarios = await survivalScenarioUploadRepository.findByStudySession(sessionId);
  const runs = await survivalTestRunRepository.findByStudySession(sessionId);

  // Load baselines used in this session
  const baselineImages = await Promise.all(
    session.baselineIds.map(async (id: string) => {
      const b = await survivalBaselineRepository.findByIdWithReports(id);
      return b;
    }),
  );
  const baselines = baselineImages.filter(Boolean);

  // 3) Create temp zip file
  const zipFilename = `study-session-${sessionId}.zip`;
  const zipPath = path.join(os.tmpdir(), zipFilename);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 6 } });

  const archiveComplete = new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);

  // 4) Add README
  const readmeContent = generateReadme(session, baselines, scenarios, runs);
  archive.append(readmeContent, { name: 'README.md' });

  // 5) Add baseline images + reports
  for (const baseline of baselines) {
    if (!baseline) continue;
    const prefix = `baselines/${safeName(baseline.label)}_${baseline.id.slice(0, 8)}`;

    // Download image file
    try {
      const tempFile = await downloadToTempFile(baseline.storagePath, baseline.originalFilename);
      if (tempFile) {
        archive.file(tempFile, { name: `${prefix}/${safeName(baseline.originalFilename)}` });
        // Note: temp file cleaned up after archive finalize
      }
    } catch {
      // Skip file if download fails
    }

    // Add metadata report JSON
    const reports = baseline.metadataReports ?? [];
    for (const report of reports) {
      if (report.fileKind === 'baseline') {
        archive.append(JSON.stringify(report, null, 2), {
          name: `${prefix}/metadata_report.json`,
        });
      }
    }
  }

  // 6) Add scenario uploads + metadata + comparisons
  for (const scenario of scenarios) {
    const platformName = scenario.testRun?.platform?.name ?? 'unknown';
    const prefix = `scenarios/${safeName(platformName)}/${safeName(scenario.scenarioType ?? scenario.scenario)}_${scenario.id.slice(0, 8)}`;

    // Download scenario image
    try {
      const tempFile = await downloadToTempFile(scenario.storagePath, scenario.originalFilename);
      if (tempFile) {
        archive.file(tempFile, { name: `${prefix}/${safeName(scenario.originalFilename)}` });
      }
    } catch {
      // Skip
    }

    // Scenario metadata report
    const scenarioReports = scenario.metadataReports ?? [];
    for (const report of scenarioReports) {
      archive.append(JSON.stringify(report, null, 2), {
        name: `${prefix}/metadata_report.json`,
      });
    }

    // Comparison diffReport
    const comparisons = scenario.comparisons ?? [];
    for (const comp of comparisons) {
      archive.append(
        JSON.stringify(
          {
            survivalScore: comp.survivalScore,
            scoreV2: comp.scoreV2,
            survivalClass: comp.survivalClass,
            creatorOk: comp.creatorOk,
            rightsOk: comp.rightsOk,
            creditOk: comp.creditOk,
            descriptionOk: comp.descriptionOk,
            dimsChanged: comp.dimsChanged,
            diffReport: comp.diffReport,
          },
          null,
          2,
        ),
        { name: `${prefix}/comparison.json` },
      );
    }
  }

  // 7) Add CSV summary
  const csvContent = generateCsv(baselines, scenarios);
  archive.append(csvContent, { name: 'summary.csv' });

  // 8) Add session manifest
  archive.append(
    JSON.stringify(
      {
        sessionId: session.id,
        title: session.title,
        status: session.status,
        currentStep: session.currentStep,
        baselineIds: session.baselineIds,
        platformSlugs: session.platformSlugs,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        totalBaselines: baselines.length,
        totalScenarios: scenarios.length,
        totalRuns: runs.length,
      },
      null,
      2,
    ),
    { name: 'session.json' },
  );

  // 9) Finalise archive
  await archive.finalize();
  await archiveComplete;

  const zipStats = await fs.promises.stat(zipPath);

  // 10) Upload zip to Supabase Storage
  const storagePath = `evidence-packs/${sessionId}/${zipFilename}`;

  try {
    if (isStorageAvailable()) {
      await uploadRawFile(zipPath, storagePath);
    }

    const signedUrl = await getFileUrl(storagePath, 7200); // 2 hour expiry

    return {
      signedUrl: signedUrl || '',
      storagePath,
      sizeBytes: zipStats.size,
    };
  } finally {
    // Clean up temp zip
    await deleteTempFile(zipPath).catch(() => {});
  }
}

// ---- README generator ----

function generateReadme(session: any, baselines: any[], scenarios: any[], runs: any[]): string {
  const now = new Date().toISOString();
  return `# ContextEmbed — Survival Lab Evidence Pack

## Study Session
- **ID:** ${session.id}
- **Title:** ${session.title}
- **Status:** ${session.status}
- **Current Step:** ${session.currentStep}
- **Generated:** ${now}

## Contents
- \`baselines/\` — CE-embedded baseline images with metadata reports
- \`scenarios/\` — Post-platform scenario uploads grouped by platform and type
- \`summary.csv\` — Tabular summary of all comparisons
- \`session.json\` — Full session manifest

## Baselines (${baselines.length})
${baselines.map((b: any) => `- ${b?.label ?? 'unknown'} — ${b?.originalFilename ?? 'unknown'} (SHA-256: ${b?.sha256?.slice(0, 16) ?? '?'}…)`).join('\n')}

## Platforms Tested
${session.platformSlugs?.map((s: string) => `- ${s}`).join('\n') || '(none specified)'}

## Scenario Types Uploaded (${scenarios.length})
${[...new Set(scenarios.map((s: any) => s.scenarioType || s.scenario))].map((t: unknown) => `- ${t}`).join('\n')}

## Reproduction Steps
1. Open ContextEmbed → Survival Lab → Guided Mode
2. Start a new Foundation Study session
3. Upload baselines listed above
4. For each platform, follow the step-by-step guided flow
5. Upload scenario files exactly as described in each step
6. Compare this evidence pack to your new results

## Integrity Notes
- All files are stored as raw binary — no re-encoding
- SHA-256 hashes are computed at upload time
- Metadata is extracted non-destructively with ExifTool
- Comparison scores use the v2 weighted canonical algorithm

---
*Generated by ContextEmbed Survival Lab v2*
`;
}

// ---- CSV generator ----

function generateCsv(baselines: any[], scenarios: any[]): string {
  const headers = [
    'platform',
    'scenario_type',
    'baseline_label',
    'baseline_sha256',
    'scenario_filename',
    'scenario_sha256',
    'bytes',
    'width',
    'height',
    'survival_score_v1',
    'score_v2',
    'survival_class',
    'creator_ok',
    'rights_ok',
    'credit_ok',
    'description_ok',
  ];

  const rows: string[][] = [];

  for (const scenario of scenarios) {
    const baseline = baselines.find((b: any) => b?.id === scenario.baselineImageId);
    const comparison = scenario.comparisons?.[0];

    rows.push([
      scenario.testRun?.platform?.name ?? '',
      scenario.scenarioType ?? scenario.scenario ?? '',
      baseline?.label ?? '',
      baseline?.sha256 ?? '',
      scenario.originalFilename ?? '',
      scenario.sha256 ?? '',
      String(scenario.bytes),
      String(scenario.width),
      String(scenario.height),
      String(comparison?.survivalScore ?? ''),
      String(comparison?.scoreV2 ?? ''),
      comparison?.survivalClass ?? '',
      String(comparison?.creatorOk ?? ''),
      String(comparison?.rightsOk ?? ''),
      String(comparison?.creditOk ?? ''),
      String(comparison?.descriptionOk ?? ''),
    ]);
  }

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
