<div align="center">

# 🐉 RPG System

### Ferramentas para jogadores e mestres de RPG de mesa

Uma aplicação web para criação e gerenciamento de fichas, campanhas, combates, monstros, magias, itens e conteúdo de RPG — com foco em **D&D 5e**, mas com estrutura flexível para outros sistemas.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-121013?style=for-the-badge&logo=github&logoColor=white)](https://j-tabosa.github.io/RPG-Systema/)

### 🎲 [Acessar o RPG System](https://j-tabosa.github.io/RPG-Systema/)

</div>

---

## 📖 Sobre o projeto

O **RPG System** nasceu da ideia de reunir, em uma única aplicação, as ferramentas que normalmente ficam espalhadas durante uma sessão de RPG.

O projeto foi pensado para atender tanto **jogadores** quanto **mestres**, oferecendo desde fichas de personagem até gerenciamento de campanhas e acompanhamento de combate.

A aplicação roda diretamente no navegador, sem instalação obrigatória, e utiliza uma estrutura totalmente front-end.

---

## ✨ Funcionalidades

### 🧙 Para jogadores

- 📜 **Fichas de Personagem**
  - Gerenciamento de atributos
  - Informações de personagem
  - Magias
  - Equipamentos
  - Organização dos componentes da ficha

- 🎲 **Gerador de Personagens**
  - Geração rápida de atributos
  - Método de rolagem **4d6 descartando o menor dado**
  - Suporte à criação de ideias para personagens e NPCs

- ✨ **Catálogo de Magias**
  - Consulta de magias
  - Organização por categorias e pastas
  - Integração com as fichas

- ⚔️ **Catálogo de Itens**
  - Consulta de equipamentos e itens
  - Conteúdo base e suplementos

---

### 👑 Para mestres

- 🗺️ **Gestor de Campanhas**
  - Criação e organização de campanhas
  - Associação de personagens
  - Controle de sessões
  - Imagens de capa
  - Organização das informações da aventura

- ⚔️ **Combat Tracker**
  - Controle de iniciativa
  - Acompanhamento de HP
  - Condições
  - Gerenciamento de participantes do combate
  - Rolador de dados integrado

- 👻 **Monstropédia**
  - Catálogo de criaturas
  - Consulta de atributos
  - Nível de Desafio (ND)
  - Imagens de monstros
  - Importação de criaturas para o Combat Tracker

- 🗃️ **Gestor de Conteúdo**
  - Gerenciamento das informações utilizadas pelo sistema
  - Raças
  - Classes
  - Perícias
  - Conteúdo personalizável para diferentes mesas

---

## 🧩 Módulos do sistema

| Módulo | Descrição |
|---|---|
| 🏠 **Início** | Hub principal com acesso às ferramentas de jogador e mestre |
| 📜 **Fichas** | Criação e gerenciamento de personagens |
| ✨ **Gerador** | Geração de atributos, personagens e NPCs |
| 🗃️ **Gestor** | Administração do conteúdo utilizado pelo sistema |
| 🗺️ **Campanhas** | Organização de campanhas, sessões e personagens |
| ⚔️ **Combat Tracker** | Controle de iniciativa, HP, condições e combate |
| 👻 **Monstropédia** | Consulta e gerenciamento de criaturas |
| 🔮 **Magias** | Catálogo de magias |
| 🗡️ **Itens** | Catálogo de itens e equipamentos |

---

## 🛠️ Tecnologias utilizadas

O RPG System foi desenvolvido utilizando tecnologias web sem necessidade de framework:

- **HTML5**
- **CSS3**
- **JavaScript**
- **JSON**
- **Tabler Icons**
- **Git & GitHub**
- **GitHub Pages**

Essa abordagem mantém o projeto leve e permite que ele funcione diretamente no navegador.

---

## 📁 Estrutura do projeto

```text
RPG-Systema/
│
├── index.html
│
├── css/
│   ├── base.css
│   ├── index.css
│   ├── navigation.css
│   ├── ficha.css
│   ├── gerador.css
│   ├── campanha.css
│   ├── tracker.css
│   ├── monstros.css
│   ├── magias.css
│   └── itens.css
│
├── js/
│   ├── ficha.js
│   ├── gerador.js
│   ├── campanha.js
│   ├── tracker.js
│   ├── catalogo.js
│   └── ...
│
├── data/
│   ├── personagens.json
│   ├── inimigos.json
│   ├── magias.json
│   ├── itens.json
│   └── itens-suplementos.json
│
└── pages/
    ├── ficha.html
    ├── gerador.html
    ├── campanha.html
    ├── conteudo.html
    ├── tracker.html
    ├── monstros.html
    ├── magias.html
    └── itens.html
```

---

## 🚀 Como executar

### Opção 1 — Acessar online

A versão publicada pode ser usada diretamente pelo GitHub Pages:

👉 **https://j-tabosa.github.io/RPG-Systema/**

Nenhuma instalação é necessária.

---

### Opção 2 — Executar localmente

Clone o repositório:

```bash
git clone https://github.com/J-Tabosa/RPG-Systema.git
```

Entre na pasta do projeto:

```bash
cd RPG-Systema
```

Como o projeto utiliza arquivos JSON, o recomendado é executá-lo através de um servidor local.

Com Python:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

Também é possível utilizar extensões como **Live Server** no Visual Studio Code.

---

## 💾 Dados

O projeto possui catálogos em JSON utilizados pelas ferramentas do sistema.

Atualmente o diretório `data/` inclui bases para:

- Personagens
- Inimigos
- Magias
- Itens
- Itens de suplementos

Isso permite manter o projeto independente de um backend para grande parte das funcionalidades atuais.

---

## 🎨 Interface

A interface foi construída com foco em uma identidade visual inspirada em RPGs de fantasia, mantendo:

- Layout responsivo
- Navegação para desktop e dispositivos móveis
- Tema claro/escuro
- Cards e painéis de acesso rápido
- Separação entre ferramentas de **Jogador** e **Mestre**
- Ícones através do **Tabler Icons**

---

## 📌 Estado atual

O projeto está em desenvolvimento ativo.

O changelog da aplicação registra atualmente a versão **v1.9**, incluindo melhorias como:

- Reordenação dinâmica de componentes das fichas
- Organização de magias por pastas
- Imagens para criaturas da Monstropédia
- Melhorias de interface
- Correções no Gerador, Gestor de Conteúdo e sistema de Campanhas

---

## 🎯 Objetivo

O objetivo do RPG System é evoluir para uma plataforma que concentre as ferramentas necessárias para uma mesa de RPG em um único lugar, reduzindo a necessidade de alternar entre diferentes aplicativos, documentos e páginas durante uma sessão.

---

## 🤝 Contribuindo

Sugestões, correções e melhorias são bem-vindas.

1. Faça um **fork** do projeto
2. Crie uma branch para sua alteração:

```bash
git checkout -b feature/minha-feature
```

3. Faça suas alterações
4. Crie um commit:

```bash
git commit -m "feat: adiciona nova funcionalidade"
```

5. Envie a branch:

```bash
git push origin feature/minha-feature
```

6. Abra um **Pull Request**

---

## 👨‍💻 Autor

Desenvolvido por **J-Tabosa**.

[![GitHub](https://img.shields.io/badge/GitHub-J--Tabosa-181717?style=for-the-badge&logo=github)](https://github.com/J-Tabosa)

---

<div align="center">

### ⚔️ Prepare a ficha. Role os dados. Comece a aventura.

⭐ Se o projeto foi útil para você, considere deixar uma estrela no repositório.

</div>
