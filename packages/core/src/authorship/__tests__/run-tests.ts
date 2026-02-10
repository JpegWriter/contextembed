/**
 * Run Authorship Integrity Engine tests
 * Usage: npx ts-node packages/core/src/authorship/__tests__/run-tests.ts
 */

import { runAuthorshipTests } from './authorship.test';

const { failed } = runAuthorshipTests();
process.exit(failed > 0 ? 1 : 0);
