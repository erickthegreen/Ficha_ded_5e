import { createClassEntry, syncCharacterLevels } from './character-model.js';

export function setPrimaryClass(character, classId) {
  if (!classId) {
    character.classes = [];
    character.subclasse = '';
    return syncCharacterLevels(character);
  }

  const currentPrimary = character.classes.find((entry) => entry.principal) || character.classes[0];
  const existing = character.classes.find((entry) => entry.id === classId);

  if (existing) {
    character.classes.forEach((entry) => {
      entry.principal = entry === existing;
    });
  } else if (currentPrimary) {
    currentPrimary.id = classId;
    currentPrimary.subclasse = '';
    currentPrimary.principal = true;
    character.classes.forEach((entry) => {
      if (entry !== currentPrimary) entry.principal = false;
    });
  } else {
    character.classes.push(createClassEntry(classId, {
      nivel: character.nivelTotal || 1,
      principal: true
    }));
  }

  const primary = character.classes.find((entry) => entry.principal);
  character.subclasse = primary?.subclasse || '';
  return syncCharacterLevels(character);
}

export function addCharacterClass(character, classId) {
  if (!classId || character.classes.some((entry) => entry.id === classId)) {
    return syncCharacterLevels(character);
  }

  character.classes.push(createClassEntry(classId, {
    nivel: 1,
    principal: character.classes.length === 0
  }));

  return syncCharacterLevels(character);
}

export function removeCharacterClass(character, index) {
  const position = Number(index);
  if (Number.isNaN(position) || position < 0 || position >= character.classes.length) {
    return syncCharacterLevels(character);
  }

  const [removed] = character.classes.splice(position, 1);
  if (removed?.principal && character.classes[0]) {
    character.classes[0].principal = true;
  }

  const primary = character.classes.find((entry) => entry.principal);
  character.subclasse = primary?.subclasse || '';
  return syncCharacterLevels(character);
}

export function updateClassLevel(character, index, level) {
  const entry = character.classes[Number(index)];
  if (!entry) return syncCharacterLevels(character);

  entry.nivel = Math.max(1, Math.min(20, Number(level || 1)));
  return syncCharacterLevels(character);
}

export function updateClassSubclass(character, index, subclassId) {
  const entry = character.classes[Number(index)];
  if (!entry) return syncCharacterLevels(character);

  entry.subclasse = subclassId || '';
  if (entry.principal) character.subclasse = entry.subclasse;
  return syncCharacterLevels(character);
}

export function markPrimaryClass(character, index) {
  const position = Number(index);
  if (!character.classes[position]) return syncCharacterLevels(character);

  character.classes.forEach((entry, entryIndex) => {
    entry.principal = entryIndex === position;
  });
  character.subclasse = character.classes[position].subclasse || '';
  return syncCharacterLevels(character);
}
