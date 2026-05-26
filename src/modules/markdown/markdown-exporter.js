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
import { getFeaturesUpToLevel, getMulticlassFeatureGroups } from '../classes/multiclass-manager.js';
import { getEquippedArmorEntry, getEquippedWeapons, getInventoryWeight } from '../items/inventory-manager.js';
import { getBackgroundById } from '../backgrounds/background-loader.js';

const ATTRIBUTE_LABELS = [
  ['forca', 'Força'],
  ['destreza', 'Destreza'],
  ['constituicao', 'Constituição'],
  ['inteligencia', 'Inteligência'],
  ['sabedoria', 'Sabedoria'],
  ['carisma', 'Carisma']
];

function line(value = '') {
  return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

function classSummary(character, classesData) {
  return character.classes
    .map((entry) => {
      const classe = classesData.find((candidate) => candidate.id === entry.id);
      const suffix = entry.subclasse ? ` (${entry.subclasse})` : '';
      return `${classe?.nome || entry.id} ${entry.nivel}${suffix}`;
    })
    .join(', ');
}

function getRaceName(character, racesData) {
  return racesData.find((race) => race.id === character.raca)?.nome || character.raca || '';
}

function getBackgroundName(character, backgroundsData) {
  const background = getBackgroundById(backgroundsData, character.antecedente);
  return background?.nome || character.antecedente || '';
}

function getBackgroundSummary(character, backgroundsData) {
  const background = getBackgroundById(backgroundsData, character.antecedente);
  if (!background) return character.antecedente ? `Antecedente manual: ${character.antecedente}` : 'Nenhum antecedente selecionado.';

  return [
    `- Perícias: ${(background.pericias || []).join(', ') || '-'}`,
    `- Idiomas: ${background.idiomas || '-'}`,
    `- Ferramentas: ${(background.ferramentas || []).join(', ') || '-'}`,
    `- Ouro inicial: ${background.ouro || '-'}`
  ].join('\n');
}

function getPrimaryClassData(character, classesData) {
  const primary = getPrimaryClassEntry(character);
  return classesData.find((classe) => classe.id === primary?.id) || null;
}

function getSubclassName(character, classData) {
  const primary = getPrimaryClassEntry(character);
  return classData?.subclasses?.find((subclasse) => subclasse.id === primary?.subclasse)?.nome || primary?.subclasse || '';
}

function getProficiencies(character, classesData) {
  const classData = getPrimaryClassData(character, classesData);
  if (!classData) return '';
  const prof = classData.proficiencias || {};
  return [
    `- Armaduras: ${(prof.armaduras || []).join(', ') || '-'}`,
    `- Armas: ${(prof.armas || []).join(', ') || '-'}`,
    `- Ferramentas: ${(prof.ferramentas || []).join(', ') || '-'}`,
    `- Testes de resistência: ${(prof.testesResistencia || []).join(', ') || '-'}`
  ].join('\n');
}

function getSkills(character, classesData) {
  const classData = getPrimaryClassData(character, classesData);
  return (classData?.proficiencias?.periciasDisponiveis || []).join(', ');
}

function getClassFeatures(character, classesData) {
  const groups = getMulticlassFeatureGroups(character, classesData);
  if (!groups.length) return 'Nenhuma classe selecionada.';

  return groups.map((group) => {
    const features = group.habilidadesPorNivel.flatMap((levelGroup) => {
      return levelGroup.habilidades.map((feature) => `- **Nível ${levelGroup.nivel}: ${feature.nome}** — ${feature.descricao}`);
    });
    return `### ${group.classe.nome} nível ${group.nivel}\n\n${features.join('\n') || 'Nenhuma habilidade carregada.'}`;
  }).join('\n\n');
}

function getMagicSummary(character, classesData) {
  const totalLevel = Math.max(1, calcularNivelTotal(character.classes));
  const proficiency = calcularBonusProficiencia(totalLevel);
  const blocks = character.classes
    .map((entry) => {
      const classe = classesData.find((candidate) => candidate.id === entry.id);
      const magic = classe ? calcularMagia(character, classe, proficiency) : null;
      if (!magic) return '';
      const type = magic.magiaDePacto ? 'Magia de Pacto' : 'Conjuração comum';
      return `- ${classe.nome} (${type}): CD ${magic.cd}, ataque mágico ${formatarBonus(magic.ataque)}, atributo ${magic.atributo}`;
    })
    .filter(Boolean);

  const knownSpells = (character.magias || []).map((spell) => {
    const prepared = spell.preparada ? ' preparada' : '';
    return `- ${spell.nome}${prepared}: ${spell.nivelTexto || (Number(spell.circulo || 0) === 0 ? 'Truque' : `${spell.circulo}º círculo`)}, ${spell.escola || '-'}, ${spell.tempoConjuracao || '-'}`;
  });

  return [
    blocks.join('\n') || 'Nenhuma conjuração carregada.',
    knownSpells.length ? `\nMagias adicionadas:\n${knownSpells.join('\n')}` : '\nMagias adicionadas: nenhuma.'
  ].join('\n');
}

function getInventory(character) {
  const items = character.inventario || [];
  if (!items.length) return 'Inventário vazio.';

  const lines = items.map((item) => {
    const equipped = item.equipado ? ' equipado' : '';
    return `- ${item.nome} x${item.quantidade || 1}${equipped} — ${item.peso || 'sem peso'} — ${item.observacao || ''}`;
  });
  const coins = character.moedas || {};
  lines.push('');
  lines.push(`Moedas: PC ${coins.pc || 0}, PP ${coins.pp || 0}, PE ${coins.pe || 0}, PO ${coins.po || 0}, PL ${coins.pl || 0}`);
  lines.push(`Peso total estimado: ${getInventoryWeight(character).toFixed(2).replace('.', ',')} kg`);
  return lines.join('\n');
}

function getAttacks(character) {
  const weapons = getEquippedWeapons(character);
  if (!weapons.length) return 'Nenhuma arma equipada.';
  return weapons.map((weapon) => {
    const details = [weapon.dano, weapon.tipoDano, Array.isArray(weapon.propriedades) ? weapon.propriedades.join(', ') : ''].filter(Boolean).join(' · ');
    return `- ${weapon.nome}: ${details || weapon.descricao || 'sem dados de ataque'}`;
  }).join('\n');
}

export function buildCharacterMarkdown({ character, classes = [], races = [], backgrounds = [] }) {
  const totalLevel = Math.max(1, calcularNivelTotal(character.classes || []));
  const proficiency = calcularBonusProficiencia(totalLevel);
  const armor = getEquippedArmorEntry(character);
  const armorClass = calcularCA(character, armor);
  const initiative = calcularIniciativa(character);
  const maxHp = calcularPVMaximo(character, classes);
  const primaryClass = getPrimaryClassData(character, classes);

  const attributesTable = ATTRIBUTE_LABELS.map(([key, label]) => {
    const value = character.atributos?.[key] ?? 10;
    return `| ${label} | ${value} | ${formatarModificador(value)} |`;
  }).join('\n');

  return `# ${line(character.nome) || 'Personagem sem nome'}

## Resumo
- Jogador: ${line(character.jogador)}
- Classe: ${classSummary(character, classes)}
- Subclasse: ${getSubclassName(character, primaryClass)}
- Nível: ${totalLevel}
- Bônus de Proficiência: ${formatarBonus(proficiency)}
- Raça: ${getRaceName(character, races)}
- Antecedente: ${getBackgroundName(character, backgrounds)}
- Tendência: ${line(character.tendencia)}
- XP: ${character.xp || 0}

## Atributos

| Atributo | Valor | Modificador |
|---|---:|---:|
${attributesTable}

## Combate
- CA: ${armorClass}
- Iniciativa: ${formatarBonus(initiative)}
- Deslocamento: ${character.combate?.deslocamento || ''}
- PV Máximo: ${maxHp}
- PV Atual: ${character.combate?.pontosVidaAtual || ''}
- PV Temporário:
- Dados de Vida: ${primaryClass?.dadoVida || ''}

## Proficiências
${getProficiencies(character, classes)}

## Antecedente
${getBackgroundSummary(character, backgrounds)}

## Perícias
${getSkills(character, classes)}

## Classes e Habilidades
${getClassFeatures(character, classes)}

## Ataques
${getAttacks(character)}

## Magias
${getMagicSummary(character, classes)}

## Inventário
${getInventory(character)}

## Anotações
${line(character.anotacoes)}
`;
}

export function downloadMarkdown(context) {
  const markdown = buildCharacterMarkdown(context);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `${(context.character.nome || 'personagem').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'personagem'}-ficha-dnd5e.md`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return markdown;
}
