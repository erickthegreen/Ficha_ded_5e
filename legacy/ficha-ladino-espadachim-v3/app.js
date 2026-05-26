/* ============================================================
   TEMAS
   ============================================================ */
function setTema(tema) {
  document.body.className = 'tema-' + tema;
  document.querySelectorAll('.tema-btn').forEach(function(b) { b.classList.remove('ativo'); });
  var btn = document.getElementById('btn-' + tema);
  if (btn) btn.classList.add('ativo');
  localStorage.setItem('ladino-tema', tema);
}

// Carregar tema salvo
(function() {
  var t = localStorage.getItem('ladino-tema') || 'trevas';
  setTema(t);
})();

/* ============================================================ ABAS */
var TAB_KEY = 'ladino-aba-ativa';

function trocarAba(aba) {
  var existe = document.querySelector('.tab-section[data-tab="' + aba + '"]');
  if (!existe) aba = 'resumo';

  document.querySelectorAll('.tab-section').forEach(function(secao) {
    var ativa = secao.getAttribute('data-tab') === aba;
    secao.hidden = !ativa;
    secao.classList.toggle('is-active', ativa);
  });

  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.toggle('ativo', btn.getAttribute('data-tab') === aba);
  });

  localStorage.setItem(TAB_KEY, aba);
}

function iniciarAbas() {
  trocarAba(localStorage.getItem(TAB_KEY) || 'resumo');
}

/* ============================================================ SALVAR FICHA */
var SAVE_KEY = 'ladino-ficha-v1';
var saveTimer = null;
var saveStatusTimer = null;

function camposSalvaveis() {
  return Array.prototype.slice.call(document.querySelectorAll('input[id], textarea[id], select[id]'))
    .filter(function(campo) { return campo.type !== 'file'; });
}

function mostrarStatusSave(texto) {
  var el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = texto;
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(function() {
    if (el.textContent === texto) el.textContent = '';
  }, 2500);
}

function numeroCampo(id, fallback) {
  var campo = document.getElementById(id);
  var valor = campo ? parseInt(campo.value) : NaN;
  return isNaN(valor) ? fallback : valor;
}

function salvarFicha(mostrarStatus) {
  var campos = {};
  camposSalvaveis().forEach(function(campo) {
    campos[campo.id] = campo.type === 'checkbox' ? campo.checked : campo.value;
  });

  var pvAtualSalvo = numeroCampo('pv-atual-show', pvAtual);
  var pvMaxManualSalvo = pvMaxManual;
  var pvMaxDigitado = numeroCampo('d-pv', null);
  var caManualSalva = caManual;
  var caDigitada = numeroCampo('d-ca', null);

  if (document.activeElement && document.activeElement.id === 'd-pv' && pvMaxDigitado !== null && pvMaxDigitado >= 1) {
    pvMaxManualSalvo = pvMaxDigitado;
  }
  if (document.activeElement && document.activeElement.id === 'd-ca' && caDigitada !== null && caDigitada >= 0) {
    caManualSalva = caDigitada;
  }

  var pvMaxParaLimite = pvMaxManualSalvo !== null ? pvMaxManualSalvo : pvMax;
  if (typeof pvAtualSalvo === 'number' && typeof pvMaxParaLimite === 'number' && pvMaxParaLimite > 0) {
    pvAtualSalvo = Math.max(0, Math.min(pvMaxParaLimite, pvAtualSalvo));
  }

  var estado = {
    campos: campos,
    pvAtual: pvAtualSalvo,
    pvMaxManual: pvMaxManualSalvo,
    caManual: caManualSalva,
    imagemPersonagem: imagemPersonagem,
    equipamentos: coletarEquipamentos(),
    talentos: coletarTalentos(),
    salvoEm: new Date().toISOString()
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(estado));
    if (mostrarStatus !== false) mostrarStatusSave('Salvo');
  } catch (e) {
    mostrarStatusSave('Erro ao salvar');
  }
}

function salvarFichaAuto() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    salvarFicha(false);
    mostrarStatusSave('Salvo auto');
  }, 300);
}

function exportarFicha() {
  salvarFicha(false);

  var raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    mostrarStatusSave('Nada para exportar');
    return;
  }

  var nome = (document.getElementById('nome-char')?.value || 'ficha')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ficha';

  var blob = new Blob([raw], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = nome + '-dnd-5e.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  mostrarStatusSave('Exportado');
}

function exportarPDF() {
  salvarFicha(false);
  document.body.classList.add('modo-pdf');
  mostrarStatusSave('Gerando PDF');
  setTimeout(function() {
    if (typeof window.print === 'function') window.print();
    else mostrarStatusSave('Impressão indisponível');
    setTimeout(function() { document.body.classList.remove('modo-pdf'); }, 500);
  }, 100);
}

function abrirImportarFicha() {
  var input = document.getElementById('importar-ficha-input');
  if (input) input.click();
}

function importarFicha(event) {
  var input = event.target;
  var file = input.files && input.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function() {
    try {
      var estado = JSON.parse(reader.result);
      if (!estado || typeof estado !== 'object' || !estado.campos) {
        mostrarStatusSave('Arquivo inválido');
        return;
      }

      localStorage.setItem(SAVE_KEY, JSON.stringify(estado));
      carregarFichaSalva();
      iniciarAutoSave();
      calcular();
      mostrarStatusSave('Importado');
    } catch (e) {
      mostrarStatusSave('Erro ao importar');
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file);
}

function carregarFichaSalva() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;

    var estado = JSON.parse(raw);
    var campos = estado.campos || {};

    if (Array.isArray(estado.equipamentos)) {
      equipamentos = estado.equipamentos;
      renderEquipamentos();
    }
    if (Array.isArray(estado.talentos)) {
      talentos = estado.talentos;
      renderTalentos();
    }

    var temBonusSalvo = ['b-for','b-des','b-con','b-int','b-sab','b-car'].some(function(id) {
      return Object.prototype.hasOwnProperty.call(campos, id);
    });
    if (!temBonusSalvo) {
      ['b-for','b-des','b-con','b-int','b-sab','b-car'].forEach(function(id) {
        var campoBonus = document.getElementById(id);
        if (campoBonus) campoBonus.value = 0;
      });
    }

    Object.keys(campos).forEach(function(id) {
      var campo = document.getElementById(id);
      if (campo && campo.type === 'checkbox') campo.checked = !!campos[id];
      else if (campo && ('value' in campo)) campo.value = campos[id];
    });

    if (typeof estado.pvAtual === 'number') pvAtual = estado.pvAtual;
    if (typeof estado.pvMaxManual === 'number' || estado.pvMaxManual === null) pvMaxManual = estado.pvMaxManual;
    if (typeof estado.caManual === 'number' || estado.caManual === null) caManual = estado.caManual;
    if (typeof estado.imagemPersonagem === 'string' || estado.imagemPersonagem === null) aplicarImagemPersonagem(estado.imagemPersonagem);

    mostrarStatusSave('Carregado');
  } catch (e) {
    mostrarStatusSave('Erro ao carregar');
  }
}

function iniciarAutoSave() {
  camposSalvaveis().forEach(function(campo) {
    if (campo._autosaveLigado) return;
    campo._autosaveLigado = true;
    campo.addEventListener('input', salvarFichaAuto);
    campo.addEventListener('change', salvarFichaAuto);
  });
}

/* ============================================================
   DICIONÁRIOS D&D 5E
   ============================================================ */
