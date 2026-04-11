/**
 * Show a transient global toast message anchored to the viewport.
 *
 * @param {string} text - Message text.
 * @param {'info'|'success'|'error'} [variant] - Visual variant.
 * @param {number} [duration_ms] - Auto-dismiss delay in milliseconds.
 */
export function showToast(text, variant = 'info', duration_ms = 2800) {
  const el = document.createElement('div');
  el.className = `toast toast--${variant}`;
  el.textContent = text;
  (document.body || document.documentElement).appendChild(el);
  setTimeout(() => {
    el.classList.add('toast--out');
    el.addEventListener('animationend', () => {
      try {
        el.remove();
      } catch {
        /* ignore */
      }
    });
  }, duration_ms);
}
