import { $ } from './dom.js';
import { moon, sun } from './icons.js';

export function initTheme() {
  const dark = localStorage.getItem('docs-theme') === 'dark';
  if (dark) document.documentElement.classList.add('dark');
  $('theme-btn').innerHTML = dark ? sun : moon;

  $('theme-btn').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    $('theme-btn').innerHTML = isDark ? sun : moon;
    localStorage.setItem('docs-theme', isDark ? 'dark' : 'light');
  });
}
