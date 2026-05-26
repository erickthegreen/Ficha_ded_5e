export function createCharacterExport(character) {
  return {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    type: 'dnd5e-character',
    character
  };
}

export function downloadCharacterJson(character) {
  const exportData = createCharacterExport(character);
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const name = character.nome || 'personagem';
  link.href = url;
  link.download = `${name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'personagem'}-dnd5e.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function extractCharacterFromJson(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('JSON inválido.');
  }

  const character = data.character || data;
  if (!character || typeof character !== 'object') {
    throw new Error('O arquivo não contém um personagem.');
  }

  return {
    nome: '',
    jogador: '',
    classes: [],
    raca: '',
    atributos: {},
    inventario: [],
    moedas: {},
    ...character
  };
}

export function readImportedCharacter(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nenhum arquivo selecionado.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        resolve(extractCharacterFromJson(parsed));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsText(file, 'utf-8');
  });
}
