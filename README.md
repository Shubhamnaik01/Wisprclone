# 🎙️ Tauri Live Speech-to-Text App (Deepgram)

A cross-platform **desktop speech-to-text application** built using **Tauri + React** with a **Rust backend** and **Deepgram WebSocket API** for real-time transcription.

This project demonstrates **live audio capture**, **streaming transcription**, and **frontend–backend communication** using Tauri commands and events.

---

## ✨ Features

- 🎧 Live microphone recording
- 🧠 Real-time speech-to-text using
- ✍️ Interim + final transcript handling
- 📋 Copy transcript to clipboard
- 🖥️ Desktop app powered by Tauri (Rust + WebView)

---

## 🧩 Tech Stack

**Frontend**

- React
- Vite
- Material UI
- Tailwind CSS

**Backend**

- Rust
- Tauri

**Speech API**

- Deepgram Streaming API (Nova model)

---

## 📂 Project Structure

```
root/
├── frontend/              # React frontend
│   └── src/components/
│       ├── Recorder.jsx   # Audio recording & streaming
│       └── Transcript.jsx # Live transcript display
│
├── src-tauri/              # Rust backend
│   ├── src/main.rs        # WebSocket + Deepgram logic
│   └── .env               # API key (not committed)
│
└── README.md
```

---

## 🔐 Environment Setup

Create a `.env` file inside `src-tauri/`:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

---

## 🚀 How to Run the Project

### 1️⃣ Install dependencies

From the project root:

```bash
npm install
```

### 2️⃣ Install frontend dependencies

```bash
cd frontend
npm install
```

### 3️⃣ Run the Tauri application

From the project root:

```bash
cargo tauri dev
```

This will:

- Start the React frontend
- Launch the Tauri desktop window

---

## 🎙️ How It Works

1. User clicks the **mic button**
2. Browser captures microphone audio
3. Audio is converted to **16-bit PCM (48kHz)**
4. Chunks are streamed to Rust via Tauri `invoke`
5. Rust forwards audio to **Deepgram WebSocket**
6. Transcription results are emitted back to React
7. UI displays **final** and **interim** text separately

---

## 🧠 Key Design Decisions

- **`useRef` instead of globals** for recorder lifecycle stability
- **WebSocket streaming** for low-latency transcription
- **Event-based communication** from Rust → React
- Clean separation of **interim vs final** transcripts

---

## ⚠️ Known Limitations

- Interim transcript finalization
  In rare cases, the last few spoken words may remain as interim results if recording is stopped abruptly. This is a known  
  behavior in real-time streaming transcription systems and depends on silence detection and stream closure timing.
- Latency dependency
  Transcription latency may vary based on network conditions, microphone quality, and system performance.
- Accuracy varies with environment
  Background noise, accents, or unclear speech may reduce transcription accuracy, as expected with live speech recognition.
- Single-language focus
  The application is currently optimized for English speech only.

---
