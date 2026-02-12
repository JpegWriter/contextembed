/**
 * Survival Lab — Diff Engine Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { generateMetadataDiff, type FieldStatus } from '../diff-engine';

// ─── Helper: build a raw JSON blob ────────────────────────────

function makeRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    Artist: 'Jane Doe',
    Copyright: '© 2026 Jane Doe',
    Creator: 'Jane Doe',
    Rights: '© 2026 Jane Doe',
    Credit: 'Jane Doe Studio',
    Description: 'A beautiful landscape photograph',
    ImageDescription: 'A beautiful landscape photograph',
    'Caption-Abstract': 'A beautiful landscape photograph',
    'By-line': 'Jane Doe',
    CopyrightNotice: '© 2026 Jane Doe',
    Subject: 'landscape, nature, photography',
    Keywords: 'landscape, nature, photography',
    CreatorTool: 'ContextEmbed v2.0',
    Title: 'Sunset Over Mountains',
    ObjectName: 'Sunset Over Mountains',
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────

describe('generateMetadataDiff', () => {
  it('should report PRESERVED when baseline and scenario match exactly', () => {
    const baseline = makeRaw();
    const scenario = makeRaw();

    const report = generateMetadataDiff(baseline, scenario);

    expect(report.perfectSurvival).toBe(true);
    expect(report.fieldSurvivalRate).toBe(1);

    for (const field of report.fields) {
      if (field.status !== 'ABSENT') {
        expect(field.status).toBe('PRESERVED');
      }
    }
  });

  it('should report STRIPPED when scenario is missing a field', () => {
    const baseline = makeRaw();
    const scenario = makeRaw({
      Creator: undefined,
      Artist: undefined,
      'By-line': undefined,
      'IPTC:By-line': undefined,
    });

    const report = generateMetadataDiff(baseline, scenario);
    const creatorField = report.fields.find(f => f.canonical === 'CREATOR');

    expect(creatorField).toBeDefined();
    expect(creatorField!.status).toBe('STRIPPED');
    expect(report.perfectSurvival).toBe(false);
  });

  it('should report STRIPPED for COPYRIGHT when all copyright tags are removed', () => {
    const baseline = makeRaw();
    const scenario = makeRaw({
      Copyright: undefined,
      Rights: undefined,
      CopyrightNotice: undefined,
      'IPTC:CopyrightNotice': undefined,
    });

    const report = generateMetadataDiff(baseline, scenario);
    const copyrightField = report.fields.find(f => f.canonical === 'COPYRIGHT');

    expect(copyrightField).toBeDefined();
    expect(copyrightField!.status).toBe('STRIPPED');
  });

  it('should report MIGRATED when value is same but container changed', () => {
    const baseline = makeRaw();
    // Scenario only has XMP Creator, no EXIF Artist or IPTC By-line
    const scenario = makeRaw({
      Artist: undefined,
      'By-line': undefined,
      'IPTC:By-line': undefined,
    });

    const report = generateMetadataDiff(baseline, scenario);
    const creatorField = report.fields.find(f => f.canonical === 'CREATOR');

    expect(creatorField).toBeDefined();
    // Value preserved via XMP Creator, but EXIF/IPTC containers lost
    expect(['PRESERVED', 'MIGRATED']).toContain(creatorField!.status);
  });

  it('should report TRUNCATED when scenario value is a leading substring', () => {
    const baseline = makeRaw({
      Description: 'A very long description that goes on and on with details',
      ImageDescription: 'A very long description that goes on and on with details',
      'Caption-Abstract': 'A very long description that goes on and on with details',
    });
    const scenario = makeRaw({
      Description: 'A very long description',
      ImageDescription: 'A very long description',
      'Caption-Abstract': 'A very long description',
    });

    const report = generateMetadataDiff(baseline, scenario);
    const descField = report.fields.find(f => f.canonical === 'DESCRIPTION');

    expect(descField).toBeDefined();
    expect(descField!.status).toBe('TRUNCATED');
  });

  it('should report ENCODING_MUTATION when mojibake is detected', () => {
    const baseline = makeRaw();
    const scenario = makeRaw({
      Rights: 'Â© 2026 Jane Doe',
      Copyright: 'Â© 2026 Jane Doe',
      CopyrightNotice: 'Â© 2026 Jane Doe',
    });

    const report = generateMetadataDiff(baseline, scenario);
    const copyrightField = report.fields.find(f => f.canonical === 'COPYRIGHT');

    expect(copyrightField).toBeDefined();
    expect(copyrightField!.status).toBe('ENCODING_MUTATION');
  });

  it('should report MODIFIED when value changes materially', () => {
    const baseline = makeRaw();
    const scenario = makeRaw({
      Creator: 'Platform User 12345',
      Artist: 'Platform User 12345',
      'By-line': 'Platform User 12345',
    });

    const report = generateMetadataDiff(baseline, scenario);
    const creatorField = report.fields.find(f => f.canonical === 'CREATOR');

    expect(creatorField).toBeDefined();
    expect(creatorField!.status).toBe('MODIFIED');
  });

  it('should report REGENERATED when scenario has a field that baseline did not', () => {
    const baseline = makeRaw({ CreatorTool: undefined, Software: undefined });
    const scenario = makeRaw({ CreatorTool: 'Adobe Photoshop 25.0', Software: undefined });

    const report = generateMetadataDiff(baseline, scenario);
    const toolField = report.fields.find(f => f.canonical === 'CREATOR_TOOL');

    expect(toolField).toBeDefined();
    expect(toolField!.status).toBe('REGENERATED');
  });

  it('should report ABSENT when neither baseline nor scenario has the field', () => {
    const baseline = makeRaw({ UsageTerms: undefined, 'XMP-xmpRights:UsageTerms': undefined });
    const scenario = makeRaw({ UsageTerms: undefined, 'XMP-xmpRights:UsageTerms': undefined });

    const report = generateMetadataDiff(baseline, scenario);
    const usageField = report.fields.find(f => f.canonical === 'USAGE_TERMS');

    expect(usageField).toBeDefined();
    expect(usageField!.status).toBe('ABSENT');
  });

  it('should compute container retention correctly', () => {
    const baseline = makeRaw();
    // Strip all IPTC tags
    const scenario = makeRaw({
      'By-line': undefined,
      'IPTC:By-line': undefined,
      CopyrightNotice: undefined,
      'IPTC:CopyrightNotice': undefined,
      'Caption-Abstract': undefined,
      'IPTC:Caption-Abstract': undefined,
      'IPTC:Credit': undefined,
      Keywords: undefined,
      'IPTC:Keywords': undefined,
      'IPTC:Source': undefined,
      ObjectName: undefined,
      'IPTC:ObjectName': undefined,
    });

    const report = generateMetadataDiff(baseline, scenario);
    const iptcRetention = report.containerRetention.find(c => c.container === 'IPTC');

    expect(iptcRetention).toBeDefined();
    expect(iptcRetention!.retentionPct).toBe(0);

    // XMP should still be fully retained
    const xmpRetention = report.containerRetention.find(c => c.container === 'XMP');
    expect(xmpRetention).toBeDefined();
    expect(xmpRetention!.retentionPct).toBe(100);
  });

  it('should count status types correctly', () => {
    const baseline = makeRaw();
    const scenario = makeRaw({
      Creator: undefined,
      Artist: undefined,
      'By-line': undefined,
      'IPTC:By-line': undefined,
    });

    const report = generateMetadataDiff(baseline, scenario);

    expect(report.statusCounts.STRIPPED).toBeGreaterThanOrEqual(1);
    expect(report.statusCounts.PRESERVED).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty raw JSON gracefully', () => {
    const report = generateMetadataDiff({}, {});

    expect(report.fields.length).toBeGreaterThan(0);
    expect(report.perfectSurvival).toBe(false); // nothing to preserve, but not "perfect"
    expect(report.fieldSurvivalRate).toBe(1); // nothing authored = 100% survival
  });
});
