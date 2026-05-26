export const STORAGE_KEY = 'dnd5e-fichas-personagens-v1';
export const ACTIVE_CHARACTER_KEY = 'dnd5e-ficha-ativa-v1';

function canUseStorage() {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readStore() {
  if (!canUseStorage()) return { personagens: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { personagens: [] };
    const parsed = JSON.parse(raw);
    return {
      personagens: Array.isArray(parsed.personagens) ? parsed.personagens : []
    };
  } catch (error) {
    console.error('Erro ao ler personagens salvos.', error);
    return { personagens: [] };
  }
}

function writeStore(store) {
  if (!canUseStorage()) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  return true;
}

function createSaveRecord(character, id = null) {
  const now = new Date().toISOString();
  return {
    id: id || `personagem-${Date.now()}`,
    nome: character.nome || 'Personagem sem nome',
    updatedAt: now,
    character
  };
}

export function listSavedCharacters() {
  return readStore().personagens.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function saveCharacter(character, id = null) {
  const store = readStore();
  const recordId = id || character.saveId || null;
  const existingIndex = recordId ? store.personagens.findIndex((entry) => entry.id === recordId) : -1;
  const record = createSaveRecord(structuredClone(character), recordId);

  if (existingIndex >= 0) store.personagens[existingIndex] = record;
  else store.personagens.push(record);

  writeStore(store);
  if (canUseStorage()) localStorage.setItem(ACTIVE_CHARACTER_KEY, record.id);
  return record;
}

export function autoSaveCharacter(character) {
  return saveCharacter(character, character.saveId || null);
}

export function loadCharacter(saveId) {
  const record = readStore().personagens.find((entry) => entry.id === saveId);
  return record ? structuredClone(record.character) : null;
}

export function loadActiveCharacter() {
  if (!canUseStorage()) return null;
  const activeId = localStorage.getItem(ACTIVE_CHARACTER_KEY);
  return activeId ? loadCharacter(activeId) : null;
}

export function deleteCharacter(saveId) {
  const store = readStore();
  store.personagens = store.personagens.filter((entry) => entry.id !== saveId);
  writeStore(store);
  return store.personagens;
}

export function duplicateCharacter(saveId) {
  const character = loadCharacter(saveId);
  if (!character) return null;
  character.nome = `${character.nome || 'Personagem'} (cópia)`;
  delete character.saveId;
  return saveCharacter(character);
}
