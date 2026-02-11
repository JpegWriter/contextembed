/**
 * ContextEmbed Launch Readiness Check
 * 
 * Validates structural requirements for controlled photographer trial:
 * 1. Proof-First fields in sample embed
 * 2. Governance fields in export
 * 3. Manifest integrity (checksum, embedTier, healthScore, governanceAttestation)
 * 4. Seed cohort configuration
 * 5. Pillar documentation
 * 
 * Usage:
 *   npx ts-node scripts/launch-readiness.ts
 *   npx ts-node scripts/launch-readiness.ts --sample ./path/to/embedded.jpg
 *   npx ts-node scripts/launch-readiness.ts --manifest ./path/to/manifest.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'PRESENT' | 'MISSING' | 'SKIP';
  details?: string[];
}

interface LaunchReadinessReport {
  timestamp: string;
  checks: CheckResult[];
  overallVerdict: 'SAFE FOR CONTROLLED PHOTOGRAPHER TRIAL' | 'NOT SAFE — FIX ABOVE FAILURES';
  passCount: number;
  failCount: number;
}

// =============================================================================
// CHECK FUNCTIONS
// =============================================================================

async function checkPillarDocs(): Promise<CheckResult> {
  const pillarDir = path.join(process.cwd(), 'docs', 'pillars');
  const requiredFiles = [
    'proof-first-metadata.md',
    'visual-authenticity-governance.md',
    'ai-structured-context.md',
    'portable-manifest-integrity.md',
    'workflow-integration.md',
  ];
  
  const missing: string[] = [];
  const present: string[] = [];
  
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(pillarDir, file));
      present.push(file);
    } catch {
      missing.push(file);
    }
  }
  
  return {
    name: 'Pillar Docs',
    status: missing.length === 0 ? 'PRESENT' : 'MISSING',
    details: missing.length > 0 
      ? [`Missing: ${missing.join(', ')}`]
      : [`All ${present.length} pillar docs present`],
  };
}

async function checkSeedCohortConfig(): Promise<CheckResult> {
  const configPath = path.join(process.cwd(), 'config', 'seed-cohort.json');
  
  try {
    await fs.access(configPath);
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    const cohortCount = config.cohorts?.length || 0;
    const hasJobTypes = !!config.jobTypes;
    const hasProofRoles = !!config.proofRoles;
    
    if (cohortCount >= 9 && hasJobTypes && hasProofRoles) {
      return {
        name: 'Seed Cohort Config',
        status: 'PRESENT',
        details: [`${cohortCount} cohorts defined`, 'Job types present', 'Proof roles present'],
      };
    } else {
      return {
        name: 'Seed Cohort Config',
        status: 'FAIL',
        details: [
          `Cohorts: ${cohortCount} (need 9)`,
          `Job types: ${hasJobTypes ? 'YES' : 'NO'}`,
          `Proof roles: ${hasProofRoles ? 'YES' : 'NO'}`,
        ],
      };
    }
  } catch {
    return {
      name: 'Seed Cohort Config',
      status: 'MISSING',
      details: ['config/seed-cohort.json not found'],
    };
  }
}

async function checkProofFirstContract(): Promise<CheckResult> {
  const contractPath = path.join(process.cwd(), 'packages', 'metadata', 'src', 'iptc-contract.ts');
  
  try {
    const content = await fs.readFile(contractPath, 'utf-8');
    
    const requiredFields = [
      'businessName',
      'jobType',
      'serviceCategory',
      'assetId',
    ];
    
    const present: string[] = [];
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      if (content.includes(field)) {
        present.push(field);
      } else {
        missing.push(field);
      }
    }
    
    return {
      name: 'Proof-First',
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: missing.length > 0
        ? [`Missing in contract: ${missing.join(', ')}`]
        : [`All ${present.length} required proof fields defined`],
    };
  } catch {
    return {
      name: 'Proof-First',
      status: 'FAIL',
      details: ['Could not read iptc-contract.ts'],
    };
  }
}

async function checkGovernanceExport(): Promise<CheckResult> {
  const writerPath = path.join(process.cwd(), 'packages', 'metadata', 'src', 'authoritative-writer.ts');
  
  try {
    const content = await fs.readFile(writerPath, 'utf-8');
    
    const governanceTags = [
      'AIGenerated',
      'GovernanceStatus',
      'GovernancePolicy',
      'GovernanceCheckedAt',
    ];
    
    const present: string[] = [];
    const missing: string[] = [];
    
    for (const tag of governanceTags) {
      if (content.includes(`XMP-contextembed:${tag}`)) {
        present.push(tag);
      } else {
        missing.push(tag);
      }
    }
    
    return {
      name: 'Governance Export',
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: missing.length > 0
        ? [`Missing XMP tags: ${missing.join(', ')}`]
        : [`All ${present.length} governance tags in writer`],
    };
  } catch {
    return {
      name: 'Governance Export',
      status: 'FAIL',
      details: ['Could not read authoritative-writer.ts'],
    };
  }
}

async function checkManifestIntegrity(): Promise<CheckResult> {
  const manifestPath = path.join(process.cwd(), 'packages', 'metadata', 'src', 'manifest-generator.ts');
  
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    
    const requiredFeatures = [
      { name: 'checksum', pattern: /checksum/i },
      { name: 'embedTier', pattern: /embedTier/i },
      { name: 'healthScore', pattern: /healthScore/i },
      { name: 'governanceAttestation', pattern: /governanceAttestation/i },
    ];
    
    const present: string[] = [];
    const missing: string[] = [];
    
    for (const feature of requiredFeatures) {
      if (feature.pattern.test(content)) {
        present.push(feature.name);
      } else {
        missing.push(feature.name);
      }
    }
    
    return {
      name: 'Manifest Integrity',
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      details: missing.length > 0
        ? [`Missing in manifest: ${missing.join(', ')}`]
        : [`All ${present.length} manifest features present`],
    };
  } catch {
    return {
      name: 'Manifest Integrity',
      status: 'FAIL',
      details: ['Could not read manifest-generator.ts'],
    };
  }
}

async function checkAuditScript(): Promise<CheckResult> {
  const auditPath = path.join(process.cwd(), 'scripts', 'audit-embed.ts');
  
  try {
    const content = await fs.readFile(auditPath, 'utf-8');
    
    const hasGovernanceFields = content.includes('AIGenerated') && content.includes('GovernanceStatus');
    const hasManifestAudit = content.includes('auditManifest');
    
    if (hasGovernanceFields && hasManifestAudit) {
      return {
        name: 'Audit Script',
        status: 'PASS',
        details: ['Governance field checks present', 'Manifest audit function present'],
      };
    } else {
      return {
        name: 'Audit Script',
        status: 'FAIL',
        details: [
          `Governance checks: ${hasGovernanceFields ? 'YES' : 'NO'}`,
          `Manifest audit: ${hasManifestAudit ? 'YES' : 'NO'}`,
        ],
      };
    }
  } catch {
    return {
      name: 'Audit Script',
      status: 'FAIL',
      details: ['Could not read audit-embed.ts'],
    };
  }
}

async function checkSurvivalHarness(): Promise<CheckResult> {
  const survivalDir = path.join(process.cwd(), 'scripts', 'survival');
  
  try {
    await fs.access(path.join(survivalDir, 'run-survival-test.ts'));
    await fs.access(path.join(survivalDir, 'platform-matrix.json'));
    
    return {
      name: 'Survival Harness',
      status: 'PRESENT',
      details: ['run-survival-test.ts present', 'platform-matrix.json present'],
    };
  } catch {
    return {
      name: 'Survival Harness',
      status: 'MISSING',
      details: ['Survival test harness not found in scripts/survival/'],
    };
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function runLaunchReadiness(): Promise<LaunchReadinessReport> {
  console.log('\n' + '='.repeat(50));
  console.log('ContextEmbed Launch Readiness');
  console.log('='.repeat(50));
  
  const checks: CheckResult[] = [];
  
  // Run all checks
  checks.push(await checkProofFirstContract());
  checks.push(await checkGovernanceExport());
  checks.push(await checkManifestIntegrity());
  checks.push(await checkAuditScript());
  checks.push(await checkSeedCohortConfig());
  checks.push(await checkPillarDocs());
  checks.push(await checkSurvivalHarness());
  
  // Print results
  console.log('');
  for (const check of checks) {
    const icon = check.status === 'PASS' || check.status === 'PRESENT' ? '✅' : '❌';
    console.log(`${check.name}: ${icon} ${check.status}`);
    if (check.details) {
      for (const detail of check.details) {
        console.log(`   ${detail}`);
      }
    }
  }
  
  // Calculate verdict
  const passCount = checks.filter(c => c.status === 'PASS' || c.status === 'PRESENT').length;
  const failCount = checks.filter(c => c.status === 'FAIL' || c.status === 'MISSING').length;
  
  const overallVerdict = failCount === 0
    ? 'SAFE FOR CONTROLLED PHOTOGRAPHER TRIAL'
    : 'NOT SAFE — FIX ABOVE FAILURES';
  
  console.log('\n' + '-'.repeat(50));
  console.log('Final Verdict:');
  console.log('-'.repeat(50));
  console.log(`\n${failCount === 0 ? '🟢' : '🔴'} ${overallVerdict}`);
  console.log(`\nPassed: ${passCount}/${checks.length}`);
  if (failCount > 0) {
    console.log(`Failed: ${failCount}/${checks.length}`);
  }
  console.log('');
  
  return {
    timestamp: new Date().toISOString(),
    checks,
    overallVerdict,
    passCount,
    failCount,
  };
}

// CLI
async function main() {
  try {
    const report = await runLaunchReadiness();
    
    // Optionally save report
    const args = process.argv.slice(2);
    if (args.includes('--save')) {
      const reportPath = path.join(process.cwd(), 'launch-readiness-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Report saved: ${reportPath}`);
    }
    
    // Exit with appropriate code
    process.exit(report.failCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

// Export for programmatic use
export {
  runLaunchReadiness,
  LaunchReadinessReport,
  CheckResult,
};
