# 🗳️ Grinza — Community-Powered Voting for NFTs

Grinza is a decentralized application (dApp) on **Solana** that lets users upvote or downvote NFTs — giving the community a voice in what's valuable, trending, or underrated. Think of it as **Reddit-style voting meets Web3 NFTs**.

> 📈 Reputation-driven NFTs.  
> 🗳️ Immutable on-chain voting.  
> 🧠 Built with Anchor, React, and the Solana stack.

---

## ✨ Features

- ✅ Upvote or downvote NFTs you love or dislike
- ✅ Votes are stored **on-chain** using Solana and Anchor
- ✅ Each NFT has a visible score and vote history
- ✅ Real-time frontend built with **Next.js + Tailwind**
- ✅ Optional vote-to-value logic (future roadmap)

---

## 🚀 Demo

[🌐 Live Demo (if hosted)](https://grinza.vercel.app)  
📹 Coming soon: GIF walkthrough

---

## 🔧 Stack

| Tech         | Description                         |
|--------------|-------------------------------------|
| **Solana**   | Blockchain layer for on-chain votes |
| **Anchor**   | Smart contract framework            |
| **React**    | Frontend UI                         |
| **Next.js**  | SSR & API routes                    |
| **Tailwind** | Styling                             |
| **Shadcn/UI**| Components                          |
| **TypeScript** | Type-safe dev environment        |

---

## 📦 Local Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/grinza.git
cd grinza
cd web

# Install dependencies
npm install

# Start frontend
npm run dev

# Start Anchor local validator (separate terminal)
cd programs
anchor build
anchor test
