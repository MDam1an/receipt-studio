# Receipt Studio

Gerador e gerenciador de recibos profissional — visual light clean, Firebase, exportação PDF/PNG/JSON.

---

## ⚡ Setup rápido

### 1. Configure o Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto (ou use um existente)
3. Vá em **Autenticação** → Ativar **E-mail/senha**
4. Vá em **Firestore Database** → Criar banco (modo de produção ou teste)
5. Vá em **Configurações do projeto** → **Seus apps** → Adicione um app Web
6. Copie o `firebaseConfig` gerado

### 2. Cole as credenciais

Abra `js/services/firebase.js` e substitua:

```js
const firebaseConfig = {
  apiKey:            "SUA_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO_ID",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId:             "SEU_APP_ID",
};
```

### 3. Regras do Firestore

No console Firebase → Firestore → Regras, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Sirva o projeto via HTTP

Por usar ES Modules, o app precisa de um servidor local:

**VS Code:** extensão _Live Server_ → botão direito no `index.html` → Open with Live Server

**Terminal:**
```bash
npx serve .
# ou
python -m http.server 8080
```

---

## Funcionalidades

- Login/cadastro via Firebase Auth
- Criação e edição completa de recibos
- Upload de logo da marca (PNG, JPG, SVG)
- Auto-preenchimento via CEP (ViaCEP)
- Pré-visualização em tempo real
- Exportação em **PDF**, **PNG** e **JSON**
- Gestão de marcas reutilizáveis
- Dashboard com estatísticas
- Filtro por marca, status e busca livre
- Persistência na nuvem via Firestore

---

## Estrutura

```
receipt-studio/
├── index.html
├── css/
│   ├── base.css           ← design tokens, reset
│   ├── layout.css         ← shell, sidebar, topbar, views
│   ├── components.css     ← botões, forms, tabela, modal
│   └── receipt-doc.css    ← estilo do documento recibo
├── js/
│   ├── main.js            ← controller principal
│   ├── services/
│   │   └── firebase.js    ← Auth + Firestore
│   ├── components/
│   │   ├── receipt-renderer.js
│   │   └── exporter.js
│   └── utils/
│       └── helpers.js
└── README.md
```

---

## Stack

- HTML5 + CSS3 + JavaScript ES Modules (zero dependências de build)
- Firebase Auth + Firestore
- jsPDF + html2canvas (via CDN)
- ViaCEP para auto-fill de endereço