var DICIONARIOS_DND5E = {
  regras: {
    bonusAlerta: 5,
    pbPorNivel: [2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6],
    ataqueFurtivoPorNivel: [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10],
    xpPorNivel: [0,300,900,2700,6500,14000,23000,34000,48000,64000,
                 85000,100000,120000,140000,165000,195000,225000,265000,305000,355000]
  },

  pericias: [
    { id:'acr',  nome:'Acrobacia',          attr:'DES' },
    { id:'ani',  nome:'Adestrar Animais',   attr:'SAB' },
    { id:'arc',  nome:'Arcanismo',          attr:'INT' },
    { id:'atl',  nome:'Atletismo',          attr:'FOR' },
    { id:'atu',  nome:'Atuação',            attr:'CAR' },
    { id:'eng',  nome:'Enganação',          attr:'CAR' },
    { id:'fur',  nome:'Furtividade',        attr:'DES' },
    { id:'his',  nome:'História',           attr:'INT' },
    { id:'inti', nome:'Intimidação',        attr:'CAR' },
    { id:'intu', nome:'Intuição',           attr:'SAB' },
    { id:'inv',  nome:'Investigação',       attr:'INT' },
    { id:'med',  nome:'Medicina',           attr:'SAB' },
    { id:'nat',  nome:'Natureza',           attr:'INT' },
    { id:'per',  nome:'Percepção',          attr:'SAB' },
    { id:'pers', nome:'Persuasão',          attr:'CAR' },
    { id:'pre',  nome:'Prestidigitação',    attr:'DES' },
    { id:'rel',  nome:'Religião',           attr:'INT' },
    { id:'sob',  nome:'Sobrevivência',      attr:'SAB' }
  ],

  equipamentos: {
    categorias: [
      { id:'armas',        nome:'Armas' },
      { id:'armaduras',    nome:'Armaduras' },
      { id:'kits',         nome:'Kits e Ferramentas' },
      { id:'frascos',      nome:'Frascos e Consumíveis' },
      { id:'improvisadas', nome:'Pode Virar Arma' },
      { id:'montarias',    nome:'Montarias e Veículos' },
      { id:'comercio',     nome:'Bens e Serviços' },
      { id:'bugigangas',   nome:'Bugigangas' },
      { id:'backpack',     nome:'Backpack' }
    ],
    usos: ['Arma', 'Armadura', 'Escudo', 'Kit/Ferramenta', 'Consumível', 'Montaria', 'Veículo', 'Serviço', 'Bem comercial', 'Bugiganga', 'Diverso', 'Arma improvisada'],
    raridades: ['Comum', 'Incomum', 'Raro', 'Muito raro', 'Lendário', 'Artefato'],

    armas: {
      rapieira: {
        categoria:'armas',
        nome:'Rapieira',
        uso:'Arma',
        raridade:'Comum',
        bonus:'0',
        dano:'1d8 perfurante',
        propriedades:['Acuidade'],
        detalhes:'1d8 perfurante · Acuidade · Requintada · corpo a corpo · 0,9kg'
      },
      adaga: {
        categoria:'armas',
        nome:'Adaga ×2',
        uso:'Arma',
        raridade:'Comum',
        bonus:'0',
        dano:'1d4 perfurante',
        propriedades:['Leve', 'Acuidade', 'Arremesso 6/18m'],
        detalhes:'1d4 perfurante · Leve · Acuidade · Arremesso 6/18m · 0,5kg cada'
      },
      bestaMao: {
        categoria:'armas',
        nome:'Besta de Mão + 20 Virotes',
        uso:'Arma',
        raridade:'Comum',
        bonus:'0',
        dano:'1d6 perfurante',
        propriedades:['Munição 9/36m', 'Leve', 'Recarga'],
        detalhes:'1d6 perfurante · 30/120m · Recarga · munição · 1,35kg'
      },
      arcoLongo: {
        categoria:'armas',
        nome:'Arco Longo',
        uso:'Arma',
        raridade:'Comum',
        bonus:'0',
        dano:'1d8 perfurante',
        propriedades:['Munição 45/180m', 'Pesada', 'Duas mãos'],
        detalhes:'1d8 perfurante · 45/180m · pesada · duas mãos · 1kg'
      },
      adagaEnvenenada: {
        categoria:'armas',
        nome:'Adaga Envenenada',
        uso:'Arma',
        raridade:'Incomum',
        bonus:'1',
        dano:'1d4 perfurante + 1d6 veneno',
        propriedades:['Leve', 'Acuidade', 'Arremesso 6/18m'],
        detalhes:'1d4 perfurante + 1d6 veneno · Leve · Acuidade · Arremesso 6/18m · bônus +1'
      }
    },

    armaduras: {
      acolchoada: {
        categoria:'armaduras',
        nome:'Acolchoada',
        aliases:['Armadura Acolchoada'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'5 po',
        ca:'11 + modificador de Des',
        caBase:11,
        somaDes:true,
        tipo:'Leve',
        furtividade:'Desvantagem',
        peso:'4 kg',
        detalhes:'CA 11 + modificador de Des · leve · 5 po · 4 kg · Furtividade: desvantagem'
      },
      couro: {
        categoria:'armaduras',
        nome:'Couro',
        aliases:['Armadura de Couro', 'Colete de Couro'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'10 po',
        ca:'11 + modificador de Des',
        caBase:11,
        somaDes:true,
        tipo:'Leve',
        peso:'5 kg',
        detalhes:'CA 11 + modificador de Des · leve · 10 po · 5 kg'
      },
      couroBatido: {
        categoria:'armaduras',
        nome:'Couro Batido',
        aliases:['Armadura de Couro Batido'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'45 po',
        ca:'12 + modificador de Des',
        caBase:12,
        somaDes:true,
        tipo:'Leve',
        peso:'6,5 kg',
        detalhes:'CA 12 + modificador de Des · leve · 45 po · 6,5 kg'
      },
      gibaoPeles: {
        categoria:'armaduras',
        nome:'Gibão de Peles',
        aliases:['Gibao de Peles'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'10 po',
        ca:'12 + modificador de Des (máx. +2)',
        caBase:12,
        somaDes:true,
        limiteDes:2,
        tipo:'Média',
        peso:'6 kg',
        detalhes:'CA 12 + modificador de Des (máx. +2) · média · 10 po · 6 kg'
      },
      camisaoMalha: {
        categoria:'armaduras',
        nome:'Camisão de Malha',
        aliases:['Camisao de Malha'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'50 po',
        ca:'13 + modificador de Des (máx. +2)',
        caBase:13,
        somaDes:true,
        limiteDes:2,
        tipo:'Média',
        peso:'10 kg',
        detalhes:'CA 13 + modificador de Des (máx. +2) · média · 50 po · 10 kg'
      },
      brunea: {
        categoria:'armaduras',
        nome:'Brunea',
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'50 po',
        ca:'14 + modificador de Des (máx. +2)',
        caBase:14,
        somaDes:true,
        limiteDes:2,
        tipo:'Média',
        furtividade:'Desvantagem',
        peso:'22,5 kg',
        detalhes:'CA 14 + modificador de Des (máx. +2) · média · 50 po · 22,5 kg · Furtividade: desvantagem'
      },
      peitoral: {
        categoria:'armaduras',
        nome:'Peitoral',
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'400 po',
        ca:'14 + modificador de Des (máx. +2)',
        caBase:14,
        somaDes:true,
        limiteDes:2,
        tipo:'Média',
        peso:'10 kg',
        detalhes:'CA 14 + modificador de Des (máx. +2) · média · 400 po · 10 kg'
      },
      meiaArmadura: {
        categoria:'armaduras',
        nome:'Meia-Armadura',
        aliases:['Meia Armadura'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'750 po',
        ca:'15 + modificador de Des (máx. +2)',
        caBase:15,
        somaDes:true,
        limiteDes:2,
        tipo:'Média',
        furtividade:'Desvantagem',
        peso:'20 kg',
        detalhes:'CA 15 + modificador de Des (máx. +2) · média · 750 po · 20 kg · Furtividade: desvantagem'
      },
      cotaAneis: {
        categoria:'armaduras',
        nome:'Cota de Anéis',
        aliases:['Cota de Aneis'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'30 po',
        ca:'14',
        caBase:14,
        tipo:'Pesada',
        furtividade:'Desvantagem',
        peso:'20 kg',
        detalhes:'CA 14 · pesada · 30 po · 20 kg · Furtividade: desvantagem'
      },
      cotaMalha: {
        categoria:'armaduras',
        nome:'Cota de Malha',
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'75 po',
        ca:'16',
        caBase:16,
        tipo:'Pesada',
        forca:'For 13',
        furtividade:'Desvantagem',
        peso:'27,5 kg',
        detalhes:'CA 16 · pesada · 75 po · 27,5 kg · Força: For 13 · Furtividade: desvantagem'
      },
      cotaTalas: {
        categoria:'armaduras',
        nome:'Cota de Talas',
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'200 po',
        ca:'17',
        caBase:17,
        tipo:'Pesada',
        forca:'For 15',
        furtividade:'Desvantagem',
        peso:'30 kg',
        detalhes:'CA 17 · pesada · 200 po · 30 kg · Força: For 15 · Furtividade: desvantagem'
      },
      placas: {
        categoria:'armaduras',
        nome:'Placas',
        aliases:['Armadura de Placas'],
        uso:'Armadura',
        raridade:'Comum',
        bonus:'0',
        preco:'1.500 po',
        ca:'18',
        caBase:18,
        tipo:'Pesada',
        forca:'For 15',
        furtividade:'Desvantagem',
        peso:'32,5 kg',
        detalhes:'CA 18 · pesada · 1.500 po · 32,5 kg · Força: For 15 · Furtividade: desvantagem'
      },
      escudo: {
        categoria:'armaduras',
        nome:'Escudo',
        uso:'Escudo',
        raridade:'Comum',
        bonus:'0',
        preco:'10 po',
        ca:'+2',
        caBonus:2,
        tipo:'Escudo',
        peso:'3 kg',
        detalhes:'CA +2 · escudo · 10 po · 3 kg'
      }
    },

    kits: {
      ferramentasLadrao: {
        categoria:'kits',
        nome:'Kit/Ferramentas de Ladrão',
        aliases:['Ferramentas de Ladrão', 'Kit de Ladrão', 'Gazuas'],
        uso:'Kit/Ferramenta',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Inclui lima pequena, gazuas, espelho pequeno em cabo metálico, tesouras estreitas e alicate. Com proficiência, some PB em testes para abrir fechaduras e desarmar armadilhas.'
      },
      kitDisfarce: {
        categoria:'kits',
        nome:'Kit de Disfarce',
        uso:'Kit/Ferramenta',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Tintas, perucas, próteses simples e roupas ajustáveis para alterar aparência. Use com Enganação, Atuação ou testes pedidos pelo mestre.'
      },
      kitFalsificacao: {
        categoria:'kits',
        nome:'Kit de Falsificação',
        uso:'Kit/Ferramenta',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Tintas, lacres, papéis, penas e moldes para copiar documentos, assinaturas e selos. Útil para criar permissões falsas e pistas forjadas.'
      },
      kitVenenos: {
        categoria:'kits',
        nome:'Kit de Venenos',
        uso:'Kit/Ferramenta',
        raridade:'Incomum',
        bonus:'0',
        detalhes:'Frascos, pilão, luvas e reagentes para manusear, identificar ou preparar venenos. Use com autorização do mestre.'
      },
      kitHerbalismo: {
        categoria:'kits',
        nome:'Kit de Herbalismo',
        uso:'Kit/Ferramenta',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Bolsa com tesoura, almofariz, frascos e panos para coletar ervas, preparar bálsamos simples e reconhecer plantas úteis.'
      },
      suprimentosAlquimista: {
        categoria:'kits',
        nome:'Suprimentos de Alquimista',
        uso:'Kit/Ferramenta',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Vidros, sais, reagentes e queimador pequeno para identificar substâncias e preparar misturas alquímicas simples.'
      },
      ferramentasCartografo: {
        categoria:'kits',
        nome:'Ferramentas de Cartógrafo',
        uso:'Kit/Ferramenta',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Penas, compassos, régua, tinta e pergaminhos para desenhar mapas, registrar rotas e interpretar terreno explorado.'
      },
      ferramentasNavegador: {
        categoria:'kits',
        nome:'Ferramentas de Navegador',
        uso:'Kit/Ferramenta',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Instrumentos de direção e medição para navegação por estrelas, costa, vento e mapas.'
      },
      pacoteAventureiro: {
        categoria:'backpack',
        nome:'Pacote de Aventureiro',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Use este item como pasta para registrar corda, tochas, rações e outros itens carregados.'
      }
    },

    consumiveis: {
      pocaoCura: {
        categoria:'frascos',
        nome:'Poção de Cura',
        aliases:['Poção de Cura Menor', 'Pocao de Cura'],
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Recupera 2d4 + 2 PV ao beber.'
      },
      venenoBasico: {
        categoria:'frascos',
        nome:'Veneno Básico',
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Aplicado em arma perfurante ou cortante; o alvo faz resistência conforme a regra usada pela mesa.'
      },
      frascoAcido: {
        categoria:'frascos',
        nome:'Frasco de Ácido',
        aliases:['Acido', 'Ácido'],
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Pode ser arremessado ou derramado. Causa dano ácido ou corrói material simples conforme decisão do mestre.'
      },
      fogoAlquimico: {
        categoria:'frascos',
        nome:'Fogo Alquímico',
        aliases:['Fogo Alquimico'],
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Frasco pegajoso que incendeia ao quebrar. Útil para pressão, distração e dano contínuo se o mestre permitir.'
      },
      antidoto: {
        categoria:'frascos',
        nome:'Antídoto',
        aliases:['Antidoto'],
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Bebido para ganhar ajuda contra venenos por um período curto. Ajuste duração e bônus conforme a mesa.'
      },
      oleoFrasco: {
        categoria:'frascos',
        nome:'Frasco de Óleo',
        aliases:['Oleo', 'Óleo'],
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Pode alimentar lanterna, lubrificar mecanismos ou ser espalhado para tornar uma área escorregadia ou inflamável.'
      },
      aguaBenta: {
        categoria:'frascos',
        nome:'Água Benta',
        aliases:['Agua Benta'],
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Frasco consagrado. Pode ferir mortos-vivos ou corruptos se arremessado, conforme regra usada pelo mestre.'
      },
      tintaInvisivel: {
        categoria:'frascos',
        nome:'Tinta Invisível',
        aliases:['Tinta Invisivel'],
        uso:'Consumível',
        raridade:'Incomum',
        bonus:'0',
        detalhes:'Escreve mensagens que só aparecem com calor, reagente específico ou luz adequada. Boa para contratos e pistas secretas.'
      },
      bombaFumaca: {
        categoria:'frascos',
        nome:'Bomba de Fumaça',
        aliases:['Bomba de Fumaca', 'Frasco de Fumaça'],
        uso:'Consumível',
        raridade:'Incomum',
        bonus:'0',
        detalhes:'Ao quebrar, cria fumaça curta para cobertura, fuga ou distração. Vento forte dispersa rapidamente.'
      },
      poDeCoceira: {
        categoria:'frascos',
        nome:'Pó de Coceira',
        uso:'Consumível',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Irrita pele e olhos por alguns instantes. Serve para distração social ou para atrapalhar uma perseguição.'
      },
      essenciaSilencio: {
        categoria:'frascos',
        nome:'Essência de Passos Leves',
        uso:'Consumível',
        raridade:'Incomum',
        bonus:'0',
        detalhes:'Aplicada nas botas por 1 hora. Reduz ruídos de passos e ajuda testes de Furtividade, a critério do mestre.'
      }
    },

    improvisadas: {
      peDeCabra: {
        categoria:'improvisadas',
        nome:'Pé de cabra',
        uso:'Arma improvisada',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Ferramenta para forçar portas/baús. Pode ser tratado como arma improvisada se o mestre permitir.'
      },
      garrafaQuebrada: {
        categoria:'improvisadas',
        nome:'Garrafa Quebrada',
        uso:'Arma improvisada',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Arma improvisada cortante. Sugestão: 1d4 cortante, frágil e descartável após uso perigoso.'
      },
      tochaAcesa: {
        categoria:'improvisadas',
        nome:'Tocha Acesa',
        uso:'Arma improvisada',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Pode causar dano improvisado e fogo narrativo. Também ilumina e serve para ameaçar criaturas sensíveis a chamas.'
      },
      correnteCurta: {
        categoria:'improvisadas',
        nome:'Corrente Curta',
        uso:'Arma improvisada',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Pode bater, prender ou puxar objetos. Sugestão: arma improvisada contundente com alcance curto.'
      },
      cordaComGancho: {
        categoria:'improvisadas',
        nome:'Corda com Gancho',
        uso:'Arma improvisada',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Serve para escalar, puxar objetos, prender algo ou improvisar manobra. Dano depende do uso narrativo.'
      },
      pedraPesada: {
        categoria:'improvisadas',
        nome:'Pedra Pesada',
        uso:'Arma improvisada',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Objeto arremessável ou contundente. Sugestão: 1d4 contundente se usado como arma improvisada.'
      },
      cadeira: {
        categoria:'improvisadas',
        nome:'Cadeira',
        uso:'Arma improvisada',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Pode bloquear passagem, ser quebrada ou usada como arma improvisada contundente em briga de taverna.'
      }
    },

    diversos: {
      roupasViagem: {
        categoria:'backpack',
        nome:'Roupas de viagem',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Parte do equipamento comum do personagem.'
      },
      sacoOuMochila: {
        categoria:'backpack',
        nome:'Saco ou mochila',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Use para listar os itens carregados no backpack.'
      },
      mochila: {
        categoria:'backpack',
        nome:'Mochila',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Recipiente principal para carregar equipamentos pequenos, rações, corda e objetos de exploração.'
      },
      cordaCanhamo: {
        categoria:'backpack',
        nome:'Corda de Cânhamo',
        aliases:['Corda'],
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Corda comum para escalada, amarração, armadilhas simples e resgates. Resistente, mas volumosa.'
      },
      cordaSeda: {
        categoria:'backpack',
        nome:'Corda de Seda',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Mais leve e discreta que corda comum. Boa para infiltração, escalada silenciosa e carregar escondida.'
      },
      pederneira: {
        categoria:'backpack',
        nome:'Pederneira e Isqueiro',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Usado para acender fogo, tochas, fogueiras, pavios e distrações com preparação.'
      },
      tocha: {
        categoria:'backpack',
        nome:'Tocha',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Ilumina áreas escuras e pode virar objeto inflamável ou arma improvisada.'
      },
      racoes: {
        categoria:'backpack',
        nome:'Rações de Viagem',
        aliases:['Rações'],
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Comida seca para jornadas. Útil para registrar consumo diário e tempo longe de cidades.'
      },
      cantil: {
        categoria:'backpack',
        nome:'Cantil',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Recipiente para água, vinho barato ou líquidos úteis durante exploração.'
      },
      espelhoAco: {
        categoria:'backpack',
        nome:'Espelho de Aço',
        aliases:['Espelho'],
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Permite olhar cantos, refletir luz, sinalizar à distância ou examinar mecanismos sem se expor.'
      },
      giz: {
        categoria:'backpack',
        nome:'Giz',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Marca paredes, portas, rotas de fuga, símbolos de ladrões e pistas discretas.'
      },
      lanterna: {
        categoria:'backpack',
        nome:'Lanterna Coberta',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Ilumina com controle melhor que tocha. Usa óleo e pode ser parcialmente fechada para reduzir claridade.'
      },
      sacoDormir: {
        categoria:'backpack',
        nome:'Saco de Dormir',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Ajuda em descanso durante viagem. Também pode embalar itens frágeis.'
      },
      sinete: {
        categoria:'backpack',
        nome:'Sinete Falso',
        uso:'Diverso',
        raridade:'Incomum',
        bonus:'0',
        detalhes:'Selo forjado para cartas, contratos e autorizações falsas. Funciona melhor junto de Kit de Falsificação.'
      },
      capaEscura: {
        categoria:'backpack',
        nome:'Capa Escura',
        uso:'Diverso',
        raridade:'Comum',
        bonus:'0',
        detalhes:'Roupa discreta para chuva, frio e infiltração. Pode ajudar a esconder equipamento pequeno.'
      }
    }
  },

  talentosPadrao: [
    {
      nome:'Alerta',
      desc:'+5 na iniciativa. Enquanto estiver consciente, você não pode ser surpreendido. Criaturas não ganham vantagem em ataques contra você apenas por estarem invisíveis.'
    }
  ]
};

function clonarItemCatalogo(item) {
  var copia = Object.assign({}, item || {});
  if (Array.isArray(item && item.propriedades)) copia.propriedades = item.propriedades.slice();
  if (Array.isArray(item && item.aliases)) copia.aliases = item.aliases.slice();
  return copia;
}

function chaveCatalogo(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function chaveObjetoCatalogo(nome) {
  var chave = chaveCatalogo(nome).replace(/(?:^|\s)([a-z0-9])/g, function(_, letra) {
    return letra.toUpperCase();
  }).replace(/\s+/g, '');
  return chave ? chave.charAt(0).toLowerCase() + chave.slice(1) : 'item';
}

var CATALOGO_EQUIPAMENTOS = { lista: [], porNome: {} };

function registrarItemCatalogo(item) {
  if (!item || !item.nome) return;
  var copia = clonarItemCatalogo(item);
  if (!copia.categoria) copia.categoria = classificarEquipamento(copia);
  if (!copia.uso) copia.uso = usoPadraoPorCategoria(copia.categoria);
  if (!copia.raridade) copia.raridade = 'Comum';
  if (!copia.bonus) copia.bonus = '0';
  if (!copia.detalhes) copia.detalhes = montarDetalhesCatalogo(copia);

  var chavePrincipal = chaveCatalogo(copia.nome);
  var existente = chavePrincipal ? CATALOGO_EQUIPAMENTOS.porNome[chavePrincipal] : null;
  if (existente && existente.categoria === copia.categoria) {
    var aliases = [].concat(existente.aliases || [], copia.aliases || []);
    Object.assign(existente, copia);
    existente.catalogoId = existente.catalogoId;
    existente.aliases = aliases.filter(function(alias, i, arr) {
      return alias && arr.indexOf(alias) === i;
    });
    copia = existente;
  } else {
    copia.catalogoId = CATALOGO_EQUIPAMENTOS.lista.length;
    CATALOGO_EQUIPAMENTOS.lista.push(copia);
  }

  [copia.nome].concat(copia.aliases || []).forEach(function(nome) {
    var chave = chaveCatalogo(nome);
    if (chave) CATALOGO_EQUIPAMENTOS.porNome[chave] = copia;
  });
}

function registrarGrupoCatalogo(grupo) {
  Object.keys(grupo || {}).forEach(function(chave) {
    registrarItemCatalogo(grupo[chave]);
  });
}

function inicializarCatalogoEquipamentos() {
  CATALOGO_EQUIPAMENTOS = { lista: [], porNome: {} };
  var eq = DICIONARIOS_DND5E.equipamentos;
  registrarGrupoCatalogo(eq.armas);
  registrarGrupoCatalogo(eq.armaduras);
  registrarGrupoCatalogo(eq.kits);
  registrarGrupoCatalogo(eq.consumiveis);
  registrarGrupoCatalogo(eq.improvisadas);
  registrarGrupoCatalogo(eq.diversos);
  if (typeof DICIONARIO_EQUIPAMENTOS_LIVRO !== 'undefined' && Array.isArray(DICIONARIO_EQUIPAMENTOS_LIVRO)) {
    DICIONARIO_EQUIPAMENTOS_LIVRO.forEach(registrarItemCatalogo);
  }
}

function buscarItemCatalogoPorNome(nome, permitirPrefixo) {
  var chave = chaveCatalogo(nome);
  if (!chave) return null;
  if (CATALOGO_EQUIPAMENTOS.porNome[chave]) return CATALOGO_EQUIPAMENTOS.porNome[chave];
  if (!permitirPrefixo) return null;

  var candidatos = CATALOGO_EQUIPAMENTOS.lista.filter(function(item) {
    return chaveCatalogo(item.nome).indexOf(chave) === 0;
  });
  return candidatos.length === 1 ? candidatos[0] : null;
}

function fundirItemNoDicionario(categoria, item) {
  if (!item || !item.nome) return;
  var grupos = {
    armas: DICIONARIOS_DND5E.equipamentos.armas,
    armaduras: DICIONARIOS_DND5E.equipamentos.armaduras,
    kits: DICIONARIOS_DND5E.equipamentos.kits,
    frascos: DICIONARIOS_DND5E.equipamentos.consumiveis,
    improvisadas: DICIONARIOS_DND5E.equipamentos.improvisadas,
    montarias: DICIONARIOS_DND5E.equipamentos.diversos,
    comercio: DICIONARIOS_DND5E.equipamentos.diversos,
    bugigangas: DICIONARIOS_DND5E.equipamentos.diversos,
    backpack: DICIONARIOS_DND5E.equipamentos.diversos
  };
  var grupo = grupos[categoria] || grupos.backpack;
  var chave = chaveObjetoCatalogo(item.nome);
  grupo[chave] = Object.assign({}, grupo[chave] || {}, item);
}

function usoPadraoPorCategoria(categoria) {
  return categoria === 'armas' ? 'Arma'
    : categoria === 'armaduras' ? 'Armadura'
    : categoria === 'kits' ? 'Kit/Ferramenta'
    : categoria === 'frascos' ? 'Consumível'
    : categoria === 'improvisadas' ? 'Arma improvisada'
    : categoria === 'montarias' ? 'Montaria'
    : categoria === 'comercio' ? 'Bem comercial'
    : categoria === 'bugigangas' ? 'Bugiganga'
    : 'Diverso';
}

function categoriaPorUso(uso, fallback) {
  var chave = chaveCatalogo(uso);
  if (chave === 'arma') return 'armas';
  if (chave === 'armadura' || chave === 'escudo') return 'armaduras';
  if (chave === 'kit ferramenta') return 'kits';
  if (chave === 'consumivel') return 'frascos';
  if (chave === 'arma improvisada') return 'improvisadas';
  if (chave === 'montaria' || chave === 'veiculo') return 'montarias';
  if (chave === 'servico' || chave === 'bem comercial' || chave === 'hospedagem') return 'comercio';
  if (chave === 'bugiganga') return 'bugigangas';
  return fallback || 'backpack';
}

function montarDetalhesCatalogo(item) {
  var partes = [];
  if (item.dano) partes.push(item.dano);
  if (item.ca) partes.push('CA ' + item.ca);
  if (Array.isArray(item.propriedades) && item.propriedades.length) partes = partes.concat(item.propriedades);
  if (item.tipo) partes.push(String(item.tipo).toLowerCase());
  if (item.preco) partes.push(item.preco);
  if (item.peso) partes.push(item.peso);
  if (item.forca) partes.push('Força: ' + item.forca);
  if (item.furtividade && item.furtividade !== '–' && item.furtividade !== '-') partes.push('Furtividade: ' + String(item.furtividade).toLowerCase());
  return partes.join(' · ');
}

function itemComCatalogo(item, permitirPrefixo) {
  item = item || {};
  var catalogo = buscarItemCatalogoPorNome(item.nome, permitirPrefixo);
  if (!catalogo) return item;

  var combinado = Object.assign({}, item);
  combinado.categoria = catalogo.categoria || item.categoria;
  combinado.uso = catalogo.uso || item.uso || usoPadraoPorCategoria(combinado.categoria);
  combinado.raridade = item.raridade && item.raridade !== 'Comum' ? item.raridade : (catalogo.raridade || item.raridade || 'Comum');
  combinado.bonus = item.bonus && item.bonus !== '0' ? item.bonus : (catalogo.bonus || item.bonus || '0');
  combinado.detalhes = item.detalhes || catalogo.detalhes || montarDetalhesCatalogo(catalogo);
  return combinado;
}

function renderCatalogoDatalist() {
  var usados = {};
  var opcoes = CATALOGO_EQUIPAMENTOS.lista
    .map(function(item) { return item.nome; })
    .filter(function(nome) {
      var chave = chaveCatalogo(nome);
      if (!chave || usados[chave]) return false;
      usados[chave] = true;
      return true;
    })
    .sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });

  return '<datalist id="equip-catalogo-list">'
    + opcoes.map(function(nome) { return '<option value="' + escapeHTML(nome) + '"></option>'; }).join('')
    + '</datalist>';
}

function textoBuscaCatalogo(item) {
  return [
    item.nome,
    (item.aliases || []).join(' '),
    item.uso,
    item.raridade,
    item.dano,
    item.ca,
    (item.propriedades || []).join(' '),
    item.detalhes
  ].join(' ');
}

function distanciaLeve(a, b, limite) {
  if (a === b) return 0;
  if (!a || !b) return Math.max(a.length, b.length);
  if (Math.abs(a.length - b.length) > limite) return limite + 1;

  var anterior = [];
  for (var j = 0; j <= b.length; j++) anterior[j] = j;

  for (var i = 1; i <= a.length; i++) {
    var atual = [i];
    var menorLinha = atual[0];
    for (var col = 1; col <= b.length; col++) {
      var custo = a.charAt(i - 1) === b.charAt(col - 1) ? 0 : 1;
      atual[col] = Math.min(
        anterior[col] + 1,
        atual[col - 1] + 1,
        anterior[col - 1] + custo
      );
      menorLinha = Math.min(menorLinha, atual[col]);
    }
    if (menorLinha > limite) return limite + 1;
    anterior = atual;
  }
  return anterior[b.length];
}

function pontuarItemCatalogo(item, termo, categoria) {
  if (categoria && item.categoria !== categoria) return -1;
  var busca = chaveCatalogo(termo);
  if (!busca) return 10;

  var nome = chaveCatalogo(item.nome);
  var texto = chaveCatalogo(textoBuscaCatalogo(item));
  var palavrasTexto = texto.split(' ').filter(Boolean);
  var partesBusca = busca.split(' ').filter(Boolean);
  var score = 0;

  if (nome === busca) score += 1000;
  else if (nome.indexOf(busca) === 0) score += 760;
  else if (texto.indexOf(busca) >= 0) score += 420;

  partesBusca.forEach(function(parte) {
    if (!parte) return;
    if (nome.indexOf(parte) === 0) score += 190;
    else if (texto.indexOf(parte) >= 0) score += 90;
    else {
      var perto = palavrasTexto.some(function(palavra) {
        return palavra.length >= 3 && distanciaLeve(parte, palavra, 2) <= 2;
      });
      if (perto) score += 45;
    }
  });

  return score;
}

function buscarCatalogo(termo, categoria, limite) {
  var vistos = {};
  return CATALOGO_EQUIPAMENTOS.lista
    .map(function(item) {
      return { item:item, score:pontuarItemCatalogo(item, termo, categoria) };
    })
    .filter(function(resultado) {
      if (resultado.score <= 0) return false;
      var chave = resultado.item.categoria + ':' + chaveCatalogo(resultado.item.nome);
      if (vistos[chave]) return false;
      vistos[chave] = true;
      return true;
    })
    .sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.nome.localeCompare(b.item.nome, 'pt-BR');
    })
    .slice(0, limite || 8)
    .map(function(resultado) { return resultado.item; });
}

function nomeCategoria(categoria) {
  var cat = EQUIP_CATEGORIAS.find(function(item) { return item.id === categoria; });
  return cat ? cat.nome : 'Catálogo';
}

function categoriaBuscaReal(categoria) {
  return categoria === 'global' ? null : categoria;
}

function renderBuscaCategoria(cat) {
  return '<div class="catalogo-busca">'
    + '<input class="catalogo-input" id="catalogo-busca-' + cat.id + '" type="search" placeholder="Buscar nesta seção" autocomplete="off" oninput="atualizarSugestoesCatalogo(\'' + cat.id + '\')" onfocus="atualizarSugestoesCatalogo(\'' + cat.id + '\')">'
    + '<div class="catalogo-sugestoes" id="catalogo-sugestoes-' + cat.id + '"></div>'
    + '</div>';
}

function renderBuscaGlobalCatalogo() {
  return '<div class="catalogo-global">'
    + '<div class="catalogo-global-titulo">Buscar em todos os itens do livro</div>'
    + '<div class="catalogo-busca catalogo-busca-global">'
    + '<input class="catalogo-input" id="catalogo-busca-global" type="search" placeholder="Digite qualquer item do livro" autocomplete="off" oninput="atualizarSugestoesCatalogo(\'global\')" onfocus="atualizarSugestoesCatalogo(\'global\')">'
    + '<div class="catalogo-sugestoes" id="catalogo-sugestoes-global"></div>'
    + '</div>'
    + '</div>';
}

function renderItemSugestao(item) {
  var meta = [nomeCategoria(item.categoria), item.uso, item.raridade, item.bonus && item.bonus !== '0' ? '+' + item.bonus : ''].filter(Boolean).join(' · ');
  return '<button type="button" class="catalogo-opcao" onclick="adicionarItemDoCatalogo(' + item.catalogoId + ')">'
    + '<span class="catalogo-opcao-top"><strong>' + escapeHTML(item.nome) + '</strong><em>' + escapeHTML(meta) + '</em></span>'
    + '<span class="catalogo-opcao-desc">' + escapeHTML(item.detalhes || montarDetalhesCatalogo(item)) + '</span>'
    + '</button>';
}

function temItemExatoNaCategoria(termo, categoria) {
  var chave = chaveCatalogo(termo);
  if (!chave) return false;
  return CATALOGO_EQUIPAMENTOS.lista.some(function(item) {
    return (!categoria || item.categoria === categoria) && chaveCatalogo(item.nome) === chave;
  });
}

function atualizarSugestoesCatalogo(categoria) {
  var input = document.getElementById('catalogo-busca-' + categoria);
  var box = document.getElementById('catalogo-sugestoes-' + categoria);
  if (!input || !box) return;

  var termo = input.value.trim();
  var categoriaReal = categoriaBuscaReal(categoria);
  var resultados = buscarCatalogo(termo, categoriaReal, termo ? 10 : 6);
  var html = resultados.map(renderItemSugestao).join('');

  var categoriaCriacao = categoria === 'global' ? 'backpack' : categoria;
  var permiteCriar = categoriaCriacao !== 'armas' && categoriaCriacao !== 'armaduras';
  if (permiteCriar && termo.length >= 2 && !temItemExatoNaCategoria(termo, categoriaReal)) {
    var inventado = criarItemInventado(categoriaCriacao, termo);
    html += '<button type="button" class="catalogo-opcao catalogo-opcao-criar" onclick="adicionarItemInventadoDaBusca(\'' + categoriaCriacao + '\', \'' + categoria + '\')">'
      + '<span class="catalogo-opcao-top"><strong>' + escapeHTML(inventado.nome) + '</strong><em>' + escapeHTML(inventado.uso + ' · novo') + '</em></span>'
      + '<span class="catalogo-opcao-desc">' + escapeHTML(inventado.detalhes) + '</span>'
      + '</button>';
  }

  box.innerHTML = html;
  box.classList.toggle('tem-resultados', !!html);
}

function fecharSugestoesCatalogo() {
  document.querySelectorAll('.catalogo-sugestoes').forEach(function(box) {
    box.innerHTML = '';
    box.classList.remove('tem-resultados');
  });
}

function iniciarFechamentoBuscaCatalogo() {
  if (document._catalogoFechamentoLigado) return;
  document._catalogoFechamentoLigado = true;

  document.addEventListener('click', function(event) {
    if (!event.target.closest('.catalogo-busca')) fecharSugestoesCatalogo();
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') fecharSugestoesCatalogo();
  });
}

function capitalizarNomeItem(texto) {
  return String(texto || '').trim().replace(/\s+/g, ' ').replace(/(^|\s)([a-záéíóúâêôãõç])/gi, function(_, espaco, letra) {
    return espaco + letra.toUpperCase();
  });
}

function criarItemInventado(categoria, termo) {
  var nome = capitalizarNomeItem(termo) || 'Item Novo';
  var uso = usoPadraoPorCategoria(categoria);
  var detalhes = '';

  if (categoria === 'frascos') {
    detalhes = 'Consumível criado a partir da busca. Sugestão: efeito curto ligado ao nome, com teste, CD e duração definidos pelo mestre.';
  } else if (categoria === 'kits') {
    detalhes = 'Kit criado a partir da busca. Sugestão: conjunto de ferramentas para testes relacionados ao nome, usando proficiência quando o mestre permitir.';
  } else if (categoria === 'improvisadas') {
    detalhes = 'Pode ser usado como arma improvisada. Sugestão: 1d4 de dano apropriado ao objeto, salvo decisão diferente do mestre.';
  } else if (categoria === 'armas') {
    detalhes = 'Arma não catalogada. Preencha dano, alcance, propriedades, peso e bônus conforme a regra da mesa.';
  } else if (categoria === 'armaduras') {
    detalhes = 'Armadura não catalogada. Preencha CA, tipo, requisito de Força, furtividade, peso e bônus conforme a regra da mesa.';
  } else {
    detalhes = 'Item diverso criado a partir da busca. Use para registrar função, peso, efeito narrativo e qualquer regra combinada com o mestre.';
  }

  return {
    categoria: categoria || 'backpack',
    nome: nome,
    uso: uso,
    raridade: 'Comum',
    bonus: '0',
    detalhes: detalhes
  };
}

function adicionarItemDoCatalogo(catalogoId) {
  var item = CATALOGO_EQUIPAMENTOS.lista.find(function(candidato) {
    return candidato.catalogoId === catalogoId;
  });
  if (!item) return;

  equipamentos = coletarEquipamentos();
  equipamentos.push(normalizarEquipamento(clonarItemCatalogo(item)));
  renderEquipamentos();
  salvarFicha(false);
  mostrarStatusSave('Item adicionado');
}

function adicionarItemInventadoDaBusca(categoria, origemBusca) {
  var input = document.getElementById('catalogo-busca-' + (origemBusca || categoria));
  var termo = input ? input.value.trim() : '';
  if (!termo) return;

  equipamentos = coletarEquipamentos();
  equipamentos.push(normalizarEquipamento(criarItemInventado(categoria, termo)));
  renderEquipamentos();
  salvarFicha(false);
  mostrarStatusSave('Item criado');
}

function parseCatalogoGenericoTxt(texto, categoria, uso) {
  return String(texto || '').split(/\r?\n/)
    .map(function(linha) { return linha.trim(); })
    .filter(function(linha) { return linha && linha.charAt(0) !== '#' && linha.indexOf('|') >= 0; })
    .map(function(linha) {
      var partes = linha.split(/[|;]/).map(function(parte) { return parte.trim(); });
      if (!partes[0]) return null;
      var usoItem = partes[1] || uso || usoPadraoPorCategoria(categoria);
      return {
        categoria: categoriaPorUso(usoItem, categoria),
        nome: partes[0],
        uso: usoItem,
        raridade: partes[2] || 'Comum',
        bonus: partes[3] || '0',
        detalhes: partes.slice(4).join(' · ') || partes[1] || ''
      };
    })
    .filter(Boolean);
}

function normalizarLinhaTabela(linha) {
  return String(linha || '')
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+)\s+\.\s+(\d+)/g, '$1.$2')
    .replace(/\b(\d+)\s+k\s+g\b/gi, '$1 kg')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function linhaTemPrecoEPeso(linha) {
  var texto = normalizarLinhaTabela(linha);
  return /\b\d[\d.,]*\s*(po|pp|pc)\b/i.test(texto)
    && /(\b\d[\d.,]*\s*kg\b|–|-)\s*$/i.test(texto);
}

function linhaGrupoTabelaItem(linha) {
  return /^(Ferramentas de artesão|Instrumento musical|Kit de jogo|Foco arcano|Foco druídico|Munição|Símbolo sagrado|Sela|Acomodação em estalagem \(diária\)|Cerveja|Refeição \(diária\)|Vinho)$/i.test(linha);
}

function coletarLinhasTabelaItemCustoPeso(texto) {
  var linhas = String(texto || '').split(/\r?\n/);
  var lendo = false;
  var buffer = '';
  var rows = [];

  linhas.forEach(function(linhaOriginal) {
    var linha = normalizarLinhaTabela(linhaOriginal);
    if (!linha) return;

    if (/^Item\s+Custo\s+Peso$/i.test(linha)) {
      lendo = true;
      buffer = '';
      return;
    }
    if (!lendo) return;
    if (/^\d{3}$/.test(linha)) return;
    if (linhaGrupoTabelaItem(linha) && !/\b\d[\d.,]*\s*(po|pp|pc)\b/i.test(linha)) {
      buffer = '';
      return;
    }
    if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,70}\.\s/.test(linha) && !/\b\d[\d.,]*\s*(po|pp|pc)\b/i.test(linha)) {
      lendo = false;
      buffer = '';
      return;
    }

    buffer = normalizarLinhaTabela((buffer ? buffer + ' ' : '') + linha);
    if (linhaTemPrecoEPeso(buffer)) {
      rows.push(buffer);
      buffer = '';
    }
  });

  return rows;
}

function extrairDescricoesPontuadas(texto) {
  var descricoes = {};
  var titulo = '';
  var partes = [];

  function salvarAtual() {
    if (!titulo || !partes.length) return;
    var desc = normalizarLinhaTabela(partes.join(' '));
    if (desc) descricoes[chaveCatalogo(titulo)] = desc;
  }

  String(texto || '').split(/\r?\n/).forEach(function(linhaOriginal) {
    var linha = normalizarLinhaTabela(linhaOriginal);
    if (!linha || /^\d{3}$/.test(linha)) return;

    var inicio = linha.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,70})\.\s*(.*)$/);
    if (inicio && !/\b\d[\d.,]*\s*(po|pp|pc)\b/i.test(linha)) {
      salvarAtual();
      titulo = inicio[1].trim();
      partes = [inicio[2].trim()].filter(Boolean);
      return;
    }

    if (titulo) partes.push(linha);
  });

  salvarAtual();
  return descricoes;
}

