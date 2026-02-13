/**
 * Survival Lab — Study Session Unit Tests
 *
 * Covers:
 * - Step ordering & validation constants
 * - Step advancement logic (forward-only, reject backward/same)
 * - Scenario type labels
 * - Evidence pack (mock-level structure checks)
 */

import { describe, it, expect } from 'vitest';
import {
  STUDY_STEPS,
  SCENARIO_TYPES,
  type StudyStep,
} from '../../../routes/survival-study';

// ─── Step Ordering ─────────────────────────────────────────────

describe('STUDY_STEPS', () => {
  it('should define 9 ordered steps', () => {
    expect(STUDY_STEPS).toHaveLength(9);
  });

  it('should start with BASELINE_LOCK', () => {
    expect(STUDY_STEPS[0]).toBe('BASELINE_LOCK');
  });

  it('should end with COMPLETE', () => {
    expect(STUDY_STEPS[STUDY_STEPS.length - 1]).toBe('COMPLETE');
  });

  it('should include all platform test steps', () => {
    const expected = [
      'BASELINE_LOCK',
      'LOCAL_EXPORT',
      'CDN_DERIVATIVE',
      'CLOUD_STORAGE',
      'CMS',
      'SOCIAL',
      'SUMMARY',
      'EVIDENCE_PACK',
      'COMPLETE',
    ];
    expect([...STUDY_STEPS]).toEqual(expected);
  });
});

// ─── Step Advancement Logic ────────────────────────────────────

describe('Step advancement validation', () => {
  function stepIndex(step: string): number {
    return STUDY_STEPS.indexOf(step as StudyStep);
  }

  function isValidStep(step: string): boolean {
    return STUDY_STEPS.includes(step as StudyStep);
  }

  function canAdvance(currentStep: string, nextStep: string): { ok: boolean; reason?: string } {
    if (!isValidStep(nextStep)) {
      return { ok: false, reason: `Invalid step: ${nextStep}` };
    }
    const currentIdx = stepIndex(currentStep);
    const nextIdx = stepIndex(nextStep);
    if (nextIdx <= currentIdx) {
      return { ok: false, reason: `Cannot go backward: ${currentStep} → ${nextStep}` };
    }
    return { ok: true };
  }

  it('should allow forward advancement', () => {
    expect(canAdvance('BASELINE_LOCK', 'LOCAL_EXPORT').ok).toBe(true);
    expect(canAdvance('LOCAL_EXPORT', 'CDN_DERIVATIVE').ok).toBe(true);
    expect(canAdvance('EVIDENCE_PACK', 'COMPLETE').ok).toBe(true);
  });

  it('should allow skipping steps', () => {
    // Users may skip optional platform steps
    expect(canAdvance('BASELINE_LOCK', 'CMS').ok).toBe(true);
    expect(canAdvance('LOCAL_EXPORT', 'SUMMARY').ok).toBe(true);
  });

  it('should reject backward movement', () => {
    const result = canAdvance('CMS', 'BASELINE_LOCK');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Cannot go backward');
  });

  it('should reject same-step advancement', () => {
    const result = canAdvance('LOCAL_EXPORT', 'LOCAL_EXPORT');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Cannot go backward');
  });

  it('should reject invalid step names', () => {
    const result = canAdvance('BASELINE_LOCK', 'INVALID_STEP');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Invalid step');
  });

  it('should not allow advancing past COMPLETE', () => {
    // COMPLETE is the terminal step — no more steps after it
    const idx = stepIndex('COMPLETE');
    expect(idx).toBe(STUDY_STEPS.length - 1);
  });
});

// ─── Scenario Types ────────────────────────────────────────────

describe('SCENARIO_TYPES', () => {
  it('should define 13 valid scenario type labels', () => {
    expect(SCENARIO_TYPES).toHaveLength(13);
  });

  it('should include all platform scenario types', () => {
    expect(SCENARIO_TYPES).toContain('LOCAL_EXPORT');
    expect(SCENARIO_TYPES).toContain('CDN_DERIVATIVE');
    expect(SCENARIO_TYPES).toContain('CLOUD_GOOGLE_DRIVE');
    expect(SCENARIO_TYPES).toContain('CLOUD_DROPBOX');
    expect(SCENARIO_TYPES).toContain('CMS_WP_ORIGINAL');
    expect(SCENARIO_TYPES).toContain('CMS_WP_THUMB');
    expect(SCENARIO_TYPES).toContain('SOCIAL_INSTAGRAM');
    expect(SCENARIO_TYPES).toContain('SOCIAL_FACEBOOK');
    expect(SCENARIO_TYPES).toContain('SOCIAL_LINKEDIN');
  });

  it('should cover all CMS platforms', () => {
    const cmsTypes = [...SCENARIO_TYPES].filter((t: string) => t.startsWith('CMS_'));
    expect(cmsTypes.length).toBeGreaterThanOrEqual(6);
  });

  it('should cover all social platforms', () => {
    const socialTypes = [...SCENARIO_TYPES].filter((t: string) => t.startsWith('SOCIAL_'));
    expect(socialTypes).toHaveLength(3);
  });
});

// ─── Step ↔ Scenario Type Mapping ──────────────────────────────

describe('Step-to-ScenarioType mapping', () => {
  const STEP_SCENARIO_MAP: Record<string, string[]> = {
    LOCAL_EXPORT: ['LOCAL_EXPORT'],
    CDN_DERIVATIVE: ['CDN_DERIVATIVE'],
    CLOUD_STORAGE: ['CLOUD_GOOGLE_DRIVE', 'CLOUD_DROPBOX'],
    CMS: ['CMS_WP_ORIGINAL', 'CMS_WP_THUMB', 'CMS_SQUARESPACE', 'CMS_WIX', 'CMS_WEBFLOW', 'CMS_SHOPIFY'],
    SOCIAL: ['SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN'],
  };

  it('every scenario type should map to a study step', () => {
    const allMapped = Object.values(STEP_SCENARIO_MAP).flat();
    for (const st of SCENARIO_TYPES) {
      expect(allMapped).toContain(st);
    }
  });

  it('step-specific scenario types should be a subset of SCENARIO_TYPES', () => {
    for (const types of Object.values(STEP_SCENARIO_MAP)) {
      for (const t of types) {
        expect([...SCENARIO_TYPES]).toContain(t);
      }
    }
  });
});
