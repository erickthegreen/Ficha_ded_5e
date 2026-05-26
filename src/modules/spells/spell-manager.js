const SPELLS_URL = new URL('../../../data/magias.json', import.meta.url);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.magias)) return data.magias;
  return [];
}

export function normalizeSpell(spell) {
  return {
    id: spell.id || '',
    nome: spell.nome || '',
    nomeIngles: spell.nomeIngles || '',
    circulo: Number(spell.circulo || 0),
    nivelTexto: spell.nivelTexto || (Number(spell.circulo || 0) === 0 ? 'Truque' : `${spell.circulo}º Círculo`),
    escola: spell.escola || '',
    classes: Array.isArray(spell.classes) ? spell.classes : [],
    classeIds: Array.isArray(spell.classeIds) ? spell.classeIds : [],
    tempoConjuracao: spell.tempoConjuracao || '',
    alcance: spell.alcance || '',
    componentes: spell.componentes || '',
    duracao: spell.duracao || '',
    descricao: spell.descricao || '',
    fonte: spell.fonte || '',
    raw: spell.raw || spell
  };
}

export async function loadSpells(options = {}) {
  const errors = [];

  try {
    const response = await fetch(SPELLS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    return {
      spells: asArray(json).map(normalizeSpell).sort((a, b) => a.nome.localeCompare(b.nome)),
      errors
    };
  } catch (error) {
    const message = `Falha ao carregar data/magias.json: ${error.message}`;
    errors.push(message);
    console.error(message, error);
    options.onError?.(message);
    return { spells: [], errors };
  }
}

export function getSpellById(spells = [], spellId = '') {
  return spells.find((spell) => spell.id === spellId) || null;
}

export function getSpellCircles(spells = []) {
  return [...new Set(spells.map((spell) => Number(spell.circulo || 0)))]
    .sort((a, b) => a - b);
}

export function getSpellSchools(spells = []) {
  return [...new Set(spells.map((spell) => spell.escola).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function matchesCharacterClasses(spell, characterClassIds = []) {
  if (!characterClassIds.length) return true;
  return spell.classeIds.some((classId) => characterClassIds.includes(classId));
}

export function searchSpells(spells = [], filters = {}, characterClassIds = []) {
  const query = normalizeText(filters.query);
  const circle = filters.circle;
  const school = filters.school || '';
  const classId = filters.classId || 'personagem';

  return spells
    .filter((spell) => {
      if (circle !== '' && circle !== null && circle !== undefined && Number(spell.circulo) !== Number(circle)) return false;
      if (school && spell.escola !== school) return false;
      if (classId === 'personagem' && !matchesCharacterClasses(spell, characterClassIds)) return false;
      if (classId && classId !== 'personagem' && !spell.classeIds.includes(classId)) return false;

      if (!query) return true;
      const haystack = normalizeText([
        spell.nome,
        spell.nomeIngles,
        spell.nivelTexto,
        spell.escola,
        spell.classes.join(' '),
        spell.tempoConjuracao,
        spell.alcance,
        spell.componentes,
        spell.duracao,
        spell.descricao,
        spell.fonte
      ].join(' '));

      return query.split(/\s+/).every((part) => haystack.includes(part));
    })
    .sort((a, b) => a.circulo - b.circulo || a.nome.localeCompare(b.nome));
}

export function createKnownSpellEntry(spell, options = {}) {
  return {
    instanceId: options.instanceId || `${spell.id}-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    spellId: spell.id,
    id: spell.id,
    nome: spell.nome,
    nomeIngles: spell.nomeIngles,
    circulo: spell.circulo,
    nivelTexto: spell.nivelTexto,
    escola: spell.escola,
    classes: spell.classes,
    classeIds: spell.classeIds,
    tempoConjuracao: spell.tempoConjuracao,
    alcance: spell.alcance,
    componentes: spell.componentes,
    duracao: spell.duracao,
    descricao: spell.descricao,
    fonte: spell.fonte,
    preparada: Boolean(options.preparada),
    observacao: options.observacao || ''
  };
}

export function addSpellToCharacter(character, spell, options = {}) {
  character.magias = Array.isArray(character.magias) ? character.magias : [];
  const existing = character.magias.find((entry) => entry.spellId === spell.id);
  if (existing && !options.forceNew) return existing;

  const entry = createKnownSpellEntry(spell, options);
  character.magias.push(entry);
  return entry;
}

export function removeSpellFromCharacter(character, instanceId) {
  character.magias = Array.isArray(character.magias) ? character.magias : [];
  character.magias = character.magias.filter((entry) => entry.instanceId !== instanceId);
  return character;
}

export function updateKnownSpell(character, instanceId, field, value) {
  character.magias = Array.isArray(character.magias) ? character.magias : [];
  const entry = character.magias.find((candidate) => candidate.instanceId === instanceId);
  if (!entry) return null;

  if (field === 'preparada') entry.preparada = Boolean(value);
  else entry[field] = value;

  return entry;
}