function buscarDescricaoTxt(nome, descricoes) {
  var nomes = [
    nome,
    String(nome || '').replace(/\s*\([^)]*\)/g, ''),
    String(nome || '').replace(/^Frasco de\s+/i, ''),
    String(nome || '').replace(/\s+de\s+\w+$/i, '')
  ];
  for (var i = 0; i < nomes.length; i++) {
    var desc = descricoes[chaveCatalogo(nomes[i])];
    if (desc) return desc;
  }
  return '';
}

function detalheTabela(nome, preco, peso, descricao, fallback) {
  var extras = [];
  if (preco) extras.push(preco);
  if (peso) extras.push(peso);
  if (descricao) return descricao + (extras.length ? ' · ' + extras.join(' · ') : '');
  return (fallback || 'Item catalogado a partir do TXT. Complete efeitos específicos com o mestre.')
    + (extras.length ? ' · ' + extras.join(' · ') : '');
}

function limparNomeTabelaItem(nome) {
  return normalizarLinhaTabela(nome)
    .replace(/^(Foco arcano|Foco druídico|Munição|Símbolo sagrado|Instrumento musical|Kit de jogo)\s+/i, '')
    .replace(/\s+-\s*/g, '-')
    .trim();
}

function categoriaItemTabela(nome, categoriaPadrao) {
  var chave = chaveCatalogo(nome);
  if (/acido|agua benta|antidoto|fogo alquimico|oleo|pocao|veneno|tinta|perfume|frasco|garrafa/.test(chave)) return 'frascos';
  if (/kit|ferramenta|suprimentos|utensilios|baralho|dados|xadrez|drag[aã]o|alaude|flauta|gaita|lira|oboe|tambor|trombeta|violino|xilofone/.test(chave)) return 'kits';
  if (/pe de cabra|tocha|corrente|marreta|martelo|pa|picareta|ariete|garrafa quebrada|pedra/.test(chave)) return 'improvisadas';
  return categoriaPadrao || 'backpack';
}

function usoItemTabela(categoria) {
  return usoPadraoPorCategoria(categoria);
}

