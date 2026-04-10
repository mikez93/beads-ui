import { html, render } from 'lit-html';
import { debug } from '../utils/logging.js';

/**
 * @typedef {import('../state.js').WorkspaceInfo} WorkspaceInfo
 */

/**
 * Extract the project name from a workspace path. Returns just the directory
 * name (e.g., 'myproject' from '/home/user/code/myproject').
 *
 * @param {string} workspace_path
 * @returns {string}
 */
export function getProjectName(workspace_path) {
  if (!workspace_path) return 'Unknown';
  const parts = workspace_path.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : 'Unknown';
}

/**
 * Build a display label for a workspace, appending a disambiguator when
 * multiple workspaces share the same basename.
 *
 * Strategy:
 *   1. If no collision → bare basename (e.g. `myrepo`)
 *   2. If collision and branch available → `myrepo (feature-a)`
 *   3. If collision but no branch → `myrepo (parent-dir)`
 *
 * @param {WorkspaceInfo} ws
 * @param {WorkspaceInfo[]} all_workspaces
 * @returns {string}
 */
export function getDisplayLabel(ws, all_workspaces) {
  const name = getProjectName(ws.path);
  const duplicates = all_workspaces.filter(
    (other) => getProjectName(other.path) === name
  );
  if (duplicates.length <= 1) {
    return name;
  }
  // Disambiguate: prefer branch, fall back to parent directory
  if (ws.branch) {
    return `${name} (${ws.branch})`;
  }
  const parts = ws.path.split('/').filter(Boolean);
  const parent = parts.length >= 2 ? parts[parts.length - 2] : '';
  return parent ? `${name} (${parent})` : name;
}

/**
 * Create the workspace picker dropdown component.
 *
 * @param {HTMLElement} mount_element
 * @param {{ getState: () => any, subscribe: (fn: (s: any) => void) => () => void }} store
 * @param {(workspace_path: string) => Promise<void>} onWorkspaceChange
 */
export function createWorkspacePicker(mount_element, store, onWorkspaceChange) {
  const log = debug('views:workspace-picker');
  /** @type {(() => void) | null} */
  let unsubscribe = null;
  /** @type {boolean} */
  let is_switching = false;

  /**
   * Handle workspace selection change.
   *
   * @param {Event} ev
   */
  async function onChange(ev) {
    const select = /** @type {HTMLSelectElement} */ (ev.target);
    const new_path = select.value;
    const s = store.getState();
    const current_path = s.workspace?.current?.path || '';

    if (new_path && new_path !== current_path) {
      log('switching workspace to %s', new_path);
      is_switching = true;
      doRender();
      try {
        await onWorkspaceChange(new_path);
      } catch (err) {
        log('workspace switch failed: %o', err);
      } finally {
        is_switching = false;
        doRender();
      }
    }
  }

  function template() {
    const s = store.getState();
    const current = s.workspace?.current;
    const available = s.workspace?.available || [];

    // Don't render if no workspaces available
    if (available.length === 0) {
      return html``;
    }

    // If only one workspace, show it as a simple label
    if (available.length === 1) {
      const name = getDisplayLabel(available[0], available);
      return html`
        <div class="workspace-picker workspace-picker--single">
          <span class="workspace-picker__label" title="${available[0].path}"
            >${name}</span
          >
        </div>
      `;
    }

    // Multiple workspaces: show dropdown
    const current_path = current?.path || '';
    return html`
      <div class="workspace-picker">
        <select
          class="workspace-picker__select"
          @change=${onChange}
          ?disabled=${is_switching}
          aria-label="Select project workspace"
        >
          ${available.map(
            (/** @type {WorkspaceInfo} */ ws) => html`
              <option
                value="${ws.path}"
                ?selected=${ws.path === current_path}
                title="${ws.path}"
              >
                ${getDisplayLabel(ws, available)}
              </option>
            `
          )}
        </select>
        ${is_switching
          ? html`<span
              class="workspace-picker__loading"
              aria-hidden="true"
            ></span>`
          : ''}
      </div>
    `;
  }

  function doRender() {
    render(template(), mount_element);
  }

  doRender();
  unsubscribe = store.subscribe(() => doRender());

  return {
    destroy() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      render(html``, mount_element);
    }
  };
}
