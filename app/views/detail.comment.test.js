import { describe, expect, test, vi } from 'vitest';
import { createDetailView } from './detail.js';

/** @type {(impl: (type: string, payload?: unknown) => Promise<any>) => (type: string, payload?: unknown) => Promise<any>} */
const mockSend = (impl) => vi.fn(impl);

/** @param {any} issue */
function createStores(issue) {
  return {
    /** @param {string} id */
    snapshotFor(id) {
      return id === `detail:${issue.id}` ? [issue] : [];
    },
    subscribe() {
      return () => {};
    }
  };
}

describe('views/detail comment creation', () => {
  test('sends add-comment with issue id and trimmed text', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const issue = {
      id: 'UI-42',
      title: 'Test issue',
      status: 'open',
      priority: 2,
      comments: []
    };

    const updated_comments = [
      {
        id: 1,
        issue_id: 'UI-42',
        author: 'alice',
        text: 'Hello world',
        created_at: '2025-06-01T00:00:00Z'
      }
    ];

    const send = mockSend(async (type) => {
      if (type === 'add-comment') {
        return updated_comments;
      }
      return {};
    });

    const stores = createStores(issue);
    const view = createDetailView(mount, send, undefined, stores);
    await view.load('UI-42');

    // Type into the comment textarea
    const textarea = /** @type {HTMLTextAreaElement} */ (
      mount.querySelector('.comment-input textarea')
    );
    expect(textarea).not.toBeNull();
    textarea.value = '  Hello world  ';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Click the Add Comment button
    const button = /** @type {HTMLButtonElement} */ (
      mount.querySelector('.comment-input button')
    );
    expect(button).not.toBeNull();
    button.click();

    await vi.waitFor(() => {
      expect(send).toHaveBeenCalledWith('add-comment', {
        id: 'UI-42',
        text: 'Hello world'
      });
    });
  });

  test('renders existing comments', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const issue = {
      id: 'UI-43',
      title: 'With comments',
      status: 'open',
      priority: 2,
      comments: [
        {
          id: 1,
          author: 'bob',
          text: 'First note',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 2,
          author: 'carol',
          text: 'Second note',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]
    };

    const send = mockSend(async () => ({}));
    const stores = createStores(issue);
    const view = createDetailView(mount, send, undefined, stores);
    await view.load('UI-43');

    const items = mount.querySelectorAll('.comment-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.comment-author')?.textContent).toBe('bob');
    expect(items[0].querySelector('.comment-text')?.textContent).toBe(
      'First note'
    );
    expect(items[1].querySelector('.comment-author')?.textContent).toBe(
      'carol'
    );
  });

  test('disables button when comment text is empty', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const issue = {
      id: 'UI-44',
      title: 'Empty comment',
      status: 'open',
      priority: 2,
      comments: []
    };

    const send = mockSend(async () => ({}));
    const stores = createStores(issue);
    const view = createDetailView(mount, send, undefined, stores);
    await view.load('UI-44');

    const button = /** @type {HTMLButtonElement} */ (
      mount.querySelector('.comment-input button')
    );
    expect(button.disabled).toBe(true);
  });
});
