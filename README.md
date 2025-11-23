<div align="center">
  <img src="public/logo.svg" width="120" alt="Logo Finanças Sinceras" />
  <h1>Finanças Sinceras 💸</h1>
  <p><strong>Seu assistente financeiro que não passa a mão na cabeça.</strong></p>
  
  <p>
    <a href="https://financas-sinceras.vercel.app/">🔗 Acessar Demo Online</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" />
    <img src="https://img.shields.io/badge/Vite-Fast-yellow?style=flat-square&logo=vite" />
    <img src="https://img.shields.io/badge/AI-Google%20Gemini-orange?style=flat-square&logo=google" />
    <img src="https://img.shields.io/badge/Auth-Firebase-orange?style=flat-square&logo=firebase" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwindcss" />
  </p>
</div>

---

## 🚀 Sobre o Projeto

O **Finanças Sinceras** é mais do que uma planilha bonita. É um Progressive Web App (PWA) inteligente desenhado para eliminar o atrito de controlar gastos. 

O diferencial? Ele usa **Inteligência Artificial (Google Gemini)** para ler notas fiscais automaticamente e um **Chatbot com Personalidade** que pode ser um gerente de banco formal ou um amigo "sincero" que te dá bronca se você gastar demais.

## ✨ Funcionalidades Principais

* **🤖 Leitura Mágica de Recibos**: Tire uma foto da nota fiscal ou envie um PDF. A IA extrai o valor, data, estabelecimento e categoriza automaticamente.
* **🛒 Modo Mercadinho**: Escaneie a nota do supermercado e a IA separa item por item (Arroz, Cerveja, Sabão...), permitindo ver exatamente para onde foi o dinheiro.
* **💬 Consultor Sincero**: Um chat integrado onde você pode perguntar "Gastei muito com Uber esse mês?". Ele analisa seus dados e responde (com sarcasmo opcional).
* **🔒 Login Seguro**: Autenticação via Google (Firebase Auth).
* **📱 PWA Instalável**: Funciona como um app nativo no Android e iOS.
* **📊 Dashboard Visual**: Gráficos de fluxo diário e distribuição de gastos por categoria.
* **📥 Importação em Lote**: Suba a fatura do cartão em PDF e converta em transações editáveis em segundos.

## 🛠️ Tecnologias

* **Frontend**: React 19, TypeScript, Vite.
* **Estilização**: Tailwind CSS, Lucide Icons.
* **Gráficos**: Recharts.
* **IA / Backend-for-Frontend**: Google Gemini 1.5 Flash (via SDK direto).
* **Autenticação**: Firebase Authentication.
* **Deploy**: Vercel.

## 🔧 Como Rodar Localmente

**Pré-requisitos**: Node.js instalado.

1.  **Clone o repositório**
    ```bash
    git clone [https://github.com/seu-usuario/financas-sinceras.git](https://github.com/seu-usuario/financas-sinceras.git)
    cd financas-sinceras
    ```

2.  **Instale as dependências**
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente**
    Crie um arquivo `.env` na raiz com suas chaves:
    ```env
    GEMINI_API_KEY=sua_chave_do_google_ai_studio
    
    VITE_FIREBASE_API_KEY=sua_chave_firebase
    VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=seu_projeto_id
    VITE_FIREBASE_STORAGE_BUCKET=seu_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=seu_id
    VITE_FIREBASE_APP_ID=seu_app_id
    ```

4.  **Rode o projeto**
    ```bash
    npm run dev
    ```

## 📱 Como Instalar no Celular (PWA)

1.  Acesse o site pelo navegador do celular (Chrome no Android ou Safari no iOS).
2.  Toque em "Compartilhar" (iOS) ou no Menu (Android).
3.  Selecione **"Adicionar à Tela de Início"**.
4.  Pronto! O app aparecerá na sua lista de aplicativos.

---

Desenvolvido com 💚 e sinceridade.