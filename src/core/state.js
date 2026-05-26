export function createInitialCharacter() {
  return {
    nome: '',
    jogador: '',
    classes: [],
    raca: '',
    subclasse: '',
    antecedente: '',
    nivelTotal: 1,
    tendencia: '',
    xp: 0,
    campanha: '',
    mestre: '',
    atributos: {
      forca: 10,
      destreza: 10,
      constituicao: 10,
      inteligencia: 10,
      sabedoria: 10,
      carisma: 10
    },
    combate: {
      pontosVidaAtual: '',
      pontosVidaMaxManual: '',
      classeArmaduraManual: '',
      bonusCAManual: 0,
      bonusIniciativa: 0,
      deslocamento: '',
      armaduraEquipadaId: '',
      escudoEquipado: false
    },
    inventario: [],
    magias: [],
    moedas: {
      pc: 0,
      pp: 0,
      pe: 0,
      po: 0,
      pl: 0
    },
    anotacoes: ''
  };
}

export function createInitialState() {
  return {
    activeTab: 'personagem',
    character: createInitialCharacter(),
    biblioteca: {
      query: '',
      category: '',
      type: '',
      selectedItemId: ''
    },
    magias: {
      query: '',
      circle: '',
      school: '',
      classId: 'personagem',
      selectedSpellId: ''
    },
    customItem: {
      nome: '',
      categoria: 'custom',
      tipo: 'Item personalizado',
      preco: '',
      peso: '',
      dano: '',
      tipoDano: '',
      ca: '',
      descricao: ''
    },
    storage: {
      selectedSaveId: '',
      lastSavedAt: ''
    }
  };
}