function criarItemTabelaCatalogo(linha, categoriaPadrao, descricoes) {
  var texto = normalizarLinhaTabela(linha);
  var match = texto.match(/^(.+?)\s+(\d[\d.,]*\s*(?:po|pp|pc))\s+(\d[\d.,]*\s*kg|–|-)\s*$/i);
  if (!match) return null;

  var nome = limparNomeTabelaItem(match[1]);
  if (!nome || /^Item$/i.test(nome)) return null;

  var preco = normalizarLinhaTabela(match[2]).replace(/(\d)(po|pp|pc)$/i, '$1 $2');
  var peso = match[3] === '-' ? '–' : match[3];
  var categoria = categoriaItemTabela(nome, categoriaPadrao);
  var descricao = buscarDescricaoTxt(nome, descricoes || {});
  var fallback = categoria === 'frascos'
    ? 'Consumível ou recipiente catalogado a partir do TXT. Use o efeito do nome ou combine CD/duração com o mestre.'
    : categoria === 'kits'
      ? 'Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta.'
      : categoria === 'improvisadas'
        ? 'Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto.'
        : 'Item diverso catalogado a partir do TXT para exploração, viagem ou cena social.';

  return {
    categoria: categoria,
    nome: nome,
    uso: usoItemTabela(categoria),
    raridade:'Comum',
    bonus:'0',
    preco:preco,
    peso:peso,
    detalhes: detalheTabela(nome, preco, peso, descricao, fallback)
  };
}

function parseItensEquipamentoTxt(texto, categoriaPadrao) {
  var pipe = parseCatalogoGenericoTxt(texto, categoriaPadrao || 'backpack', usoPadraoPorCategoria(categoriaPadrao || 'backpack'));
  var descricoes = extrairDescricoesPontuadas(texto);
  var tabela = coletarLinhasTabelaItemCustoPeso(texto)
    .map(function(linha) { return criarItemTabelaCatalogo(linha, categoriaPadrao || 'backpack', descricoes); })
    .filter(Boolean);
  return pipe.concat(tabela);
}

function parseFrascosConsumiveisTxt(texto) {
  return parseItensEquipamentoTxt(texto, 'backpack').filter(function(item) {
    return item.categoria === 'frascos';
  });
}

function parseKitsFerramentasTxt(texto) {
  var pipe = parseCatalogoGenericoTxt(texto, 'kits', 'Kit/Ferramenta');
  var descricoes = extrairDescricoesPontuadas(texto);
  var tabela = coletarLinhasTabelaItemCustoPeso(texto)
    .map(function(linha) { return criarItemTabelaCatalogo(linha, 'kits', descricoes); })
    .filter(Boolean)
    .map(function(item) {
      item.categoria = 'kits';
      item.uso = 'Kit/Ferramenta';
      if (!item.detalhes || /Item catalogado|Ferramenta catalogada/.test(item.detalhes)) {
        var desc = buscarDescricaoTxt(item.nome, descricoes);
        item.detalhes = detalheTabela(item.nome, item.preco, item.peso, desc, 'Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta.');
      }
      return item;
    });
  return pipe.concat(tabela);
}

function criarArmaCatalogo(linha, grupo) {
  var texto = normalizarLinhaTabela(linha);
  var match = texto.match(/^(.+?)\s+(\d[\d.,]*\s*(?:po|pp|pc))\s+((?:\d+d\d+|\d+|–|-)(?:\s+(?:perfurante|cortante|concussão))?)\s+(\d[\d.,]*\s*kg|–|-)\s*(.*)$/i);
  if (!match) return null;

  var nome = limparNomeTabelaItem(match[1]);
  var preco = normalizarLinhaTabela(match[2]);
  var dano = normalizarLinhaTabela(match[3]);
  var peso = normalizarLinhaTabela(match[4]);
  var propriedadesTxt = normalizarLinhaTabela(match[5] || '');
  var propriedades = propriedadesTxt && propriedadesTxt !== '–'
    ? propriedadesTxt.split(/\s*,\s*/).map(function(p) { return p.trim(); }).filter(Boolean)
    : [];

  return {
    categoria:'armas',
    nome:nome,
    uso:'Arma',
    raridade:'Comum',
    bonus:'0',
    preco:preco,
    dano:dano,
    peso:peso,
    tipo:grupo || 'Arma',
    propriedades:propriedades,
    detalhes:[dano, grupo, propriedadesTxt, preco, peso].filter(function(p) { return p && p !== '–'; }).join(' · ')
  };
}

function parseArmasTxt(texto) {
  var pipe = parseCatalogoGenericoTxt(texto, 'armas', 'Arma');
  var linhas = String(texto || '').split(/\r?\n/).map(normalizarLinhaTabela);
  var itens = [];
  var lendo = false;
  var grupo = '';

  linhas.forEach(function(linha) {
    if (!linha) return;
    if (/^Nome\s+Preço\s+Dano\s+Peso\s+Propriedades$/i.test(linha)) {
      lendo = true;
      return;
    }
    if (!lendo) return;
    if (/^Armas Simples Corpo-a-Corpo/i.test(linha)) { grupo = 'Simples corpo a corpo'; return; }
    if (/^Armas Simples à Distância/i.test(linha)) { grupo = 'Simples à distância'; return; }
    if (/^Armas Marciais Corpo-a-Corpo/i.test(linha)) { grupo = 'Marcial corpo a corpo'; return; }
    if (/^Armas Marciais à Distância/i.test(linha)) { grupo = 'Marcial à distância'; return; }

    var item = criarArmaCatalogo(linha, grupo);
    if (item) itens.push(item);
  });

  return pipe.concat(itens);
}

function tipoArmaduraPorNome(nome) {
  var chave = chaveCatalogo(nome);
  if (/acolchoada|couro/.test(chave)) return 'Leve';
  if (/gibao|camisao|brunea|peitoral|meia/.test(chave)) return 'Média';
  if (/cota|placas/.test(chave)) return 'Pesada';
  if (/escudo/.test(chave)) return 'Escudo';
  return 'Armadura';
}

function criarArmaduraCatalogo(nome, restoLinha) {
  var precoMatch = restoLinha.match(/^([\d.,]+)\s+po\s+(.+)$/i);
  if (!precoMatch) return null;

  var preco = precoMatch[1] + ' po';
  var resto = precoMatch[2].replace(/\s+/g, ' ').trim();
  var finalMatch = resto.match(/^(.*?)\s+(-|–|For\s+\d+)\s+(-|–|Desvantagem)\s+([\d.,]+\s+kg)$/i);
  if (!finalMatch) return null;

  var ca = finalMatch[1].trim();
  var forca = finalMatch[2] === '-' || finalMatch[2] === '–' ? '' : finalMatch[2];
  var furtividade = finalMatch[3] === '-' || finalMatch[3] === '–' ? '' : finalMatch[3];
  var peso = finalMatch[4];
  var tipo = tipoArmaduraPorNome(nome);
  var caBaseMatch = ca.match(/\d+/);
  var item = {
    categoria:'armaduras',
    nome:nome,
    uso: tipo === 'Escudo' ? 'Escudo' : 'Armadura',
    raridade:'Comum',
    bonus:'0',
    preco:preco,
    ca:ca,
    caBase:caBaseMatch ? parseInt(caBaseMatch[0], 10) : null,
    somaDes:/des/i.test(ca),
    limiteDes:/máx|max/i.test(ca) ? 2 : null,
    tipo:tipo,
    forca:forca,
    furtividade:furtividade,
    peso:peso
  };
  item.detalhes = montarDetalhesCatalogo(item);
  if (chaveCatalogo(nome) === 'couro') item.aliases = ['Armadura de Couro', 'Colete de Couro'];
  if (chaveCatalogo(nome) === 'couro batido') item.aliases = ['Armadura de Couro Batido'];
  return item;
}

function parseArmadurasTxt(texto) {
  var nomes = ['Acolchoada', 'Couro Batido', 'Couro', 'Gibão de Peles', 'Camisão de Malha', 'Brunea', 'Peitoral', 'Meia-Armadura', 'Cota de anéis', 'Cota de malha', 'Cota de talas', 'Placas', 'Escudo'];
  var linhas = String(texto || '').split(/\r?\n/).map(function(linha) {
    return linha.trim().replace(/\s+/g, ' ');
  });
  var itens = [];
  var lendoTabela = false;

  linhas.forEach(function(linha) {
    if (/^Nome\s+Preço\s+Classe de Armadura/i.test(linha)) {
      lendoTabela = true;
      return;
    }
    if (/^ENTRANDO E/i.test(linha)) lendoTabela = false;
    if (!lendoTabela) return;

    nomes.some(function(nome) {
      var chaveLinha = chaveCatalogo(linha);
      var chaveNome = chaveCatalogo(nome);
      if (chaveLinha.indexOf(chaveNome + ' ') !== 0) return false;
      var item = criarArmaduraCatalogo(nome, linha.slice(nome.length).trim());
      if (item) itens.push(item);
      return true;
    });
  });

  return itens;
}

var FONTES_DICIONARIO_TXT = [
  { arquivo:'../../armaduras.txt', categoria:'armaduras', parser:parseArmadurasTxt },
  { arquivo:'../../armas.txt', categoria:'armas', parser:parseArmasTxt },
  { arquivo:'../../frascos e consumiveis.txt', categoria:'frascos', parser:parseFrascosConsumiveisTxt },
  { arquivo:'../../kits e ferramentas.txt', categoria:'kits', parser:parseKitsFerramentasTxt },
  { arquivo:'../../itens diversos.txt', categoria:'backpack', parser:function(texto) { return parseItensEquipamentoTxt(texto, 'backpack'); } },
  { arquivo:'../../montarias e veiculos.txt', categoria:'montarias', parser:function(texto) { return parseCatalogoGenericoTxt(texto, 'montarias', 'Montaria'); } },
  { arquivo:'../../bens e servicos.txt', categoria:'comercio', parser:function(texto) { return parseCatalogoGenericoTxt(texto, 'comercio', 'Bem comercial'); } },
  { arquivo:'../../bugigangas.txt', categoria:'bugigangas', parser:function(texto) { return parseCatalogoGenericoTxt(texto, 'bugigangas', 'Bugiganga'); } }
];

function carregarDicionariosTxt() {
  if (window.location.protocol === 'file:') return Promise.resolve(false);

  return Promise.all(FONTES_DICIONARIO_TXT.map(function(fonte) {
    return fetch(encodeURI(fonte.arquivo), { cache:'no-store' })
      .then(function(resp) { return resp.ok ? resp.text() : ''; })
      .then(function(texto) {
        var itens = fonte.parser(texto);
        itens.forEach(function(item) { fundirItemNoDicionario(item.categoria || fonte.categoria, item); });
        return itens.length;
      })
      .catch(function() { return 0; });
  })).then(function(contagens) {
    var total = contagens.reduce(function(soma, n) { return soma + n; }, 0);
    if (!total) return false;
    inicializarCatalogoEquipamentos();
    equipamentos = equipamentos.map(normalizarEquipamento);
    renderEquipamentos();
    mostrarStatusSave('Dicionários TXT carregados');
    return true;
  });
}

/* ============================================================
   CAT?LOGO DO LIVRO EMBUTIDO
   Gerado a partir dos TXT/PDF para funcionar tamb?m em file://.
   ============================================================ */
