import { calcularNivelTotal } from '../../core/calculations.js';

export function getClassData(classesData, classId) {
  return classesData.find((classe) => classe.id === classId) || null;
}

export function getPrimaryClass(character, classesData) {
  const entry = character.classes.find((classe) => classe.principal) || character.classes[0] || null;
  return entry ? getClassData(classesData, entry.id) : null;
}

export function getAvailableClassOptions(character, classesData) {
  const selected = new Set(character.classes.map((entry) => entry.id));
  return classesData.filter((classe) => !selected.has(classe.id));
}

export function getFeaturesUpToLevel(classData, level) {
  const maxLevel = Number(level || 0);
  return Object.entries(classData?.habilidadesPorNivel || {})
    .map(([featureLevel, features]) => ({
      nivel: Number(featureLevel),
      habilidades: Array.isArray(features) ? features : []
    }))
    .filter((entry) => entry.nivel <= maxLevel)
    .sort((a, b) => a.nivel - b.nivel);
}

export function getMulticlassFeatureGroups(character, classesData) {
  return character.classes.map((entry) => {
    const classData = getClassData(classesData, entry.id);
    return {
      entry,
      classe: classData,
      nivel: Number(entry.nivel || 0),
      habilidadesPorNivel: getFeaturesUpToLevel(classData, entry.nivel)
    };
  }).filter((group) => group.classe);
}

export function getTotalLevel(character) {
  return Math.max(1, calcularNivelTotal(character.classes));
}
