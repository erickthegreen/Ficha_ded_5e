import { calcularNivelTotal } from '../../core/calculations.js';

export function createClassEntry(id, options = {}) {
  return {
    id,
    nivel: Math.max(1, Number(options.nivel || 1)),
    subclasse: options.subclasse || '',
    principal: Boolean(options.principal)
  };
}

export function getPrimaryClassEntry(character) {
  return character.classes.find((entry) => entry.principal) || character.classes[0] || null;
}

export function syncCharacterLevels(character) {
  character.nivelTotal = Math.max(1, calcularNivelTotal(character.classes));

  if (character.classes.length && !character.classes.some((entry) => entry.principal)) {
    character.classes[0].principal = true;
  }

  if (character.classes.length === 1) {
    character.classes[0].principal = true;
  }

  return character;
}

export function normalizeCharacter(character) {
  character.classes = Array.isArray(character.classes) ? character.classes : [];
  character.classes = character.classes
    .filter((entry) => entry?.id)
    .map((entry, index) => ({
      id: entry.id,
      nivel: Math.max(1, Number(entry.nivel || 1)),
      subclasse: entry.subclasse || '',
      principal: Boolean(entry.principal || index === 0)
    }));

  character.combate = {
    pontosVidaAtual: '',
    pontosVidaMaxManual: '',
    classeArmaduraManual: '',
    bonusCAManual: 0,
    bonusIniciativa: 0,
    deslocamento: '',
    armaduraEquipadaId: '',
    escudoEquipado: false,
    ...(character.combate || {})
  };
  character.moedas = {
    pc: 0,
    pp: 0,
    pe: 0,
    po: 0,
    pl: 0,
    ...(character.moedas || {})
  };
  character.inventario = Array.isArray(character.inventario) ? character.inventario : [];
  character.magias = Array.isArray(character.magias) ? character.magias : [];

  return syncCharacterLevels(character);
}
