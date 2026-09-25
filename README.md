# YouTube Tutor (LumoTutor AI) 🎓✨

> **Next-Generation Interactive Video Lecture AI Tutor & Spatial Whiteboard Canvas**
> Pause any YouTube STEM lecture at any second, and your AI tutor explains the exact on-screen blackboard chalk notes, equations, diagrams, and worked examples visible at that exact moment.

---

## 🌟 Overview

**YouTube Tutor (LumoTutor AI)** transforms passive video lectures into an active, collaborative 1-on-1 tutoring experience. Built directly into a synchronized video player and infinite spatial whiteboard, it acts as a world-class MIT/Stanford teaching assistant sitting right beside you.

When you pause a lecture at timestamp $T$, the platform analyzes the live blackboard state, formulas, and spoken context to answer your questions with zero conceptual drift or textbook hallucination.

```
+----------------------------------------------------------------------------------------------------+
|                                    YOUTUBE TUTOR SYSTEM ARCHITECTURE                               |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [Any YouTube URL]                                                                                 |
|         |                                                                                          |
|         v                                                                                          |
|  [Video Ingestion & Scraper] ---------------------------------------------+                        |
|  • Native creator macro-markers (`ytInitialData`)                         |                        |
|  • Timestamped syllabus & description parser                              |                        |
|  • Persistent cache (`.cache/video_meta_<id>.json`)                       |                        |
|         |                                                                 |                        |
|         v                                                                 v                        |
|  [Interactive Video Player]                                   [Infinite Spatial Canvas]            |
|  • YouTube IFrame API Synchronization                         • Freehand pen & sketch tools        |
|  • Second-by-second timestamp tracking                        • Visual blackboard OCR bounding box |
|  • Auto-pause on typing / drawing                             • Drag-and-drop AI solution cards    |
|  • Dockable & Floating PiP modes                              • Procedural SVG math models         |
|         |                                                                 ^                        |
|         +-----------------------+-----------------------------------------+                        |
|                                 |                                                                  |
|                                 v                                                                  |
|                  [Multi-Tier AI Pedagogical Engine]                                                |
|                  +----------------------------------------------+                                  |
|                  | Tier 1: Gemini 3.8 Flash (Blackboard Vision) |                                  |
|                  | Tier 2: Groq Cloud (Sub-second Qwen Fast Path) |                                  |
|                  | Tier 3: OpenRouter Qwen 2.5 72B & Nemotron   |                                  |
|                  +----------------------------------------------+                                  |
|                                 |                                                                  |
|                                 v                                                                  |
|                  [Structured Pedagogical Output]                                                   |
|                  • Crisp Markdown with KaTeX LaTeX math ($...$, $$...$$)                           |
|                  • Adaptive Answer Depth: Quick / Medium / Detailed                                |
|                  • Gated Visual SVG Diagrams & Whiteboard Nodes                                    |
|                  • Interactive Socratic Comprehension Quizzes                                      |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 🚀 Key Features

### 1. Second-by-Second Blackboard & Scene Grounding
- **Zero Hallucination**: When paused at 2:25 looking at a parabola $y = x^2$ or a 28x28 neural network grid, the AI explains the exact shapes, numbers, variables, and chalkboard notes visible right then—never generic or disconnected textbook definitions.
- **Micro-Chapter Synthesis**: Automatic decomposition of lectures into fine-grained chapter segments with full LaTeX blackboard representations and surrounding dialogue context ($[-90\text{s}, +30\text{s}]$).

### 2. Universal YouTube URL Support
- Works with **ANY YouTube URL** entered into the top navigation bar.
- Automatically extracts creator-defined chapter markers, descriptions, and video metadata.
- Pre-indexed high-precision curated library for flagship STEM courses (3Blue1Brown Calculus & Neural Networks, MIT Linear Algebra, Khan Academy Physics, MIT Chemistry).

### 3. Infinite Spatial Whiteboard Canvas
- **Collaborative Whiteboard**: Draw diagrams, write out intermediate steps, and circle problem areas directly on the canvas.
- **Multimodal Visual Feedback**: Submit your whiteboard sketches to the AI tutor to check your work, identify algebraic missteps, and get immediate visual corrections.
- **Dynamic AI Cards**: Every tutor reply automatically instantiates as an interactive, draggable note card with key formula takeaways.

### 4. Flawless Math & LaTeX Rendering
- Integrated with **KaTeX** for instant, crystal-clear typography.
- Renders inline math ($f'(x) = 2x$) and multi-line display equations with zero raw escaping bugs.
- Built-in LaTeX sanitizer prevents backslash escaping syntax errors across all LLM providers.

### 5. Configurable Answer Depth Modes
- ⚡ **Quick**: Concise 2-3 sentence intuitive explanation focusing on the core takeaway and essential formula.
- ⚖️ **Medium**: Balanced explanation highlighting geometric/physical intuition, key derivation steps, and direct connection to the blackboard.
- 🔬 **Detailed**: Rigorous university-level step-by-step mathematical proof with underlying theorems and edge cases.

### 6. Strict Visual Diagram Gating
- Procedural SVG diagrams appear **only** when a concept fundamentally requires geometric, spatial, graphical, or physical models (e.g. force vectors, curve slicing, molecular geometry).
- Conceptual, algebraic, and definition questions remain clean without unwanted diagram popups.

### 7. 100% Reload & Reboot Session Persistence
- Automatically persists your active video, exact playback timestamp in seconds, entire conversation thread, answer depth preferences, recent video dock (last 5 videos), and canvas state in browser `localStorage`.
- Restoring your browser session or restarting your machine returns you exactly where you stopped.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime & Server** | [Bun](https://bun.com) + Express + TypeScript |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Styling & UI** | Tailwind CSS + Lucide Icons + Canvas API |
| **Math Typesetting** | [KaTeX](https://katex.org/) (High-performance LaTeX renderer) |
| **Video Engine** | YouTube IFrame API + Native Scraping & Caching |
| **LLM Inference** | Gemini 3.8 Flash, Groq Cloud (Qwen 3.8/27B), OpenRouter (Qwen 2.5 72B) |

---

## 📂 Project Structure

```
.
├── server/
│   ├── index.ts                # Express backend & API endpoints
│   ├── tutorService.ts         # Multi-tier LLM tutor orchestration & prompt engine
│   ├── youtubeService.ts       # YouTube scraping, macro-markers & chapter synthesis
│   ├── blackboardService.ts    # Blackboard vision OCR & context analysis
│   └── curatedLibrary.ts       # Pre-curated STEM library ground truth
├── src/
│   ├── App.tsx                 # Main application controller & state orchestrator
│   ├── components/
│   │   ├── VideoPlayer.tsx     # Synced YouTube player (dockable, PiP, controls)
│   │   ├── TutorChat.tsx       # AI Tutor chat panel with KaTeX & quizzes
│   │   ├── WhiteboardCanvas.tsx# Infinite spatial drawing canvas & node graph
│   │   ├── BlackboardInspector.tsx # Blackboard OCR inspection tool
│   │   └── Navbar.tsx          # Top bar with URL loader, answer depth & recent videos
│   ├── utils/
│   │   └── katexRenderer.tsx   # Robust LaTeX math parser & renderer
│   └── types/
│       └── tutor.ts            # TypeScript interfaces & domain models
├── public/                     # Static assets & captured blackboard frames
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🚦 Quick Start Guide