var DICIONARIO_EQUIPAMENTOS_LIVRO = [
  {
    "categoria": "armaduras",
    "nome": "Acolchoada",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 11 + modificador de Des · leve · 5 po · 4 kg · Furtividade: desvantagem"
  },
  {
    "categoria": "armaduras",
    "nome": "Brunea",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 14 + modificador de Des (máx. +2) · média · 50 po · 22,5 kg · Furtividade: desvantagem"
  },
  {
    "categoria": "armaduras",
    "nome": "Camisão de Malha",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 13 + modificador de Des (máx. +2) · média · 50 po · 10 kg"
  },
  {
    "categoria": "armaduras",
    "nome": "Cota de anéis",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 14 · pesada · 30 po · 20 kg · Furtividade: desvantagem"
  },
  {
    "categoria": "armaduras",
    "nome": "Cota de malha",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 16 · pesada · 75 po · 27,5 kg · Força: For 13 · Furtividade: desvantagem"
  },
  {
    "categoria": "armaduras",
    "nome": "Cota de talas",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 17 · pesada · 200 po · 30 kg · Força: For 15 · Furtividade: desvantagem"
  },
  {
    "categoria": "armaduras",
    "nome": "Couro",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 11 + modificador de Des · leve · 10 po · 5 kg"
  },
  {
    "categoria": "armaduras",
    "nome": "Couro Batido",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 12 + modificador de Des · leve · 45 po · 6,5 kg"
  },
  {
    "categoria": "armaduras",
    "nome": "Escudo",
    "uso": "Escudo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA +2 · escudo · 10 po · 3 kg"
  },
  {
    "categoria": "armaduras",
    "nome": "Gibão de Peles",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 12 + modificador de Des (máx. +2) · média · 10 po · 6 kg"
  },
  {
    "categoria": "armaduras",
    "nome": "Meia-Armadura",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 15 + modificador de Des (máx. +2) · média · 750 po · 20 kg · Furtividade: desvantagem"
  },
  {
    "categoria": "armaduras",
    "nome": "Peitoral",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 14 + modificador de Des (máx. +2) · média · 400 po · 10 kg"
  },
  {
    "categoria": "armaduras",
    "nome": "Placas",
    "uso": "Armadura",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "CA 18 · pesada · 1.500 po · 32,5 kg · Força: For 15 · Furtividade: desvantagem"
  },
  {
    "categoria": "armas",
    "nome": "Adaga",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d4 perfurante · Simples corpo a corpo · Acuidade, leve, arremesso (distância 6/18) · 2 po · 0,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Alabarda",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d10 cortante · Marcial corpo a corpo · Pesada, alcance, duas mãos · 20 po · 3 kg"
  },
  {
    "categoria": "armas",
    "nome": "Arco Curto",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 perfurante · Simples à distância · Munição (distância 24/96), duas mãos · 25 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Arco Longo",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 perfurante · Marcial à distância · Munição (distância 45/180), pesada, duas mãos · 50 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Azagaia",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 perfurante · Simples corpo a corpo · Arremesso (distância 9/36) · 5 pp · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Besta de Mão",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 perfurante · Marcial à distância · Munição (distância 9/36), leve, recarga · 75 po · 1,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Besta Pesada",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d10 perfurante · Marcial à distância · Munição (distância 30/120), pesada, recarga, duas mãos · 50 po · 4,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Beste Leve",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 perfurante · Simples à distância · Munição (distância 24/96), recarga, duas mãos · 25 po · 2,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Bordão",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 concussão · Simples corpo a corpo · Versátil (1d8) · 2 pp · 2 kg"
  },
  {
    "categoria": "armas",
    "nome": "Chicote",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d4 cortante · Marcial corpo a corpo · Acuidade, alcance · 2 po · 1,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Cimitarra",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 cortante · Marcial corpo a corpo · Acuidade, leve · 25 po · 1,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Clava Grande",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 concussão · Simples corpo a corpo · Pesada, duas mãos · 2 pp · 5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Dardo",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d4 perfurante · Simples à distância · Acuidade, arremesso (distância 6/18) · 5 pc · 0,1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Espada Curta",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 perfurante · Marcial corpo a corpo · Acuidade, leve · 10 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Espada Grande",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "2d6 cortante · Marcial corpo a corpo · Pesada, duas mãos · 50 po · 3 kg"
  },
  {
    "categoria": "armas",
    "nome": "Espada Longa",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 cortante · Marcial corpo a corpo · Versátil (1d10) · 15 po · 1,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Foice Curta",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d4 cortante · Simples corpo a corpo · Leve · 1 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Funda",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d4 concussão · Simples à distância · Munição (distância 9/36) · 1 pp"
  },
  {
    "categoria": "armas",
    "nome": "Glaive",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d10 cortante · Marcial corpo a corpo · Pesada, alcance, duas mãos · 20 po · 3 kg"
  },
  {
    "categoria": "armas",
    "nome": "Lança",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 perfurante · Simples corpo a corpo · Arremesso (distância 6/18), versátil (1d8) · 1 po · 1,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Lança de Montaria",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d12 perfurante · Marcial corpo a corpo · Alcance, especial · 10 po · 3 kg"
  },
  {
    "categoria": "armas",
    "nome": "Lança Longa",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d10 perfurante · Marcial corpo a corpo · Pesada, alcance, duas mãos · 5 po · 4 kg"
  },
  {
    "categoria": "armas",
    "nome": "Maça",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 concussão · Simples corpo a corpo · 5 po · 2 kg"
  },
  {
    "categoria": "armas",
    "nome": "Maça Estrela",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 perfurante · Marcial corpo a corpo · 15 po · 2 kg"
  },
  {
    "categoria": "armas",
    "nome": "Machadinha",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 cortante · Simples corpo a corpo · Leve, arremesso (distância 6/18) · 5 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Machado de Batalha",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 cortante · Marcial corpo a corpo · Versátil (1d10) · 10 po · 2 kg"
  },
  {
    "categoria": "armas",
    "nome": "Machado Grande",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d12 cortante · Marcial corpo a corpo · Pesada, duas mãos · 30 po · 3,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Malho",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "2d6 concussão · Marcial corpo a corpo · Pesada, duas mãos · 10 po · 5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Mangual",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 concussão · Marcial corpo a corpo · 10 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Martelo de Guerra",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 concussão · Marcial corpo a corpo · Versátil (1d10) · 15 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Martelo Leve",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d4 concussão · Simples corpo a corpo · Leve, arremesso (distância 6/18) · 2 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Picareta de Guerra",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 perfurante · Marcial corpo a corpo · 5 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Porrete",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d4 concussão · Simples corpo a corpo · Leve · 1 pp · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Rapieira",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d8 perfurante · Marcial corpo a corpo · Acuidade · 25 po · 1 kg"
  },
  {
    "categoria": "armas",
    "nome": "Rede",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Marcial à distância · Especial, arremesso (distância 1,5/4,5) · 1 po · 1,5 kg"
  },
  {
    "categoria": "armas",
    "nome": "Tridente",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1d6 perfurante · Marcial corpo a corpo · Arremesso (6/18), versátil (1d8) · 5 po · 2 kg"
  },
  {
    "categoria": "armas",
    "nome": "Zarabatana",
    "uso": "Arma",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "1 perfurante · Marcial à distância · Munição (distância 7,5/30), recarga · 10 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Ábaco",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Algemas",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Essas algemas de metal podem prender uma criatura Pequena ou Média. Escapar das algemas exige sucesso em um teste de Destreza CD 20. Quebrá-las exige um teste de Força CD 20 bem sucedido. Cada conjunto de algemas vem com uma chave. Sem a chave, uma criatura proficiente com ferramentas de ladrão pode abrir a fechadura das algemas com um sucesso em um teste de Destreza CD 15. As algemas têm 15 pontos de vida. · 2 po · 2 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Algibeira",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Uma bolsa de pano ou couro que pode armazenar até 20 munições de funda ou 50 munições de zarabatana, entre outras coisas. Para armazenar componentes de magia, veja bolsa de componentes, também descrita nessa seção. · 5 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Aljava",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Uma aljava pode guardar até 20 flechas. · 1 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Ampulheta",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 25 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Amuleto",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Apito de advertência",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 25 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Armadilha de caça",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Quando você usa sua ação para armá-la, essa armadilha forma um anel de aço com dentes serrilhados. Eles se fecham quando uma criatura pisa sobre uma placa de pressão no seu centro. A armadilha é fixada por uma pesada corrente em um objeto fixo e imóvel, como uma árvore ou um cravo enterrado no chão. Uma criatura que pisar na placa de pressão deve ser bem sucedida em um teste de resistência de Destreza CD 13 ou sofrerá 1d4 de dano perfurante e para de se mover. Daí em diante, até que a criatura se liberte da armadilha, seu movimento é limitado ao comprimento da corrente (tipicamente 1 metro de comprimento). A criatura presa pode usar sua ação para fazer um teste de Força CD 13 e se libertar, ou outra criatura no alcance pode fazer o teste para libertá-la. Cada fracasso no teste causa 1 de dano perfurante à criatura presa. · 5 po · 12,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Arpéu",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 po · 2 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Balança de mercador",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Trata-se de uma pequena balança, pratos e um sortimento adequado de pesos de até 1 kg. Com ela, você pode medir o peso exato de pequenos objetos, como metais preciosos brutos ou bens comerciais, para ajudar a determinar seu valor. · 5 po · 1,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Balas de Funda (20)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 4 pc · 0,75 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Balde",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 pc · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Barril",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 po · 35 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Bastão",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 10 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Baú",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · 12,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Bolsa de componentes",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Trata-se de uma pequena bolsa de couro à prova d'água que pode ser fixada em um cinto. Ela possui compartimentos para armazenar todos os componentes materiais e outros itens especiais que você precisa para lançar suas magias, exceto os componentes que possuem um custo específico (conforme indicado na descrição da magia). · 25 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Caixa de Fogo",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Esse pequeno recipiente detém uma pederneira, isqueiro e um pavio (um pano geralmente seco embebido em óleo) usado para acender uma fogueira. Usá-lo para acender uma tocha – ou qualquer outra coisa exposta a um combustível abundante – leva uma ação. Acender qualquer outro fogo leva 1 minuto · 5 pp · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Cajado",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · 2 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Cajado de madeira",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · 2 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Caneca",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 pc · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Caneta tinteiro",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 pc · –"
  },
  {
    "categoria": "backpack",
    "nome": "Cantil",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 pp · 2,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Cesto",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 4 pp · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Cobertor de inverno",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 pp · 1,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Corda de cânhamo (15 metros)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Corda de seda (15 metros)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 10 po · 2,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Cristal",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 10 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Emblema",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · –"
  },
  {
    "categoria": "backpack",
    "nome": "Escada (3 metros)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 pp · 12,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Esferas (sacola com 1.000)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Espelho de aço",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · 0,25 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Estrepes (bolsa com 20)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Usando uma ação, você pode espalhar um único saco de estrepes para cobrir a área de um quadrado de 1,5 metro de lado. Qualquer criatura que entrar na área deve ser bem sucedida em um teste de resistência de · 1 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Fechadura",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "A fechadura vem com chave. Sem a chave, uma criatura proficiente com ferramentas de ladrão pode abrir a fechadura com um sucesso em um teste de Destreza CD 15. O Mestre pode decidir que fechaduras melhores estão disponíveis por preços mais elevados. PACOTES DE EQUIPAMENTO O equipamento inicial que você recebe da sua classe inclui uma coleção de equipamentos úteis para aventurar-se, todos juntos em um pacote. O conteúdo desses pacotes é listado aqui. Se você for comprar seu equipamento inicial, você pode adquirir um pacote pelo preço apresentado, o que pode ser mais barato do que comprar os itens individualmente. Pacote de Artista (40 po). Inclui uma mochila, um saco de dormir, duas fantasias, 5 velas, 5 dias de rações, um cantil e um kit de disfarce. Pacote de Assaltante (16 po). Inclui uma mochila, um saco com 1.000 esferas de metal, 3 metros de linha, um sino, 5 velas, um pé de cabra, um martelo, 10 pítons, uma lanterna coberta, 2 frascos de óleo, 5 dias de rações, uma caixa de fogo e um cantil. O kit também possui 15 metros de corda de cânhamo amarrada ao lado dele. Pacote de Aventureiro (12 po). Inclui uma mochila, um pé de cabra, um martelo, 10 pítons, 10 tochas, uma caixa de fogo, 10 dias de rações e um cantil. O kit também tem 15 metros de corda de cânhamo amarrada ao lado dele. Pacote de Diplomata (39 po). Inclui um baú, 2 caixas para mapas ou pergaminhos, um conjunto de roupas finas, um vidro de tinta, uma caneta tinteiro, uma lâmpada, 2 frascos de óleo, 5 folhas de papel, um vidro de perfume, parafina e sabão. Pacote de Estudioso (40 po). Inclui uma mochila, um livro de estudo, um vidro de tinta, uma caneta tinteiro, 10 folhas de pergaminho, um saquinho de areia e uma pequena faca. Pacote de Explorador (10 po). Inclui uma mochila, um saco de dormir, um kit de refeição, uma caixa de fogo, 10 tochas, 10 dias de rações e um cantil. O kit também tem 15 metros de corda de cânhamo amarrada ao lado dele. Pacote de Sacerdote (19 po). Inclui uma mochila, um cobertor, 10 velas, uma caixa de fogo, uma caixa de esmolas, 2 blocos de incenso, um incensário, vestes, 2 dias de rações e um cantil. · 10 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Flechas (20)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Giz (1 peça)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 pc · –"
  },
  {
    "categoria": "backpack",
    "nome": "Grimório",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Essencial para os magos, um grimório é um volume encadernado em couro com 100 páginas de pergaminhos em branco, adequado para armazenar magias. · 50 po · 1,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Jarra",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 4 pc · 2 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Lanterna coberta",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Uma lanterna coberta lança luz plena em um raio de 9 metros e penumbra por mais 9 metros. Uma vez acesa, ela queima por 6 horas usando um frasco de óleo (500 ml). Usando uma ação, você pode abaixar a cobertura, reduzindo a claridade para penumbra em um raio de 1,5 metro. · 5 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Lanterna furta-fogo",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Uma lanterna furta-fogo lança luz plena em um cone de 18 metros e penumbra por mais 18 metros. Uma vez acesa, ela queima por 6 horas usando um frasco de óleo (500 ml). · 10 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Lente de aumento",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Essa lente permite ver pequenos objetos mais de perto. Ela também é útil como um substituto da pederneira e isqueiro para acender fogo. Usar uma lupa para acender fogo necessita de luz tão brilhante como a luz do sol para focar, um pavio e cerca de 5 minutos. Uma lente de aumento concede vantagem em qualquer teste de habilidade feito para avaliar ou inspecionar um item que é pequeno ou muito detalhado. · 100 po · –"
  },
  {
    "categoria": "backpack",
    "nome": "Livro",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Um livro pode conter poesia, relatos históricos, informações relativas a um campo particular de sabedoria, diagramas e notas sobre engenhocas gnômicas, ou qualquer outra coisa que possa ser representada usando texto ou imagens. Um livro com magias é um grimório, também descrito nessa seção. · 25 po · 2,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Luneta",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Objetos vistos através de uma luneta são ampliados até o dobro do seu tamanho. · 1.000 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Manto",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 2 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Mochila",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 po · 2,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Orbe",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 20 po · 1,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Pergaminho (uma folha)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 pp · –"
  },
  {
    "categoria": "backpack",
    "nome": "Píton",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 pc · –"
  },
  {
    "categoria": "backpack",
    "nome": "Porta virotes",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Esse estojo de madeira pode armazenar até 20 virotes de besta. · 1 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Pregos de ferro (10)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 2,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Rações de viagem (1 dia)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Rações de viajem consistem em alimentos desidratados adequados para viagens longas, incluindo carne seca, frutas secas, bolachas e nozes. · 5 pp · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Ramo de visco",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · –"
  },
  {
    "categoria": "backpack",
    "nome": "Relicário",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · 1 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Robes",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 2 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Roldana e polia",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Um conjunto de roldanas com um cabo entre elas e um gancho para fixar aos objetos, a roldana e polia permitem içar até quatro vezes o peso que você ergueria normalmente. · 1 po · 2,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Sabão",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 2 pc · –"
  },
  {
    "categoria": "backpack",
    "nome": "Saco",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 pc · 0,25 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Saco de dormir",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 3,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Sinete",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 po · –"
  },
  {
    "categoria": "backpack",
    "nome": "Sino",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · –"
  },
  {
    "categoria": "backpack",
    "nome": "Totem",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · –"
  },
  {
    "categoria": "backpack",
    "nome": "Vara (3 metros)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 5 pc · 3,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Varinha",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 10 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Varinha de teixo",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 10 po · 0,5 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Vela",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Por uma hora, a vela emana luz plena em um raio de 1,5 metro e penumbra por mais 1,5 metro. · 1 pc · –"
  },
  {
    "categoria": "backpack",
    "nome": "Virotes (20)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 0,75 kg"
  },
  {
    "categoria": "backpack",
    "nome": "Zarabatana (50)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Item diverso catalogado a partir do TXT para exploração, viagem ou cena social. · 1 po · 0,5 kg"
  },
  {
    "categoria": "bugigangas",
    "nome": "A armação de um monóculo feita de ouro",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 67"
  },
  {
    "categoria": "bugigangas",
    "nome": "A casca de um ovo pintada com cenas de sofrimento humano em perturbadores detalhes",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 73"
  },
  {
    "categoria": "bugigangas",
    "nome": "A empunhadura de uma espada quebrada",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 58"
  },
  {
    "categoria": "bugigangas",
    "nome": "Dois soldadinhos de brinquedo, um deles sem a cabeça",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 52"
  },
  {
    "categoria": "bugigangas",
    "nome": "Metade da planta de um templo, castelo ou alguma outra estrutura",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 82"
  },
  {
    "categoria": "bugigangas",
    "nome": "O convite de uma festa aonde aconteceu um assassinato",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 79"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um acordo por uma parcela de terra em um reino que você não conhece",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 10"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um anel de bronze que nunca perde o brilho",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 05"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um apito feito de uma madeira dourada",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 50"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um bloco de 30 gramas de um material desconhecido",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 11"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um brinco de prata na forma de uma lágrima, feito a partir de uma lágrima de verdade",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 72"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um broche ornamentado com detalhes anões",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 92"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um camafeu esculpido à semelhança de uma pessoa horrível",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 61"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um camundongo petrificado",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 95"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um canário mecânico dentro de uma lamparina gnômica",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 44"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um caranguejo, ou aranha, bem pequeno e mecânico que se move quando não está sendo observado",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 97"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um conjunto de canos de osso",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 75"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um cordão com 4 dedos élficos mumificados",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 09"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um crânio de prata do tamanho de uma moeda",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 62"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um cubo de 0,025 metros de lado, cada lado pintado com uma cor diferente",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 68"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um dente de uma fera desconhecida",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 13"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um diário escrito em um idioma que você desconhece",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 04"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um diário faltando sete páginas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 85"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um diminuto porta-retratos com o desenho de um goblin",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 38"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um disco de pedra multicolorido",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 24"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um dispositivo retangular de metal com dois pequenos recipientes em um dos lados e que expele faíscas se molhado",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 34"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um escaravelho morto do tamanho da sua palma",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 51"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um fragmento de obsidiana que sempre está quente ao toque",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 27"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um frasco de sangue de dragão",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 89"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um ícone miúdo de um corvo prateado",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 25"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um incenso negro em forma de pirâmide com péssimo odor",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 64"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um indecifrável mapa do tesouro",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 57"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um lenço de cor púrpura bordado com o nome de um poderoso arquimago",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 81"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um leque, que ao ser aberto revela o desenho de um gato",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 74"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um livro contando a história de um lendário herói, de sua ascensão à queda, com o último capítulo faltando",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 88"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um livro em branco, suas páginas se recusam a segurar tinta, giz, grafite, qualquer outra substância ou marcação",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 30"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um mosaico de superfície vítrea colorida",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 94"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um olho de vidro",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 60"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um orbe de bronze crivado com estranhas runas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 23"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um orbe de vidro cheio d'água, aonde nada um pequeno peixe dourado mecânico",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 48"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um orbe de vidro preenchido com uma fumaça que está sempre em movimento",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 17"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um osso de garra de dragão pendendo de um simples cordão de couro",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 28"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um ovo de 0,5 kg com uma casca vermelha lustrosa",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 18"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um par de dados feitos com ossos de falange, cada um com o símbolo de um crânio na sexta face",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 07"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um par de meias velhas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 29"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pé de coelho",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 59"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pedaço de couro de um antigo estandarte",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 41"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pedaço de cristal que brilha ao luar",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 02"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pedaço de pano que ao ser desdobrado se transforma em uma elegante capa",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 83"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pentagrama de bronze com uma marca d'água de cabeça de rato no centro",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 80"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pequeno baú construído com a aparência de diversos pés no fundo",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 45"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pequeno bloco de pedra que não pesa",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 37"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pequeno ídolo de uma criatura horripilante que faz você ter pesadelos se deixado próxima durante o sono",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 08"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pequeno sino de prata sem o badalo",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 43"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pergaminho sobre o qual está desenhada uma complexa engenhoca mecânica",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 77"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um pote de vidro cheio de unhas cortadas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 33"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um recibo de depósito de uma distante cidade",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 84"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um saquinho cheio de um pó rosa",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 70"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um saquinho contendo 47 dentes de humanoide, um dos quais está apodrecido",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 26"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um símbolo sagrado de ferro devoto a um deus desconhecido",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 87"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um trevo de quatro folhas prensado dentro de um livro que discute etiqueta e boas maneiras",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 76"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um tubo que solta bolhas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 19"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um único estrepe feito de osso",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 66"
  },
  {
    "categoria": "bugigangas",
    "nome": "Um vidro vazio que cheira a perfume quando aberto",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 39"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma agulha que não se pode entortar",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 91"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma antiga flecha de estilo élfico",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 90"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma bainha ricamente ornamentada, na qual não cabe nenhum tipo de lâmina que você já tenha encontrado",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 78"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma bandeira negra de piratas, adornada com um crânio de dragão e ossos cruzados",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 96"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma caixa de madeira, com fundo de cerâmica, que contém um pequeno verme com duas cabeças, uma de cada lado do corpo",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 99"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma chave velha",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 56"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma colher de prata com um \"M\" gravado na ponta do cabo",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 49"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma das metades de um pergaminho que continha uma bela canção escrita em notas musicais",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 71"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma escama enorme, talvez de um dragão",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 14"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma faca pertencida a um parente",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 32"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma garrafa de vinho vazia, com a etiqueta: \"O Mago da Adega, Aperto do Dragão Vermelho, 331422-W\"",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 93"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma insígnia de patente de um legionário perdido",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 42"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma insígnia de prata no formato de uma estrela de cinco pontas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 31"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma jarra de vidro cheia de banha, com uma etiqueta que diz: \"Graxa de Grifo\"",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 98"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma jarra de vidro com um estranho pedaço de carne flutuando em conserva",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 20"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma lata de metal que não abre, mas emite sons como se estivesse cheia de líquido, areia, aranhas ou vidro quebrado (à sua escolha)",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 47"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma luva de humanoide, branca com lantejoulas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 35"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma maçaneta de cristal",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 69"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma mão de goblin mumificada",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 01"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma máscara de alabastro",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 63"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma moeda de ouro de uma terra desconhecida",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 03"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma pedra preciosa que se parece com carvão para todos, exceto você",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 40"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma pena verde brilhante",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 15"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma pequena boneca de pano espetada com várias agulhas",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 12"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma pequena caixa de música feita por gnomos e que toca uma melodia que você recorda vagamente da sua infância",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 21"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma pequena caixa repleta de botões de diferentes tamanhos",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 53"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma pequena estátua de madeira de um halfling presunçoso",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 22"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma pequena gaiola sem porta",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 55"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma sprite morta dentro de uma garrafa de vidro transparente",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 46"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma tabaqueira prateada com uma gravura na parte superior, onde se lê “sonhos”",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 86"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma touca de dormir que quando vestida concede a você sonos agradáveis",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 65"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma urna de metal que contém as cinzas de um herói",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 100"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma vela que não pode ser acesa",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 54"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma velha carta de adivinhação com sua aparência",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 16"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma velha peça de xadrez feita de vidro",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 06"
  },
  {
    "categoria": "bugigangas",
    "nome": "Uma vestimenta com cem pequenos bolsos",
    "uso": "Bugiganga",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Bugiganga d100 36"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de açafrão",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 15 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de canela",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de cobre",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 pp"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de cravos",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 3 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de farinha",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 pc"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de ferro",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pp"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de gengibre",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de ouro",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 50 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de pimenta",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de platina",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 500 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de prata",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 po"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de sal",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 pc"
  },
  {
    "categoria": "comercio",
    "nome": "0,5 kg de trigo",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pc"
  },
  {
    "categoria": "comercio",
    "nome": "1 m2 de linho",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 po"
  },
  {
    "categoria": "comercio",
    "nome": "1 m2 de lona",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pp"
  },
  {
    "categoria": "comercio",
    "nome": "1 m2 de seda",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 10 po"
  },
  {
    "categoria": "comercio",
    "nome": "1 m2 de tecido de algodão",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 pp"
  },
  {
    "categoria": "comercio",
    "nome": "Acomodação em estalagem aristocrática",
    "uso": "Hospedagem",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 4 po por diária"
  },
  {
    "categoria": "comercio",
    "nome": "Acomodação em estalagem confortável",
    "uso": "Hospedagem",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 8 pp por diária"
  },
  {
    "categoria": "comercio",
    "nome": "Acomodação em estalagem esquálida",
    "uso": "Hospedagem",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 7 pc por diária"
  },
  {
    "categoria": "comercio",
    "nome": "Acomodação em estalagem modesta",
    "uso": "Hospedagem",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 pp por diária"
  },
  {
    "categoria": "comercio",
    "nome": "Acomodação em estalagem pobre",
    "uso": "Hospedagem",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pp por diária"
  },
  {
    "categoria": "comercio",
    "nome": "Acomodação em estalagem rica",
    "uso": "Hospedagem",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 po por diária"
  },
  {
    "categoria": "comercio",
    "nome": "Banquete por pessoa",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 10 po"
  },
  {
    "categoria": "comercio",
    "nome": "Boi",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 15 po"
  },
  {
    "categoria": "comercio",
    "nome": "Cabra",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 po"
  },
  {
    "categoria": "comercio",
    "nome": "Carne, pedaço",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 3 pp"
  },
  {
    "categoria": "comercio",
    "nome": "Cerveja, caneca",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 4 pc"
  },
  {
    "categoria": "comercio",
    "nome": "Cerveja, galão",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 pp"
  },
  {
    "categoria": "comercio",
    "nome": "Condutor dentro da cidade",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pc"
  },
  {
    "categoria": "comercio",
    "nome": "Condutor entre cidades",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 pc por km"
  },
  {
    "categoria": "comercio",
    "nome": "Estábulo",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 pp · abrigo e cuidado básico para montaria"
  },
  {
    "categoria": "comercio",
    "nome": "Galinha",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 pc"
  },
  {
    "categoria": "comercio",
    "nome": "Mensageiro",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pc por km"
  },
  {
    "categoria": "comercio",
    "nome": "Ovelha",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 po"
  },
  {
    "categoria": "comercio",
    "nome": "Pão, pedaço",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 pc"
  },
  {
    "categoria": "comercio",
    "nome": "Passagem de navio",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 6 pc por km"
  },
  {
    "categoria": "comercio",
    "nome": "Pedágio",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pc"
  },
  {
    "categoria": "comercio",
    "nome": "Porco",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 3 po"
  },
  {
    "categoria": "comercio",
    "nome": "Queijo, pedaço",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 1 pp"
  },
  {
    "categoria": "comercio",
    "nome": "Refeição aristocrática",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 po por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Refeição confortável",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 pp por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Refeição esquálida",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 3 pc por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Refeição modesta",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 3 pp por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Refeição pobre",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 6 pc por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Refeição rica",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 8 pp por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Serviçal destreinado",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 pp por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Serviçal treinado",
    "uso": "Serviço",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 po por dia"
  },
  {
    "categoria": "comercio",
    "nome": "Vaca",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 10 po"
  },
  {
    "categoria": "comercio",
    "nome": "Vinho comum (jarra)",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 pp"
  },
  {
    "categoria": "comercio",
    "nome": "Vinho fino (garrafa)",
    "uso": "Bem comercial",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 10 po"
  },
  {
    "categoria": "frascos",
    "nome": "Ácido (vidro)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Consumível ou recipiente catalogado a partir do TXT. Use o efeito do nome ou combine CD/duração com o mestre. · 25 po · 0,5 kg"
  },
  {
    "categoria": "frascos",
    "nome": "Água benta (frasco)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Usando uma ação, você pode espalhar o conteúdo desse frasco em uma criatura a até 1,5 metro de você ou arremessar a até 6 metros, quebrando o frasco com o impacto. Em ambos os casos, você deve realizar um ataque à distância contra uma criatura alvo, tratando a água benta como uma arma improvisada. Se o alvo for um corruptor ou morto-vivo, ele sofre 2d6 de dano radiante. Um clérigo ou paladino pode criar água benta realizando um ritual especial. O ritual leva 1 hora para ser realizado, consome 25 po de prata em pó e exige que se gaste um espaço de magia de 1º nível. · 25 po · 0,5 kg"
  },
  {
    "categoria": "frascos",
    "nome": "Antídoto (vidro)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Uma criatura que beber o líquido desse vidro tem vantagem em testes de resistência contra venenos por 1 hora. O antídoto não confere nenhum benefício para mortos-vivos ou constructos. · 50 po · –"
  },
  {
    "categoria": "frascos",
    "nome": "Fogo alquímico (frasco)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Esse líquido pegajoso e adesivo inflama em contado com o ar. Usando uma ação, você pode arremessar esse frasco a até 6 metros de distância, quebrando-o com o impacto. Você deve realizar um ataque à distância contra uma criatura ou objeto, tratando o fogo alquímico como uma arma improvisada. Em um sucesso, o alvo sofre 1d4 de dano de fogo no início de cada um de seus turnos. Uma criatura pode terminar esse dano usando sua ação e fazendo um teste de Destreza CD 10 para apagar as chamas. · 50 po · 0,5 kg"
  },
  {
    "categoria": "frascos",
    "nome": "Frasco",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Consumível ou recipiente catalogado a partir do TXT. Use o efeito do nome ou combine CD/duração com o mestre. · 2 pc · 1 kg"
  },
  {
    "categoria": "frascos",
    "nome": "Garrafa de vidro",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Consumível ou recipiente catalogado a partir do TXT. Use o efeito do nome ou combine CD/duração com o mestre. · 1 po · 1 kg"
  },
  {
    "categoria": "frascos",
    "nome": "Óleo (frasco)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Geralmente vem em um frasco de argila que contém 500 ml. Usando uma ação, você pode espirrar o óleo desse frasco em uma criatura a até 1,5 metro de você ou arremessar a até 6 metros, quebrando-o com o impacto. Você deve realizar um ataque à distância contra uma criatura ou objeto, tratando o óleo como uma arma improvisada. Com um sucesso, o alvo é coberto de óleo. Se o alvo sofrer qualquer dano flamejante antes do óleo secar (depois de 1 minuto), a criatura sofre 5 de dano flamejante adicional pela queima do óleo. Você também pode derramar um frasco de óleo no chão para cobrir uma área de um quadrado de 1,5 metro de lado, desde que a superfície esteja nivelada. Se aceso, o óleo queima por 2 rodadas e causa 5 de dano flamejante a qualquer criatura que entrar na área ou terminar seu turno dentro da área. Uma criatura pode sofrer esse dano apenas uma vez por turno. · 1 pp · 0,5 kg"
  },
  {
    "categoria": "frascos",
    "nome": "Perfume (frasco)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Consumível ou recipiente catalogado a partir do TXT. Use o efeito do nome ou combine CD/duração com o mestre. · 5 po · –"
  },
  {
    "categoria": "frascos",
    "nome": "Poção de cura",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Um personagem que beber o líquido vermelho mágico deste frasco recupera 2d4+2 pontos de vida. Beber ou administrar uma poção exige uma ação. · 50 po · 0,25 kg"
  },
  {
    "categoria": "frascos",
    "nome": "Tinta (frasco de 30ml)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Consumível ou recipiente catalogado a partir do TXT. Use o efeito do nome ou combine CD/duração com o mestre. · 10 po · –"
  },
  {
    "categoria": "frascos",
    "nome": "Veneno básico (frasco)",
    "uso": "Consumível",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Você pode usar o veneno contido nesse vidro para cobrir a lâmina de uma arma cortante ou perfurante ou até três peças de munição. Aplicar o veneno leva uma ação. Uma criatura atingida pela arma ou munição envenenada deve obter sucesso em um teste de resistência de Constituição CD 10 ou sofrerá 1d4 de dano de veneno. Uma vez aplicado, o veneno retém sua potência durante 1 minuto antes de secar. CAPACIDADE DE RECIPIENTES Recipiente Capacidade Algibeira 15 cm³ /3 kg de equipamentos Balde 12 litros/15 cm³ sólido Barril 160 litros/1,2 m³ sólido Baú 3,5 m³/150 kg de equipamentos Caneca 500 ml Cantil 2 litros Cesto 60 cm³/20 kg de equipamentos Frasco 120 ml Garrafa 750 ml Jarra 5 litros Mochila* 30 cm³/15 kg de equipamentos Panela de Ferro 4 litros Saco 30 cm³/13kg de equipamentos * Você pode prender itens como um saco de dormir e um rolo de corda do lado de fora da mochila. · 100 po · –"
  },
  {
    "categoria": "improvisadas",
    "nome": "Aríete portátil",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Você pode usar um aríete portátil para quebrar portas. Ao fazer isso, você ganha um bônus de +4 no teste de Força. Outra criatura pode ajudá-lo a usar o aríete, o que concede vantagem no teste. · 4 po · 17,5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Corrente (3 metros)",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Uma corrente possui 10 pontos de vida e pode ser arrebentada com um teste de Força CD 20 bem sucedido. · 5 po · 5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Equipamento de pescaria",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Este kit inclui uma vara de pesca de madeira, linha de seda, boias de cortiça, anzóis de aço, chumbadas, iscas e redes de pesca. · 1 po · 2 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Lâmpada",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Uma lâmpada lança luz plena em um raio de 4,5 metros e penumbra por mais 9 metros. Uma vez acesa, a lâmpada queima por 6 horas usando um frasco de óleo (500 ml). · 5 pp · 0,5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Marreta",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 2 po · 5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Martelo",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 1 po · 1,5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Pá",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 2 po · 2,5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Panela de ferro",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 2 po · 5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Papel (uma folha)",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 2 pp · –"
  },
  {
    "categoria": "improvisadas",
    "nome": "Parafina",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 5 pp · –"
  },
  {
    "categoria": "improvisadas",
    "nome": "Pé de cabra",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Usar um pé de cabra concede vantagem nos testes de Força onde uma alavanca possa ser aplicada. · 2 po · 2,5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Pedra de amolar",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 1 pc · –"
  },
  {
    "categoria": "improvisadas",
    "nome": "Picareta de minerador",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 2 po · 5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Porta mapas ou pergaminhos",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Esse estojo cilíndrico de couro pode armazenar até 10 folhas de papel enroladas ou 5 folhas de pergaminhos enroladas. · 1 po · 0,5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Roupas comuns",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 5 pp · 1,5 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Roupas de entretenimento",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 5 po · 2 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Roupas de viajante",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 2 po · 2 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Roupas finas",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 15 po · 3 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Tenda para duas pessoas",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Pode virar arma improvisada se o mestre permitir. Sugestão: 1d4 de dano apropriado ao objeto. · 2 po · 10 kg"
  },
  {
    "categoria": "improvisadas",
    "nome": "Tocha",
    "uso": "Arma improvisada",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "A tocha queima por 1 hora, fornecendo luz plena em um raio de 6 metros e penumbra por mais 6 metros. Se você realizar um ataque corpo-a-corpo com uma tocha acesa e acertar, causa 1 de dano flamejante. · 1 pc · 0,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Alaúde",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 35 po · 1 kg"
  },
  {
    "categoria": "kits",
    "nome": "Baralho de cartas",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 5 pp · –"
  },
  {
    "categoria": "kits",
    "nome": "Conjunto de dados",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 1 pp · –"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de carpinteiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 8 po · 3 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de cartógrafo",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 15 po · 3 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de costureiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 1 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de coureiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 5 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de entalhador",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 1 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de ferreiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 20 po · 4 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de funileiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 50 po · 5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de joalheiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 25 po · 1 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de ladrão",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Esse conjunto de ferramentas inclui uma pequena pasta, um conjunto de chaves mestras, um pequeno espelho montado em uma alça de metal, um conjunto de tesouras de lâminas estreitas e um par de alicates. Proficiência com essas ferramentas permite adicionar o bônus de proficiência para quaisquer testes de habilidade que você fizer para desarmar armadilhas ou abrir fechaduras. · 25 po · 0,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de navegação",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 25 po · 1 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de oleiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 10 po · 1,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de pedreiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 10 po · 4 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de pintor",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 10 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de sapateiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 5 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Ferramentas de vidreiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 30 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Flauta",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 2 po · 0,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Flauta de pã",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 12 po · 1 kg"
  },
  {
    "categoria": "kits",
    "nome": "Gaita de foles",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 30 po · 3 kg"
  },
  {
    "categoria": "kits",
    "nome": "Jogo dos três dragões",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 5 po · –"
  },
  {
    "categoria": "kits",
    "nome": "Kit de disfarce",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Essa bolsa de cosméticos, tintura de cabelo e pequenos adereços permite criar disfarces que mudam sua aparência física. Proficiência com este kit permite adicionar o bônus de proficiência para quaisquer testes de habilidade que você fizer para criar um disfarce visual. · 25 po · 1,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Kit de escalada",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Um kit de escalada inclui pítons especiais, botas com solas pontiagudas, luvas e um cinto. Você pode usar o kit de escalada como uma ação para \"ancorar-se\". Quando faz isso, você não pode cair mais de 7,5 metros a partir do ponto onde se ancorou, e não pode subir mais de 7,5 metros de distância desse ponto, sem desfazer a âncora. · 25 po · 6 kg"
  },
  {
    "categoria": "kits",
    "nome": "Kit de falsificação",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Essa pequena caixa contém uma variedade de papéis e pergaminhos, canetas e tintas, selos e lacres, folha de ouro e prata, e outros suprimentos necessários para criar falsificações convincentes de documentos físicos. Proficiência com esse kit permite adicionar o bônus de proficiência para quaisquer testes de habilidade que você fizer para criar uma falsificação de um documento físico. · 15 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Kit de herbalismo",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Esse kit contém uma variedade de instrumentos, como alicates, almofariz e pilão, e bolsas e frascos utilizados pelos herbalistas para criar remédios e poções. Proficiência com este kit permite adicionar o bônus de proficiência para quaisquer testes de habilidade que você fizer para identificar ou aplicar ervas. Além disso, a proficiência com esse kit é necessária para criar antídotos e poções de cura. · 5 po · 1,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Kit de primeiros-socorros",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Esse kit é uma bolsa de couro contendo ataduras, pomadas e talas. O kit possui material suficiente para dez usos. Usando uma ação, você pode gastar um uso do kit para estabilizar uma criatura que tenha 0 pontos de vida, sem a necessidade de realizar um teste de Sabedoria (Medicina). · 5 po · 1,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Kit de venenos",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "O kit de venenos inclui os frascos, produtos químicos e outros equipamentos necessários para a criação de venenos. Proficiência com esse kit permite adicionar o bônus de proficiência para quaisquer testes de habilidade que você fizer para criar ou utilizar venenos. · 50 po · 1 kg"
  },
  {
    "categoria": "kits",
    "nome": "Lira",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 30 po · 1 kg"
  },
  {
    "categoria": "kits",
    "nome": "Oboé",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 2 po · 0,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Suprimentos de alquimista",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 50 po · 4 kg"
  },
  {
    "categoria": "kits",
    "nome": "Suprimentos de caligrafia",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 10 po · 2,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Suprimentos de cervejeiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 20 po · 4,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Tambor",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 6 po · 1,5 kg"
  },
  {
    "categoria": "kits",
    "nome": "Trombeta",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 3 po · 1 kg"
  },
  {
    "categoria": "kits",
    "nome": "Utensílios de cozinheiro",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 1 po · 4 kg"
  },
  {
    "categoria": "kits",
    "nome": "Violino",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 30 po · 3 kg"
  },
  {
    "categoria": "kits",
    "nome": "Xadrez do dragão",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 1 po · 0,25 kg"
  },
  {
    "categoria": "kits",
    "nome": "Xilofone",
    "uso": "Kit/Ferramenta",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Ferramenta catalogada a partir do TXT. Use com proficiência quando o teste combinar com a ferramenta. · 25 po · 5 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Alforje",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 4 po · peso 4 kg · arreio para carregar carga em montaria"
  },
  {
    "categoria": "montarias",
    "nome": "Armadura de montaria",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo x4 · peso x2 · versão para montaria de uma armadura comum"
  },
  {
    "categoria": "montarias",
    "nome": "Barco a remo",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 50 po · velocidade 2 km/h · veículo aquático"
  },
  {
    "categoria": "montarias",
    "nome": "Barco de quilha",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 3.000 po · velocidade 1,5 km/h · veículo aquático"
  },
  {
    "categoria": "montarias",
    "nome": "Biga",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 250 po · peso 50 kg · veículo de tração"
  },
  {
    "categoria": "montarias",
    "nome": "Burro ou mula",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 8 po · deslocamento 12m · capacidade de carga 210 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Camelo",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 50 po · deslocamento 15m · capacidade de carga 240 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Carroça",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 15 po · peso 100 kg · veículo de tração"
  },
  {
    "categoria": "montarias",
    "nome": "Carruagem",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 100 po · peso 300 kg · veículo de tração"
  },
  {
    "categoria": "montarias",
    "nome": "Cavalo de guerra",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 400 po · deslocamento 18m · capacidade de carga 270 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Cavalo de montaria",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 75 po · deslocamento 18m · capacidade de carga 220 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Cavalo pesado",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 50 po · deslocamento 12m · capacidade de carga 270 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Dracar",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 10.000 po · velocidade 5 km/h · veículo aquático"
  },
  {
    "categoria": "montarias",
    "nome": "Elefante",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 200 po · deslocamento 12m · capacidade de carga 660 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Freio e rédea",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 2 po · peso 0,5 kg · controle de montaria"
  },
  {
    "categoria": "montarias",
    "nome": "Galera",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 30.000 po · velocidade 6,5 km/h · veículo aquático"
  },
  {
    "categoria": "montarias",
    "nome": "Mastim",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 25 po · deslocamento 12m · capacidade de carga 100 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Navio de guerra",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 25.000 po · velocidade 4 km/h · veículo aquático"
  },
  {
    "categoria": "montarias",
    "nome": "Pônei",
    "uso": "Montaria",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 30 po · deslocamento 12m · capacidade de carga 115 kg"
  },
  {
    "categoria": "montarias",
    "nome": "Ração para montaria (1 dia)",
    "uso": "Diverso",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 pc · peso 5 kg · alimentação para animal"
  },
  {
    "categoria": "montarias",
    "nome": "Sela compacta",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 5 po · peso 7,5 kg · sela simples"
  },
  {
    "categoria": "montarias",
    "nome": "Sela de viagem",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 10 po · peso 12,5 kg · sela para deslocamento longo"
  },
  {
    "categoria": "montarias",
    "nome": "Sela exótica",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 60 po · peso 20 kg · necessária para montaria aquática ou voadora"
  },
  {
    "categoria": "montarias",
    "nome": "Sela militar",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 20 po · peso 15 kg · concede vantagem para permanecer montado em combate"
  },
  {
    "categoria": "montarias",
    "nome": "Trenó",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 20 po · peso 150 kg · veículo de tração para neve ou terreno apropriado"
  },
  {
    "categoria": "montarias",
    "nome": "Veleiro",
    "uso": "Veículo",
    "raridade": "Comum",
    "bonus": "0",
    "detalhes": "Custo 10.000 po · velocidade 3 km/h · veículo aquático"
  }
];

