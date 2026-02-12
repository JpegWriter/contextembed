/**
 * Survival Lab — Classifier Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { generateMetadataDiff } from '../diff-engine';
import { classifyDiff, classFromScore, classLabel, classColor } from '../classifier';

// ─── Helper ────────────────────────────────────────────────────

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

describe('classifyDiff', () => {
  it('should return PRISTINE (100) when all fields are preserved', () => {
    const baseline = makeRaw();
    const scenario = makeRaw();
    const diff = generateMetadataDiff(baseline, scenario);
    const result = classifyDiff(diff);

    expect(result.scoreV2).toBe(100);
    expect(result.survivalClass).toBe('PRISTINE');
  });

  it('should return DESTRUCTIVE (0-19) when everything is stripped', () => {
    const baseline = makeRaw();
    const scenario: Record<string, unknown> = {};
    const diff = generateMetadataDiff(baseline, scenario);
    const result = classifyDiff(diff);

    expect(result.scoreV2).toBeLessThanOrEqual(19);
    expect(result.survivalClass).toBe('DESTRUCTIVE');
  });

  it('should apply correct multipliers for different statuses', () => {
    const baseline = makeRaw();
    // Strip creator (weight 0.20), corrupt copyright (weight 0.25)
    const scenario = makeRaw({
      Creator: undefined,
      Artist: undefined,
      'By-line': undefined,
      'IPTC:By-line': undefined,
      Rights: 'Â© 2026 Jane Doe',
      Copyright: 'Â© 2026 Jane Doe',
      CopyrightNotice: 'Â© 2026 Jane Doe',
    });

    const diff = generateMetadataDiff(baseline, scenario);
    const result = classifyDiff(diff);

    // Creator stripped: 0.0 * 0.20 = 0
    // Copyright encoding: 0.3 * 0.25 = 0.075
    // Others preserved: full
    expect(result.scoreV2).toBeLessThan(100);
    expect(result.scoreV2).toBeGreaterThan(50);

    // Check field details
    const creatorDetail = result.fieldDetails.find(d => d.canonical === 'CREATOR');
    expect(creatorDetail).toBeDefined();
    expect(creatorDetail!.multiplier).toBe(0);
    expect(creatorDetail!.earned).toBe(0);

    const copyrightDetail = result.fieldDetails.find(d => d.canonical === 'COPYRIGHT');
    expect(copyrightDetail).toBeDefined();
    expect(copyrightDetail!.multiplier).toBe(0.3);
  });

  it('should not penalise for ABSENT fields', () => {
    // Baseline with only creator and copyright
    const baseline: Record<string, unknown> = {
      Creator: 'Jane Doe',
      Artist: 'Jane Doe',
      Rights: '© 2026 Jane Doe',
      Copyright: '© 2026 Jane Doe',
    };
    // Scenario preserves both
    const scenario: Record<string, unknown> = {
      Creator: 'Jane Doe',
      Artist: 'Jane Doe',
      Rights: '© 2026 Jane Doe',
      Copyright: '© 2026 Jane Doe',
    };

    const diff = generateMetadataDiff(baseline, scenario);
    const result = classifyDiff(diff);

    expect(result.scoreV2).toBe(100);
    expect(result.survivalClass).toBe('PRISTINE');
  });

  it('should include a human-readable summary', () => {
    const baseline = makeRaw();
    const scenario = makeRaw({
      Creator: undefined,
      Artist: undefined,
      'By-line': undefined,
    });

    const diff = generateMetadataDiff(baseline, scenario);
    const result = classifyDiff(diff);

    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('should pass container retention through', () => {
    const baseline = makeRaw();
    const scenario = makeRaw();

    const diff = generateMetadataDiff(baseline, scenario);
    const result = classifyDiff(diff);

    expect(result.containerRetention).toBeDefined();
    expect(result.containerRetention.length).toBe(3);
  });
});

describe('classFromScore', () => {
  it('should classify scores correctly', () => {
    expect(classFromScore(100)).toBe('PRISTINE');
    expect(classFromScore(90)).toBe('SAFE');
    expect(classFromScore(80)).toBe('SAFE');
    expect(classFromScore(79)).toBe('DEGRADED');
    expect(classFromScore(50)).toBe('DEGRADED');
    expect(classFromScore(49)).toBe('HOSTILE');
    expect(classFromScore(20)).toBe('HOSTILE');
    expect(classFromScore(19)).toBe('DESTRUCTIVE');
    expect(classFromScore(0)).toBe('DESTRUCTIVE');
  });
});

describe('classLabel', () => {
  it('should return human-friendly labels', () => {
    expect(classLabel('PRISTINE')).toBe('Pristine');
    expect(classLabel('SAFE')).toBe('Safe');
    expect(classLabel('DEGRADED')).toBe('Degraded');
    expect(classLabel('HOSTILE')).toBe('Hostile');
    expect(classLabel('DESTRUCTIVE')).toBe('Destructive');
  });
});

describe('classColor', () => {
  it('should return hex color codes', () => {
    expect(classColor('PRISTINE')).toMatch(/^#/);
    expect(classColor('DESTRUCTIVE')).toMatch(/^#/);
  });
});
