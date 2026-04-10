import { describe, expect, test } from 'vitest';
import { createDetailView } from './detail.js';

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

describe('views/detail timestamps (#42)', () => {
  test('displays created_at timestamp in properties sidebar', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const issue = {
      id: 'UI-42',
      title: 'Timestamp test',
      status: 'open',
      priority: 2,
      created_at: '2026-03-15T10:30:00Z',
      dependencies: [],
      dependents: []
    };

    const stores = createStores(issue);
    const view = createDetailView(mount, async () => ({}), undefined, stores);
    await view.load('UI-42');

    const props = mount.querySelectorAll('#detail-root .prop');
    const labels = Array.from(props).map(
      (p) => p.querySelector('.label')?.textContent
    );
    expect(labels).toContain('Created');

    const created_prop = Array.from(props).find(
      (p) => p.querySelector('.label')?.textContent === 'Created'
    );
    const created_value = created_prop?.querySelector('.value')?.textContent;
    expect(created_value).toBeTruthy();
    expect(created_value).toContain('2026');
  });

  test('displays closed_at timestamp when issue is closed', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const issue = {
      id: 'UI-43',
      title: 'Closed issue',
      status: 'closed',
      priority: 1,
      created_at: '2026-03-10T08:00:00Z',
      closed_at: '2026-03-20T14:45:00Z',
      dependencies: [],
      dependents: []
    };

    const stores = createStores(issue);
    const view = createDetailView(mount, async () => ({}), undefined, stores);
    await view.load('UI-43');

    const props = mount.querySelectorAll('#detail-root .prop');
    const labels = Array.from(props).map(
      (p) => p.querySelector('.label')?.textContent
    );
    expect(labels).toContain('Created');
    expect(labels).toContain('Closed');

    const closed_prop = Array.from(props).find(
      (p) => p.querySelector('.label')?.textContent === 'Closed'
    );
    const closed_value = closed_prop?.querySelector('.value')?.textContent;
    expect(closed_value).toBeTruthy();
    expect(closed_value).toContain('2026');
  });

  test('does not display closed_at when issue is open', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const issue = {
      id: 'UI-44',
      title: 'Open issue',
      status: 'open',
      priority: 2,
      created_at: '2026-04-01T12:00:00Z',
      dependencies: [],
      dependents: []
    };

    const stores = createStores(issue);
    const view = createDetailView(mount, async () => ({}), undefined, stores);
    await view.load('UI-44');

    const props = mount.querySelectorAll('#detail-root .prop');
    const labels = Array.from(props).map(
      (p) => p.querySelector('.label')?.textContent
    );
    expect(labels).toContain('Created');
    expect(labels).not.toContain('Closed');
  });

  test('omits timestamps when neither created_at nor closed_at exists', async () => {
    document.body.innerHTML =
      '<section class="panel"><div id="mount"></div></section>';
    const mount = /** @type {HTMLElement} */ (document.getElementById('mount'));

    const issue = {
      id: 'UI-45',
      title: 'No timestamps',
      status: 'open',
      priority: 2,
      dependencies: [],
      dependents: []
    };

    const stores = createStores(issue);
    const view = createDetailView(mount, async () => ({}), undefined, stores);
    await view.load('UI-45');

    const props = mount.querySelectorAll('#detail-root .prop');
    const labels = Array.from(props).map(
      (p) => p.querySelector('.label')?.textContent
    );
    expect(labels).not.toContain('Created');
    expect(labels).not.toContain('Closed');
  });
});
