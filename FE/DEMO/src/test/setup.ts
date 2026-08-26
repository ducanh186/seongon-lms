import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without `globals`, so React Testing Library never registers its
// own auto-cleanup. Without this every `it()` in a file leaves its rendered
// tree in the document: queries then hit duplicates and heavy pages get slower
// with each test until they trip the 5s timeout.
afterEach(cleanup);
