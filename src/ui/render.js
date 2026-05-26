import { ATTRIBUTES, TABS } from '../core/constants.js';
import {
  calcularBonusProficiencia,
  calcularCA,
  calcularCAAutomatico,
  calcularIniciativa,
  calcularMagia,
  calcularNivelTotal,
  calcularPVAutomatico,
  calcularPVMaximo,
  formatarBonus,
  formatModifier
} from '../core/calculations.js';
import {
  getAvailableClassOptions,
  getFeaturesUpToLevel,
  getMulticlassFeatureGroups,
  getPrimaryClass
} from '../modules/classes/multiclass-manager.js';
import { getPrimaryClassEntry } from '../modules/character/character-model.js';
import {
  getDisplayCategory,
  getItemById,
  getItemCategories,
  getItemTypes,
  searchItems
} from '../modules/items/item-library.js';
import {
  getEquippedArmorEntry,
  getEquippedShieldEntry,
  getEquippedWeapons,
  getInventoryWeight
} from '../modules/items/inventory-manager.js';
import {
  getSpellById,
  getSpellCircles,
  getSpellSchools,
  searchSpells
} from '../modules/spells/spell-manager.js';
import { escapeHtml, joinList } from '../utils/format.js';

function valueOf(value) {
  return escapeHtml(value ?? '');
}

function selectedAttr(current, value) {
  return String(current || '') === String(value || '') ? ' selected' : '';
}

function checkedAttr(value) {
  return value ? ' checked' : '';
}

function field(label, name, value, options = {}) {
  const type = options.type || 'text';
  const min = options.min ?? '';
  const max = options.max ?? '';
  return `
    <label class="form-field">
      <span>${label}</span>
      <input data-field="${name}" type="${type}" value="${valueOf(value)}" ${min !== '' ? `min="${min}"` : ''} ${max !== '' ? `max="${max}"` : ''} placeholder="${valueOf(options.placeholder || '')}">
    </label>
  `;
}

function combatField(label, name, value, options = {}) {
  const type = options.type || 'text';
  return `
    <label class="form-field">
      <span>${label}</span>
      <input data-combat="${name}" type="${type}" value="${valueOf(value)}" placeholder="${valueOf(options.placeholder || '')}">
    </label>
  `;
}

function selectField(label, control, value, options, placeholder = 'Selecionar') {
  return `
    <label class="form-field">
      <span>${label}</span>
      <select data-control="${control}">
        <option value="">${placeholder}</option>
        ${options.map((option) => `
          <option value="${valueOf(option.id)}"${selectedAttr(value, option.id)}>${valueOf(option.nome)}</option>
        `).join('')}
      </select>
    </label>
  `;
}

function textareaField(label, name, value, rows = 8) {
  return `
    <label class="form-field form-field-full">
      <span>${label}</span>
      <textarea data-field="${name}" rows="${rows}">${escapeHtml(value || '')}</textarea>
    </label>
  `;
}

function currentClass(state, classes) {
  return getPrimaryClass(state.character, classes);
}

function currentRace(state, races) {
  return races.find((race) => race.id === state.character.raca) || null;
}

function currentSubclass(state, classe) {
  const primary = getPrimaryClassEntry(state.character);
  const subclassId = primary?.subclasse || state.character.subclasse || '';
  return classe?.subclasses?.find((subclasse) => subclasse.id === subclassId) || null;
}

function getArmorOptions(items) {
  return items.filter((item) => item.categoria === 'armaduras' && item.tipo !== 'Escudo' && item.uso !== 'Escudo');
}

function getEquippedArmor(character, items) {
  const inventoryArmor = getEquippedArmorEntry(character);
  if (inventoryArmor) return inventoryArmor;
  return getArmorOptions(items).find((item) => item.id === character.combate.armaduraEquipadaId) || null;
}

function getDerived(ctx) {
  const { state, classes, items } = ctx;
  const character = state.character;
  const shieldEntry = getEquippedShieldEntry(character);
  const characterForCombat = {
    ...character,
    combate: {
      ...character.combate,
      escudoEquipado: Boolean(character.combate.escudoEquipado || shieldEntry)
    }
  };
  const nivelTotal = Math.max(1, calcularNivelTotal(character.classes));
  const bonusProficiencia = calcularBonusProficiencia(nivelTotal);
  const equippedArmor = getEquippedArmor(character, items);
  const pvAuto = calcularPVAutomatico(characterForCombat, classes);
  const pvMaximo = calcularPVMaximo(characterForCombat, classes);
  const caAuto = calcularCAAutomatico(characterForCombat, equippedArmor);
  const ca = calcularCA(characterForCombat, equippedArmor);
  const iniciativa = calcularIniciativa(characterForCombat);
  const magias = character.classes
    .map((entry) => {
      const classe = classes.find((candidate) => candidate.id === entry.id);
      return classe ? calcularMagia(character, classe, bonusProficiencia) : null;
    })
    .filter(Boolean);

  return {
    nivelTotal,
    bonusProficiencia,
    equippedArmor,
    pvAuto,
    pvMaximo,
    caAuto,
    ca,
    iniciativa,
    magias,
    shieldEntry,
    equippedWeapons: getEquippedWeapons(character),
    pesoTotal: getInventoryWeight(character)
  };
}

