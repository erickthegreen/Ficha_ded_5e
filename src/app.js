import { createInitialState } from './core/state.js';
import { loadClasses } from './modules/classes/class-loader.js';
import { loadRaces } from './modules/races/race-loader.js';
import { loadAllItems } from './modules/items/item-normalizer.js';
import { applyClassTheme } from './modules/theme/theme-manager.js';
import { renderApp, getCurrentClass } from './ui/render.js';
import { setActiveTab } from './ui/tabs.js';
import { formatModifier } from './core/calculations.js';
import { normalizeCharacter } from './modules/character/character-model.js';
import {
  addCharacterClass,
  markPrimaryClass,
  removeCharacterClass,
  setPrimaryClass,
  updateClassLevel,
  updateClassSubclass
} from './modules/character/character-controller.js';
import { getItemById } from './modules/items/item-library.js';
import {
  addCustomItemToInventory,
  addItemToInventory,
  ensureInventory,
  removeInventoryItem,
  updateCoins,
  updateInventoryEntry
} from './modules/items/inventory-manager.js';
import {
  autoSaveCharacter,
  deleteCharacter,
  duplicateCharacter,
  listSavedCharacters,
  loadActiveCharacter,
  loadCharacter,
  saveCharacter
} from './modules/storage/storage-manager.js';
import { downloadCharacterJson, readImportedCharacter } from './modules/storage/import-export-json.js';
import { getNotificationText } from './ui/notifications.js';
import { downloadMarkdown } from './modules/markdown/markdown-exporter.js';
import { downloadEditablePdf } from './modules/pdf/pdf-exporter.js';
import {
  addSpellToCharacter,
  getSpellById,
  loadSpells,
  removeSpellFromCharacter,
  updateKnownSpell
} from './modules/spells/spell-manager.js';

const appRoot = document.querySelector('[data-app-root]');
const state = createInitialState();
normalizeCharacter(state.character);
const data = {
  classes: [],
  races: [],
  items: [],
  spells: [],
  savedCharacters: [],
  errors: []
};

let toast = '';
let toastTimer = null;
let autosaveTimer = null;

const FOCUS_ATTRIBUTES = [
  'data-field',
  'data-combat',
  'data-library-filter',
  'data-spell-filter',
  'data-inventory-field',
  'data-known-spell-field',
  'data-coin',
  'data-attribute',
  'data-multiclass-level',
  'data-multiclass-subclass',
  'data-storage-selected',
  'data-control'
];

function escapeSelectorValue(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ');
}

function getFocusSnapshot() {
  const element = document.activeElement;
  if (!element || !appRoot?.contains(element)) return null;
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return null;

  const attr = FOCUS_ATTRIBUTES.find((name) => element.hasAttribute(name));
  if (!attr) return null;

  let selector = `${element.tagName.toLowerCase()}[${attr}="${escapeSelectorValue(element.getAttribute(attr))}"]`;
  if (element.hasAttribute('data-inventory-id')) {
    selector += `[data-inventory-id="${escapeSelectorValue(element.getAttribute('data-inventory-id'))}"]`;
  }
  if (element.hasAttribute('data-spell-id')) {
    selector += `[data-spell-id="${escapeSelectorValue(element.getAttribute('data-spell-id'))}"]`;
  }

  const matches = [...appRoot.querySelectorAll(selector)];
  return {
    selector,
    index: Math.max(0, matches.indexOf(element)),
    selectionStart: typeof element.selectionStart === 'number' ? element.selectionStart : null,
    selectionEnd: typeof element.selectionEnd === 'number' ? element.selectionEnd : null
  };
}

function restoreFocus(snapshot) {
  if (!snapshot) return;

  window.requestAnimationFrame(() => {
    const matches = [...appRoot.querySelectorAll(snapshot.selector)];
    const element = matches[snapshot.index] || matches[0];
    if (!element) return;

    element.focus({ preventScroll: true });
    if (
      snapshot.selectionStart !== null &&
      snapshot.selectionEnd !== null &&
      typeof element.setSelectionRange === 'function'
    ) {
      element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    }
  });
}

