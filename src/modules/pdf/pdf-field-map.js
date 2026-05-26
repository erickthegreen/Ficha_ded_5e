import {
  calcularBonusProficiencia,
  calcularCA,
  calcularIniciativa,
  calcularMagia,
  calcularNivelTotal,
  calcularPVMaximo,
  formatarBonus,
  formatarModificador
} from '../../core/calculations.js';
import { getPrimaryClassEntry } from '../character/character-model.js';
import { getMulticlassFeatureGroups } from '../classes/multiclass-manager.js';
import { getEquippedArmorEntry, getEquippedWeapons, getInventoryWeight } from '../items/inventory-manager.js';
import { getBackgroundById } from '../backgrounds/background-loader.js';

const ATTRIBUTES = [
  ['forca', 'Força'],
  ['destreza', 'Destreza'],
  ['constituicao', 'Constituição'],
  ['inteligencia', 'Inteligência'],
  ['sabedoria', 'Sabedoria'],
  ['carisma', 'Carisma']
];

function classSummary(character, classesData) {
  return (character.classes || []).map((entry) => {
    const classe = classesData.find((candidate) => candidate.id === entry.id);
    return `${classe?.nome || entry.id} ${entry.nivel}`;
  }).join(', ');
}

function raceName(character, racesData) {
  return racesData.find((race) => race.id === character.raca)?.nome || character.raca || '';
}

function backgroundName(character, backgroundsData) {
  const background = getBackgroundById(backgroundsData, character.antecedente);
  return background?.nome || character.antecedente || '';
}

function primaryClass(character, classesData) {
  const primary = getPrimaryClassEntry(character);
  return classesData.find((classe) => classe.id === primary?.id) || null;
}

function subclassName(character, classData) {
  const primary = getPrimaryClassEntry(character);
  return classData?.subclasses?.find((subclass) => subclass.id === primary?.subclasse)?.nome || primary?.subclasse || '';
}

function joinFeatures(character, classesData) {
  const groups = getMulticlassFeatureGroups(character, classesData);
  return groups.map((group) => {
    const features = group.habilidadesPorNivel.flatMap((levelGroup) => {
      return levelGroup.habilidades.map((feature) => `N${levelGroup.nivel} ${feature.nome}: ${feature.descricao}`);
    });
    return `${group.classe.nome} nível ${group.nivel}\n${features.join('\n')}`;
  }).join('\n\n');
}

function joinMagic(character, classesData) {
  const totalLevel = Math.max(1, calcularNivelTotal(character.classes || []));
  const proficiency = calcularBonusProficiencia(totalLevel);
  const classMagic = (character.classes || []).map((entry) => {
    const classe = classesData.find((candidate) => candidate.id === entry.id);
    const magic = classe ? calcularMagia(character, classe, proficiency) : null;
    if (!magic) return '';
    return `${classe.nome}${magic.magiaDePacto ? ' - Magia de Pacto' : ''}: CD ${magic.cd}, ataque ${formatarBonus(magic.ataque)}, atributo ${magic.atributo}`;
  }).filter(Boolean).join('\n');
  const knownSpells = (character.magias || []).map((spell) => {
    return `${spell.nome}${spell.preparada ? ' (preparada)' : ''}: ${spell.nivelTexto || ''}, ${spell.escola || ''}, ${spell.tempoConjuracao || ''}`;
  }).join('\n');

  return [classMagic, knownSpells].filter(Boolean).join('\n\n');
}

function joinInventory(character) {
  const items = character.inventario || [];
  const lines = items.map((item) => `${item.nome} x${item.quantidade || 1}${item.equipado ? ' (equipado)' : ''} - ${item.peso || ''} ${item.observacao || ''}`);
  const coins = character.moedas || {};
  lines.push(`Moedas: PC ${coins.pc || 0}, PP ${coins.pp || 0}, PE ${coins.pe || 0}, PO ${coins.po || 0}, PL ${coins.pl || 0}`);
  lines.push(`Peso total: ${getInventoryWeight(character).toFixed(2).replace('.', ',')} kg`);
  return lines.join('\n');
}

