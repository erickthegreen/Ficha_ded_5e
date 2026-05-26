import { slugify } from '../../utils/slug.js';

export const ITEM_DATA_FILES = {
  todos: 'itens.json',
  armas: 'armas.json',
  armaduras: 'armaduras.json',
  bensServicos: 'bens-servicos.json',
  bugigangas: 'bugigangas.json',
  frascosConsumiveis: 'frascos-consumiveis.json',
  itensDiversos: 'itens-diversos.json',
  kitsFerramentas: 'kits-ferramentas.json',
  montariasVeiculos: 'montarias-veiculos.json'
};

function asArray(data, key = 'itens') {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && typeof data === 'object') return [data];
  return [];
}

export function normalizeItem(item) {
  const categoria = item.categoria || '';
  const nome = item.nome || '';

  return {
    id: slugify(item.id || `${categoria}-${nome}`),
    nome,
    categoria,
    tipo: item.tipo || item.uso || '',
    uso: item.uso || item.tipo || '',
    raridade: item.raridade || 'Comum',
    bonus: item.bonus || '0',
    preco: item.preco || '',
    peso: item.peso || '',
    dano: item.dano || '',
    tipoDano: item.tipoDano || '',
    ca: item.ca || '',
    propriedades: Array.isArray(item.propriedades) ? item.propriedades : [],
    descricao: item.descricao || item.detalhes || '',
    efeitoCriado: Boolean(item.efeitoCriado),
    raw: item.raw || item
  };
}

export async function loadItemFile(fileName, options = {}) {
  const errors = [];
  const url = new URL(`../../../data/${fileName}`, import.meta.url);

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const items = asArray(json).map(normalizeItem);
    return { items, errors };
  } catch (error) {
    const message = `Falha ao carregar data/${fileName}: ${error.message}`;
    errors.push(message);
    console.error(message, error);
    options.onError?.(message);
    return { items: [], errors };
  }
}

export async function loadAllItems(options = {}) {
  const files = Object.values(ITEM_DATA_FILES);
  const results = await Promise.all(files.map((fileName) => loadItemFile(fileName, options)));
  const errors = results.flatMap((result) => result.errors);
  const itemsById = new Map();

  for (const result of results) {
    for (const item of result.items) {
      if (!itemsById.has(item.id)) itemsById.set(item.id, item);
    }
  }

  return {
    items: [...itemsById.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    errors
  };
}
