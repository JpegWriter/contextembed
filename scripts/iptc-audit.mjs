#!/usr/bin/env node
/**
 * IPTC/XMP Metadata Audit Tool
 * 
 * Inspects exported JPG files and verifies required IPTC/XMP metadata is embedded.
 * Generates machine-readable reports (CSV + JSON) and console summary.
 * 
 * Usage:
 *   node scripts/iptc-audit.mjs --dir ./exports
 *   node scripts/iptc-audit.mjs --dir ./exports --gate
 * 
 * Options:
 *   --dir <path>   Directory containing JPG/JPEG files to audit
 *   --gate         Fail with non-zero exit code if any required fields missing
 *   --verbose      Show per-file details
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Use vendored ExifTool from the metadata package
let exiftool;
try {
  const { exiftool: et } = require('exiftool-vendored');
  exiftool = et;
} catch (e) {
  console.error('❌ exiftool-vendored not found. Run: pnpm install');
  process.exit(1);
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const REQUIRED_IPTC_FIELDS = [
  'ObjectName',           // Title
  'Caption-Abstract',     // Description
  'Keywords',             // Must have >= 5
  'By-line',              // Creator
  'Credit',               // Brand/Studio
  'CopyrightNotice',      // Copyright
];

const USAGE_TERMS_FIELDS = [
  'RightsUsageTerms',
  'UsageTerms',
  'XMP-xmpRights:UsageTerms',
  'XMP-iptcCore:UsageTerms',
];

const CONTEXTEMBED_FIELDS = [
  'SceneType',
  'Intent',
  'SafetyValidated',
  'StyleFingerprintId',
  'VisionConfidenceScore',
  'PrimarySubjects',
  'EmotionalTone',
];

const RULES = {
  titleMaxLength: 80,
  captionMinLength: 200,
  minKeywords: 5,
};

// =============================================================================
// HELPERS
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dir: './exports',
    gate: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      options.dir = args[++i];
    } else if (args[i] === '--gate') {
      options.gate = true;
    } else if (args[i] === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function getJpegFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    process.exit(1);
  }

  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.tif', '.tiff'].includes(ext)) {
        files.push(path.join(dir, entry.name));
      }
    } else if (entry.isDirectory()) {
      // Recurse into subdirectories
      files.push(...getJpegFiles(path.join(dir, entry.name)));
    }
  }

  return files;
}

async function readMetadata(filePath) {
  try {
    const tags = await exiftool.read(filePath);
    return tags;
  } catch (error) {
    throw new Error(`Failed to read metadata: ${error.message}`);
  }
}

function normalizeKeywords(keywords) {
  if (!keywords) return [];
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === 'string') {
    // Could be comma-separated or semicolon-separated
    return keywords.split(/[,;]/).map(k => k.trim()).filter(k => k);
  }
  return [];
}

function getFieldValue(metadata, ...fieldNames) {
  for (const name of fieldNames) {
    // Try exact match
    if (metadata[name] !== undefined && metadata[name] !== '') {
      return metadata[name];
    }
    // Try with IPTC: prefix
    if (metadata[`IPTC:${name}`] !== undefined && metadata[`IPTC:${name}`] !== '') {
      return metadata[`IPTC:${name}`];
    }
    // Try with XMP prefixes
    for (const prefix of ['XMP-dc:', 'XMP-photoshop:', 'XMP-xmpRights:', 'XMP-iptcCore:', 'XMP-contextembed:']) {
      if (metadata[`${prefix}${name}`] !== undefined && metadata[`${prefix}${name}`] !== '') {
        return metadata[`${prefix}${name}`];
      }
    }
  }
  return null;
}

function hasContextEmbedNamespace(metadata) {
  return Object.keys(metadata).some(key => key.includes('contextembed'));
}

function getContextEmbedFields(metadata) {
  const fields = {};
  for (const key of Object.keys(metadata)) {
    if (key.includes('contextembed')) {
      const fieldName = key.split(':').pop();
      fields[fieldName] = metadata[key];
    }
  }
  return fields;
}

// =============================================================================
// AUDIT LOGIC
// =============================================================================

function auditFile(metadata, filename) {
  const result = {
    filename: path.basename(filename), // GDPR: only basename, no full path
    pass_required: true,
    missing_required: [],
    warnings: [],
    title_len: 0,
    caption_len: 0,
    keyword_count: 0,
    has_contextembed_namespace: false,
    has_usage_terms: false,
    fields_present: [],
    contextembed_fields: {},
  };

  // Check ObjectName (Title)
  const title = getFieldValue(metadata, 'ObjectName', 'Title', 'Headline');
  if (!title) {
    result.missing_required.push('ObjectName (Title)');
    result.pass_required = false;
  } else {
    result.title_len = String(title).length;
    result.fields_present.push('ObjectName');
    
    if (result.title_len > RULES.titleMaxLength) {
      result.warnings.push(`Title too long: ${result.title_len} chars (max ${RULES.titleMaxLength})`);
    }
  }

  // Check Caption-Abstract (Description)
  const caption = getFieldValue(metadata, 'Caption-Abstract', 'Description', 'ImageDescription');
  if (!caption) {
    result.missing_required.push('Caption-Abstract (Description)');
    result.pass_required = false;
  } else {
    result.caption_len = String(caption).length;
    result.fields_present.push('Caption-Abstract');
    
    if (result.caption_len < RULES.captionMinLength) {
      result.warnings.push(`Caption too short: ${result.caption_len} chars (min ${RULES.captionMinLength})`);
    }
  }

  // Check Keywords
  const keywords = normalizeKeywords(
    getFieldValue(metadata, 'Keywords', 'Subject')
  );
  result.keyword_count = keywords.length;
  
  if (keywords.length === 0) {
    result.missing_required.push('Keywords');
    result.pass_required = false;
  } else {
    result.fields_present.push('Keywords');
    
    if (keywords.length < RULES.minKeywords) {
      result.warnings.push(`Too few keywords: ${keywords.length} (min ${RULES.minKeywords})`);
    }
    
    // Check for sentence-like keywords
    const sentenceKeywords = keywords.filter(k => 
      k.includes('.') || k.includes(',') || k.split(' ').length > 4
    );
    if (sentenceKeywords.length > 0) {
      result.warnings.push(`Sentence-like keywords detected: "${sentenceKeywords[0]}"`);
    }
  }

  // Check By-line (Creator)
  const creator = getFieldValue(metadata, 'By-line', 'Creator', 'Artist');
  if (!creator) {
    result.missing_required.push('By-line (Creator)');
    result.pass_required = false;
  } else {
    result.fields_present.push('By-line');
  }

  // Check Credit
  const credit = getFieldValue(metadata, 'Credit');
  if (!credit) {
    result.missing_required.push('Credit');
    result.pass_required = false;
  } else {
    result.fields_present.push('Credit');
  }

  // Check CopyrightNotice
  const copyright = getFieldValue(metadata, 'CopyrightNotice', 'Copyright', 'Rights');
  if (!copyright) {
    result.missing_required.push('CopyrightNotice');
    result.pass_required = false;
  } else {
    result.fields_present.push('CopyrightNotice');
  }

  // Check Usage Terms (any variant)
  for (const field of USAGE_TERMS_FIELDS) {
    const value = getFieldValue(metadata, field);
    if (value) {
      result.has_usage_terms = true;
      result.fields_present.push('UsageTerms');
      break;
    }
  }
  if (!result.has_usage_terms) {
    result.missing_required.push('RightsUsageTerms');
    result.pass_required = false;
  }

  // Check ContextEmbed namespace
  result.has_contextembed_namespace = hasContextEmbedNamespace(metadata);
  result.contextembed_fields = getContextEmbedFields(metadata);
  
  if (!result.has_contextembed_namespace) {
    result.warnings.push('Missing XMP-contextembed namespace');
  } else {
    // Check for specific fields
    for (const field of CONTEXTEMBED_FIELDS) {
      if (!result.contextembed_fields[field]) {
        result.warnings.push(`Missing contextembed:${field}`);
      }
    }
  }

  return result;
}

// =============================================================================
// REPORTING
// =============================================================================

function generateSummary(results) {
  const total = results.length;
  const passed = results.filter(r => r.pass_required).length;
  const failed = total - passed;

  // Count missing fields
  const missingFieldCounts = {};
  const warningCounts = {};

  for (const result of results) {
    for (const field of result.missing_required) {
      missingFieldCounts[field] = (missingFieldCounts[field] || 0) + 1;
    }
    for (const warning of result.warnings) {
      // Normalize warning for counting
      const key = warning.split(':')[0];
      warningCounts[key] = (warningCounts[key] || 0) + 1;
    }
  }

  // Sort by frequency
  const topMissing = Object.entries(missingFieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topWarnings = Object.entries(warningCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const hasContextEmbed = results.filter(r => r.has_contextembed_namespace).length;

  return {
    total,
    passed,
    failed,
    passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
    topMissing,
    topWarnings,
    hasContextEmbed,
    avgTitleLen: total > 0 ? Math.round(results.reduce((sum, r) => sum + r.title_len, 0) / total) : 0,
    avgCaptionLen: total > 0 ? Math.round(results.reduce((sum, r) => sum + r.caption_len, 0) / total) : 0,
    avgKeywordCount: total > 0 ? (results.reduce((sum, r) => sum + r.keyword_count, 0) / total).toFixed(1) : 0,
  };
}

function writeReports(results, summary, reportsDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Write JSON report
  const jsonPath = path.join(reportsDir, `iptc_audit_${timestamp}.json`);
  const jsonReport = {
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  // Write CSV report
  const csvPath = path.join(reportsDir, `iptc_audit_${timestamp}.csv`);
  const csvHeaders = [
    'filename',
    'pass_required',
    'missing_required',
    'warnings',
    'title_len',
    'caption_len',
    'keyword_count',
    'has_contextembed',
    'has_usage_terms',
  ];
  
  const csvRows = [csvHeaders.join(',')];
  for (const result of results) {
    csvRows.push([
      `"${result.filename}"`,
      result.pass_required,
      `"${result.missing_required.join('; ')}"`,
      `"${result.warnings.join('; ')}"`,
      result.title_len,
      result.caption_len,
      result.keyword_count,
      result.has_contextembed_namespace,
      result.has_usage_terms,
    ].join(','));
  }
  fs.writeFileSync(csvPath, csvRows.join('\n'));

  return { jsonPath, csvPath };
}

function printSummary(summary, options) {
  console.log('\n' + '='.repeat(60));
  console.log('                    IPTC AUDIT REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📊 SUMMARY`);
  console.log(`   Total files:     ${summary.total}`);
  console.log(`   ✅ Passed:       ${summary.passed}`);
  console.log(`   ❌ Failed:       ${summary.failed}`);
  console.log(`   Pass rate:       ${summary.passRate}%`);
  
  console.log(`\n📏 AVERAGES`);
  console.log(`   Title length:    ${summary.avgTitleLen} chars`);
  console.log(`   Caption length:  ${summary.avgCaptionLen} chars`);
  console.log(`   Keyword count:   ${summary.avgKeywordCount}`);
  console.log(`   ContextEmbed:    ${summary.hasContextEmbed}/${summary.total} files`);

  if (summary.topMissing.length > 0) {
    console.log(`\n🚨 TOP MISSING REQUIRED FIELDS`);
    for (const [field, count] of summary.topMissing) {
      const pct = ((count / summary.total) * 100).toFixed(0);
      console.log(`   ${field}: ${count} files (${pct}%)`);
    }
  }

  if (summary.topWarnings.length > 0) {
    console.log(`\n⚠️  TOP WARNINGS`);
    for (const [warning, count] of summary.topWarnings) {
      console.log(`   ${warning}: ${count} files`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (summary.failed > 0) {
    console.log('❌ AUDIT FAILED - Required IPTC fields missing');
    if (options.gate) {
      console.log('   Gate mode enabled - exiting with error code 1');
    }
  } else {
    console.log('✅ AUDIT PASSED - All required IPTC fields present');
  }

  console.log('='.repeat(60) + '\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const options = parseArgs();

  console.log('🔍 ContextEmbed IPTC/XMP Metadata Audit');
  console.log(`   Directory: ${options.dir}`);
  console.log(`   Gate mode: ${options.gate ? 'ON' : 'OFF'}`);
  console.log('');

  // Get files
  const files = getJpegFiles(options.dir);
  
  if (files.length === 0) {
    console.log('⚠️  No image files found in', options.dir);
    process.exit(0);
  }

  console.log(`📁 Found ${files.length} image files\n`);

  // Audit each file
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const basename = path.basename(file);
    
    process.stdout.write(`   [${i + 1}/${files.length}] ${basename}... `);

    try {
      const metadata = await readMetadata(file);
      const result = auditFile(metadata, file);
      results.push(result);

      if (result.pass_required) {
        console.log('✅');
      } else {
        console.log(`❌ Missing: ${result.missing_required.join(', ')}`);
      }

      if (options.verbose && result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.log(`      ⚠️  ${warning}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({
        filename: basename,
        pass_required: false,
        missing_required: ['ERROR'],
        warnings: [error.message],
        title_len: 0,
        caption_len: 0,
        keyword_count: 0,
        has_contextembed_namespace: false,
        has_usage_terms: false,
        fields_present: [],
        contextembed_fields: {},
      });
    }
  }

  // Generate summary
  const summary = generateSummary(results);

  // Write reports
  const reportsDir = path.join(ROOT_DIR, 'reports');
  const { jsonPath, csvPath } = writeReports(results, summary, reportsDir);

  console.log(`\n📄 Reports written:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   CSV:  ${csvPath}`);

  // Print summary
  printSummary(summary, options);

  // Cleanup exiftool
  await exiftool.end();

  // Exit with error if gate mode and failures
  if (options.gate && summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(async error => {
  console.error('Fatal error:', error);
  await exiftool.end();
  process.exit(1);
});