function renderTabs(activeTab) {
  return `
    <nav class="tabs" aria-label="Abas da ficha">
      ${TABS.map((tab) => `
        <button class="tab-button${activeTab === tab.id ? ' active' : ''}" data-tab="${tab.id}" type="button">
          ${tab.label}
        </button>
      `).join('')}
    </nav>
  `;
}

function renderLoadingErrors(errors) {
  if (!errors.length) return '';
  return `
    <section class="notice notice-danger">
      <strong>Dados com problema</strong>
      <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>
    </section>
  `;
}

function renderClassSelect(state, classes) {
  const primary = getPrimaryClassEntry(state.character);
  return selectField('Classe principal', 'class', primary?.id || '', classes, 'Escolha uma classe');
}

function renderRaceSelect(state, races) {
  return selectField('Raça', 'race', state.character.raca, races, 'Escolha uma raça');
}

function renderSubclassSelect(state, classe) {
  const primary = getPrimaryClassEntry(state.character);
  const subclasses = classe?.subclasses || [];
  return selectField('Subclasse', 'subclass', primary?.subclasse || '', subclasses, subclasses.length ? 'Escolha uma subclasse' : 'Sem subclasses carregadas');
}

function renderFeatureList(features = []) {
  if (!features.length) return '<p class="muted">Nenhuma habilidade carregada.</p>';
  return `
    <div class="feature-list">
      ${features.map((feature) => `
        <article class="feature-item">
          <h4>${valueOf(feature.nome)}</h4>
          <p>${valueOf(feature.descricao)}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderFeatureGroups(groups) {
  if (!groups.length) return '<p class="muted">Nenhuma habilidade disponível para o nível atual.</p>';

  return `
    <div class="level-list">
      ${groups.map((group) => `
        <section class="level-row">
          <h3>Nível ${valueOf(group.nivel)}</h3>
          ${renderFeatureList(group.habilidades)}
        </section>
      `).join('')}
    </div>
  `;
}

function renderPersonagemTab(ctx) {
  const { state, classes, races } = ctx;
  const character = state.character;
  const classe = currentClass(state, classes);
  const primary = getPrimaryClassEntry(character);
  const race = currentRace(state, races);
  const levelOneFeatures = classe?.habilidadesPorNivel?.['1'] || [];
  const raceFeatures = race?.habilidades || [];
  const derived = getDerived(ctx);

  return `
    <section class="tab-grid">
      <div class="panel">
        <h2>Personagem</h2>
        <div class="form-grid">
          ${field('Nome do personagem', 'nome', character.nome, { placeholder: 'Nome' })}
          ${field('Nome do jogador', 'jogador', character.jogador, { placeholder: 'Jogador' })}
          ${renderClassSelect(state, classes)}
          ${renderSubclassSelect(state, classe)}
          ${renderRaceSelect(state, races)}
          ${field('Antecedente', 'antecedente', character.antecedente, { placeholder: 'Ex.: Criminoso, Artesão, Nobre...' })}
          ${field('Nível da classe principal', 'nivelClassePrincipal', primary?.nivel || 1, { type: 'number', min: 1, max: 20 })}
          ${field('Tendência', 'tendencia', character.tendencia)}
          ${field('XP', 'xp', character.xp, { type: 'number', min: 0 })}
          ${field('Campanha', 'campanha', character.campanha)}
          ${field('Mestre', 'mestre', character.mestre)}
        </div>
      </div>

      <div class="panel">
        <h2>Resumo calculado</h2>
        <div class="summary-stack">
          <div><span>Nível total</span><strong>${valueOf(derived.nivelTotal)}</strong></div>
          <div><span>Bônus de proficiência</span><strong>${formatarBonus(derived.bonusProficiencia)}</strong></div>
          <div><span>PV máximo</span><strong>${valueOf(derived.pvMaximo)}</strong></div>
          <div><span>Classe de armadura</span><strong>${valueOf(derived.ca)}</strong></div>
          <div><span>Iniciativa</span><strong>${formatarBonus(derived.iniciativa)}</strong></div>
        </div>
      </div>

      <div class="panel">
        <h2>Resumo de classe</h2>
        ${classe ? `
          <div class="summary-stack">
            <div><span>Dado de vida</span><strong>${valueOf(classe.dadoVida)}</strong></div>
            <div><span>Resistências</span><strong>${valueOf(joinList(classe.proficiencias?.testesResistencia))}</strong></div>
            <div><span>Perícias</span><strong>${valueOf(classe.proficiencias?.quantidadePericias || 0)} escolha(s)</strong></div>
          </div>
          <h3>Habilidades de nível 1</h3>
          ${renderFeatureList(levelOneFeatures)}
        ` : '<p class="muted">Escolha uma classe para ver dado de vida, proficiências e habilidades iniciais.</p>'}
      </div>

      <div class="panel">
        <h2>Resumo de raça</h2>
        ${race ? `
          <div class="summary-stack">
            <div><span>Deslocamento</span><strong>${valueOf(race.deslocamento)} m</strong></div>
            <div><span>Idiomas</span><strong>${valueOf(joinList(race.idiomas))}</strong></div>
            <div><span>Tamanho</span><strong>${valueOf(race.tamanho || 'Não informado')}</strong></div>
          </div>
          <h3>Habilidades raciais</h3>
          ${renderFeatureList(raceFeatures)}
        ` : '<p class="muted">Escolha uma raça para ver habilidades raciais e idiomas.</p>'}
      </div>
    </section>
  `;
}

function renderAtributosTab(ctx) {
  const derived = getDerived(ctx);
  return `
    <section class="attribute-grid">
      ${ATTRIBUTES.map((attribute) => {
        const value = ctx.state.character.atributos[attribute.key] ?? 10;
        return `
          <article class="attribute-card">
            <label>
              <span>${attribute.label}</span>
              <input data-attribute="${attribute.key}" type="number" min="1" max="30" value="${valueOf(value)}">
            </label>
            <strong>${formatModifier(value)}</strong>
            <small>${attribute.short}</small>
          </article>
        `;
      }).join('')}
    </section>
    <section class="panel attribute-summary">
      <h2>Impacto nos cálculos</h2>
      <div class="category-grid">
        <div><strong>${valueOf(derived.pvMaximo)}</strong><span>PV máximo</span></div>
        <div><strong>${valueOf(derived.ca)}</strong><span>CA</span></div>
        <div><strong>${formatarBonus(derived.iniciativa)}</strong><span>Iniciativa</span></div>
      </div>
    </section>
  `;
}

function renderClasseTab(ctx) {
  const classe = currentClass(ctx.state, ctx.classes);
  const primary = getPrimaryClassEntry(ctx.state.character);
  const subclass = currentSubclass(ctx.state, classe);
  if (!classe) {
    return '<section class="panel"><h2>Classe</h2><p class="muted">Selecione uma classe na aba Personagem para carregar esta área.</p></section>';
  }

  const availableLevels = getFeaturesUpToLevel(classe, primary?.nivel || 1);

  return `
    <section class="class-layout">
      <div class="panel">
        <h2>${valueOf(classe.nome)} nível ${valueOf(primary?.nivel || 1)}</h2>
        <div class="summary-stack">
          <div><span>Dado de vida</span><strong>${valueOf(classe.dadoVida)}</strong></div>
          <div><span>PV no nível 1</span><strong>${valueOf(classe.pontosVida?.nivel1)}</strong></div>
          <div><span>PV depois</span><strong>${valueOf(classe.pontosVida?.niveisPosteriores)}</strong></div>
        </div>
      </div>

      <div class="panel">
        <h2>Proficiências</h2>
        <dl class="detail-list">
          <div><dt>Armaduras</dt><dd>${valueOf(joinList(classe.proficiencias?.armaduras))}</dd></div>
          <div><dt>Armas</dt><dd>${valueOf(joinList(classe.proficiencias?.armas))}</dd></div>
          <div><dt>Ferramentas</dt><dd>${valueOf(joinList(classe.proficiencias?.ferramentas))}</dd></div>
          <div><dt>Testes de resistência</dt><dd>${valueOf(joinList(classe.proficiencias?.testesResistencia))}</dd></div>
          <div><dt>Perícias disponíveis</dt><dd>${valueOf(joinList(classe.proficiencias?.periciasDisponiveis))}</dd></div>
        </dl>
      </div>

      <div class="panel">
        <h2>Equipamento inicial</h2>
        <ul class="clean-list">${(classe.equipamentoInicial || []).map((item) => `<li>${valueOf(item)}</li>`).join('')}</ul>
      </div>

      <div class="panel">
        <h2>Subclasses</h2>
        ${renderSubclassSelect(ctx.state, classe)}
        ${subclass ? `
          <h3>${valueOf(subclass.nome)}</h3>
          ${renderFeatureList(subclass.habilidades || [])}
        ` : '<p class="muted">Escolha uma subclasse para ver as habilidades carregadas.</p>'}
      </div>

      <div class="panel panel-wide">
        <h2>Habilidades disponíveis até o nível ${valueOf(primary?.nivel || 1)}</h2>
        ${renderFeatureGroups(availableLevels)}
      </div>
    </section>
  `;
}

function renderMulticlasseTab(ctx) {
  const { state, classes } = ctx;
  const character = state.character;
  const derived = getDerived(ctx);
  const available = getAvailableClassOptions(character, classes);
  const groups = getMulticlassFeatureGroups(character, classes);

  return `
    <section class="class-layout">
      <div class="panel">
        <h2>Multiclasse</h2>
        <div class="summary-stack">
          <div><span>Nível total</span><strong>${valueOf(derived.nivelTotal)}</strong></div>
          <div><span>Bônus de proficiência</span><strong>${formatarBonus(derived.bonusProficiencia)}</strong></div>
        </div>
        <div class="add-class-row">
          ${selectField('Adicionar classe', 'add-multiclass', '', available, available.length ? 'Escolha uma classe' : 'Todas as classes já foram adicionadas')}
        </div>
      </div>

      <div class="panel">
        <h2>Regras aplicadas</h2>
        <p class="muted">O nível total soma todas as classes. O bônus de proficiência usa o nível total. O PV usa dado cheio no nível 1 da classe principal e média nos níveis posteriores.</p>
      </div>

      <div class="panel panel-wide">
        <h2>Classes do personagem</h2>
        ${character.classes.length ? `
          <div class="multiclass-list">
            ${character.classes.map((entry, index) => {
              const classData = classes.find((classe) => classe.id === entry.id);
              const subclasses = classData?.subclasses || [];
              return `
                <article class="multiclass-card">
                  <div>
                    <h3>${valueOf(classData?.nome || entry.id)} ${entry.principal ? '<span class="badge">Principal</span>' : ''}</h3>
                    <p class="muted">Dado de vida ${valueOf(classData?.dadoVida || '-')}</p>
                  </div>
                  <label class="form-field">
                    <span>Nível</span>
                    <input data-multiclass-level="${index}" type="number" min="1" max="20" value="${valueOf(entry.nivel)}">
                  </label>
                  <label class="form-field">
                    <span>Subclasse</span>
                    <select data-multiclass-subclass="${index}">
                      <option value="">Sem subclasse</option>
                      ${subclasses.map((subclasse) => `<option value="${valueOf(subclasse.id)}"${selectedAttr(entry.subclasse, subclasse.id)}>${valueOf(subclasse.nome)}</option>`).join('')}
                    </select>
                  </label>
                  <div class="action-row">
                    <button class="button" data-multiclass-primary="${index}" type="button" ${entry.principal ? 'disabled' : ''}>Marcar principal</button>
                    <button class="button danger" data-multiclass-remove="${index}" type="button">Remover</button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        ` : '<p class="muted">Escolha uma classe principal para começar.</p>'}
      </div>

      <div class="panel panel-wide">
        <h2>Habilidades por classe e nível</h2>
        ${groups.length ? groups.map((group) => `
          <section class="class-feature-group">
            <h3>${valueOf(group.classe.nome)} nível ${valueOf(group.nivel)}</h3>
            ${renderFeatureGroups(group.habilidadesPorNivel)}
          </section>
        `).join('') : '<p class="muted">Nenhuma classe selecionada.</p>'}
      </div>
    </section>
  `;
}

function renderCombateTab(ctx) {
  const { state, items, races } = ctx;
  const character = state.character;
  const race = currentRace(state, races);
  const derived = getDerived(ctx);
  const armorOptions = getArmorOptions(items);

  return `
    <section class="tab-grid">
      <div class="panel">
        <h2>Combate</h2>
        <div class="form-grid compact">
          ${combatField('PV atual', 'pontosVidaAtual', character.combate.pontosVidaAtual, { placeholder: 'Manual' })}
          ${combatField('PV máximo manual', 'pontosVidaMaxManual', character.combate.pontosVidaMaxManual, { placeholder: `Auto ${derived.pvAuto}` })}
          ${combatField('CA manual', 'classeArmaduraManual', character.combate.classeArmaduraManual, { placeholder: `Auto ${derived.caAuto}` })}
          ${combatField('Bônus manual de CA', 'bonusCAManual', character.combate.bonusCAManual, { type: 'number' })}
          ${combatField('Bônus de iniciativa', 'bonusIniciativa', character.combate.bonusIniciativa, { type: 'number' })}
          ${combatField('Deslocamento', 'deslocamento', character.combate.deslocamento || race?.deslocamento || '', { placeholder: 'Manual' })}
          ${selectField('Armadura equipada', 'armor', character.combate.armaduraEquipadaId, armorOptions, 'Sem armadura')}
          <label class="check-field">
            <input data-control="shield" type="checkbox"${checkedAttr(character.combate.escudoEquipado)}>
            <span>Escudo equipado (+2 CA)</span>
          </label>
        </div>
      </div>
      <div class="panel">
        <h2>Calculado</h2>
        <div class="summary-stack">
          <div><span>PV máximo</span><strong>${valueOf(derived.pvMaximo)}</strong></div>
          <div><span>PV automático</span><strong>${valueOf(derived.pvAuto)}</strong></div>
          <div><span>CA final</span><strong>${valueOf(derived.ca)}</strong></div>
          <div><span>CA automática</span><strong>${valueOf(derived.caAuto)}</strong></div>
          <div><span>Iniciativa</span><strong>${formatarBonus(derived.iniciativa)}</strong></div>
          <div><span>Bônus de proficiência</span><strong>${formatarBonus(derived.bonusProficiencia)}</strong></div>
        </div>
        <p class="muted">PV máximo e CA podem ser sobrescritos manualmente. Deixe os campos manuais vazios para usar os valores automáticos.</p>
      </div>
      <div class="panel panel-wide">
        <h2>Armas equipadas</h2>
        ${derived.equippedWeapons.length ? `
          <div class="feature-list">
            ${derived.equippedWeapons.map((weapon) => `
              <article class="feature-item">
                <h4>${valueOf(weapon.nome)}</h4>
                <p>${valueOf([weapon.dano, weapon.tipoDano, weapon.propriedades?.join(', ')].filter(Boolean).join(' · ') || weapon.descricao || 'Sem dados de ataque.')}</p>
              </article>
            `).join('')}
          </div>
        ` : '<p class="muted">Equipe armas no Inventário para vê-las aqui.</p>'}
      </div>
    </section>
  `;
}

function renderMagiaCard(magic) {
  return `
    <article class="feature-item">
      <h4>${valueOf(magic.classeNome)}${magic.magiaDePacto ? ' · Magia de Pacto' : ''}</h4>
      <dl class="detail-list">
        <div><dt>Atributo</dt><dd>${valueOf(magic.atributo)} (${formatarBonus(magic.modificadorAtributo)})</dd></div>
        <div><dt>CD de magia</dt><dd>${valueOf(magic.cd)}</dd></div>
        <div><dt>Ataque mágico</dt><dd>${formatarBonus(magic.ataque)}</dd></div>
      </dl>
    </article>
  `;
}

function renderSpellDetails(spell) {
  if (!spell) return '<p class="muted">Selecione uma magia para ver detalhes.</p>';

  return `
    <article class="item-detail spell-detail">
      <h3>${valueOf(spell.nome)}</h3>
      ${spell.nomeIngles ? `<p class="muted">${valueOf(spell.nomeIngles)}</p>` : ''}
      <dl class="detail-list">
        <div><dt>Círculo</dt><dd>${valueOf(spell.nivelTexto)}</dd></div>
        <div><dt>Escola</dt><dd>${valueOf(spell.escola || '-')}</dd></div>
        <div><dt>Classes</dt><dd>${valueOf(joinList(spell.classes))}</dd></div>
        <div><dt>Tempo</dt><dd>${valueOf(spell.tempoConjuracao || '-')}</dd></div>
        <div><dt>Alcance</dt><dd>${valueOf(spell.alcance || '-')}</dd></div>
        <div><dt>Componentes</dt><dd>${valueOf(spell.componentes || '-')}</dd></div>
        <div><dt>Duração</dt><dd>${valueOf(spell.duracao || '-')}</dd></div>
        <div><dt>Descrição</dt><dd>${valueOf(spell.descricao || 'Sem descrição.')}</dd></div>
        <div><dt>Fonte</dt><dd>${valueOf(spell.fonte || 'Lista importada')}</dd></div>
      </dl>
    </article>
  `;
}

function renderMagiasTab(ctx) {
  const derived = getDerived(ctx);
  const comuns = derived.magias.filter((magic) => !magic.magiaDePacto);
  const pactos = derived.magias.filter((magic) => magic.magiaDePacto);
  const character = ctx.state.character;
  const filters = ctx.state.magias || { query: '', circle: '', school: '', classId: 'personagem', selectedSpellId: '' };
  const currentClassIds = (character.classes || []).map((entry) => entry.id).filter(Boolean);
  const results = searchSpells(ctx.spells || [], filters, currentClassIds).slice(0, 80);
  const selected = getSpellById(ctx.spells || [], filters.selectedSpellId) || results[0] || null;
  const circles = getSpellCircles(ctx.spells || []);
  const schools = getSpellSchools(ctx.spells || []);
  const spellClassIds = new Set((ctx.spells || []).flatMap((spell) => spell.classeIds || []));
  const classOptions = (ctx.classes || []).filter((classe) => spellClassIds.has(classe.id));
  const knownSpells = character.magias || [];

  return `
    <section class="class-layout">
      <div class="panel">
        <h2>Conjuração comum</h2>
        ${comuns.length ? `
          <div class="feature-list">${comuns.map(renderMagiaCard).join('')}</div>
        ` : '<p class="muted">Nenhuma classe com conjuração comum foi selecionada.</p>'}
      </div>
      <div class="panel">
        <h2>Magia de Pacto</h2>
        ${pactos.length ? `
          <div class="feature-list">${pactos.map(renderMagiaCard).join('')}</div>
          <p class="muted">Os espaços de magia do Bruxo são mostrados separados e não são misturados aos espaços comuns nesta fase.</p>
        ` : '<p class="muted">Adicione Bruxo para ver Magia de Pacto separada.</p>'}
      </div>

      <div class="panel panel-wide">
        <h2>Magias do personagem</h2>
        ${knownSpells.length ? `
          <div class="spell-known-list">
            ${knownSpells.map((spell) => `
              <article class="spell-known-row">
                <div>
                  <h3>${valueOf(spell.nome)}</h3>
                  <p class="muted">${valueOf(spell.nivelTexto || (Number(spell.circulo || 0) === 0 ? 'Truque' : `${spell.circulo}º Círculo`))} · ${valueOf(spell.escola || '-')} · ${valueOf(spell.tempoConjuracao || '-')}</p>
                </div>
                <label class="check-field">
                  <input data-known-spell-field="preparada" data-spell-id="${valueOf(spell.instanceId)}" type="checkbox"${checkedAttr(spell.preparada)}>
                  <span>Preparada</span>
                </label>
                <label class="form-field">
                  <span>Observação</span>
                  <input data-known-spell-field="observacao" data-spell-id="${valueOf(spell.instanceId)}" value="${valueOf(spell.observacao || '')}">
                </label>
                <button class="button danger" data-spell-remove="${valueOf(spell.instanceId)}" type="button">Remover</button>
              </article>
            `).join('')}
          </div>
        ` : '<div class="empty-slot">Nenhuma magia adicionada ainda. Use a biblioteca abaixo para adicionar magias ao personagem.</div>'}
      </div>

      <div class="panel panel-wide">
        <h2>Biblioteca de magias</h2>
        <div class="form-grid library-filters">
          <label class="form-field">
            <span>Pesquisar</span>
            <input data-spell-filter="query" value="${valueOf(filters.query)}" placeholder="Nome, efeito, componentes, fonte...">
          </label>
          <label class="form-field">
            <span>Classe</span>
            <select data-spell-filter="classId">
              <option value="personagem"${selectedAttr(filters.classId || 'personagem', 'personagem')}>Classes do personagem</option>
              <option value=""${selectedAttr(filters.classId, '')}>Todas</option>
              ${classOptions.map((classe) => `<option value="${valueOf(classe.id)}"${selectedAttr(filters.classId, classe.id)}>${valueOf(classe.nome)}</option>`).join('')}
            </select>
          </label>
          <label class="form-field">
            <span>Círculo</span>
            <select data-spell-filter="circle">
              <option value="">Todos</option>
              ${circles.map((circle) => `<option value="${valueOf(circle)}"${selectedAttr(filters.circle, circle)}>${circle === 0 ? 'Truque' : `${circle}º Círculo`}</option>`).join('')}
            </select>
          </label>
          <label class="form-field">
            <span>Escola</span>
            <select data-spell-filter="school">
              <option value="">Todas</option>
              ${schools.map((school) => `<option value="${valueOf(school)}"${selectedAttr(filters.school, school)}>${valueOf(school)}</option>`).join('')}
            </select>
          </label>
          <div class="stat-chip"><span>Resultados</span><strong>${valueOf(results.length)}</strong></div>
        </div>
      </div>

      <div class="panel library-results">
        <h2>Resultados</h2>
        ${results.length ? `
          <div class="item-result-list spell-result-list">
            ${results.map((spell) => `
              <article class="item-result${selected?.id === spell.id ? ' active' : ''}">
                <button type="button" data-spell-select="${valueOf(spell.id)}">
                  <strong>${valueOf(spell.nome)}</strong>
                  <span>${valueOf(spell.nivelTexto)} · ${valueOf(spell.escola)} · ${valueOf(joinList(spell.classes))}</span>
                </button>
                <button class="button" data-spell-add="${valueOf(spell.id)}" type="button">Adicionar</button>
              </article>
            `).join('')}
          </div>
        ` : '<p class="muted">Nenhuma magia encontrada para os filtros atuais.</p>'}
      </div>

      <div class="panel">
        <h2>Detalhes da magia</h2>
        ${renderSpellDetails(selected)}
        ${selected ? `<div class="action-row"><button class="button" data-spell-add="${valueOf(selected.id)}" type="button">Adicionar ao personagem</button></div>` : ''}
      </div>
    </section>
  `;
}

function renderItemDetails(item) {
  if (!item) return '<p class="muted">Selecione um item para ver detalhes.</p>';

  return `
    <article class="item-detail">
      <h3>${valueOf(item.nome)}</h3>
      <dl class="detail-list">
        <div><dt>Categoria</dt><dd>${valueOf(getDisplayCategory(item))}</dd></div>
        <div><dt>Tipo</dt><dd>${valueOf(item.tipo || item.uso || '-')}</dd></div>
        <div><dt>Preço</dt><dd>${valueOf(item.preco || '-')}</dd></div>
        <div><dt>Peso</dt><dd>${valueOf(item.peso || '-')}</dd></div>
        ${item.dano ? `<div><dt>Dano</dt><dd>${valueOf(item.dano)} ${valueOf(item.tipoDano)}</dd></div>` : ''}
        ${item.ca ? `<div><dt>CA</dt><dd>${valueOf(item.ca)}</dd></div>` : ''}
        ${item.propriedades?.length ? `<div><dt>Propriedades</dt><dd>${valueOf(item.propriedades.join(', '))}</dd></div>` : ''}
        <div><dt>Descrição</dt><dd>${valueOf(item.descricao || 'Sem descrição.')}</dd></div>
        <div><dt>Fonte</dt><dd>${item.efeitoCriado ? 'Descrição prática criada para a ficha' : 'Dados do catálogo'}</dd></div>
      </dl>
    </article>
  `;
}

function renderInventarioTab(ctx) {
  const character = ctx.state.character;
  const derived = getDerived(ctx);
  const coins = character.moedas || {};
  const inventory = character.inventario || [];

  return `
    <section class="class-layout">
      <div class="panel">
        <h2>Moedas e carga</h2>
        <div class="coins-grid">
          ${['pc', 'pp', 'pe', 'po', 'pl'].map((coin) => `
            <label class="form-field">
              <span>${coin.toUpperCase()}</span>
              <input data-coin="${coin}" type="number" min="0" value="${valueOf(coins[coin] || 0)}">
            </label>
          `).join('')}
        </div>
        <div class="summary-stack inventory-summary">
          <div><span>Peso total estimado</span><strong>${valueOf(derived.pesoTotal.toFixed(2).replace('.', ','))} kg</strong></div>
          <div><span>Armadura equipada</span><strong>${valueOf(derived.equippedArmor?.nome || 'Nenhuma')}</strong></div>
          <div><span>Escudo</span><strong>${valueOf(derived.shieldEntry?.nome || (character.combate.escudoEquipado ? 'Escudo manual' : 'Nenhum'))}</strong></div>
        </div>
      </div>

      <div class="panel">
        <h2>Criar item personalizado</h2>
        <div class="form-grid compact">
          ${field('Nome', 'customItem.nome', ctx.state.customItem.nome, { placeholder: 'Nome do item' })}
          ${field('Tipo', 'customItem.tipo', ctx.state.customItem.tipo, { placeholder: 'Item personalizado' })}
          ${field('Preço', 'customItem.preco', ctx.state.customItem.preco)}
          ${field('Peso', 'customItem.peso', ctx.state.customItem.peso, { placeholder: 'Ex.: 1 kg' })}
          ${field('Dano', 'customItem.dano', ctx.state.customItem.dano)}
          ${field('CA', 'customItem.ca', ctx.state.customItem.ca)}
          ${textareaField('Descrição', 'customItem.descricao', ctx.state.customItem.descricao, 4)}
        </div>
        <div class="action-row">
          <button class="button" data-inventory-custom-add type="button">Adicionar item personalizado</button>
        </div>
      </div>

      <div class="panel panel-wide">
        <h2>Inventário</h2>
        ${inventory.length ? `
          <div class="inventory-list">
            ${inventory.map((entry) => `
              <article class="inventory-row">
                <div>
                  <h3>${valueOf(entry.nome)}</h3>
                  <p class="muted">${valueOf(getDisplayCategory(entry))} · ${valueOf(entry.peso || 'peso não informado')} · ${valueOf(entry.preco || 'sem preço')}</p>
                  ${entry.dano ? `<p class="muted">Dano: ${valueOf(entry.dano)} ${valueOf(entry.tipoDano)}</p>` : ''}
                  ${entry.ca ? `<p class="muted">CA: ${valueOf(entry.ca)}</p>` : ''}
                </div>
                <label class="form-field">
                  <span>Qtd.</span>
                  <input data-inventory-field="quantidade" data-inventory-id="${valueOf(entry.instanceId)}" type="number" min="1" value="${valueOf(entry.quantidade || 1)}">
                </label>
                <label class="check-field">
                  <input data-inventory-field="equipado" data-inventory-id="${valueOf(entry.instanceId)}" type="checkbox"${checkedAttr(entry.equipado)}>
                  <span>Equipado</span>
                </label>
                <label class="form-field">
                  <span>Observação</span>
                  <input data-inventory-field="observacao" data-inventory-id="${valueOf(entry.instanceId)}" value="${valueOf(entry.observacao || '')}">
                </label>
                <button class="button danger" data-inventory-remove="${valueOf(entry.instanceId)}" type="button">Remover</button>
              </article>
            `).join('')}
          </div>
        ` : '<div class="empty-slot">Nenhum item adicionado ainda. Use a aba Biblioteca para adicionar itens.</div>'}
      </div>

      <div class="panel panel-wide">
        <h2>Armas equipadas</h2>
        ${derived.equippedWeapons.length ? `
          <div class="feature-list">
            ${derived.equippedWeapons.map((weapon) => `
              <article class="feature-item">
                <h4>${valueOf(weapon.nome)}</h4>
                <p>${valueOf([weapon.dano, weapon.tipoDano, weapon.propriedades?.join(', ')].filter(Boolean).join(' · ') || weapon.descricao || 'Sem dados de ataque.')}</p>
              </article>
            `).join('')}
          </div>
        ` : '<p class="muted">Marque armas como equipadas para vê-las aqui e na aba Combate.</p>'}
      </div>
    </section>
  `;
}

function renderBibliotecaTab(ctx) {
  const filters = ctx.state.biblioteca;
  const results = searchItems(ctx.items, filters).slice(0, 80);
  const selected = getItemById(ctx.items, filters.selectedItemId) || results[0] || null;
  const categories = getItemCategories(ctx.items);
  const types = getItemTypes(ctx.items);

  return `
    <section class="library-layout">
      <div class="panel panel-wide">
        <h2>Biblioteca de itens</h2>
        <div class="form-grid library-filters">
          <label class="form-field">
            <span>Pesquisar</span>
            <input data-library-filter="query" value="${valueOf(filters.query)}" placeholder="Nome, efeito, dano, propriedade...">
          </label>
          <label class="form-field">
            <span>Categoria</span>
            <select data-library-filter="category">
              <option value="">Todas</option>
              ${categories.map((category) => `<option value="${valueOf(category)}"${selectedAttr(filters.category, category)}>${valueOf(category)}</option>`).join('')}
            </select>
          </label>
          <label class="form-field">
            <span>Tipo</span>
            <select data-library-filter="type">
              <option value="">Todos</option>
              ${types.map((type) => `<option value="${valueOf(type)}"${selectedAttr(filters.type, type)}>${valueOf(type)}</option>`).join('')}
            </select>
          </label>
          <div class="stat-chip"><span>Resultados</span><strong>${valueOf(results.length)}</strong></div>
        </div>
      </div>

      <div class="panel library-results">
        <h2>Resultados</h2>
        ${results.length ? `
          <div class="item-result-list">
            ${results.map((item) => `
              <article class="item-result${selected?.id === item.id ? ' active' : ''}">
                <button type="button" data-library-select="${valueOf(item.id)}">
                  <strong>${valueOf(item.nome)}</strong>
                  <span>${valueOf(getDisplayCategory(item))} · ${valueOf(item.tipo || item.uso || 'sem tipo')}</span>
                </button>
                <button class="button" data-library-add="${valueOf(item.id)}" type="button">Adicionar</button>
              </article>
            `).join('')}
          </div>
        ` : '<p class="muted">Nenhum item encontrado para os filtros atuais.</p>'}
      </div>

      <div class="panel">
        <h2>Detalhes</h2>
        ${renderItemDetails(selected)}
        ${selected ? `<div class="action-row"><button class="button" data-library-add="${valueOf(selected.id)}" type="button">Adicionar ao inventário</button></div>` : ''}
      </div>
    </section>
  `;
}

function renderSaveOptions(savedCharacters = [], selectedSaveId = '') {
  return savedCharacters.map((record) => `
    <option value="${valueOf(record.id)}"${selectedAttr(selectedSaveId, record.id)}>
      ${valueOf(record.nome)} · ${valueOf(new Date(record.updatedAt).toLocaleString('pt-BR'))}
    </option>
  `).join('');
}

function renderExportacaoTab(ctx) {
  const savedCharacters = ctx.savedCharacters || [];
  const selectedSaveId = ctx.state.storage.selectedSaveId || savedCharacters[0]?.id || '';

  return `
    <section class="class-layout">
      <div class="panel">
        <h2>Salvamento local</h2>
        <p class="muted">Os personagens são salvos no localStorage deste navegador.</p>
        <div class="action-row">
          <button class="button" data-storage-action="save" type="button">Salvar personagem</button>
          <button class="button" data-storage-action="autosave" type="button">Salvar como ativo</button>
        </div>
        <label class="form-field storage-select">
          <span>Personagens salvos</span>
          <select data-storage-selected>
            <option value="">Selecione</option>
            ${renderSaveOptions(savedCharacters, selectedSaveId)}
          </select>
        </label>
        <div class="action-row">
          <button class="button" data-storage-action="load" type="button">Carregar</button>
          <button class="button" data-storage-action="duplicate" type="button">Duplicar</button>
          <button class="button danger" data-storage-action="delete" type="button">Excluir</button>
        </div>
        ${ctx.state.storage.lastSavedAt ? `<p class="muted">Último salvamento: ${valueOf(ctx.state.storage.lastSavedAt)}</p>` : ''}
      </div>

      <div class="panel">
        <h2>Importar e exportar JSON</h2>
        <p class="muted">Use JSON para backup ou para mover o personagem para outro navegador.</p>
        <div class="action-row">
          <button class="button" data-storage-action="export-json" type="button">Exportar JSON</button>
          <button class="button" data-storage-action="import-json" type="button">Importar JSON</button>
          <button class="button" data-storage-action="export-markdown" type="button">Exportar Markdown</button>
          <button class="button" data-storage-action="export-pdf" type="button">Exportar PDF editável</button>
          <button class="button" data-storage-action="print" type="button">Imprimir</button>
          <input data-import-file type="file" accept="application/json,.json" hidden>
        </div>
      </div>

      <div class="panel panel-wide">
        <h2>Resumo do personagem atual</h2>
        <div class="category-grid">
          <div><strong>${valueOf(ctx.state.character.nome || 'Sem nome')}</strong><span>Nome</span></div>
          <div><strong>${valueOf(ctx.state.character.inventario?.length || 0)}</strong><span>Itens</span></div>
          <div><strong>${valueOf(ctx.state.character.classes?.length || 0)}</strong><span>Classes</span></div>
        </div>
      </div>
    </section>
  `;
}

function renderAnotacoesTab(state) {
  return `
    <section class="panel">
      <h2>Anotações</h2>
      ${textareaField('Notas livres', 'anotacoes', state.character.anotacoes, 14)}
    </section>
  `;
}

function renderActiveTab(ctx) {
  switch (ctx.state.activeTab) {
    case 'personagem': return renderPersonagemTab(ctx);
    case 'atributos': return renderAtributosTab(ctx);
    case 'classe': return renderClasseTab(ctx);
    case 'multiclasse': return renderMulticlasseTab(ctx);
    case 'combate': return renderCombateTab(ctx);
    case 'magias': return renderMagiasTab(ctx);
    case 'inventario': return renderInventarioTab(ctx);
    case 'biblioteca': return renderBibliotecaTab(ctx);
    case 'anotacoes': return renderAnotacoesTab(ctx.state);
    case 'exportacao': return renderExportacaoTab(ctx);
    default: return renderPersonagemTab(ctx);
  }
}

export function renderApp(root, ctx) {
  const { state, classes, races, errors, toast } = ctx;
  const character = state.character;
  const classe = currentClass(state, classes);
  const race = currentRace(state, races);
  const derived = getDerived(ctx);

  root.className = 'app-shell';
  root.innerHTML = `
    <header class="sheet-header">
      <div class="title-block">
        <p class="eyebrow">D&D 5e · Ficha Modular</p>
        <input class="character-title" data-field="nome" value="${valueOf(character.nome)}" placeholder="Nome do personagem">
        <p>${valueOf(classe?.nome || 'Classe não selecionada')} · ${valueOf(race?.nome || 'Raça não selecionada')} · Nível ${valueOf(derived.nivelTotal)} · PB ${formatarBonus(derived.bonusProficiencia)}</p>
      </div>
    </header>

    ${renderLoadingErrors(errors)}

    <section class="quick-panel">
      ${renderClassSelect(state, classes)}
      ${renderRaceSelect(state, races)}
      <div class="stat-chip"><span>Nível total</span><strong>${valueOf(derived.nivelTotal)}</strong></div>
      <div class="stat-chip"><span>Proficiência</span><strong>${formatarBonus(derived.bonusProficiencia)}</strong></div>
      <div class="stat-chip"><span>PV</span><strong>${valueOf(derived.pvMaximo)}</strong></div>
      <div class="stat-chip"><span>CA</span><strong>${valueOf(derived.ca)}</strong></div>
    </section>

    ${renderTabs(state.activeTab)}

    <main class="tab-content">
      ${renderActiveTab(ctx)}
    </main>

    <div class="toast-region" aria-live="polite">
      ${toast ? `<div class="toast">${valueOf(toast)}</div>` : ''}
    </div>
  `;
}

export function getCurrentClass(state, classes) {
  return currentClass(state, classes);
}