function render() {
  const focusSnapshot = getFocusSnapshot();
  renderApp(appRoot, {
    state,
    classes: data.classes,
    races: data.races,
    items: data.items,
    spells: data.spells,
    savedCharacters: data.savedCharacters,
    errors: data.errors,
    toast
  });
  restoreFocus(focusSnapshot);
}

function showToast(message) {
  toast = message;
  window.clearTimeout(toastTimer);
  render();
  toastTimer = window.setTimeout(() => {
    toast = '';
    render();
  }, 2400);
}

async function refreshTheme() {
  await applyClassTheme(getCurrentClass(state, data.classes));
}

function refreshSavedCharacters() {
  data.savedCharacters = listSavedCharacters();
  if (!state.storage.selectedSaveId && data.savedCharacters[0]) {
    state.storage.selectedSaveId = data.savedCharacters[0].id;
  }
}

function markSaved(record) {
  state.character.saveId = record.id;
  state.storage.selectedSaveId = record.id;
  state.storage.lastSavedAt = new Date(record.updatedAt).toLocaleString('pt-BR');
  refreshSavedCharacters();
}

function scheduleAutosave() {
  if (!state.character.saveId) return;
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    const record = autoSaveCharacter(state.character);
    markSaved(record);
    render();
  }, 800);
}

function replaceCharacter(character) {
  const saveId = character.saveId || state.storage.selectedSaveId || '';
  const next = normalizeCharacter({
    ...state.character,
    ...character,
    saveId
  });
  state.character = next;
}

function updateField(name, value) {
  if (name.startsWith('customItem.')) {
    const key = name.split('.')[1];
    state.customItem[key] = value;
    return false;
  }

  if (name === 'nivelClassePrincipal') {
    const primaryIndex = state.character.classes.findIndex((entry) => entry.principal);
    if (primaryIndex >= 0) {
      updateClassLevel(state.character, primaryIndex, value);
      scheduleAutosave();
    }
    return true;
  }

  if (name === 'xp') {
    state.character[name] = Math.max(0, Number.parseInt(value, 10) || 0);
    return false;
  }

  state.character[name] = value;
  scheduleAutosave();
  return false;
}

function handleInput(event) {
  const field = event.target.closest('[data-field]');
  const attribute = event.target.closest('[data-attribute]');
  const combat = event.target.closest('[data-combat]');
  const multiclassLevel = event.target.closest('[data-multiclass-level]');
  const libraryFilter = event.target.closest('[data-library-filter]');
  const spellFilter = event.target.closest('[data-spell-filter]');
  const inventoryField = event.target.closest('[data-inventory-field]');
  const spellField = event.target.closest('[data-known-spell-field]');
  const coinField = event.target.closest('[data-coin]');

  if (field) {
    if (updateField(field.dataset.field, field.value)) render();
    return;
  }

  if (libraryFilter) {
    state.biblioteca[libraryFilter.dataset.libraryFilter] = libraryFilter.value;
    render();
    return;
  }

  if (spellFilter) {
    state.magias[spellFilter.dataset.spellFilter] = spellFilter.value;
    render();
    return;
  }

  if (attribute) {
    state.character.atributos[attribute.dataset.attribute] = Number.parseInt(attribute.value, 10) || 0;
    const card = attribute.closest('.attribute-card');
    const modifier = card?.querySelector('strong');
    if (modifier) modifier.textContent = formatModifier(attribute.value);
    scheduleAutosave();
    return;
  }

  if (combat) {
    const key = combat.dataset.combat;
    state.character.combate[key] = ['bonusCAManual', 'bonusIniciativa'].includes(key)
      ? Number(combat.value || 0)
      : combat.value;
    scheduleAutosave();
    return;
  }

  if (multiclassLevel) {
    updateClassLevel(state.character, multiclassLevel.dataset.multiclassLevel, multiclassLevel.value);
    scheduleAutosave();
    return;
  }

  if (inventoryField) {
    updateInventoryEntry(state.character, inventoryField.dataset.inventoryId, inventoryField.dataset.inventoryField, inventoryField.value);
    scheduleAutosave();
    return;
  }

  if (spellField) {
    updateKnownSpell(state.character, spellField.dataset.spellId, spellField.dataset.knownSpellField, spellField.value);
    scheduleAutosave();
    return;
  }

  if (coinField) {
    updateCoins(state.character, coinField.dataset.coin, coinField.value);
    scheduleAutosave();
  }
}

