# 🤖 GroqChat — Setup Guide

A ChatGPT-like AI chatbot powered by **Groq AI** with blazing-fast inference, image analysis, streaming responses, and PWA support.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🚀 Fast Streaming | Real-time token streaming via Groq API |
| 👁️ Image Analysis | Upload & analyze images (Vision models) |
| 🤖 Multi-Model | 6 Groq models including Llama 4 Scout/Maverick |
| 📱 PWA | Install on phone/desktop like a native app |
| 💾 Local History | Conversations saved in localStorage |
| 🎤 Voice Input | Microphone button for voice-to-text |
| 🔊 Text-to-Speech | Read responses aloud |
| 📋 Code Highlighting | Syntax-highlighted code blocks with copy |
| ⚙️ Settings | Model picker, temperature, system prompt |
| 🌗 Responsive | Works on mobile, tablet, desktop |

---

## 🛠️ Setup

### 1. Get a Groq API Key (FREE)
- Go to: https://console.groq.com
- Sign up and create an API key
- Copy it

### 2. Set up environment variables
```bash
cp .env.local .env.local
```
Edit `.env.local` and replace `gsk_your_groq_api_key_here` with your actual key.

### 3. Install dependencies
```bash
npm install
```

### 4. Run the development server
```bash
npm run dev
```

Open http://localhost:3000

### 5. Build for production
```bash
npm run build
npm start
```

---

## 🤖 Available Models

| Model | Vision | Speed | Context |
|---|---|---|---|
| Llama 4 Scout | ✅ | Fast | 128K |
| Llama 4 Maverick | ✅ | Fast | 128K |
| Llama 3.3 70B | ❌ | Medium | 128K |
| Llama 3.1 8B | ❌ | Fastest | 128K |
| Gemma 2 9B | ❌ | Fast | 8K |
| Mixtral 8x7B | ❌ | Medium | 32K |

---

## 📱 PWA Installation

**iOS (Safari):** Share → Add to Home Screen  
**Android (Chrome):** ⋮ Menu → Add to Home Screen  
**Desktop (Chrome):** Address bar install icon  

---

## 🏗️ Project Structure

```
groq-chatbot/
├── app/
│   ├── api/chat/route.ts     # Groq streaming API route
│   ├── layout.tsx            # Root layout with PWA meta
│   ├── page.tsx              # Main chat application
│   └── globals.css           # Tailwind + custom styles
├── components/
│   ├── Sidebar.tsx           # Conversation history sidebar
│   ├── MessageBubble.tsx     # Chat message with markdown
│   ├── ChatInput.tsx         # Input with image upload
│   ├── SettingsModal.tsx     # Settings panel
│   └── WelcomeScreen.tsx     # Empty state / suggestions
├── lib/
│   └── utils.ts              # Utilities, model list, helpers
├── types/
│   └── index.ts              # TypeScript interfaces
├── public/
│   └── manifest.json         # PWA manifest
└── .env.local                # API keys (never commit!)
```

---

## 🔒 Security Notes

- API key is stored server-side in `.env.local` only
- Never expose `GROQ_API_KEY` in frontend code
- Add rate limiting before deploying publicly
- Add `.env.local` to `.gitignore`

---

## 🚀 Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add `GROQ_API_KEY` in Vercel project settings → Environment Variables.
