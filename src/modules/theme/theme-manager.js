import { buildThemeCandidates, DEFAULT_THEME } from './class-themes.js';

function imageExists(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve('');
      return;
    }

    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => resolve('');
    image.src = encodeURI(src);
  });
}

async function findThemeImage(classe) {
  const candidates = buildThemeCandidates(classe);

  for (const candidate of candidates) {
    const found = await imageExists(candidate);
    if (found) return found;
  }

  return '';
}

export async function applyClassTheme(classe) {
  const theme = {
    ...DEFAULT_THEME,
    ...(classe?.tema || {})
  };
  const image = await findThemeImage(classe);
  const root = document.documentElement;

  root.style.setProperty('--theme-primary', theme.corPrimaria);
  root.style.setProperty('--theme-secondary', theme.corSecundaria);
  root.style.setProperty('--theme-accent', theme.corDestaque);
  root.style.setProperty('--theme-overlay', theme.overlay || DEFAULT_THEME.overlay);
  root.style.setProperty('--class-bg', image ? `url("${new URL(image, window.location.href).href}")` : 'none');
  document.body.dataset.themeClass = classe?.id || 'padrao';
}
