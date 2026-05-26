import { createCustomLibraryItem } from './item-library.js';

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replace(/\./g, '').replace(',', '.');
  const match = normalized.match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function parseWeightKg(value) {
  return parseNumber(value);
}

export function createInventoryEntry(item, options = {}) {
  return {
    instanceId: options.instanceId || `${item.id || 'item'}-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    itemId: item.id || '',
    id: item.id || '',
    nome: item.nome || '',
    categoria: item.categoria || '',
    tipo: item.tipo || item.uso || '',
    quantidade: Math.max(1, Number(options.quantidade || 1)),
    equipado: Boolean(options.equipado),
    peso: item.peso || '',
    preco: item.preco || '',
    dano: item.dano || '',
    tipoDano: item.tipoDano || '',
    ca: item.ca || '',
    bonus: item.bonus || '',
    propriedades: Array.isArray(item.propriedades) ? item.propriedades : [],
    descricao: item.descricao || '',
    observacao: options.observacao || '',
    custom: Boolean(item.custom),
    raw: item.raw || item
  };
}

export function ensureInventory(character) {
  character.inventario = Array.isArray(character.inventario) ? character.inventario : [];
  character.moedas = {
    pc: 0,
    pp: 0,
    pe: 0,
    po: 0,
    pl: 0,
    ...(character.moedas || {})
  };
  return character;
}

export function addItemToInventory(character, item, options = {}) {
  ensureInventory(character);
  const existing = character.inventario.find((entry) => entry.itemId === item.id && !entry.custom && !options.forceNew);

  if (existing) {
    existing.quantidade = Math.max(1, Number(existing.quantidade || 1)) + Math.max(1, Number(options.quantidade || 1));
    return existing;
  }

  const entry = createInventoryEntry(item, options);
  character.inventario.push(entry);
  return entry;
}

export function addCustomItemToInventory(character, fields) {
  const item = createCustomLibraryItem(fields);
  return addItemToInventory(character, item, { forceNew: true });
}

export function removeInventoryItem(character, instanceId) {
  ensureInventory(character);
  character.inventario = character.inventario.filter((entry) => entry.instanceId !== instanceId);
  return character;
}

export function updateInventoryEntry(character, instanceId, field, value) {
  ensureInventory(character);
  const entry = character.inventario.find((candidate) => candidate.instanceId === instanceId);
  if (!entry) return null;

  if (field === 'quantidade') entry.quantidade = Math.max(1, Number(value || 1));
  else if (field === 'equipado') entry.equipado = Boolean(value);
  else entry[field] = value;

  return entry;
}

export function updateCoins(character, coin, value) {
  ensureInventory(character);
  character.moedas[coin] = Math.max(0, Number(value || 0));
  return character.moedas;
}

export function getInventoryWeight(character) {
  ensureInventory(character);
  return character.inventario.reduce((total, entry) => {
    return total + parseWeightKg(entry.peso) * Math.max(1, Number(entry.quantidade || 1));
  }, 0);
}

export function getEquippedArmorEntry(character) {
  ensureInventory(character);
  return character.inventario.find((entry) => {
    const text = `${entry.categoria} ${entry.tipo} ${entry.nome}`.toLowerCase();
    return entry.equipado && text.includes('armadura') && !text.includes('escudo');
  }) || null;
}

export function getEquippedShieldEntry(character) {
  ensureInventory(character);
  return character.inventario.find((entry) => {
    const text = `${entry.categoria} ${entry.tipo} ${entry.nome}`.toLowerCase();
    return entry.equipado && text.includes('escudo');
  }) || null;
}

export function getEquippedWeapons(character) {
  ensureInventory(character);
  return character.inventario.filter((entry) => {
    const text = `${entry.categoria} ${entry.tipo} ${entry.nome}`.toLowerCase();
    return entry.equipado && (entry.categoria === 'armas' || text.includes('arma'));
  });
}
