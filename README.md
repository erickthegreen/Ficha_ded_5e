# Ficha D&D 5e Modular

Ficha editável modular de D&D 5e, feita em HTML, CSS e JavaScript puro.

O projeto mantém a ficha antiga do Ladino Espadachim preservada e adiciona uma nova ficha modular com classes, raças, biblioteca de itens, inventário, salvamento local, exportação JSON, exportação Markdown e PDF editável.

## Como abrir

### Opção 1 - Abrir direto

Abra:

```txt
index.html
```

Se os dados não carregarem ao abrir direto, use a opção de servidor local. Alguns navegadores bloqueiam `fetch` de JSON e módulos JavaScript quando a página é aberta por `file://`.

### Opção 2 - Servidor local

Na pasta do projeto, rode:

```bash
python -m http.server 8000
```

Depois acesse:

```txt
http://localhost:8000
```

### Opção 3 - GitHub Pages

Para publicar online e abrir também no celular, veja:

```txt
PUBLICAR_GITHUB_PAGES.md
```

## Como acessar a ficha antiga do Ladino

Abra:

```txt
legacy/ficha-ladino-espadachim-v3/index.html
```

Ela não aparece como chamada dentro da tela principal da ficha modular. O arquivo continua disponível para quem quiser usar ou comparar manualmente.

Os arquivos originais também continuam preservados na raiz:

```txt
ficha_ladino_espadachim_v3.html
ficha_ladino_espadachim_v3.css
ficha_ladino_espadachim_v3.js
```

## Estrutura principal

```txt
index.html
styles/
src/
data/
assets/backgrounds/
legacy/ficha-ladino-espadachim-v3/
```

## Como adicionar imagens de fundo

Coloque imagens em:

```txt
assets/backgrounds/
```

Use nomes como:

```txt
fundo-da-ladino.png
fundo-da-bruxo.png
fundo-da-feiticeiro.png
fundo-da-guerreiro.png
```

A seleção do fundo é feita pelo id da classe.

## Como adicionar classes

Edite:

```txt
data/classes.json
```

Cada classe deve manter um `id`, `nome`, `dadoVida`, proficiências, habilidades por nível e, se existir, dados de conjuração.

## Como adicionar raças

Edite:

```txt
data/racas.json
```

## Como adicionar itens

Edite os JSONs dentro de:

```txt
data/
```

Arquivos principais de itens:

```txt
data/itens.json
data/armas.json
data/armaduras.json
data/kits-ferramentas.json
data/frascos-consumiveis.json
data/itens-diversos.json
data/bugigangas.json
data/bens-servicos.json
data/montarias-veiculos.json
data/magias.json
```

Itens comuns sem efeito mecânico claro podem receber uma descrição prática simples. Armas e armaduras devem preservar dano, CA, preço, peso e propriedades, sem inventar regra extra.

## Recursos disponíveis

- Seleção de classe, raça, subclasse e antecedente.
- Abas de personagem, atributos, classe, multiclasse, combate, magias, inventário, biblioteca, anotações e exportação.
- Tema e imagem de fundo por classe.
- Cálculo de modificadores de atributo.
- Cálculo de bônus de proficiência por nível total.
- Cálculo de PV máximo automático.
- Sobrescrita manual de PV máximo.
- Cálculo de CA base, CA com armadura e CA com escudo.
- Sobrescrita manual de CA.
- Cálculo de iniciativa.
- Cálculo de CD de magia e ataque mágico.
- Magia de Pacto do Bruxo separada da conjuração comum.
- Multiclasse simples.
- Biblioteca pesquisável de itens.
- Biblioteca pesquisável de magias.
- Filtros por categoria e tipo.
- Filtros de magias por classe, círculo e escola.
- Inventário com quantidade, equipado, observação e remoção.
- Lista de magias do personagem com marcação de preparada e observação.
- Item personalizado.
- Moedas e peso total estimado.
- Salvamento no `localStorage`.
- Exportação e importação JSON.
- Exportação Markdown.
- Exportação PDF editável.
- PDF editável com fundo da classe, painéis organizados e campos AcroForm.
- Impressão pelo navegador.

## Como salvar

Use a aba:

```txt
Exportação
```

Depois clique em:

```txt
Salvar personagem
```

O salvamento usa o `localStorage` do navegador. Isso significa que ele fica salvo naquele navegador e naquele perfil. Se abrir em guia anônima, outro navegador ou outro computador, o salvamento não aparece automaticamente.

## Como exportar

Use a aba:

```txt
Exportação
```

Opções disponíveis:

```txt
Exportar JSON
Importar JSON
Exportar Markdown
Exportar PDF editável
Imprimir
```