function joinAttacks(character) {
  return getEquippedWeapons(character).map((weapon) => {
    return `${weapon.nome}: ${[weapon.dano, weapon.tipoDano, weapon.propriedades?.join(', ')].filter(Boolean).join(' · ') || weapon.descricao || ''}`;
  }).join('\n');
}

function proficiencies(character, classesData) {
  const classe = primaryClass(character, classesData);
  const prof = classe?.proficiencias || {};
  return [
    `Armaduras: ${(prof.armaduras || []).join(', ')}`,
    `Armas: ${(prof.armas || []).join(', ')}`,
    `Ferramentas: ${(prof.ferramentas || []).join(', ')}`,
    `Resistências: ${(prof.testesResistencia || []).join(', ')}`
  ].join('\n');
}

function savingThrows(character, classesData) {
  return (primaryClass(character, classesData)?.proficiencias?.testesResistencia || []).join(', ');
}

function skills(character, classesData) {
  return (primaryClass(character, classesData)?.proficiencias?.periciasDisponiveis || []).join(', ');
}

export function buildPdfFieldValues({ character, classes = [], races = [], backgrounds = [] }) {
  const totalLevel = Math.max(1, calcularNivelTotal(character.classes || []));
  const proficiency = calcularBonusProficiencia(totalLevel);
  const classData = primaryClass(character, classes);
  const armor = getEquippedArmorEntry(character);
  const values = {
    character_name: character.nome || '',
    player_name: character.jogador || '',
    class: classSummary(character, classes),
    subclass: subclassName(character, classData),
    level: String(totalLevel),
    race: raceName(character, races),
    background: backgroundName(character, backgrounds),
    alignment: character.tendencia || '',
    xp: String(character.xp || 0),
    proficiency_bonus: formatarBonus(proficiency),
    armor_class: String(calcularCA(character, armor)),
    initiative: formatarBonus(calcularIniciativa(character)),
    speed: character.combate?.deslocamento || '',
    hp_max: String(calcularPVMaximo(character, classes)),
    hp_current: character.combate?.pontosVidaAtual || '',
    hp_temp: '',
    hit_dice: classData?.dadoVida || '',
    proficiencies: proficiencies(character, classes),
    saving_throws: savingThrows(character, classes),
    skills: skills(character, classes),
    attacks: joinAttacks(character),
    spells: joinMagic(character, classes),
    inventory: joinInventory(character),
    notes: character.anotacoes || '',
    class_features: joinFeatures(character, classes)
  };

  for (const [key] of ATTRIBUTES) {
    const value = character.atributos?.[key] ?? 10;
    values[key] = String(value);
    values[`${key}_mod`] = formatarModificador(value);
  }

  return values;
}

