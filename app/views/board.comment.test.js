import { describe, expect, test } from 'vitest';
import { createSubscriptionIssueStore } from '../data/subscription-issue-store.js';
import { createBoardView } from './board.js';

function createTestIssueStores() {
  /** @type {Map<string, any>} */
  const stores = new Map();
  /** @type {Set<() => void>} */
  const listeners = new Set();
  /** @param {string} id */
  function getStore(id) {
    let s = stores.get(id);
    if (!s) {
      s = createSubscriptionIssueStore(id);
      stores.set(id, s);
      s.subscribe(() => {
        for (const fn of Array.from(listeners)) {
          try {
            fn();
          } catch {
            /* ignore */
          }
        }
      });
    }
    return s;
  }
  return {
    getStore,
    /** @param {string} id */
    snapshotFor(id) {
      return getStore(id).snapshot().slice();
    },
    /** @param {() => void} fn */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

describe('views/board comment support', () => {
  test('shows comment count badge on cards with comments', async () => {
    document.body.innerHTML = '<div id="m"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('m'));

    const now = Date.now();
    const issueStores = createTestIssueStores();
    issueStores.getStore('tab:board:ready').applyPush({
      type: 'snapshot',
      id: 'tab:board:ready',
      revision: 1,
      issues: [
        {
          id: 'R-1',
          title: 'Has comments',
          priority: 1,
          created_at: now,
          updated_at: now,
          issue_type: 'task',
          comment_count: 3
        },
        {
          id: 'R-2',
          title: 'No comments',
          priority: 2,
          created_at: now,
          updated_at: now,
          issue_type: 'task',
          comment_count: 0
        }
      ]
    });

    const view = createBoardView(
      mount,
      null,
      () => {},
      undefined,
      undefined,
      issueStores
    );
    await view.load();

    const card_with = /** @type {HTMLElement} */ (
      mount.querySelector('[data-issue-id="R-1"]')
    );
    const badge = card_with.querySelector('.board-card__comments');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('3');
    expect(badge?.getAttribute('title')).toBe('3 comments — click to view');

    const card_without = /** @type {HTMLElement} */ (
      mount.querySelector('[data-issue-id="R-2"]')
    );
    const no_badge = card_without.querySelector('.board-card__comments');
    expect(no_badge).toBeNull();
  });

  test('singular comment title for count of 1', async () => {
    document.body.innerHTML = '<div id="m"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('m'));

    const now = Date.now();
    const issueStores = createTestIssueStores();
    issueStores.getStore('tab:board:ready').applyPush({
      type: 'snapshot',
      id: 'tab:board:ready',
      revision: 1,
      issues: [
        {
          id: 'R-1',
          title: 'One comment',
          priority: 1,
          created_at: now,
          updated_at: now,
          issue_type: 'task',
          comment_count: 1
        }
      ]
    });

    const view = createBoardView(
      mount,
      null,
      () => {},
      undefined,
      undefined,
      issueStores
    );
    await view.load();

    const badge = mount.querySelector(
      '[data-issue-id="R-1"] .board-card__comments'
    );
    expect(badge?.getAttribute('title')).toBe('1 comment — click to view');
  });

  test('card click navigates to detail view for commenting', async () => {
    document.body.innerHTML = '<div id="m"></div>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('m'));

    const now = Date.now();
    const issueStores = createTestIssueStores();
    issueStores.getStore('tab:board:ready').applyPush({
      type: 'snapshot',
      id: 'tab:board:ready',
      revision: 1,
      issues: [
        {
          id: 'R-1',
          title: 'Commentable',
          priority: 1,
          created_at: now,
          updated_at: now,
          issue_type: 'task',
          comment_count: 2
        }
      ]
    });

    /** @type {string[]} */
    const navigations = [];
    const view = createBoardView(
      mount,
      null,
      (id) => navigations.push(id),
      undefined,
      undefined,
      issueStores
    );
    await view.load();

    const card = /** @type {HTMLElement} */ (
      mount.querySelector('[data-issue-id="R-1"]')
    );
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigations).toEqual(['R-1']);
  });
});