async function handleChange(event) {
  const field = event.target.closest('[data-field]');
  const control = event.target.closest('[data-control]');
  const multiclassLevel = event.target.closest('[data-multiclass-level]');
  const multiclassSubclass = event.target.closest('[data-multiclass-subclass]');
  const libraryFilter = event.target.closest('[data-library-filter]');
  const spellFilter = event.target.closest('[data-spell-filter]');
  const inventoryField = event.target.closest('[data-inventory-field]');
  const spellField = event.target.closest('[data-known-spell-field]');
  const coinField = event.target.closest('[data-coin]');
  const storageSelected = event.target.closest('[data-storage-selected]');
  const importFile = event.target.closest('[data-import-file]');

  if (importFile) {
    try {
      const imported = await readImportedCharacter(importFile.files?.[0]);
      replaceCharacter(imported);
      render();
      await refreshTheme();
      showToast(getNotificationText('imported'));
    } catch (error) {
      console.error(error);
      showToast(error.message || getNotificationText('error'));
    } finally {
      importFile.value = '';
    }
    return;
  }

  if (storageSelected) {
    state.storage.selectedSaveId = storageSelected.value;
    render();
    return;
  }

  if (libraryFilter) {
    state.biblioteca[libraryFilter.dataset.libraryFilter] = libraryFilter.value;
    render();
    return;
  }

  if (spellFilter) {
    state.magias[spellFilter.dataset.spellFilter] = spellFilter.value;
    render();
    return;
  }

  if (field?.dataset.field === 'nivelClassePrincipal') {
    updateField(field.dataset.field, field.value);
    render();
    return;
  }

  if (multiclassLevel) {
    updateClassLevel(state.character, multiclassLevel.dataset.multiclassLevel, multiclassLevel.value);
    scheduleAutosave();
    render();
    return;
  }

  if (multiclassSubclass) {
    updateClassSubclass(state.character, multiclassSubclass.dataset.multiclassSubclass, multiclassSubclass.value);
    scheduleAutosave();
    render();
    showToast(multiclassSubclass.value ? 'Subclasse atualizada.' : 'Subclasse removida.');
    return;
  }

  if (inventoryField) {
    updateInventoryEntry(
      state.character,
      inventoryField.dataset.inventoryId,
      inventoryField.dataset.inventoryField,
      inventoryField.type === 'checkbox' ? inventoryField.checked : inventoryField.value
    );
    scheduleAutosave();
    render();
    return;
  }

  if (spellField) {
    updateKnownSpell(
      state.character,
      spellField.dataset.spellId,
      spellField.dataset.knownSpellField,
      spellField.type === 'checkbox' ? spellField.checked : spellField.value
    );
    scheduleAutosave();
    render();
    return;
  }

  if (coinField) {
    updateCoins(state.character, coinField.dataset.coin, coinField.value);
    scheduleAutosave();
    render();
    return;
  }

  if (!control) return;

  if (control.dataset.control === 'class') {
    const classId = control.value;
    setPrimaryClass(state.character, classId);
    render();
    await refreshTheme();
    scheduleAutosave();
    showToast(classId ? 'Tema da classe aplicado.' : 'Tema padrão aplicado.');
    return;
  }

  if (control.dataset.control === 'race') {
    state.character.raca = control.value;
    scheduleAutosave();
    render();
    showToast(control.value ? 'Dados da raça carregados.' : 'Raça removida.');
    return;
  }

  if (control.dataset.control === 'subclass') {
    const primaryIndex = state.character.classes.findIndex((entry) => entry.principal);
    updateClassSubclass(state.character, primaryIndex, control.value);
    scheduleAutosave();
    render();
    showToast(control.value ? 'Subclasse selecionada.' : 'Subclasse removida.');
    return;
  }

  if (control.dataset.control === 'add-multiclass') {
    if (control.value) {
      addCharacterClass(state.character, control.value);
      scheduleAutosave();
      render();
      showToast('Classe adicionada à multiclasse.');
    }
    return;
  }

  if (control.dataset.control === 'armor') {
    state.character.combate.armaduraEquipadaId = control.value;
    scheduleAutosave();
    render();
    showToast(control.value ? 'Armadura equipada.' : 'Armadura removida.');
    return;
  }

  if (control.dataset.control === 'shield') {
    state.character.combate.escudoEquipado = control.checked;
    scheduleAutosave();
    render();
    showToast(control.checked ? 'Escudo equipado.' : 'Escudo removido.');
  }
}