export function buildPdfPages(fieldValues) {
  const identitySection = { title: 'Identidade', x: 32, y: 76, w: 531, h: 116 };
  const combatSection = { title: 'Combate', x: 32, y: 210, w: 531, h: 104 };
  const attributesSection = { title: 'Atributos', x: 32, y: 332, w: 531, h: 168 };
  const proficiencySection = { title: 'Proficiências e perícias', x: 32, y: 518, w: 531, h: 242 };

  const page1 = [
    { name: 'character_name', label: 'Nome do personagem', x: 44, y: 110, w: 226, h: 26 },
    { name: 'player_name', label: 'Jogador', x: 284, y: 110, w: 126, h: 26 },
    { name: 'race', label: 'Raça', x: 424, y: 110, w: 127, h: 26 },
    { name: 'class', label: 'Classe(s)', x: 44, y: 158, w: 178, h: 26 },
    { name: 'subclass', label: 'Subclasse', x: 236, y: 158, w: 124, h: 26 },
    { name: 'level', label: 'Nível', x: 374, y: 158, w: 48, h: 26 },
    { name: 'background', label: 'Antecedente', x: 436, y: 158, w: 115, h: 26 },
    { name: 'proficiency_bonus', label: 'Prof.', x: 44, y: 244, w: 64, h: 30, align: 'center' },
    { name: 'armor_class', label: 'CA', x: 120, y: 244, w: 58, h: 30, align: 'center' },
    { name: 'initiative', label: 'Iniciativa', x: 190, y: 244, w: 72, h: 30, align: 'center' },
    { name: 'speed', label: 'Desloc.', x: 274, y: 244, w: 78, h: 30, align: 'center' },
    { name: 'hp_max', label: 'PV máx.', x: 364, y: 244, w: 58, h: 30, align: 'center' },
    { name: 'hp_current', label: 'PV atual', x: 434, y: 244, w: 58, h: 30, align: 'center' },
    { name: 'hp_temp', label: 'PV temp.', x: 504, y: 244, w: 47, h: 30, align: 'center' },
    { name: 'hit_dice', label: 'Dados de vida', x: 44, y: 288, w: 118, h: 22 },
    { name: 'alignment', label: 'Tendência', x: 176, y: 288, w: 156, h: 22 },
    { name: 'xp', label: 'XP', x: 346, y: 288, w: 205, h: 22 },
    { name: 'proficiencies', label: 'Proficiências', x: 44, y: 552, w: 246, h: 82, multiline: true },
    { name: 'saving_throws', label: 'Testes de resistência', x: 304, y: 552, w: 247, h: 82, multiline: true },
    { name: 'skills', label: 'Perícias disponíveis', x: 44, y: 660, w: 507, h: 74, multiline: true }
  ];

  const attributePositions = [
    ['forca', 'Força', 44, 370],
    ['destreza', 'Destreza', 222, 370],
    ['constituicao', 'Constituição', 400, 370],
    ['inteligencia', 'Inteligência', 44, 442],
    ['sabedoria', 'Sabedoria', 222, 442],
    ['carisma', 'Carisma', 400, 442]
  ];

  for (const [key, label, x, y] of attributePositions) {
    page1.push({ name: key, label, x, y, w: 76, h: 28, align: 'center', fontSize: 11 });
    page1.push({ name: `${key}_mod`, label: 'Mod.', x: x + 88, y, w: 54, h: 28, align: 'center', fontSize: 11 });
  }

  const detailSection = { title: 'Habilidades e detalhes', x: 32, y: 76, w: 531, h: 684 };
  const activitySection = { title: 'Ações', x: 44, y: 394, w: 507, h: 126 };
  const inventorySection = { title: 'Inventário e anotações', x: 44, y: 548, w: 507, h: 184 };

  const page2 = [
    { name: 'class_features', label: 'Classes e habilidades', x: 44, y: 112, w: 507, h: 246, multiline: true, fontSize: 8 },
    { name: 'attacks', label: 'Ataques', x: 44, y: 430, w: 244, h: 74, multiline: true },
    { name: 'spells', label: 'Magias', x: 307, y: 430, w: 244, h: 74, multiline: true },
    { name: 'inventory', label: 'Inventário', x: 44, y: 584, w: 244, h: 122, multiline: true },
    { name: 'notes', label: 'Anotações', x: 307, y: 584, w: 244, h: 122, multiline: true }
  ];

  return [
    { fields: page1, sections: [identitySection, combatSection, attributesSection, proficiencySection] },
    { fields: page2, sections: [detailSection, activitySection, inventorySection] }
  ].map((page, index) => ({
    title: index === 0 ? 'Ficha D&D 5e' : 'Ficha D&D 5e - detalhes',
    sections: page.sections,
    fields: page.fields.map((field) => ({
      ...field,
      value: fieldValues[field.name] || ''
    }))
  }));
}
