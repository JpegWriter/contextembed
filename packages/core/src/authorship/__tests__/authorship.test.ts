// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Authorship Integrity Engine — Tests
 * 
 * NON-NEGOTIABLE tests that assert:
 * 1. Synthetic images can NEVER be VERIFIED
 * 2. Missing EXIF never auto-assigns authorship
 * 3. DECLARED ≠ VERIFIED in all outputs
 * 4. False authorship language blocks export
 * 5. Export refusal is explicit and visible
 */

import { AuthorshipClassifier } from '../classifier';
import { LanguageGovernor } from '../language-governor';
import { ExportGuard } from '../export-guard';
import { MetadataEmbeddingRules } from '../metadata-rules';
import { AuthorshipStatus, ImageSignals } from '../types';
import { ReasonCode } from '../reason-codes';

// ============================================
// Test helpers
// ============================================

function makeSignals(overrides: Partial<ImageSignals> = {}): ImageSignals {
  return {
    exifPresent: false,
    aiSignaturesFound: [],
    ...overrides,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

// ============================================
// Test suite
// ============================================

function testSyntheticCanNeverBeVerified(): void {
  console.log('\n📋 Test: Synthetic images can NEVER be VERIFIED');
  
  const classifier = new AuthorshipClassifier();

  // AI metadata signature detected → must be SYNTHETIC_AI
  const result1 = classifier.classify(
    makeSignals({
      exifPresent: true,
      existingCreator: 'John Smith',
      aiSignaturesFound: ['stable diffusion'],
    }),
    'John Smith'
  );
  assert(result1.status === AuthorshipStatus.SYNTHETIC_AI, 
    'AI metadata signature → SYNTHETIC_AI (even with matching EXIF)');

  // DigitalSourceType = computerGenerated → must be SYNTHETIC_AI
  const result2 = classifier.classify(
    makeSignals({
      exifPresent: true,
      existingCreator: 'John Smith',
      digitalSourceType: 'computerGeneratedImage',
    }),
    'John Smith'
  );
  assert(result2.status === AuthorshipStatus.SYNTHETIC_AI, 
    'DigitalSourceType=computerGenerated → SYNTHETIC_AI');

  // High synthetic confidence → must be SYNTHETIC_AI
  const result3 = classifier.classify(
    makeSignals({
      exifPresent: true,
      existingCreator: 'John Smith',
      syntheticConfidence: 0.85,
    }),
    'John Smith'
  );
  assert(result3.status === AuthorshipStatus.SYNTHETIC_AI, 
    'High synthetic confidence (0.85) → SYNTHETIC_AI');

  // User trying to declare synthetic as original → STILL SYNTHETIC_AI
  const result4 = classifier.applyUserDeclaration(
    AuthorshipStatus.SYNTHETIC_AI,
    true, // user says "yes I'm the creator"
    makeSignals({ aiSignaturesFound: ['midjourney'] })
  );
  assert(result4.status === AuthorshipStatus.SYNTHETIC_AI, 
    'User declaration cannot override SYNTHETIC_AI');
}

function testMissingExifNeverAutoAssigns(): void {
  console.log('\n📋 Test: Missing EXIF never auto-assigns authorship');
  
  const classifier = new AuthorshipClassifier();

  // No EXIF, no creator → must be UNVERIFIED (needs declaration)
  const result1 = classifier.classify(makeSignals(), 'John Smith');
  assert(result1.status === AuthorshipStatus.UNVERIFIED, 
    'Missing EXIF → UNVERIFIED');
  assert(result1.needsUserDeclaration === true, 
    'Missing EXIF → needs user declaration');

  // EXIF present but no creator field → must still be UNVERIFIED
  const result2 = classifier.classify(
    makeSignals({ exifPresent: true }),
    'John Smith'
  );
  assert(result2.status === AuthorshipStatus.UNVERIFIED, 
    'EXIF present but no creator → UNVERIFIED (needs declaration)');
  assert(result2.needsUserDeclaration === true, 
    'EXIF present but no creator → needs user declaration');

  // No user creator name set → never VERIFIED
  const result3 = classifier.classify(
    makeSignals({ exifPresent: true, existingCreator: 'Someone' })
  );
  assert(result3.status === AuthorshipStatus.UNVERIFIED, 
    'No user creator name → cannot verify → UNVERIFIED');
}

function testDeclaredNotEqualVerified(): void {
  console.log('\n📋 Test: DECLARED ≠ VERIFIED in all outputs');
  
  const classifier = new AuthorshipClassifier();
  const rules = new MetadataEmbeddingRules();

  // User declares creator → DECLARED_BY_USER, not VERIFIED
  const result = classifier.applyUserDeclaration(
    AuthorshipStatus.UNVERIFIED,
    true,
    makeSignals()
  );
  assert(result.status === AuthorshipStatus.DECLARED_BY_USER, 
    'User declaration → DECLARED_BY_USER');
  assert(result.status !== AuthorshipStatus.VERIFIED_ORIGINAL, 
    'DECLARED_BY_USER ≠ VERIFIED_ORIGINAL');

  // DECLARED cannot set IPTC:Creator
  const declaredPerms = rules.getPermissions(AuthorshipStatus.DECLARED_BY_USER);
  assert(declaredPerms.allowCreator === false, 
    'DECLARED cannot set IPTC:Creator');
  assert(declaredPerms.allowCopyrightOverwrite === false, 
    'DECLARED cannot overwrite copyright');

  // VERIFIED can set IPTC:Creator
  const verifiedPerms = rules.getPermissions(AuthorshipStatus.VERIFIED_ORIGINAL);
  assert(verifiedPerms.allowCreator === true, 
    'VERIFIED can set IPTC:Creator');
  assert(verifiedPerms.allowCopyrightOverwrite === true, 
    'VERIFIED can overwrite copyright');
}

function testFalseAuthorshipLanguageBlocksExport(): void {
  console.log('\n📋 Test: False authorship language blocks export');
  
  const governor = new LanguageGovernor();

  // UNVERIFIED image + "photographed by" → violation
  const result1 = governor.validate(
    'This image was photographed by John Smith during the event.',
    AuthorshipStatus.UNVERIFIED
  );
  assert(!result1.valid, 
    'UNVERIFIED + "photographed by" → VIOLATION');

  // SYNTHETIC_AI + "captured by" → violation
  const result2 = governor.validate(
    'This beautiful scene was captured by our team.',
    AuthorshipStatus.SYNTHETIC_AI
  );
  assert(!result2.valid, 
    'SYNTHETIC_AI + "captured by" → VIOLATION');

  // SYNTHETIC_AI + "photographer" → violation
  const result3 = governor.validate(
    'Our photographer created this stunning visual.',
    AuthorshipStatus.SYNTHETIC_AI
  );
  assert(!result3.valid, 
    'SYNTHETIC_AI + "photographer" → VIOLATION');

  // DECLARED + "captured by" → violation
  const result4 = governor.validate(
    'This image was captured by the artist.',
    AuthorshipStatus.DECLARED_BY_USER
  );
  assert(!result4.valid, 
    'DECLARED + "captured by" → VIOLATION');

  // VERIFIED + "photographed by" → allowed
  const result5 = governor.validate(
    'This image was photographed by John Smith.',
    AuthorshipStatus.VERIFIED_ORIGINAL
  );
  assert(result5.valid, 
    'VERIFIED + "photographed by" → ALLOWED');

  // UNVERIFIED + "image used" → allowed
  const result6 = governor.validate(
    'Example image used to illustrate the concept.',
    AuthorshipStatus.UNVERIFIED
  );
  assert(result6.valid, 
    'UNVERIFIED + "example image" → ALLOWED');
}

function testExportRefusalExplicit(): void {
  console.log('\n📋 Test: Export refusal is explicit and visible');
  
  const guard = new ExportGuard();

  // UNVERIFIED image with creator claim → BLOCKED
  const result1 = guard.validateAuthorshipClaims({
    authorshipStatus: AuthorshipStatus.UNVERIFIED,
    exportType: 'metadata',
    metadata: { creator: 'John Smith' },
  });
  assert(!result1.allowed, 
    'UNVERIFIED + creator claim → BLOCKED');
  assert(result1.reasonCodes.includes(ReasonCode.CREATOR_FIELD_BLOCKED), 
    'BLOCKED with CREATOR_FIELD_BLOCKED reason code');
  assert(result1.violations.length > 0, 
    'BLOCKED with human-readable violation message');

  // SYNTHETIC_AI image with copyright → BLOCKED
  const result2 = guard.validateAuthorshipClaims({
    authorshipStatus: AuthorshipStatus.SYNTHETIC_AI,
    exportType: 'metadata',
    settingCopyright: true,
  });
  assert(!result2.allowed, 
    'SYNTHETIC_AI + copyright → BLOCKED');

  // SYNTHETIC_AI with "photographed by" text → BLOCKED
  const result3 = guard.validateAuthorshipClaims({
    authorshipStatus: AuthorshipStatus.SYNTHETIC_AI,
    exportType: 'case_study',
    textContent: ['This was photographed by our team at the studio.'],
  });
  assert(!result3.allowed, 
    'SYNTHETIC_AI + "photographed by" text → BLOCKED');
  assert(result3.reasonCodes.includes(ReasonCode.LANGUAGE_VIOLATION), 
    'BLOCKED with LANGUAGE_VIOLATION reason code');

  // VERIFIED_ORIGINAL with full claims → ALLOWED
  const result4 = guard.validateAuthorshipClaims({
    authorshipStatus: AuthorshipStatus.VERIFIED_ORIGINAL,
    exportType: 'metadata',
    metadata: { creator: 'John Smith', copyright: '© 2026 John Smith' },
    claimedCreator: 'John Smith',
    settingCopyright: true,
    textContent: ['Photographed by John Smith at the studio.'],
  });
  assert(result4.allowed, 
    'VERIFIED_ORIGINAL + full claims → ALLOWED');
  assert(result4.reasonCodes.length === 0, 
    'ALLOWED with no reason codes');
}

function testMetadataFilteringByStatus(): void {
  console.log('\n📋 Test: Metadata filtering by authorship status');
  
  const rules = new MetadataEmbeddingRules();

  // UNVERIFIED → creator and copyright REMOVED
  const { filtered: f1, removedFields: r1 } = rules.filterMetadata(
    { headline: 'Test', creator: 'John', copyright: '© 2026' },
    AuthorshipStatus.UNVERIFIED
  );
  assert(!('creator' in f1), 'UNVERIFIED → creator removed');
  assert(!('copyright' in f1), 'UNVERIFIED → copyright removed');
  assert(r1.includes('creator'), 'UNVERIFIED → creator in removed list');

  // SYNTHETIC_AI → force DigitalSourceType
  const { filtered: f2 } = rules.filterMetadata(
    { headline: 'AI Art' },
    AuthorshipStatus.SYNTHETIC_AI
  );
  assert((f2 as any).digitalSourceType === 'computerGenerated', 
    'SYNTHETIC_AI → DigitalSourceType forced to computerGenerated');

  // VERIFIED_ORIGINAL → creator SET to user name
  const { filtered: f3 } = rules.filterMetadata(
    { headline: 'Wedding' },
    AuthorshipStatus.VERIFIED_ORIGINAL,
    'John Smith'
  );
  assert(f3.creator === 'John Smith', 
    'VERIFIED_ORIGINAL → creator set to user name');
}

function testXmpBlockGeneration(): void {
  console.log('\n📋 Test: XMP AuthorshipIntegrity block generation');
  
  const rules = new MetadataEmbeddingRules();

  const block1 = rules.buildXmpBlock(AuthorshipStatus.VERIFIED_ORIGINAL);
  assert(block1['AuthorshipIntegrity:AuthorshipStatus'] === 'VERIFIED_ORIGINAL', 
    'XMP block has correct status');
  assert(block1['AuthorshipIntegrity:VerificationLevel'] === 'machine-verified', 
    'VERIFIED_ORIGINAL → machine-verified');

  const block2 = rules.buildXmpBlock(AuthorshipStatus.DECLARED_BY_USER, {
    declaredAuthor: 'Jane Doe',
  });
  assert(block2['AuthorshipIntegrity:VerificationLevel'] === 'not-verified', 
    'DECLARED → not-verified');
  assert(block2['AuthorshipIntegrity:DeclaredAuthor'] === 'Jane Doe', 
    'DECLARED → DeclaredAuthor set');

  const block3 = rules.buildXmpBlock(AuthorshipStatus.SYNTHETIC_AI, {
    humanRole: 'editor',
    generationTool: 'Midjourney v6',
  });
  assert(block3['AuthorshipIntegrity:HumanRole'] === 'editor', 
    'SYNTHETIC_AI → HumanRole set');
  assert(block3['AuthorshipIntegrity:GenerationTool'] === 'Midjourney v6', 
    'SYNTHETIC_AI → GenerationTool set');
}

// ============================================
// Run all tests
// ============================================

export function runAuthorshipTests(): { passed: number; failed: number; errors: string[] } {
  console.log('═══════════════════════════════════════════════════');
  console.log('  AUTHORSHIP INTEGRITY ENGINE — TEST SUITE');
  console.log('  ContextEmbed may refuse to export content.');
  console.log('  That is not a failure. That is the product.');
  console.log('═══════════════════════════════════════════════════');

  const tests = [
    { name: 'Synthetic can NEVER be verified', fn: testSyntheticCanNeverBeVerified },
    { name: 'Missing EXIF never auto-assigns', fn: testMissingExifNeverAutoAssigns },
    { name: 'DECLARED ≠ VERIFIED', fn: testDeclaredNotEqualVerified },
    { name: 'False authorship language blocks', fn: testFalseAuthorshipLanguageBlocksExport },
    { name: 'Export refusal is explicit', fn: testExportRefusalExplicit },
    { name: 'Metadata filtering by status', fn: testMetadataFilteringByStatus },
    { name: 'XMP block generation', fn: testXmpBlockGeneration },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const test of tests) {
    try {
      test.fn();
      passed++;
    } catch (error) {
      failed++;
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${test.name}: ${msg}`);
      console.error(`  ❌ FAILED: ${msg}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log('  Failures:');
    errors.forEach(e => console.log(`    - ${e}`));
  }
  console.log('═══════════════════════════════════════════════════');

  return { passed, failed, errors };
}

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const { failed } = runAuthorshipTests();
  process.exit(failed > 0 ? 1 : 0);
}
