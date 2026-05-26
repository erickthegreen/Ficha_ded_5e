# Publicar no GitHub Pages

## Funciona no mobile?

Sim. A ficha é responsiva e roda no navegador do celular.

O salvamento continua sendo local:

- no PC, salva no navegador do PC;
- no celular, salva no navegador do celular;
- para passar uma ficha de um aparelho para outro, use `Exportar JSON` e `Importar JSON`.

## Opção recomendada: GitHub Pages

1. Crie uma conta em:

```txt
https://github.com
```

2. Crie um repositório novo.

Exemplo de nome:

```txt
ficha-dnd5e
```

3. Envie todos os arquivos desta pasta para o repositório.

Arquivos e pastas importantes:

```txt
index.html
styles/
src/
data/
assets/
legacy/
.nojekyll
```

4. No GitHub, abra:

```txt
Settings > Pages
```

5. Em `Build and deployment`, escolha:

```txt
Source: Deploy from a branch
Branch: main
Folder: /root
```

6. Clique em `Save`.

7. Aguarde o GitHub gerar o site.

O link ficará parecido com:

```txt
https://SEU_USUARIO.github.io/ficha-dnd5e/
```

## Como os amigos usam

Você envia o link do GitHub Pages.

Cada pessoa abre no navegador e edita a própria ficha.

No celular também funciona. O ideal é usar Chrome, Edge, Firefox ou Safari atualizado.

## Como compartilhar um personagem específico

Na sua ficha:

1. Abra a aba `Exportação`.
2. Clique em `Exportar JSON`.
3. Envie o arquivo `.json`.

No aparelho da outra pessoa:

1. Abra o link da ficha.
2. Vá em `Exportação`.
3. Clique em `Importar JSON`.
4. Escolha o arquivo recebido.

## Limitação importante

GitHub Pages é site estático. Isso significa que ele não tem banco de dados.

Funciona para:

- cada pessoa editar sua própria ficha;
- salvar localmente no navegador;
- importar/exportar personagens por JSON;
- abrir no PC e no celular.

Não funciona para:

- várias pessoas editarem a mesma ficha ao mesmo tempo;
- sincronizar automaticamente celular e PC;
- login de usuários;
- banco de fichas online.

Para isso seria necessária uma versão com backend e banco de dados.
