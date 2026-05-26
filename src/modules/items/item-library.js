import { slugify } from '../../utils/slug.js';

export const MINIMUM_CATEGORIES = [
  'armas',
  'armaduras',
  'escudos',
  'ferramentas',
  'kits',
  'equipamento de aventura',
  'frascos',
  'venenos',
  'bugigangas',
  'serviços',
  'montarias',
  'veículos',
  'itens diversos',
  'itens personalizados'
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getDisplayCategory(item) {
  const text = normalizeText(`${item.categoria} ${item.tipo} ${item.uso} ${item.nome}`);

  if (text.includes('escudo')) return 'escudos';
  if (item.categoria === 'armas') return 'armas';
  if (item.categoria === 'armaduras') return 'armaduras';
  if (item.categoria === 'kits') {
    if (text.includes('ferramenta')) return 'ferramentas';
    return 'kits';
  }
  if (item.categoria === 'frascos') {
    if (text.includes('veneno')) return 'venenos';
    return 'frascos';
  }
  if (item.categoria === 'bugigangas') return 'bugigangas';
  if (item.categoria === 'comercio') return 'serviços';
  if (item.categoria === 'montarias') {
    if (text.includes('veiculo') || text.includes('carroca') || text.includes('barco') || text.includes('navio')) return 'veículos';
    return 'montarias';
  }
  if (item.categoria === 'custom') return 'itens personalizados';
  if (item.categoria === 'backpack') return 'equipamento de aventura';

  return 'itens diversos';
}

export function getItemTypes(items = []) {
  return [...new Set(items.map((item) => item.tipo || item.uso || '').filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

export function getItemCategories(items = []) {
  const existing = items.map(getDisplayCategory);
  return [...new Set([...MINIMUM_CATEGORIES, ...existing])]
    .sort((a, b) => a.localeCompare(b));
}

export function searchItems(items = [], filters = {}) {
  const query = normalizeText(filters.query);
  const category = filters.category || '';
  const type = filters.type || '';

  return items
    .filter((item) => {
      if (category && getDisplayCategory(item) !== category) return false;
      if (type && (item.tipo || item.uso || '') !== type) return false;

      if (!query) return true;

      const haystack = normalizeText([
        item.nome,
        item.categoria,
        item.tipo,
        item.uso,
        item.preco,
        item.peso,
        item.dano,
        item.tipoDano,
        item.ca,
        Array.isArray(item.propriedades) ? item.propriedades.join(' ') : '',
        item.descricao
      ].join(' '));

      return query.split(/\s+/).every((part) => haystack.includes(part));
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function getItemById(items = [], itemId) {
  return items.find((item) => item.id === itemId) || null;
}

export function createCustomLibraryItem(fields = {}) {
  const nome = String(fields.nome || 'Item personalizado').trim() || 'Item personalizado';
  return {
    id: `custom-${slugify(nome)}-${Date.now()}`,
    nome,
    categoria: 'custom',
    tipo: fields.tipo || 'Item personalizado',
    uso: fields.tipo || 'Item personalizado',
    raridade: fields.raridade || 'Comum',
    bonus: fields.bonus || '0',
    preco: fields.preco || '',
    peso: fields.peso || '',
    dano: fields.dano || '',
    tipoDano: fields.tipoDano || '',
    ca: fields.ca || '',
    propriedades: [],
    descricao: fields.descricao || 'Item personalizado criado manualmente.',
    efeitoCriado: true,
    custom: true,
    raw: fields
  };
}