function handleClick(event) {
  const tabButton = event.target.closest('[data-tab]');
  const futureButton = event.target.closest('[data-future-action]');
  const removeMulticlass = event.target.closest('[data-multiclass-remove]');
  const primaryMulticlass = event.target.closest('[data-multiclass-primary]');
  const librarySelect = event.target.closest('[data-library-select]');
  const libraryAdd = event.target.closest('[data-library-add]');
  const spellSelect = event.target.closest('[data-spell-select]');
  const spellAdd = event.target.closest('[data-spell-add]');
  const spellRemove = event.target.closest('[data-spell-remove]');
  const inventoryRemove = event.target.closest('[data-inventory-remove]');
  const customAdd = event.target.closest('[data-inventory-custom-add]');
  const storageAction = event.target.closest('[data-storage-action]');

  if (tabButton) {
    setActiveTab(state, tabButton.dataset.tab);
    render();
    return;
  }

  if (removeMulticlass) {
    removeCharacterClass(state.character, removeMulticlass.dataset.multiclassRemove);
    scheduleAutosave();
    render();
    refreshTheme();
    showToast('Classe removida.');
    return;
  }

  if (primaryMulticlass) {
    markPrimaryClass(state.character, primaryMulticlass.dataset.multiclassPrimary);
    scheduleAutosave();
    render();
    refreshTheme();
    showToast('Classe principal atualizada.');
    return;
  }

  if (librarySelect) {
    state.biblioteca.selectedItemId = librarySelect.dataset.librarySelect;
    render();
    return;
  }

  if (libraryAdd) {
    const item = getItemById(data.items, libraryAdd.dataset.libraryAdd);
    if (item) {
      addItemToInventory(state.character, item);
      scheduleAutosave();
      render();
      showToast(getNotificationText('addItem'));
    }
    return;
  }

  if (spellSelect) {
    state.magias.selectedSpellId = spellSelect.dataset.spellSelect;
    render();
    return;
  }

  if (spellAdd) {
    const spell = getSpellById(data.spells, spellAdd.dataset.spellAdd);
    if (spell) {
      addSpellToCharacter(state.character, spell);
      scheduleAutosave();
      render();
      showToast('Magia adicionada.');
    }
    return;
  }

  if (spellRemove) {
    removeSpellFromCharacter(state.character, spellRemove.dataset.spellRemove);
    scheduleAutosave();
    render();
    showToast('Magia removida.');
    return;
  }

  if (inventoryRemove) {
    removeInventoryItem(state.character, inventoryRemove.dataset.inventoryRemove);
    scheduleAutosave();
    render();
    showToast(getNotificationText('removeItem'));
    return;
  }

  if (customAdd) {
    if (!state.customItem.nome.trim()) {
      showToast('Informe o nome do item personalizado.');
      return;
    }
    addCustomItemToInventory(state.character, state.customItem);
    state.customItem = {
      nome: '',
      categoria: 'custom',
      tipo: 'Item personalizado',
      preco: '',
      peso: '',
      dano: '',
      tipoDano: '',
      ca: '',
      descricao: ''
    };
    scheduleAutosave();
    render();
    showToast(getNotificationText('addItem'));
    return;
  }

  if (storageAction) {
    handleStorageAction(storageAction.dataset.storageAction);
    return;
  }

  if (futureButton) {
    showToast('Esta exportação será implementada em uma fase futura.');
  }
}