### Prerequisites
- [Bun](https://bun.com) v1.1+ (or Node.js v20+)

### 1. Clone the Repository
```bash
git clone https://github.com/cyberpunk-71/Youtube-tutor.git
cd Youtube-tutor
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Environment Variables (Optional)
Create a `.env` file in the root directory if you wish to use custom API keys:
```env
PORT=3456
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```
*(Note: Built-in high-speed fallback endpoints are configured out of the box).*

### 4. Build and Run
```bash
# Build frontend bundle
bun run build

# Start production server
bun run server/index.ts
```

Open your browser at `http://localhost:3456` to start learning!

---

## 📖 Usage Guide

1. **Load Any Lecture**:
   - Pick from the curated STEM library (Calculus, Linear Algebra, Physics, Chemistry, Deep Learning), or paste any YouTube URL into the top search bar.
2. **Watch & Pause**:
   - Play the lecture. Whenever a concept is confusing or an equation appears on the blackboard, click **Pause** (or start typing in chat—the video auto-pauses for you).
3. **Ask Your Tutor**:
   - Select your desired **Answer Depth** (`Quick`, `Medium`, `Detailed`) from the top dropdown.
   - Ask a question in chat or sketch directly on the whiteboard canvas.
4. **Interact with Solutions**:
   - View step-by-step LaTeX derivations and visual SVG models.
   - Test your comprehension with interactive multiple-choice quiz questions.
   - Move or resize AI solution cards on the spatial canvas.

---

## 📄 License

MIT License. Designed with ❤️ for curious minds and lifelong learners.
