const HIT_DIE_AVERAGE = {
  d6: 4,
  d8: 5,
  d10: 6,
  d12: 7
};

const MAGIC_ATTRIBUTE_TO_SCORE = {
  Carisma: 'carisma',
  Sabedoria: 'sabedoria',
  Inteligência: 'inteligencia',
  Inteligencia: 'inteligencia'
};

export function calcularModificador(valor) {
  return Math.floor((Number(valor || 10) - 10) / 2);
}

export function getModifier(value) {
  return calcularModificador(value);
}

export function formatarModificador(valor) {
  const modifier = calcularModificador(valor);
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}

export function formatModifier(value) {
  return formatarModificador(value);
}

export function calcularBonusProficiencia(nivelTotal) {
  const level = Number(nivelTotal || 1);
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

export function calcularNivelTotal(classes = []) {
  return classes.reduce((total, entry) => total + Math.max(0, Number(entry.nivel || 0)), 0);
}

export function formatarBonus(valor) {
  const number = Number(valor || 0);
  return number >= 0 ? `+${number}` : String(number);
}

export function dadoVidaMaximo(dadoVida) {
  const match = String(dadoVida || '').match(/d(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export function dadoVidaMedio(dadoVida) {
  return HIT_DIE_AVERAGE[String(dadoVida || '').toLowerCase()] || Math.ceil(dadoVidaMaximo(dadoVida) / 2);
}

export function getClassePrincipalEntry(character) {
  const classes = character?.classes || [];
  return classes.find((entry) => entry.principal) || classes[0] || null;
}

export function getClasseData(classesData, classId) {
  return classesData.find((classe) => classe.id === classId) || null;
}

export function calcularPVAutomatico(character, classesData = []) {
  const entries = character?.classes || [];
  if (!entries.length) return 0;

  const constitution = character?.atributos?.constituicao ?? 10;
  const constitutionMod = calcularModificador(constitution);
  const primary = getClassePrincipalEntry(character);
  let total = 0;

  for (const entry of entries) {
    const classData = getClasseData(classesData, entry.id);
    if (!classData) continue;

    const levels = Math.max(0, Number(entry.nivel || 0));
    if (!levels) continue;

    const firstLevelFull = primary && entry.id === primary.id;
    const fullLevels = firstLevelFull ? 1 : 0;
    const averageLevels = Math.max(0, levels - fullLevels);

    total += fullLevels * dadoVidaMaximo(classData.dadoVida);
    total += averageLevels * dadoVidaMedio(classData.dadoVida);
    total += levels * constitutionMod;
  }

  return Math.max(1, total);
}

export function calcularPVMaximo(character, classesData = []) {
  const manual = character?.combate?.pontosVidaMaxManual;
  if (manual !== '' && manual !== null && manual !== undefined) {
    const parsed = Number(manual);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  return calcularPVAutomatico(character, classesData);
}

export function normalizarArmadura(armor) {
  if (!armor) return null;

  const description = armor.descricao || armor.raw || '';
  const text = String(description).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const caBase = Number((armor.ca || description || '').match(/(\d+)/)?.[1] || 0);
  const type = text.includes('escudo')
    ? 'escudo'
    : text.includes('pesada')
      ? 'pesada'
      : text.includes('media')
        ? 'media'
        : text.includes('leve')
          ? 'leve'
          : 'leve';

  return {
    id: armor.id,
    nome: armor.nome,
    caBase,
    tipoArmadura: type,
    bonus: Number(String(armor.bonus || '').match(/[+-]?\d+/)?.[0] || 0)
  };
}

export function calcularCAAutomatico(character, armadura = null) {
  const dexMod = calcularModificador(character?.atributos?.destreza ?? 10);
  const normalizedArmor = normalizarArmadura(armadura);
  let base = 10 + dexMod;

  if (normalizedArmor?.caBase && normalizedArmor.tipoArmadura !== 'escudo') {
    if (normalizedArmor.tipoArmadura === 'pesada') base = normalizedArmor.caBase;
    if (normalizedArmor.tipoArmadura === 'media') base = normalizedArmor.caBase + Math.min(2, dexMod);
    if (normalizedArmor.tipoArmadura === 'leve') base = normalizedArmor.caBase + dexMod;
  }

  if (character?.combate?.escudoEquipado) base += 2;
  base += Number(character?.combate?.bonusCAManual || 0);

  return base;
}

export function calcularCA(character, armadura = null) {
  const manual = character?.combate?.classeArmaduraManual;
  if (manual !== '' && manual !== null && manual !== undefined) {
    const parsed = Number(manual);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  return calcularCAAutomatico(character, armadura);
}

export function calcularIniciativa(character) {
  return calcularModificador(character?.atributos?.destreza ?? 10) + Number(character?.combate?.bonusIniciativa || 0);
}

export function getMagicAttributeKey(atributo) {
  return MAGIC_ATTRIBUTE_TO_SCORE[atributo] || MAGIC_ATTRIBUTE_TO_SCORE[String(atributo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || null;
}

export function calcularMagia(character, classe, bonusProficiencia = null) {
  if (!classe?.conjuracao?.atributo) return null;

  const attributeKey = getMagicAttributeKey(classe.conjuracao.atributo);
  if (!attributeKey) return null;

  const proficiency = bonusProficiencia ?? calcularBonusProficiencia(character?.nivelTotal || calcularNivelTotal(character?.classes || []));
  const attributeMod = calcularModificador(character?.atributos?.[attributeKey] ?? 10);

  return {
    classeId: classe.id,
    classeNome: classe.nome,
    atributo: classe.conjuracao.atributo,
    atributoChave: attributeKey,
    modificadorAtributo: attributeMod,
    cd: 8 + proficiency + attributeMod,
    ataque: proficiency + attributeMod,
    tipo: classe.conjuracao.tipo || 'conjuracao',
    magiaDePacto: classe.conjuracao.tipo === 'magia_de_pacto'
  };
}