var BONUS_ALERTA = DICIONARIOS_DND5E.regras.bonusAlerta;
var PB_TABLE = DICIONARIOS_DND5E.regras.pbPorNivel;
var AF_TABLE = DICIONARIOS_DND5E.regras.ataqueFurtivoPorNivel;
var XP_TOTAIS = DICIONARIOS_DND5E.regras.xpPorNivel;

var SKILLS = DICIONARIOS_DND5E.pericias;
var EQUIP_CATEGORIAS = DICIONARIOS_DND5E.equipamentos.categorias;
var EQUIP_USOS = DICIONARIOS_DND5E.equipamentos.usos;
var EQUIP_RARIDADES = DICIONARIOS_DND5E.equipamentos.raridades;

var DEFAULT_EQUIPAMENTOS = [
  DICIONARIOS_DND5E.equipamentos.armas.rapieira,
  DICIONARIOS_DND5E.equipamentos.armas.adaga,
  DICIONARIOS_DND5E.equipamentos.armas.bestaMao,
  DICIONARIOS_DND5E.equipamentos.armaduras.couro,
  DICIONARIOS_DND5E.equipamentos.kits.ferramentasLadrao,
  DICIONARIOS_DND5E.equipamentos.improvisadas.peDeCabra,
  DICIONARIOS_DND5E.equipamentos.diversos.roupasViagem,
  DICIONARIOS_DND5E.equipamentos.diversos.sacoOuMochila
].map(clonarItemCatalogo);

