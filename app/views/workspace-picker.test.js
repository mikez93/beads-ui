import { describe, expect, test } from 'vitest';
import { getDisplayLabel, getProjectName } from './workspace-picker.js';

describe('views/workspace-picker', () => {
  describe('getProjectName', () => {
    test('extracts basename from path', () => {
      expect(getProjectName('/home/user/code/myrepo')).toBe('myrepo');
    });

    test('returns Unknown for empty path', () => {
      expect(getProjectName('')).toBe('Unknown');
    });

    test('handles path with trailing slash', () => {
      // filter(Boolean) removes empty segments from trailing slash
      expect(getProjectName('/home/user/code/myrepo/')).toBe('myrepo');
    });
  });

  describe('getDisplayLabel', () => {
    test('returns bare name when basenames are unique', () => {
      const workspaces = [
        { path: '/home/user/alpha', database: 'a.db', branch: 'main' },
        { path: '/home/user/beta', database: 'b.db', branch: 'main' }
      ];

      const label = getDisplayLabel(workspaces[0], workspaces);

      expect(label).toBe('alpha');
    });

    test('appends branch when basenames collide', () => {
      const workspaces = [
        {
          path: '/home/user/worktrees/myrepo-main',
          database: 'a.db',
          branch: null
        },
        { path: '/home/user/code/myrepo', database: 'b.db', branch: 'main' },
        {
          path: '/home/user/worktrees/myrepo',
          database: 'c.db',
          branch: 'feature-a'
        }
      ];

      const label = getDisplayLabel(workspaces[2], workspaces);

      expect(label).toBe('myrepo (feature-a)');
    });

    test('falls back to parent directory when no branch', () => {
      const workspaces = [
        { path: '/home/user/code/myrepo', database: 'a.db', branch: null },
        { path: '/home/user/worktrees/myrepo', database: 'b.db', branch: null }
      ];

      const label_code = getDisplayLabel(workspaces[0], workspaces);
      const label_wt = getDisplayLabel(workspaces[1], workspaces);

      expect(label_code).toBe('myrepo (code)');
      expect(label_wt).toBe('myrepo (worktrees)');
    });

    test('single workspace shows clean label without suffix', () => {
      const workspaces = [
        { path: '/home/user/code/myrepo', database: 'a.db', branch: 'main' }
      ];

      const label = getDisplayLabel(workspaces[0], workspaces);

      expect(label).toBe('myrepo');
    });

    test('mixed collision: branch for one, parent for another', () => {
      const workspaces = [
        { path: '/home/user/code/myrepo', database: 'a.db', branch: 'main' },
        { path: '/home/user/worktrees/myrepo', database: 'b.db', branch: null }
      ];

      const label_with_branch = getDisplayLabel(workspaces[0], workspaces);
      const label_no_branch = getDisplayLabel(workspaces[1], workspaces);

      expect(label_with_branch).toBe('myrepo (main)');
      expect(label_no_branch).toBe('myrepo (worktrees)');
    });
  });
});
