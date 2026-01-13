# Natural Mixer

A Progressive Web App (PWA) for multi-track audio mixing during live performances. Browse your song library, download tracks for offline use, and mix individual stems in real-time.

## Features

- **Song Library** - Browse and search songs with filters for musical key and BPM
- **Multi-track Mixer** - Play multiple audio tracks in perfect sync with individual volume controls, mute, and solo
- **Offline Support** - Download songs to your device for offline playback using IndexedDB
- **Installable PWA** - Install on iOS, Android, or desktop for a native app experience
- **Setlist Management** - Create and organize setlists for your performances
- **PDF Resources** - Access chord charts and lyrics alongside your tracks

## Tech Stack

- [Next.js](https://nextjs.org) 16
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Dexie](https://dexie.org) (IndexedDB wrapper for offline storage)
- [Zustand](https://zustand-demo.pmnd.rs) (state management)
- [next-pwa](https://github.com/shadowwalker/next-pwa) (service worker)

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                  # Next.js app router pages
│   ├── library/          # Song library with search and pagination
│   ├── mixer/            # Multi-track audio mixer
│   └── setlist/          # Setlist management
├── components/           # React components
│   ├── library/          # Library-specific components
│   ├── mixer/            # Mixer controls and UI
│   └── ui/               # Shared UI components
└── lib/
    ├── api/              # WordPress API integration
    ├── audio/            # Web Audio API engine
    ├── hooks/            # Custom React hooks
    ├── storage/          # IndexedDB/Dexie storage
    └── types/            # TypeScript type definitions
```
