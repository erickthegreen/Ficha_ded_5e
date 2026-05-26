import { slugify } from '../../utils/slug.js';

const CLASSES_URL = new URL('../../../data/classes.json', import.meta.url);

function asArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && typeof data === 'object') return [data];
  return [];
}

function normalizeClass(classe) {
  const id = slugify(classe.id || classe.nome);
  return {
    ...classe,
    id,
    nome: classe.nome || id,
    proficiencias: {
      armaduras: [],
      armas: [],
      ferramentas: [],
      testesResistencia: [],
      periciasDisponiveis: [],
      quantidadePericias: 0,
      ...(classe.proficiencias || {})
    },
    equipamentoInicial: Array.isArray(classe.equipamentoInicial) ? classe.equipamentoInicial : [],
    tabelaProgressao: Array.isArray(classe.tabelaProgressao) ? classe.tabelaProgressao : [],
    habilidadesPorNivel: classe.habilidadesPorNivel || {},
    subclasses: Array.isArray(classe.subclasses) ? classe.subclasses : [],
    conjuracao: classe.conjuracao || null
  };
}

export async function loadClasses(options = {}) {
  const errors = [];

  try {
    const response = await fetch(CLASSES_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const classes = asArray(json, 'classes').map(normalizeClass);
    return { classes, errors };
  } catch (error) {
    const message = `Falha ao carregar data/classes.json: ${error.message}`;
    errors.push(message);
    console.error(message, error);
    options.onError?.(message);
    return { classes: [], errors };
  }
}
