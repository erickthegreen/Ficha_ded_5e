export const DEFAULT_THEME = {
  id: 'padrao',
  imagemFundo: '',
  corPrimaria: '#3f3a2e',
  corSecundaria: '#11100d',
  corDestaque: '#d5b24c',
  overlay: 'rgba(9, 8, 6, 0.72)'
};

export const CLASS_THEME_IMAGES = {
  barbaro: 'assets/backgrounds/fundo-da-barbaro.png',
  bardo: 'assets/backgrounds/fundo-da-bardo.png',
  bruxo: 'assets/backgrounds/fundo-da-bruxo.png',
  clerigo: 'assets/backgrounds/fundo-da-clerigo.png',
  druida: 'assets/backgrounds/fundo-da-druida.png',
  feiticeiro: 'assets/backgrounds/fundo-da-feiticeiro.png',
  guerreiro: 'assets/backgrounds/fundo-da-guerreiro.png',
  ladino: 'assets/backgrounds/fundo-da-ladino.png',
  mago: 'assets/backgrounds/fundo-da-mago.png',
  monge: 'assets/backgrounds/fundo-da-monge.png',
  paladino: 'assets/backgrounds/fundo-da-paladino.png',
  ranger: 'assets/backgrounds/fundo-da-patrulheiro.png'
};

export function buildThemeCandidates(classe) {
  if (!classe) return [];

  const id = classe.id || '';
  const nome = classe.nome || '';
  const baseNames = [
    `fundo-da-${id}`,
    id === 'ranger' ? 'fundo-da-patrulheiro' : '',
    nome,
    nome.toLowerCase(),
    classe.tema?.imagemFundo?.split('/').pop()?.replace(/\.[a-z]+$/i, '')
  ].filter(Boolean);

  const extensions = ['png', 'jpg', 'jpeg', 'webp'];
  const candidates = [];

  if (CLASS_THEME_IMAGES[id]) candidates.push(CLASS_THEME_IMAGES[id]);

  for (const baseName of baseNames) {
    for (const ext of extensions) {
      candidates.push(`assets/backgrounds/${baseName}.${ext}`);
    }
  }

  return [...new Set(candidates)];
}
