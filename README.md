# 🚀 NextStep – AI Career & Interview Copilot

**NextStep** is an AI-powered career and interview assistant that unifies all essential career tools — resume analysis, job discovery, skill growth, interview practice, and learning roadmaps — into one intelligent platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-yellow.svg)](https://python.org/)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [AI Models](#-ai-models)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🧩 Overview

NextStep helps users take the *next step* in their career by using advanced AI agents for:

- **Resume parsing and improvement** with ATS scoring
- **Career roadmap generation** personalized to goals
- **Skill-based quizzes** with performance tracking
- **AI-powered interview simulation** with real-time analysis
- **Context-aware chatbot assistance** using RAG
- **Job search integration** with LinkedIn, Google Jobs, and Naukri
- **LaTeX-to-PDF resume generation**
- **Browser extension** for knowledge capture and retrieval

Whether you're a student, professional, or job seeker, **NextStep** gives you personalized insights, learning paths, and tools to advance your career efficiently.

---

## ✨ Key Features

### 🧾 1. Resume Upload & Analysis
- Upload existing resume (PDF/DOCX)
- AI extracts and parses information automatically
- Generates **ATS Score** (Applicant Tracking System compatibility)
- Suggests improvements in structure, keywords, and alignment
- Skills extraction and classification
- Optional manual skill input if no resume available

**Tech:** `mammoth.js`, `unpdf`, OpenRouter LLM

---

### 🧭 2. Career Roadmap Generation
- Personalized career roadmap based on resume and goals
- Lists essential **skills, certifications, and projects** for target role
- Works for *any* profession (not just tech)
- Progress tracking through interactive dashboard
- Caching system to avoid regeneration
- Force regeneration option available

**Tech:** OpenRouter (Llama 3.3 70B), MongoDB caching, Upstash Redis rate limiting

---

### 💼 3. Multi-Source Job Search
Integrated APIs to search and fetch jobs from multiple platforms:

| Platform | API Used | Features |
|----------|----------|----------|
| **LinkedIn** | Web scraping | Title, company, location, direct URL |
| **Google Jobs** | SerpAPI | Rich job data with descriptions |
| **Naukri** | Apify scraper | India-specific jobs with salary info |

- Display jobs directly inside NextStep
- **Bookmark** jobs and align with resume
- Jobs used for personalized roadmap generation

---

### 🧠 4. Skill-Based Quizzes
- **AI-generated quizzes** on chosen topics/domains
- Multiple question types (MCQ, true/false, short answer)
- Real-time scoring and feedback
- Performance tracking over time
- Visual analytics on dashboard
- Identifies strengths and knowledge gaps

**Tech:** OpenRouter LLM for question generation, MongoDB for score storage

---

### 🗂️ 5. Interactive Analytics Dashboard
Comprehensive view of career progress:

- **ATS Score** with improvement suggestions
- **Quiz Performance** with trend analysis
- **Roadmap Progress** tracking
- **Bookmarked Jobs** management
- **Interview History** with scores
- Visual charts powered by Recharts
- Real-time updates

**Tech:** Recharts, Next.js, Tailwind CSS, MongoDB aggregations

---

### 🗣️ 6. AI Interview Simulator

#### Advanced Real-Time Analysis System

**Multi-Modal Evaluation:**
1. **Content Analysis** (50% weight)
   - Response relevance to question
   - Technical accuracy
   - Completeness of answer
   - Communication clarity

2. **Voice Tone Analysis** (25% weight)
   - Sentiment analysis using **VADER**
   - Emotion detection using **RoBERTa**
   - Confidence level in speech
   - Pitch and tone consistency

3. **Body Language Analysis** (25% weight)
   - Facial expression recognition using **CNN model**
   - Confidence detection (YOLOv8-based preprocessing)
   - Real-time webcam analysis
   - Posture and engagement metrics

**Interview Flow:**
- AI generates **context-aware questions** based on user history
- Real-time **speech-to-text** transcription (Deepgram)
- **Text-to-speech** for AI interviewer (ElevenLabs)
- Parallel analysis of all three components
- Composite scoring with detailed breakdown
- Final report with actionable feedback

**Memory System:**
- Stores performance insights in **Qdrant** vector database
- Tracks strengths and weaknesses over time
- Future questions adapt based on past performance
- Personalized improvement recommendations

**Tech Stack:**
- **Backend:** Express.js (Node.js), Flask (Python 3.9+)
- **AI Services:** Deepgram Nova-2 (STT), ElevenLabs Aura-2 (TTS), OpenRouter (GPT-4o/Llama 3.3)
- **ML Models:** 
  - Custom CNN (TensorFlow 2.15, Keras)
  - YOLOv8s-cls (Ultralytics) for preprocessing
  - RoBERTa (Transformers 4.36+, Cardiff NLP)
  - VADER (NLTK 3.8+)
- **Computer Vision:** OpenCV 4.x, NumPy 1.24+, Albumentations
- **Database:** PostgreSQL (Prisma ORM 5.x), Qdrant 1.x (768-dim vectors)
- **Real-time:** WebSockets, HTTP Streaming (multipart/x-mixed-replace)
- **Audio Processing:** Librosa 0.10+, SciPy 1.11+
- **Preprocessing:** CLAHE, Bilateral Filter, Image Augmentation

---

### 🧩 7. Browser Extension

**Smart Text Saver:**
- Save selected text from any webpage
- Stores extracted content + source URL
- Built-in **RAG-powered chatbot** in extension
- Query previously saved snippets with context
- Cross-reference multiple saved sources
- Export saved knowledge base

**Tech:** Manifest V3, Gemini AI for chatbot, Express backend for storage

---

### 💬 8. AI Career Copilot Chatbot

**Context-Aware Assistant** with access to:
- Your career goals
- Resume data and ATS feedback
- Saved notes from browser extension
- Quiz performance history
- Roadmap progress
- Interview feedback

**Capabilities:**
- Resume improvement suggestions
- Career guidance and mentorship
- Learning resource recommendations
- Job application strategies
- Interview preparation tips
- Retrieval from saved snippets

**Tech:** Gemini AI, RAG architecture, MongoDB context retrieval

---

### 📄 9. LaTeX to PDF Resume Generator

**Professional Resume Creation:**
- Input personal details, skills, achievements
- AI-powered **LaTeX generation** (Llama 3.3)
- Multiple template styles
- Automatic formatting and structure
- One-click **PDF conversion**
- Download instantly
- Fallback templates for reliability

**Validation System:**
- Syntax checking
- Balanced braces verification
- Markdown removal
- Structure validation

**Tech:** LaTeX compiler, Llama 3.3 70B for generation, Node.js PDF engine

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│  (React, Tailwind CSS, Three.js, Recharts)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
┌─────▼─────────┐    ┌───────▼────────────┐
│  Express.js   │    │  Flask Analysis    │
│  Backend      │    │  Server (Python)   │
│  (Node.js)    │    │  Port 5001         │
└─────┬─────────┘    └───────┬────────────┘
      │                      │
      │    ┌─────────────────┴──────┐
      │    │                        │
┌─────▼────▼───┐  ┌────────────┐  ┌▼──────────────┐
│ PostgreSQL   │  │  MongoDB   │  │  Qdrant       │
│ (Supabase)   │  │            │  │  Vector DB    │
└──────────────┘  └────────────┘  └───────────────┘
      │                 │                │
      └─────────────────┴────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
    ┌───────▼──────┐  ┌──────▼───────┐
    │  Redis       │  │  External    │
    │  (Upstash)   │  │  APIs        │
    └──────────────┘  └──────────────┘
```

---

## 🧰 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **React 18** | UI components and state management |
| **Tailwind CSS** | Utility-first styling |
| **Three.js** | 3D background animations |
| **Recharts** | Data visualization |
| **React Three Fiber** | 3D React components |
| **Lucide React** | Icon library |

### Backend (Node.js)
| Technology | Purpose |
|------------|---------|
| **Express.js** | REST API server |
| **Prisma ORM** | PostgreSQL database interface |
| **Supabase SDK** | Authentication & PostgreSQL |
| **MongoDB Driver** | Document database operations |
| **Qdrant Client** | Vector similarity search |
| **Redis (Upstash)** | Caching & rate limiting |

### Backend (Python)
| Technology | Purpose |
|------------|---------|
| **Flask** | Analysis server |
| **TensorFlow** | CNN model inference |
| **OpenCV** | Video processing |
| **Transformers** | RoBERTa model |
| **NLTK** | VADER sentiment analysis |
| **Librosa** | Audio feature extraction |
| **Flask-CORS** | Cross-origin support |

### AI & NLP Services
| Service | Purpose | Model/API |
|---------|---------|-----------|
| **OpenRouter** | LLM Gateway | GPT-4, Llama 3.3 70B |
| **Deepgram** | Speech-to-Text | Nova-2 model |
| **ElevenLabs** | Text-to-Speech | Multilingual v2 |
| **Google Gemini** | Extension chatbot | Gemini 2.0 Flash |
| **Custom CNN** | Body language | TensorFlow model |
| **RoBERTa** | Sentiment analysis | Cardiff NLP |

### Databases
| Database | Purpose | Schema |
|----------|---------|--------|
| **PostgreSQL** | Relational data | Users, Interviews, Questions, Transcripts, Reports, Memory |
| **MongoDB** | Document store | Profiles, Goals, Bookmarks, Scores, SavedTexts |
| **Qdrant** | Vector embeddings | Interview memories, semantic search |
| **Redis** | Cache & rate limiting | Session data, API limits |

### External APIs
| API | Purpose |
|-----|---------|
| **SerpAPI** | Google Jobs search |
| **Apify** | Naukri job scraping |
| **LinkedIn** | Job listings (web scraping) |
| **OpenRouter** | LLM completions |

### Browser Extension
| Technology | Purpose |
|------------|---------|
| **Manifest V3** | Chrome extension API |
| **JavaScript** | Content scripts |
| **Gemini API** | Extension chatbot |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+ with pip
- **PostgreSQL** (via Supabase)
- **MongoDB** instance
- **Qdrant** server (local or cloud)
- **Redis** instance (Upstash recommended)

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/yourusername/nextstep.git
cd nextstep
```

#### 2. Install Frontend Dependencies
```bash
npm install
```

#### 3. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 4. Install Python Dependencies
```bash
cd flask-analysis
pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"
```

#### 5. Setup Databases

**PostgreSQL (Supabase):**
```bash
cd backend
npx prisma generate
npx prisma db push
```

**Qdrant:**
```bash
# Docker
docker run -p 6333:6333 qdrant/qdrant

# Or install locally
# https://qdrant.tech/documentation/quick-start/
```

**MongoDB:**
- Create database: `AI_Interview`
- Collections will be created automatically

#### 6. Environment Variables

Create `.env` files in respective directories:

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Backend (`backend/.env`):**
```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"
MONGODB_URI="mongodb://localhost:27017/AI_Interview"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional_api_key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# AI Services
OPENROUTER_API_KEY=your_openrouter_key
DEEPGRAM_API_KEY=your_deepgram_key
ELEVENLABS_API_KEY=your_elevenlabs_key
GEMINI_API_KEY=your_gemini_key

# Job APIs
SERPAPI_KEY=your_serpapi_key
APIFY_TOKEN=your_apify_token

# Flask Analysis
FLASK_ANALYSIS_URL=http://127.0.0.1:5001
```

**Flask Analysis (`flask-analysis/.env`):**
```env
FLASK_ENV=development
MODEL_PATH=./best_model.h5
```

#### 7. Download ML Models

**Body Language CNN Model:**
```bash
# Place your trained model in flask-analysis/
cd flask-analysis
wget https://your-model-url/best_model.h5
# Or train using the provided notebook
```

**RoBERTa Model:**
```bash
# Auto-downloads on first run via Transformers library
```

#### 8. Start Services

**Terminal 1 - Next.js Frontend:**
```bash
npm run dev
# http://localhost:3000
```

**Terminal 2 - Express Backend:**
```bash
cd backend
npm run dev
# http://localhost:3001
```

**Terminal 3 - Flask Analysis:**
```bash
cd flask-analysis
python app.py
# http://127.0.0.1:5001
```

**Terminal 4 - Qdrant (if local):**
```bash
./qdrant
# http://localhost:6333
```

---

## 📡 API Documentation

### Interview Endpoints

#### `POST /interviews`
Create new interview session
```json
{
  "role": "Software Engineer",
  "skills": ["JavaScript", "React", "Node.js"],
  "userName": "John Doe",
  "userId": "user_123"
}
```

#### `GET /interviews/:id`
Get interview details and questions

#### `POST /interviews/:id/answer`
Submit answer with audio
```json
{
  "questionId": "q_123",
  "audioBase64": "base64_encoded_audio"
}
```

#### `GET /interviews/:id/report`
Get final interview report with scores

### Flask Analysis Endpoints

#### `POST /api/session/start`
Start analysis session
```json
{
  "sessionId": "interview_123"
}
```

#### `POST /api/analyze/transcript`
Analyze voice tone
```json
{
  "sessionId": "interview_123",
  "transcript": "My answer text",
  "questionId": "q_123"
}
```

#### `GET /api/session/status?sessionId=interview_123`
Get real-time analysis results

### User Endpoints

#### `POST /api/user/processing`
Process resume and goals

#### `POST /api/user/ats-check`
Check ATS compatibility

#### `GET /api/user/profile`
Get complete user profile

#### `POST /api/roadmap`
Generate career roadmap

### Job Search Endpoints

#### `GET /api/jobs/linkedin?title=Engineer&location=USA`
Search LinkedIn jobs

#### `GET /api/jobs/naukri?query=developer&location=Bangalore`
Search Naukri jobs

#### `GET /api/serpapi?title=Manager&location=NYC`
Search Google Jobs

---

## 🤖 AI Models & Training Pipeline

### 1. Body Language CNN Model

**Architecture:** Custom Convolutional Neural Network with YOLOv8 preprocessing

**Complete Training Pipeline:**

#### Phase 1: Dataset Preparation
```
Dataset Structure:
├── train/
│   ├── confident/ (1,000+ images)
│   └── unconfident/ (2,500+ images)
└── test/
    ├── confident/ (200+ images)
    └── unconfident/ (500+ images)

Class Imbalance Ratio: 2.5:1 (unconfident:confident)
```

#### Phase 2: Preprocessing Pipeline
**Technologies:** OpenCV 4.x, NumPy, Albumentations

1. **Image Resizing & Padding**
   - Target size: 224x224 pixels
   - Preserve aspect ratio with letterboxing
   - Black padding for square format

2. **CLAHE (Contrast Limited Adaptive Histogram Equalization)**
   ```python
   clipLimit=2.0, tileGridSize=(8,8)
   Applied per channel in LAB color space
   ```
   - Enhances local contrast
   - Improves facial feature visibility
   - Better performance in varied lighting

3. **Noise Reduction**
   ```python
   Bilateral Filter: d=5, sigmaColor=50, sigmaSpace=50
   ```
   - Preserves edges while smoothing noise
   - Reduces sensor artifacts

4. **Image Sharpening**
   ```python
   Kernel: [[-1,-1,-1], [-1,9,-1], [-1,-1,-1]]
   ```
   - Enhances facial features
   - Improves edge detection

#### Phase 3: Handling Class Imbalance
**Technologies:** Albumentations, OpenCV

**Augmentation Pipeline for Minority Class (Confident):**
- HorizontalFlip (p=0.5)
- RandomBrightnessContrast (±20%, p=0.5)
- Rotate (±15°, p=0.4)
- GaussNoise (var=10-30, p=0.3)
- RandomScale (±10%, p=0.3)
- ColorJitter (p=0.3)
- Sharpen (p=0.2)

**Result:** Balanced dataset at 0.85:1 ratio (confident:unconfident)

#### Phase 4: Model Training
**Framework:** Ultralytics YOLOv8s-cls

**Training Configuration:**
```yaml
Model: YOLOv8s-cls (small variant)
Input Size: 224x224x3
Epochs: 100 (early stopping at patience=15)
Batch Size: 16
Optimizer: AdamW
Learning Rate: 0.001 → 0.00001 (cosine decay)
Weight Decay: 0.0005
Warmup: 3 epochs (momentum 0.8 → 0.937)

Loss Weights:
- Classification Loss: 1.5x (for imbalance)
- Regularization: L2 weight decay

Data Augmentation (Online):
- HSV jitter: h=0.015, s=0.7, v=0.4
- Rotation: ±15°
- Translation: ±10%
- Scale: ±20%
- Horizontal Flip: 50%
- Mixup: 0.1
```

**Hardware:** NVIDIA GPU (CUDA-enabled)

#### Phase 5: Model Evaluation

**Metrics (Test Set):**
```
Top-1 Accuracy: 87.3%
Weighted Precision: 0.8542
Weighted Recall: 0.8730
Weighted F1 Score: 0.8634

Per-Class Performance:
- Confident: Precision=0.89, Recall=0.82, F1=0.85
- Unconfident: Precision=0.84, Recall=0.91, F1=0.87

Inference Speed: 30 FPS (real-time capable)
Model Size: 22.5 MB (.h5 format)
```

**Validation Techniques:**
- 80/20 train/val split from test set
- Confusion matrix analysis
- Per-class accuracy tracking
- Confidence score calibration

#### Phase 6: Deployment
**Format:** TensorFlow/Keras .h5 file
**Runtime:** Flask server (Python 3.9+)
**Inference:** Real-time video frame analysis (96x96 downscaled)

**Export Options:**
- ONNX format (cross-platform)
- TensorFlow Lite (mobile deployment)

---

### 2. Voice Sentiment Analysis Pipeline

**Dual-Model Approach:**

#### Model A: VADER (Valence Aware Dictionary)
**Library:** NLTK 3.8+
**Type:** Lexicon-based sentiment analysis

**Process:**
1. Text input (from Deepgram transcription)
2. Tokenization and normalization
3. Lookup in sentiment lexicon
4. Compound score: -1 (negative) to +1 (positive)
5. Convert to 0-100 scale: `(compound + 1) * 50`

**Strengths:**
- Fast inference (< 1ms)
- Works well with conversational text
- No training required

#### Model B: RoBERTa (Cardiff NLP)
**Model:** `cardiffnlp/twitter-roberta-base-sentiment`
**Framework:** Transformers 4.36+ (Hugging Face)

**Architecture:**
- Base: RoBERTa (125M parameters)
- Fine-tuned on 58M Twitter posts
- 3-class output: negative, neutral, positive

**Process:**
1. Tokenization (max length: 512)
2. Forward pass through RoBERTa
3. Softmax activation
4. Extract positive probability
5. Convert to 0-100 scale: `positive_prob * 100`

**Performance:**
- Inference: ~50ms per transcript
- Accuracy: 87% on social media text

#### Combined Score
```python
final_voice_score = (vader_score + roberta_score) / 2
```

**Rationale:**
- VADER: Captures explicit sentiment words
- RoBERTa: Understands context and sarcasm
- Ensemble improves robustness

---

### 3. LLM for Content Evaluation

**Primary Model:** GPT-4o or Llama 3.3 70B Instruct
**Gateway:** OpenRouter API

**Evaluation Prompt Template:**
```
Evaluate the candidate's answer to this question: "{question}"

Transcript: "{transcript}"

Provide a comprehensive evaluation focusing on:
1. Content quality and relevance (0-100)
2. Technical accuracy (if applicable)
3. Communication clarity
4. Completeness of answer

Return ONLY valid JSON:
{
  "score": 0-100,
  "notes": "detailed feedback",
  "strengths": "what was done well",
  "improvements": "areas to improve"
}
```

**Model Selection Logic:**
- **GPT-4o:** Complex technical questions, nuanced evaluation
- **Llama 3.3 70B:** Cost-effective, faster responses

**Response Processing:**
1. Clean markdown artifacts (```json tags)
2. Parse JSON
3. Validate score range (0-100)
4. Extract structured feedback

---

### 4. Question Generation with Context

**Model:** GPT-4o or Llama 3.3 70B
**Method:** Few-shot prompting with RAG

**Context Sources:**
1. **User Aggregate** (PostgreSQL)
   - Average scores
   - Known strengths/weaknesses
   - Last interview date

2. **User Memory** (PostgreSQL + Qdrant)
   - Recent weak performance areas
   - Topics needing practice
   - Historical patterns

3. **Vector Search** (Qdrant)
   - Semantic similarity to target skills
   - Retrieve top-5 relevant memories
   - 768-dimensional embeddings

**Prompt Engineering:**
```
CONTEXT:
{user_performance_history}
{weaknesses_from_memory}
{similar_past_interviews}

Generate 3-5 interview questions for a {role} with skills: {skills}

IMPORTANT:
- Focus 60% on weakness areas
- Focus 30% on untested skills
- Focus 10% on strengths (confidence building)

Return ONLY valid JSON array of strings.
```

**Adaptive Difficulty:**
- Low performers: Foundational questions
- High performers: Advanced scenarios
- Consistent: Challenge edge cases

---

### 5. Embedding Generation

**Model:** `google/gemini-1.5-embedding` (via OpenRouter)
**Dimensions:** 768
**Use Cases:**
- Store interview summaries
- Semantic search for context
- User performance clustering

**Process:**
```python
1. Input: Interview report excerpt (max 500 chars)
2. API call to OpenRouter embeddings endpoint
3. Receive 768-dim vector
4. Store in Qdrant with metadata
5. Index for cosine similarity search
```

**Metadata Stored:**
```json
{
  "userId": "user_123",
  "type": "weakness|strength|interview_summary",
  "topic": "system_design",
  "score": 65.4,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

### Model Performance Summary

| Model | Task | Accuracy/F1 | Latency | Size |
|-------|------|-------------|---------|------|
| **Custom CNN** | Body language | F1=0.86 | 33ms | 22.5 MB |
| **YOLOv8s-cls** | Preprocessing | N/A | 15ms | Pre-trained |
| **VADER** | Sentiment | 82% | <1ms | Lexicon |
| **RoBERTa** | Sentiment | 87% | 50ms | 125M params |
| **GPT-4o** | Evaluation | Human-level | 2-5s | API |
| **Llama 3.3 70B** | Questions | High quality | 3-8s | API |
| **Gemini Embed** | Vectors | N/A | 100ms | API |

---

### Training & Inference Infrastructure

**Training:**
- Google Colab Pro (T4/V100 GPU)
- 100 epochs × 16 batch × 224² images
- Total training time: ~3 hours

**Inference:**
- Local Flask server (CPU sufficient for real-time)
- GPU acceleration optional (5x speedup)
- Batch processing for transcripts

**Model Versioning:**
- Best model saved as `best_model.h5`
- Checkpoints every 10 epochs
- ONNX export for portability

---

## 🔐 Environment Variables Reference

### Required Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL | Prisma connection |
| `MONGODB_URI` | MongoDB | Document store |
| `OPENROUTER_API_KEY` | OpenRouter | LLM access |
| `DEEPGRAM_API_KEY` | Deepgram | Speech-to-text |
| `GEMINI_API_KEY` | Google | Extension chatbot |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Auth & DB |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Admin access |

### Optional Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `QDRANT_URL` | `http://localhost:6333` | Vector DB |
| `FLASK_ANALYSIS_URL` | `http://127.0.0.1:5001` | Analysis server |
| `PORT` | `3001` | Backend port |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Cache |

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend (Railway/Render)
```bash
# Deploy Express backend
railway up

# Deploy Flask separately
railway up -d flask-analysis
```

### Databases
- **PostgreSQL:** Supabase (managed)
- **MongoDB:** MongoDB Atlas (managed)
- **Qdrant:** Qdrant Cloud (managed)
- **Redis:** Upstash (serverless)

### Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
  
  backend:
    build: ./backend
    ports:
      - "3001:3001"
  
  flask:
    build: ./flask-analysis
    ports:
      - "5001:5001"
  
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 👥 Team-AsliCoders

- **Team members:**
- Nikhil Yadav
- Rudransh Pratap Singh
- Ashish Singh
- Shreeya Srivastava
  
---

## 🏁 Vision

NextStep aims to **unify fragmented career tools** into one intelligent ecosystem — bridging the gap between learning, working, and growing through AI.

> "Your career deserves an AI copilot — not just a platform."

---

## 📞 Support

- **Documentation:** [docs.nextstep.ai](https://docs.nextstep.ai)
- **Issues:** [GitHub Issues](https://github.com/yourusername/nextstep/issues)
- **Discord:** [Join our community](https://discord.gg/nextstep)
- **Email:** support@nextstep.ai

---

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Resume analysis with ATS scoring
- ✅ Multi-source job search
- ✅ AI interview simulator with real-time analysis
- ✅ Career roadmap generation
- ✅ Skill-based quizzes
- ✅ Browser extension

### Phase 2 (Q2 2025)
- 🚧 AI Resume Builder with drag-and-drop
- 🚧 GitHub/Kaggle/LinkedIn integration
- 🚧 Peer learning features
- 🚧 Mobile app (React Native)

### Phase 3 (Q3 2025)
- 📋 AI mentorship recommendations
- 📋 Group study rooms
- 📋 Career coach marketplace
- 📋 Company culture analysis

---

**Built with ❤️ by the NextStep Team**