async function handleStorageAction(action) {
  try {
    if (action === 'save' || action === 'autosave') {
      const record = saveCharacter(state.character, state.character.saveId || null);
      markSaved(record);
      render();
      showToast(getNotificationText('saved'));
      return;
    }

    if (action === 'load') {
      const character = loadCharacter(state.storage.selectedSaveId);
      if (!character) {
        showToast('Selecione um personagem salvo.');
        return;
      }
      replaceCharacter(character);
      refreshSavedCharacters();
      render();
      await refreshTheme();
      showToast(getNotificationText('loaded'));
      return;
    }

    if (action === 'duplicate') {
      const record = duplicateCharacter(state.storage.selectedSaveId);
      if (!record) {
        showToast('Selecione um personagem salvo.');
        return;
      }
      markSaved(record);
      render();
      showToast(getNotificationText('duplicated'));
      return;
    }

    if (action === 'delete') {
      if (!state.storage.selectedSaveId) {
        showToast('Selecione um personagem salvo.');
        return;
      }
      deleteCharacter(state.storage.selectedSaveId);
      state.storage.selectedSaveId = '';
      refreshSavedCharacters();
      render();
      showToast(getNotificationText('deleted'));
      return;
    }

    if (action === 'export-json') {
      downloadCharacterJson(state.character);
      showToast(getNotificationText('exported'));
      return;
    }

    if (action === 'export-markdown') {
      downloadMarkdown({
        character: state.character,
        classes: data.classes,
        races: data.races,
        items: data.items,
        spells: data.spells
      });
      showToast('Markdown exportado.');
      return;
    }

    if (action === 'export-pdf') {
      showToast('Gerando PDF editável...');
      await downloadEditablePdf({
        character: state.character,
        classes: data.classes,
        races: data.races,
        items: data.items,
        spells: data.spells
      });
      showToast('PDF editável exportado.');
      return;
    }

    if (action === 'print') {
      window.print();
      return;
    }

    if (action === 'import-json') {
      appRoot.querySelector('[data-import-file]')?.click();
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || getNotificationText('error'));
  }
}

async function init() {
  if (!appRoot) return;

  const errors = [];

  const [classData, raceData, itemData, spellData] = await Promise.all([
    loadClasses({ onError: (error) => errors.push(error) }),
    loadRaces({ onError: (error) => errors.push(error) }),
    loadAllItems({ onError: (error) => errors.push(error) }),
    loadSpells({ onError: (error) => errors.push(error) })
  ]);

  data.classes = classData.classes;
  data.races = raceData.races;
  data.items = itemData.items;
  data.spells = spellData.spells;
  data.errors = [...new Set([...errors, ...classData.errors, ...raceData.errors, ...itemData.errors, ...spellData.errors])];
  normalizeCharacter(state.character);
  ensureInventory(state.character);
  refreshSavedCharacters();

  const activeCharacter = loadActiveCharacter();
  if (activeCharacter) {
    replaceCharacter(activeCharacter);
  }

  appRoot.addEventListener('input', handleInput);
  appRoot.addEventListener('change', handleChange);
  appRoot.addEventListener('click', handleClick);

  render();
  await refreshTheme();
}

init();
