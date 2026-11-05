// Minimal hash router: shows the matching [data-view] section and marks the active nav link.
const DEFAULT_ROUTE = 'home';

export function currentRoute() {
  const name = location.hash.replace(/^#/, '');
  return document.querySelector(`[data-view="${CSS.escape(name)}"]`) ? name : DEFAULT_ROUTE;
}

export function render({ focus = false } = {}) {
  const route = currentRoute();
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.hidden = el.dataset.view !== route;
  });
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const heading = document.querySelector(`[data-view="${route}"] h1`);
  document.title = route === DEFAULT_ROUTE ? 'ColourSight' : `${heading?.textContent ?? route} | ColourSight`;
  if (focus) document.getElementById('main')?.focus();
}

window.addEventListener('hashchange', () => render({ focus: true }));
render();