Use JSON para backup e para mover personagem entre navegadores.

## Testes finais realizados

Validações feitas na fase final:

- Ficha antiga abriu pelo caminho `legacy/ficha-ladino-espadachim-v3/index.html`.
- CSS da ficha antiga foi aplicado.
- JS da ficha antiga carregou sem erro de console.
- Nova ficha abriu por `http://127.0.0.1:8000/`.
- `data/classes.json` carregou com 12 classes.
- `data/racas.json` carregou com 15 raças.
- `data/magias.json` carregou com 477 magias.
- JSONs de itens carregaram sem erro.
- Biblioteca carregou 364 itens a partir de `data/itens.json`.
- Campos `raw` foram preservados nos dados normalizados.
- Testado personagem Ladino.
- Testado personagem Bruxo.
- Testado personagem Feiticeiro.
- Testado personagem Guerreiro.
- Testada multiclasse simples Ladino + Bruxo.
- Tema por classe aplicado.
- Imagem de fundo por classe aplicada.
- Abas funcionando.
- Campos editáveis funcionando.
- Responsividade mobile testada sem rolagem horizontal.
- Busca de item funcionando.
- Busca de magia funcionando.
- Adicionar magia ao personagem funcionando.
- Adicionar item ao inventário funcionando.
- Remover/equipar item funcionando.
- Arma equipada aparece no combate.
- Armadura equipada influencia a CA.
- Salvamento local funcionando.
- Exportação JSON funcionando.
- Importação JSON validada pelo extrator.
- Exportação Markdown funcionando.
- Exportação PDF funcionando.
- PDF gerado contém AcroForm editável.
- PDF gerado contém aparências internas dos campos para melhorar leitura em visualizadores de PDF.

## Testes de cálculo conferidos

- Modificador de atributo: 14 gera `+2`.
- Bônus de proficiência: nível 5 gera `+3`.
- Nível total multiclasse: Ladino 3 + Bruxo 2 gera nível 5.
- CA base com Destreza 14 gera 12.
- CA com Brunea e Destreza 14 gera 16.
- CA com Cota de Malha gera 16.
- CA com Cota de Malha e escudo gera 18.
- Guerreiro nível 5 com Constituição 16 gera 49 PV máximos.
- Feiticeiro nível 5 com Carisma 16 gera CD 14 e ataque mágico `+6`.
- Bruxo mostra Magia de Pacto separada.

## Limitações conhecidas

- Abrir `index.html` direto pode falhar em alguns navegadores por bloqueio de `fetch` local. Use `python -m http.server 8000`.
- A ficha usa dados locais em JSON; não há banco de dados externo.
- O salvamento fica preso ao `localStorage` do navegador usado.
- A importação/exportação JSON usa a estrutura atual do personagem; mudanças futuras de estrutura podem exigir migração.
- O PDF implementado é um PDF novo com layout próprio, fundo da classe e campos AcroForm.
- Ainda não foi implementado o preenchimento de um PDF modelo oficial existente.
- Alguns leitores de PDF de navegador exibem campos editáveis com limitações. Para editar e salvar com mais estabilidade, use Adobe Reader.
- O PDF usa campos de texto; checkboxes visuais da ficha oficial ainda não foram recriados.
- Espaços de magia de multiclasse completa ainda não são combinados.
- Magia de Pacto do Bruxo aparece separada, mas a tabela completa de espaços por nível ainda não foi implementada.
- Requisitos mínimos de atributo para multiclasse ainda não bloqueiam escolhas.
- Proficiências reduzidas específicas de multiclasse ainda não são aplicadas automaticamente.
- Ataque e dano final de armas equipadas ainda não somam atributo e proficiência automaticamente.
- A ficha antiga usa Google Fonts por CDN; se estiver sem internet, ela funciona com fontes substitutas do navegador.

## Preparação para zip

O projeto não depende de caminhos absolutos do computador local. Os caminhos usados pela aplicação são relativos, por exemplo:

```txt
assets/backgrounds/fundo-da-ladino.png
data/classes.json
src/app.js
```

Para enviar em `.zip`, compacte a pasta inteira do projeto mantendo a estrutura de diretórios.

## Arquivos principais

HTML:

```txt
index.html
legacy/ficha-ladino-espadachim-v3/index.html
```

CSS:

```txt
styles/base.css
styles/layout.css
styles/components.css
styles/themes.css
styles/print.css
```

JavaScript:

```txt
src/app.js
src/core/
src/modules/
src/ui/
src/utils/
```

Dados:

```txt
data/classes.json
data/racas.json
data/*.json
```

Assets:

```txt
assets/backgrounds/
```