var DEFAULT_TALENTOS = DICIONARIOS_DND5E.talentosPadrao;

/* ============================================================
   HABILIDADES — LADINO ESPADACHIM
   Baseado no PDF da Biblioteca Élfica + texto fornecido do Espadachim
   ============================================================ */
var FEATURES_BASE = [
  { nivel:1,  nome:"Proficiências",
    desc:"Armaduras leves. Armas simples, besta de mão, espada curta, espada longa, rapieira. Ferramentas de Ladrão. Resistência em Destreza e Inteligência. Perícias: 4 à escolha entre Acrobacia, Atletismo, Atuação, Enganação, Furtividade, Intimidação, Intuição, Percepção, Persuasão e Prestidigitação." },
  { nivel:1,  nome:"Especialização",
    desc:"Escolha 2 perícias proficientes (ou 1 perícia + Ferramentas de Ladrão). Seu bônus de proficiência é dobrado para elas. Repete no nível 6." },
  { nivel:1,  nome:"Ataque Furtivo",
    desc:"1× por turno: adicione Xd6 de dano extra ao acertar com arma de acuidade ou à distância, quando tiver vantagem no ataque — ou quando houver um aliado a 1,5m do alvo sem desvantagem. Dano cresce conforme a tabela." },
  { nivel:1,  nome:"Gíria de Ladrão",
    desc:"Idioma secreto de ladrões: dialeto, jargão e códigos que permitem mensagens ocultas em conversas normais. Leva 4× mais tempo transmitir a mensagem oculta. Você também reconhece sinais e símbolos de guildas de ladrões." },
  { nivel:2,  nome:"Ação Astuta",
    desc:"Ação bônus no seu turno para: Correr, Desengajar ou Esconder-se. Permite atacar e sair sem provocar ataque de oportunidade." },
  { nivel:4,  nome:"Melhoria de Atributo",
    desc:"+2 em um atributo, ou +1/+1 em dois atributos (máximo 20). Ou troque por um Talento. (Repete nos níveis 8, 10, 12, 16, 19)" },
  { nivel:5,  nome:"Esquiva Sobrenatural",
    desc:"Reação: quando um inimigo visível te acerta, reduza o dano pela metade." },
  { nivel:6,  nome:"Especialização (2ª)",
    desc:"Escolha mais 2 perícias (ou 1 perícia + Ferramentas de Ladrão) para dobrar o bônus de proficiência." },
  { nivel:7,  nome:"Evasão",
    desc:"Resistência de Destreza em efeitos de área: se passar, nenhum dano; se falhar, apenas metade." },
  { nivel:11, nome:"Talento Confiável",
    desc:"Toda vez que fizer um teste com proficiência, trate qualquer resultado de 9 ou menos no d20 como um 10." },
  { nivel:14, nome:"Sentido Cego",
    desc:"Se capaz de ouvir, você sabe a localização de qualquer criatura escondida ou invisível a até 3m de você." },
  { nivel:15, nome:"Mente Escorregadia",
    desc:"Você adquire proficiência nos testes de resistência de Sabedoria." },
  { nivel:18, nome:"Sagacidade",
    desc:"Nenhum ataque tem vantagem contra você, exceto se você estiver incapacitado." },
  { nivel:20, nome:"Golpe de Sorte",
    desc:"Se falhar em um ataque ou em qualquer teste de atributo, trate a rolagem como se tivesse tirado 20 natural. 1× por descanso curto ou longo." },
];

var FEATURES_SUB = [
  { nivel:3,  nome:"Trabalho de Pés Sofisticado",
    desc:"Ao realizar um ataque corpo a corpo contra uma criatura durante seu turno, essa criatura não pode fazer ataques de oportunidade contra você pelo resto daquele turno." },
  { nivel:3,  nome:"Audácia Devassa",
    desc:"• Bônus de Iniciativa igual ao seu modificador de Carisma.\n• Ataque Furtivo sem vantagem, se o alvo for o único inimigo a 1,5m de você e você não tiver desvantagem no ataque. Todas as outras regras do Ataque Furtivo se aplicam." },
  { nivel:9,  nome:"Panache",
    desc:"Ação: teste de Carisma (Persuasão) vs. Sabedoria (Intuição) da criatura (devem compartilhar idioma).\n• Hostil: desvantagem em ataques contra quem não seja você e sem ataques de oportunidade contra outros. Dura 1 min ou até aliado atacar o alvo.\n• Não-hostil: enfeitiçada por 1 min, te trata como conhecido amigável." },
  { nivel:13, nome:"Manobra Elegante",
    desc:"Ação bônus: você ganha vantagem no próximo teste de Destreza (Acrobacia) ou Força (Atletismo) que fizer neste mesmo turno." },
  { nivel:17, nome:"Mestre Duelista",
    desc:"Se errar uma jogada de ataque, pode rerolar com vantagem. Não pode usar novamente até terminar um descanso curto ou longo." },
];

var pvAtual = null;
var pvMax = 0;
var pvMaxManual = null;
var caManual = null;
var imagemPersonagem = null;
var equipamentos = DEFAULT_EQUIPAMENTOS.map(function(item) { return Object.assign({}, item); });
var talentos = DEFAULT_TALENTOS.map(function(item) { return Object.assign({}, item); });

function calcMod(v) { return Math.floor((v - 10) / 2); }
function sinal(n)   { return (n >= 0 ? '+' : '') + n; }
function setEl(id, t) {
  var e = document.getElementById(id); if (!e) return;
  if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') e.value = t;
  else e.textContent = t;
}
function getNivel()  { return Math.max(1, Math.min(20, parseInt(document.getElementById('nivel-input').value) || 1)); }
function getPB(nv)   { return PB_TABLE[nv - 1] || 2; }
function calcPVMax(nv, mCON) { return 8 + mCON + (nv - 1) * (5 + mCON); }

