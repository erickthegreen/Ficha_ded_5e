import { slugify } from '../../utils/slug.js';

const RACES_URL = new URL('../../../data/racas.json', import.meta.url);

function asArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && typeof data === 'object') return [data];
  return [];
}

function normalizeRace(raca) {
  const id = slugify(raca.id || raca.nome);
  return {
    ...raca,
    id,
    nome: raca.nome || id,
    deslocamento: Number(raca.deslocamento || raca.deslocamento_m || 0),
    bonusAtributos: raca.bonusAtributos || raca.atributos || {},
    idiomas: Array.isArray(raca.idiomas) ? raca.idiomas : [],
    proficiencias: Array.isArray(raca.proficiencias) ? raca.proficiencias : [],
    habilidades: Array.isArray(raca.habilidades) ? raca.habilidades : [],
    raw: raca.raw || raca
  };
}

export async function loadRaces(options = {}) {
  const errors = [];

  try {
    const response = await fetch(RACES_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const races = asArray(json, 'racas').map(normalizeRace);
    return { races, errors };
  } catch (error) {
    const message = `Falha ao carregar data/racas.json: ${error.message}`;
    errors.push(message);
    console.error(message, error);
    options.onError?.(message);
    return { races: [], errors };
  }
}
