import { slugify } from '../../utils/slug.js';

const BACKGROUNDS_URL = new URL('../../../data/antecedentes.json', import.meta.url);
BACKGROUNDS_URL.searchParams.set('v', '20260526-antecedentes');

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.antecedentes)) return data.antecedentes;
  if (data && typeof data === 'object') return [data];
  return [];
}

export function normalizeBackground(background) {
  const id = slugify(background.id || background.nome);
  return {
    ...background,
    id,
    nome: background.nome || id,
    pericias: Array.isArray(background.pericias) ? background.pericias : [],
    ferramentas: Array.isArray(background.ferramentas) ? background.ferramentas : [],
    idiomas: background.idiomas || 'Nenhum',
    ouro: background.ouro || ''
  };
}

export function getBackgroundById(backgrounds, idOrName) {
  const normalized = slugify(idOrName);
  return backgrounds.find((background) => background.id === normalized || slugify(background.nome) === normalized) || null;
}

export async function loadBackgrounds(options = {}) {
  const errors = [];

  try {
    const response = await fetch(BACKGROUNDS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const backgrounds = asArray(json)
      .map(normalizeBackground)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return { backgrounds, errors };
  } catch (error) {
    const message = `Falha ao carregar data/antecedentes.json: ${error.message}`;
    errors.push(message);
    console.error(message, error);
    options.onError?.(message);
    return { backgrounds: [], errors };
  }
}