function escapeHTML(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAtributos() {
  var defs = [
    ['FOR','for'], ['DES','des'], ['CON','con'],
    ['INT','int'], ['SAB','sab'], ['CAR','car']
  ];
  var attrs = {};
  var totalBonus = 0;

  defs.forEach(function(pair) {
    var cod = pair[0], id = pair[1];
    var base = numeroCampo('s-' + id, 10);
    var bonus = Math.max(0, numeroCampo('b-' + id, 0));
    var total = Math.max(1, Math.min(30, base + bonus));
    totalBonus += bonus;
    attrs[cod] = total;
    setEl('t-' + id, 'Total ' + total);
  });

  var restante = 3 - totalBonus;
  var info = document.getElementById('bonus-racial-restante');
  if (info) {
    info.textContent = totalBonus + ' / 3 usados' + (restante < 0 ? ' (' + Math.abs(restante) + ' acima)' : '');
    info.style.color = restante < 0 ? 'var(--cor-perigo)' : 'var(--cor-dourado)';
  }

  return attrs;
}

function skillDefaultRank(id) {
  var defaults = { fur:2, acr:2, atl:1, eng:1, per:1, pers:1, intu:1 };
  return defaults[id] || 0;
}

function renderSkillControls() {
  var container = document.getElementById('skills-container');
  if (!container) return;

  container.innerHTML = SKILLS.map(function(skill) {
    var rank = skillDefaultRank(skill.id);
    return '<div class="pericia-row" id="skill-row-' + skill.id + '">'
      + '<span class="pericia-nome" id="skill-name-' + skill.id + '"><span class="dot-prof" id="skill-dot-' + skill.id + '"></span>'
      + escapeHTML(skill.nome) + ' (' + skill.attr + ')</span>'
      + '<select class="pericia-select" id="skill-prof-' + skill.id + '" onchange="calcular(); salvarFicha(false)">'
      + '<option value="0"' + (rank===0?' selected':'') + '>Normal</option>'
      + '<option value="1"' + (rank===1?' selected':'') + '>Profic.</option>'
      + '<option value="2"' + (rank===2?' selected':'') + '>Especial.</option>'
      + '</select>'
      + '<input class="pericia-extra" id="skill-extra-' + skill.id + '" type="number" value="0" title="Bônus extra" oninput="calcular(); salvarFichaAuto()">'
      + '<span class="pericia-val" id="skill-val-' + skill.id + '">—</span>'
      + '</div>';
  }).join('');
}

function atualizarPericias(mods, PB) {
  SKILLS.forEach(function(skill) {
    var rank = numeroCampo('skill-prof-' + skill.id, skillDefaultRank(skill.id));
    var extra = numeroCampo('skill-extra-' + skill.id, 0);
    var total = mods[skill.attr] + (rank * PB) + extra;
    var dot = document.getElementById('skill-dot-' + skill.id);
    var nome = document.getElementById('skill-name-' + skill.id);
    var val = document.getElementById('skill-val-' + skill.id);

    if (dot) {
      dot.className = 'dot-prof' + (rank > 0 ? ' ativo' : '');
      dot.style.background = rank === 2 ? 'var(--cor-exp)' : '';
      dot.style.borderColor = rank === 2 ? 'var(--cor-exp)' : '';
    }
    if (nome) nome.className = 'pericia-nome' + (rank === 2 ? ' exp' : rank === 1 ? ' prof' : '');
    if (val) {
      val.textContent = sinal(total);
      val.className = 'pericia-val ' + (rank === 2 ? 'val-exp' : rank === 1 ? 'val-prof' : 'val-none');
    }
  });
}

function classificarEquipamento(item) {
  var itemCatalogo = buscarItemCatalogoPorNome(item && item.nome, false);
  if (itemCatalogo && itemCatalogo.categoria) return itemCatalogo.categoria;

  var txt = ((item.nome || '') + ' ' + (item.detalhes || '')).toLowerCase();
  if (/ferramentas? de ladr[aã]o|kit.*ladr[aã]o|gazua|gazuas/.test(txt)) return 'kits';
  if (item.categoria) return item.categoria;
  if (/couro|armadura|escudo|cota|peitoral|brunea/.test(txt)) return 'armaduras';
  if (/rapieira|adaga|besta|espada|arco|machado|lança|martelo|arma/.test(txt)) return 'armas';
  if (/kit|ferramenta|ladrão|gazua|alquimia|veneno|disfarce|jogo/.test(txt)) return 'kits';
  if (/frasco|poção|óleo|ácido|veneno|antídoto|fogo alquímico/.test(txt)) return 'frascos';
  if (/pé de cabra|corda|tocha|corrente|garrafa/.test(txt)) return 'improvisadas';
  return 'backpack';
}

function normalizarEquipamento(item) {
  item = item || {};
  item = itemComCatalogo(item, false);
  var categoria = classificarEquipamento(item);
  var uso = item.uso;
  if (!uso) {
    uso = usoPadraoPorCategoria(categoria);
  }
  return {
    categoria: categoria,
    nome: item.nome || '',
    uso: uso,
    raridade: item.raridade || 'Comum',
    bonus: item.bonus || '0',
    detalhes: item.detalhes || ''
  };
}

function optionHTML(valor, atual) {
  return '<option value="' + escapeHTML(valor) + '"' + (valor === atual ? ' selected' : '') + '>' + escapeHTML(valor) + '</option>';
}

function coletarEquipamentos() {
  return equipamentos.map(function(item, i) {
    return normalizarEquipamento({
      categoria: document.getElementById('equip-categoria-' + i)?.value || item.categoria,
      nome: document.getElementById('equip-nome-' + i)?.value || '',
      uso: document.getElementById('equip-uso-' + i)?.value || item.uso,
      raridade: document.getElementById('equip-raridade-' + i)?.value || 'Comum',
      bonus: document.getElementById('equip-bonus-' + i)?.value || '0',
      detalhes: document.getElementById('equip-detalhes-' + i)?.value || ''
    });
  }).filter(function(item) { return item.nome || item.detalhes; });
}

function renderEquipamentoRow(item, i) {
  item = normalizarEquipamento(item);
  return '<div class="equip-row">'
    + '<input type="hidden" id="equip-categoria-' + i + '" value="' + escapeHTML(item.categoria) + '">'
    + '<input class="edit-input" id="equip-nome-' + i + '" list="equip-catalogo-list" value="' + escapeHTML(item.nome) + '" placeholder="Item" oninput="editarNomeEquipamento(' + i + ')" onchange="editarNomeEquipamento(' + i + ')">'
    + '<select class="edit-select" id="equip-uso-' + i + '" onchange="salvarFichaAuto()">'
    + EQUIP_USOS.map(function(uso) { return optionHTML(uso, item.uso); }).join('')
    + '</select>'
    + '<select class="edit-select" id="equip-raridade-' + i + '" onchange="salvarFichaAuto()">'
    + EQUIP_RARIDADES.map(function(r) { return optionHTML(r, item.raridade); }).join('')
    + '</select>'
    + '<input class="edit-input" id="equip-bonus-' + i + '" value="' + escapeHTML(item.bonus) + '" placeholder="+0" oninput="salvarFichaAuto()">'
    + '<input class="edit-input" id="equip-detalhes-' + i + '" value="' + escapeHTML(item.detalhes) + '" placeholder="Dano, propriedade, peso, efeito..." oninput="salvarFichaAuto()">'
    + '<button class="edit-btn edit-btn-danger" onclick="removerEquipamento(' + i + ')">×</button>'
    + '</div>';
}

function renderEquipamentos() {
  var container = document.getElementById('equipamentos-container');
  if (!container) return;
  equipamentos = equipamentos.map(normalizarEquipamento);
  container.innerHTML = renderCatalogoDatalist() + renderBuscaGlobalCatalogo() + EQUIP_CATEGORIAS.map(function(cat) {
    var indices = equipamentos.map(function(item, i) { return item.categoria === cat.id ? i : -1; }).filter(function(i) { return i >= 0; });
    var rows = indices.map(function(i) { return renderEquipamentoRow(equipamentos[i], i); }).join('');
    if (!rows) rows = '<div class="equip-detalhe" style="text-align:left;">Sem itens.</div>';
    return '<div class="inventario-categoria">'
      + "<div class=\"inventario-titulo\"><span>" + cat.nome + "</span><button class=\"edit-btn\" onclick=\"adicionarEquipamento('" + cat.id + "')\">+</button></div>"
      + renderBuscaCategoria(cat)
      + rows
      + '</div>';
  }).join('');
}

function editarNomeEquipamento(i) {
  var nomeEl = document.getElementById('equip-nome-' + i);
  if (!nomeEl) return;

  var itemCatalogo = buscarItemCatalogoPorNome(nomeEl.value, true);
  if (!itemCatalogo) {
    salvarFichaAuto();
    return;
  }

  var categoriaEl = document.getElementById('equip-categoria-' + i);
  var usoEl = document.getElementById('equip-uso-' + i);
  var raridadeEl = document.getElementById('equip-raridade-' + i);
  var bonusEl = document.getElementById('equip-bonus-' + i);
  var detalhesEl = document.getElementById('equip-detalhes-' + i);
  var categoriaAnterior = categoriaEl ? categoriaEl.value : '';

  if (categoriaEl) categoriaEl.value = itemCatalogo.categoria || categoriaEl.value;
  if (usoEl) usoEl.value = itemCatalogo.uso || usoEl.value || usoPadraoPorCategoria(itemCatalogo.categoria);
  if (raridadeEl && (!raridadeEl.value || raridadeEl.value === 'Comum')) raridadeEl.value = itemCatalogo.raridade || 'Comum';
  if (bonusEl && (!bonusEl.value || bonusEl.value === '0')) bonusEl.value = itemCatalogo.bonus || '0';
  if (detalhesEl) detalhesEl.value = itemCatalogo.detalhes || montarDetalhesCatalogo(itemCatalogo);

  if (categoriaEl && categoriaEl.value !== categoriaAnterior) {
    equipamentos = coletarEquipamentos();
    renderEquipamentos();
    salvarFicha(false);
    return;
  }

  salvarFichaAuto();
}

function mudarEquipamentoERenderizar() {
  equipamentos = coletarEquipamentos();
  renderEquipamentos();
  salvarFicha(false);
}

function adicionarEquipamento(categoria) {
  equipamentos = coletarEquipamentos();
  var cat = categoria || 'backpack';
  equipamentos.push(normalizarEquipamento({
    categoria: cat,
    nome:'Novo item',
    uso: usoPadraoPorCategoria(cat),
    raridade:'Comum',
    bonus:'0',
    detalhes:''
  }));
  renderEquipamentos();
  salvarFicha(false);
}

function removerEquipamento(i) {
  equipamentos = coletarEquipamentos();
  equipamentos.splice(i, 1);
  renderEquipamentos();
  salvarFicha(false);
}

function coletarTalentos() {
  return talentos.map(function(_, i) {
    return {
      nome: document.getElementById('talento-nome-' + i)?.value || '',
      desc: document.getElementById('talento-desc-' + i)?.value || ''
    };
  }).filter(function(talento) { return talento.nome || talento.desc; });
}

function renderTalentos() {
  var container = document.getElementById('talentos-container');
  if (!container) return;
  container.innerHTML = talentos.map(function(talento, i) {
    return '<div class="talento-row">'
      + '<input class="edit-input" id="talento-nome-' + i + '" value="' + escapeHTML(talento.nome) + '" placeholder="Nome do talento" oninput="salvarFichaAuto()">'
      + '<textarea class="edit-textarea" id="talento-desc-' + i + '" placeholder="Explique o que o talento faz" oninput="salvarFichaAuto()">' + escapeHTML(talento.desc) + '</textarea>'
      + '<button class="edit-btn edit-btn-danger" onclick="removerTalento(' + i + ')">×</button>'
      + '</div>';
  }).join('');
}

function adicionarTalento() {
  talentos = coletarTalentos();
  talentos.push({ nome:'Novo talento', desc:'' });
  renderTalentos();
  salvarFicha(false);
}

function removerTalento(i) {
  talentos = coletarTalentos();
  talentos.splice(i, 1);
  renderTalentos();
  salvarFicha(false);
}

/* ============================================================ RENDER FEATURES */
function renderFeatures(nivel) {
  var container = document.getElementById('features-container');

  function buildCol(features, titulo) {
    var rows = features.map(function(f) {
      var bloq = f.nivel > nivel;
      var badge = bloq
        ? '<span class="feature-lock">🔒 nv.' + f.nivel + '</span>'
        : '<span class="feature-nivel">Nível ' + f.nivel + '</span>';
      return '<div class="feature' + (bloq ? ' bloqueada' : '') + '">'
        + '<div class="feature-nome">' + f.nome + badge + '</div>'
        + '<div class="feature-desc">' + f.desc.replace(/\n/g,'<br>') + '</div>'
        + '</div>';
    });
    return '<div class="feature-col">'
      + '<div class="col-titulo">' + titulo + '</div>'
      + '<div class="painel" style="padding:4px 12px;">' + rows.join('') + '</div>'
      + '</div>';
  }

  container.innerHTML =
    buildCol(FEATURES_BASE, 'Habilidades Base — Ladino') +
    buildCol(FEATURES_SUB,  'Subclasse — Espadachim');
}

/* ============================================================ CALCULAR XP */
function calcExpBar(nivel, expAtual) {
  if (nivel >= 20) { setEl('exp-meta','Nível máximo!'); document.getElementById('exp-pbar').style.width='100%'; return; }
  var xpProx = XP_TOTAIS[nivel];
  var xpBase = XP_TOTAIS[nivel - 1];
  var pct = Math.max(0, Math.min(100, ((expAtual - xpBase) / (xpProx - xpBase)) * 100));
  document.getElementById('exp-pbar').style.width = pct + '%';
  setEl('exp-meta', '/ ' + xpProx.toLocaleString('pt-BR') + ' XP → nível ' + (nivel + 1));
  setEl('badge-exp-txt', 'EXP: ' + expAtual.toLocaleString('pt-BR'));
}

/* ============================================================ CALCULAR */
function calcular() {
  var nivel = getNivel();
  var PB    = getPB(nivel);

  var attrs = getAtributos();
  var FOR = attrs.FOR, DES = attrs.DES, CON = attrs.CON;
  var INT = attrs.INT, SAB = attrs.SAB, CAR = attrs.CAR;

  var mFOR=calcMod(FOR), mDES=calcMod(DES), mCON=calcMod(CON);
  var mINT=calcMod(INT), mSAB=calcMod(SAB), mCAR=calcMod(CAR);

  function aplicarMod(id, m) {
    var el = document.getElementById(id); if (!el) return;
    el.textContent = sinal(m);
    el.className = 'attr-mod ' + (m>0?'mod-pos':m<0?'mod-neg':'mod-zer');
  }
  aplicarMod('m-for',mFOR); aplicarMod('m-des',mDES); aplicarMod('m-con',mCON);
  aplicarMod('m-int',mINT); aplicarMod('m-sab',mSAB); aplicarMod('m-car',mCAR);

  // PV
  var novoPVMax = pvMaxManual !== null ? pvMaxManual : calcPVMax(nivel, mCON);
  if (pvAtual === null) pvAtual = novoPVMax;
  if (novoPVMax !== pvMax) {
    var pvCheio = pvAtual === pvMax;
    pvMax = novoPVMax;
    pvAtual = pvCheio ? pvMax : Math.max(0, Math.min(pvMax, pvAtual));
  }
  setEl('d-pv', pvMax); setEl('pv-atual-show', pvAtual);
  atualizarBarraPV();

  // PB
  var pbFaixa = PB===2?'Nível 1–4':PB===3?'Nível 5–8':PB===4?'Nível 9–12':PB===5?'Nível 13–16':'Nível 17–20';
  setEl('d-pb', sinal(PB)); setEl('pb-sub', pbFaixa); setEl('badge-pb','Proficiência '+sinal(PB));

  // CA — couro: 11 + DES. Audácia Devassa soma CAR na iniciativa, não na CA.
  var caAuto = 11 + mDES;
  var ca = caManual !== null ? caManual : caAuto;
  setEl('d-ca', ca);
  setEl('ca-sub', caManual !== null ? 'Manual' : 'Couro: 11 + DES');

  // Iniciativa: DES + Alerta + CAR (Espadachim nv3+)
  var initBonus = mDES + BONUS_ALERTA + (nivel >= 3 ? mCAR : 0);
  setEl('d-init', sinal(initBonus));
  setEl('init-sub', nivel >= 3 ? 'DES + Alerta + CAR' : 'DES + Alerta');

  // Percepção passiva
  setEl('d-perc', 10 + mSAB + PB);

  // Dado de vida
  setEl('d-dv', nivel + 'd8');

  // Testes de resistência
  setEl('st-for', sinal(mFOR));       setEl('st-des', sinal(mDES+PB));
  setEl('st-con', sinal(mCON));       setEl('st-int', sinal(mINT+PB));
  setEl('st-sab', sinal(mSAB));       setEl('st-car', sinal(mCAR));

  // Perícias
  atualizarPericias({ FOR:mFOR, DES:mDES, CON:mCON, INT:mINT, SAB:mSAB, CAR:mCAR }, PB);

  // Ataques
  var hit = sinal(mDES + PB);
  setEl('att-rap',   hit);  setEl('dmg-rap',   '1d8 '+sinal(mDES)+' perf.');
  setEl('att-adag',  hit);  setEl('dmg-adag',  '1d4 '+sinal(mDES)+' perf.');
  setEl('att-arr',   hit);  setEl('dmg-arr',   '1d4 '+sinal(mDES)+' perf.');
  setEl('att-besta', hit);  setEl('dmg-besta', '1d6 '+sinal(mDES)+' perf.');

  // AF
  var afDados = AF_TABLE[nivel-1];
  setEl('af-dice', afDados + 'd6');
  var afEl = document.getElementById('af-espadachim');
  if (afEl) afEl.style.display = nivel >= 3 ? 'inline' : 'none';

  // Cabeçalho
  var subLine = nivel >= 3
    ? 'Humano Variante · Ladino Espadachim · Nível ' + nivel
    : 'Humano Variante · Ladino · Nível ' + nivel + ' · (sem subclasse até nv.3)';
  setEl('subtitulo-char', subLine);
  setEl('badge-sub', nivel >= 3 ? 'Espadachim (nv.3)' : 'Sem subclasse');
  setEl('rodape-txt', 'D&D 5e · Ladino Espadachim · Humano Variante · Nível ' + nivel);
  setEl('nivel-info', 'PB '+sinal(PB)+' | AF '+afDados+'d6 | PV máx '+pvMax);

  // XP
  calcExpBar(nivel, parseInt(document.getElementById('exp-input').value) || 0);

  // Features
  renderFeatures(nivel);
}

/* ============================================================ PV */
function atualizarBarraPV() {
  if (!pvMax) return;
  var pct = Math.max(0, Math.min(100, (pvAtual / pvMax) * 100));
  var b = document.getElementById('pv-barra'); if (!b) return;
  b.style.width = pct + '%';
  b.style.background = pct > 50 ? 'var(--cor-sucesso)' : pct > 25 ? 'var(--cor-dourado)' : 'var(--cor-perigo)';
}
function ajustarPV(dir) {
  var adj = parseInt(document.getElementById('pv-adj').value) || 1;
  pvAtual = Math.max(0, Math.min(pvMax, pvAtual + dir * adj));
  setEl('pv-atual-show', pvAtual); atualizarBarraPV();
  salvarFicha(false);
}
function resetarPV() {
  pvAtual = pvMax;
  setEl('pv-atual-show', pvAtual); atualizarBarraPV();
  salvarFicha(false);
}
function editarPVAtualManual() {
  var v = parseInt(document.getElementById('pv-atual-show').value);
  if (isNaN(v)) { setEl('pv-atual-show', pvAtual); return; }
  pvAtual = Math.max(0, Math.min(pvMax, v));
  setEl('pv-atual-show', pvAtual); atualizarBarraPV();
  salvarFicha(false);
}
function editarPVMaxManual() {
  var v = parseInt(document.getElementById('d-pv').value);
  if (isNaN(v) || v < 1) { setEl('d-pv', pvMax); return; }
  pvMaxManual = v;
  calcular();
  salvarFicha(false);
}
function limparPVMaxManual() {
  pvMaxManual = null;
  calcular();
  salvarFicha(false);
}
function editarCAManual() {
  var v = parseInt(document.getElementById('d-ca').value);
  if (isNaN(v) || v < 0) { setEl('d-ca', caManual || 0); return; }
  caManual = v;
  calcular();
  salvarFicha(false);
}
function limparCAManual() {
  caManual = null;
  calcular();
  salvarFicha(false);
}

/* ============================================================ IMAGEM */
function escolherImagemPersonagem() {
  var input = document.getElementById('imagem-personagem-input');
  if (input) input.click();
}

function aplicarImagemPersonagem(src) {
  imagemPersonagem = src || null;
  var img = document.getElementById('imagem-personagem');
  var wrapper = document.getElementById('imagem-wrapper');

  if (!img || !wrapper) return;

  if (imagemPersonagem) {
    img.src = imagemPersonagem;
    wrapper.classList.add('tem-imagem');
  } else {
    img.removeAttribute('src');
    wrapper.classList.remove('tem-imagem');
  }
}

function carregarImagemPersonagem(event) {
  var input = event.target;
  var file = input.files && input.files[0];
  if (!file) return;

  if (!file.type || file.type.indexOf('image/') !== 0) {
    mostrarStatusSave('Imagem inválida');
    input.value = '';
    return;
  }

  var reader = new FileReader();
  reader.onload = function() {
    redimensionarImagem(reader.result, function(dataUrl) {
      aplicarImagemPersonagem(dataUrl);
      salvarFicha(false);
      mostrarStatusSave('Imagem salva');
      input.value = '';
    });
  };
  reader.readAsDataURL(file);
}

function redimensionarImagem(dataUrl, callback) {
  var img = new Image();
  img.onload = function() {
    var maxW = 900;
    var maxH = 1200;
    var ratio = Math.min(1, maxW / img.width, maxH / img.height);
    var w = Math.round(img.width * ratio);
    var h = Math.round(img.height * ratio);

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = function() { callback(dataUrl); };
  img.src = dataUrl;
}

function removerImagemPersonagem() {
  aplicarImagemPersonagem(null);
  salvarFicha(false);
  mostrarStatusSave('Imagem removida');
}

/* ============================================================ NÍVEL */
function ajustarNivel(delta) {
  var input = document.getElementById('nivel-input');
  input.value = Math.max(1, Math.min(20, (parseInt(input.value)||1) + delta));
  calcular();
  salvarFicha(false);
}
function onNivelInput() { var v=parseInt(document.getElementById('nivel-input').value); if(v>=1&&v<=20) calcular(); }

/* ============================================================ INIT */
inicializarCatalogoEquipamentos();
renderSkillControls();
renderEquipamentos();
renderTalentos();
carregarFichaSalva();
carregarDicionariosTxt();
iniciarAutoSave();
iniciarFechamentoBuscaCatalogo();
calcular();
iniciarAbas();
