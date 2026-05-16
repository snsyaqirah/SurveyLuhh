# 🏠 SurveyLuhh

> A collaborative property scraper for Malaysian house hunters — paste listing URLs, shortlist together, then let a bracket tournament decide your favourite.

![Status](https://img.shields.io/badge/status-in%20progress-yellow)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [User Flow](#-user-flow)
- [Auth Flow](#-auth--session-flow)
- [Database](#-database-erd)
- [API Structure](#-api-structure)
- [Frontend Components](#-frontend-components)
- [Feature Flows](#-feature-specific-flows)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🧭 Overview

SurveyLuhh solves the group-chat chaos of house hunting — instead of sharing screenshots and arguing over WhatsApp, everyone drops listing URLs into a shared session, the app scrapes the details automatically, and the group votes using a head-to-head bracket tournament. Sessions auto-expire after 7 days so there's no clutter.

**Type:** `Solo`
**Brand:** `Luhh Series`
**Built with:** Independent

---

## ✨ Features

- ✅ One-click session creation with a shareable link
- ✅ Scrape mudah.my, PropertyGuru, and iProperty listings automatically
- ✅ Collaborative property list — all members see the same properties in real time
- ✅ Shortlist / Reject / Delete properties with status badges
- ✅ Bracket tournament (head-to-head voting) to pick a group favourite
- ✅ PDF export of any property detail
- ✅ Anonymous feedback system with admin reply panel
- ✅ Sessions auto-delete after 7 days via MongoDB TTL
- 🚧 WebSocket live sync *(in progress — currently uses 30s polling)*
- 💡 PropertyGuru + iProperty full scraping *(planned — currently blocked by Cloudflare/Akamai)*
- 💡 Price history tracking *(planned)*

---

## 🛠 Tech Stack

```mermaid
graph TD
    subgraph Frontend
        FE["Next.js 16 + React 19 + TypeScript"]
        UI["TailwindCSS 4 + Framer Motion"]
        SW["react-swipeable + reCAPTCHA v3"]
    end
    subgraph Backend
        BE["FastAPI + Uvicorn (Python 3.11)"]
        SCRAPER["curl-cffi + Selenium + BeautifulSoup4"]
        RL["slowapi rate limiter"]
    end
    subgraph Infrastructure
        DB[("MongoDB 7.0")]
        CHROME["Headless Chrome via Xvfb"]
        HOST["Docker Compose"]
    end
    FE --> BE
    BE --> DB
    BE --> SCRAPER
    SCRAPER --> CHROME
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | FastAPI, Uvicorn (Python 3.11) |
| Database | MongoDB 7.0 (Motor async driver) |
| Auth | reCAPTCHA v3 (scrape gate), Bearer token (admin) |
| Scraping | curl-cffi, Selenium, BeautifulSoup4, undetected-chromedriver |
| Hosting | Docker Compose (Railway / Vercel / Render) |
| Other | Framer Motion, react-swipeable, slowapi |

---

## 📌 Architecture

### High-level Architecture

```mermaid
graph TD
    A[User / Browser] --> B[Next.js Frontend :3000]
    B --> C[FastAPI Backend :8000]
    C --> D[(MongoDB 7.0 :27017)]
    C --> E[Headless Chrome\nSelenium :4444]
    C --> F[Property Sites\nmudah.my · PropertyGuru · iProperty]
    C --> G[Google reCAPTCHA API]
```

### System Architecture

```mermaid
graph TD
    subgraph Frontend
        A[Pages] --> B[Hunt Components]
        B --> C[api.ts Client]
        C --> LS[localStorage\nnickname · favorites · admin token]
    end
    subgraph Backend
        D[FastAPI Routes] --> E[Services]
        E --> F[Scraper Pipeline]
        F --> G[curl-cffi\nTLS impersonation]
        F --> H[Selenium fallback\nheadless Chrome]
        E --> I[(MongoDB\nmotor async)]
    end
    C --> D
```

---

## 👤 User Flow

```mermaid
flowchart TD
    A([Start]) --> B[Landing Page /]
    B --> C[Click Lessego!]
    C --> D[POST /api/sessions\ncreate session UUID]
    D --> E[/hunt/sessionId — Home Tab]
    E --> F[Enter Nickname]
    F --> G[Paste Property URL]
    G --> H{reCAPTCHA score\n>= 0.5?}
    H -->|No| I[Blocked — Error toast]
    H -->|Yes| J[POST /api/scrape]
    J --> K{Supported site?}
    K -->|mudah.my| L[curl-cffi scrape]
    K -->|PropertyGuru / iProperty| M[Selenium fallback]
    L --> N[Property added → Properties Tab]
    M --> N
    N --> O{User action?}
    O -->|Shortlist or Reject| P[PATCH status]
    O -->|Delete| Q[DELETE property]
    O -->|Favourite| R[Save to localStorage]
    O -->|Print PDF| S[Browser print dialog]
    O -->|Go to Insight| T[Bracket Tournament]
    T --> U[Head-to-head voting]
    U --> V{Final match?}
    V -->|No| U
    V -->|Yes| W[Confetti + Winner card]
    W --> X([Done])
```

### Page Map

```mermaid
graph TD
    subgraph Public ["🌐 Public Routes"]
        ROOT["/\nLanding"]
        HUNT["/hunt/[sessionId]\nMain Dashboard"]
        FEEDBACK["/feedback\nPublic Feedback Board"]
        CHANGELOG["/changelog\nVersion History"]
    end
    subgraph Protected ["🔐 Admin Token Required"]
        ADMIN["/admin\nAdmin Feedback Panel"]
    end
    ROOT --> HUNT
    HUNT --> FEEDBACK
    FEEDBACK --> ADMIN

    style Public fill:#e8f5e9,stroke:#4caf50
    style Protected fill:#e3f2fd,stroke:#2196f3
```

### Wireframe Overview

```mermaid
graph TD
    subgraph Hunt ["📄 /hunt/[sessionId]"]
        H1["NavBar — tabs · share link · online members · expiry countdown"]
        H2["Home Tab — URL input · reCAPTCHA · scrape button · backend health"]
        H3["Properties Tab — property list ↔ property detail (split layout)"]
        H4["Insight Tab — bracket tournament · head-to-head voting · confetti"]
        H1 --> H2 --> H3 --> H4
    end
    subgraph Landing ["📄 /"]
        L1["Hero section + CTA button"]
        L2["Lessego! → creates session → redirect"]
        L1 --> L2
    end
    subgraph Feedback ["📄 /feedback"]
        F1["Public replies list (admin-replied only)"]
    end
    subgraph Admin ["📄 /admin"]
        A1["Token login gate"]
        A2["All feedback + unread badge"]
        A3["Reply modal per feedback item"]
        A1 --> A2 --> A3
    end
```

---

## 🔐 Auth & Session Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant RC as reCAPTCHA API
    participant API as FastAPI
    participant DB as MongoDB

    Note over U,DB: Scrape Gate (reCAPTCHA v3)
    U->>FE: Paste URL + click Scrape
    FE->>RC: executeV3(siteKey, 'scrape')
    RC-->>FE: token
    FE->>API: POST /api/scrape { url, recaptchaToken }
    API->>RC: POST siteverify { secret, token }
    RC-->>API: { success, score }
    alt score >= 0.5
        API->>API: Run scraper pipeline
        API-->>FE: Scraped property data
        FE-->>U: Property added to list
    else score < 0.5 or fail
        API-->>FE: 403 reCAPTCHA failed
        FE-->>U: Error toast
    end

    Note over U,DB: Admin Auth (Bearer Token)
    U->>FE: Enter token at /admin
    FE->>FE: Store in localStorage (surveyluhh_admin_token)
    FE->>API: GET /api/feedback\nAuthorization: Bearer <token>
    API->>API: Compare vs env ADMIN_TOKEN
    alt Match
        API-->>FE: Feedback list
        FE-->>U: Admin panel rendered
    else No match
        API-->>FE: 401 Unauthorized
        FE-->>U: Token invalid error
    end
```

---

## 🗄️ Database (ERD)

### Core ERD

```mermaid
erDiagram
    SESSIONS {
        uuid _id PK
        datetime createdAt
    }
    PROPERTIES {
        uuid id PK
        string url
        string title
        string price
        array images
        string sqft
        int bedrooms
        int bathrooms
        int parking
        array facilities
        array nearbyPlaces
        string agentName
        string agentPhone
        string agentAgency
        string description
        string status
        string source
        string scrapedBy
        datetime addedAt
    }
    MEMBERS {
        string nickname PK
        datetime lastSeen
    }
    BRACKET_RESULTS {
        string nickname
        uuid winnerId
    }
    SESSIONS ||--o{ PROPERTIES : "contains"
    SESSIONS ||--o{ MEMBERS : "has"
    SESSIONS ||--o{ BRACKET_RESULTS : "stores"
```

### Feature ERD

```mermaid
erDiagram
    FEEDBACK {
        uuid _id PK
        string category
        string message
        string suggestedFix
        datetime createdAt
        string reply
        datetime repliedAt
        boolean read
    }
```

### Database Schema Overview

| Collection | Purpose | Key Relations |
|---|---|---|
| `sessions` | Session container (TTL 7 days) | — |
| `sessions.properties` | Embedded property array | belongs to `sessions` |
| `sessions.members` | Embedded members array (online tracking) | belongs to `sessions` |
| `sessions.bracketResults` | Embedded bracket votes per nickname | belongs to `sessions` |
| `feedback` | Anonymous user feedback + admin replies | standalone |

---

## 🔌 API Structure

### API Overview

```mermaid
mindmap
  root((API))
    health
      GET /health
    sessions
      POST /api/sessions
      GET /api/sessions/:id
      PATCH /api/sessions/:id/properties/:propId
      DELETE /api/sessions/:id/properties/:propId
      PATCH /api/sessions/:id/members
      PATCH /api/sessions/:id/bracket
    scrape
      POST /api/scrape
    feedback
      POST /api/feedback
      GET /api/feedback/public
      GET /api/feedback
      GET /api/feedback/unread-count
      PATCH /api/feedback/:id/reply
```

### Request/Response Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant RL as Rate Limiter
    participant API as FastAPI Route
    participant SVC as Service
    participant DB as MongoDB

    FE->>RL: Any request
    RL->>RL: Check 5 req/min limit
    alt Within limit
        RL->>API: Pass request
        API->>SVC: Business logic
        SVC->>DB: Query / write
        DB-->>SVC: Result
        SVC-->>API: Processed data
        API-->>FE: JSON response 200
    else Limit exceeded
        RL-->>FE: 429 Too Many Requests
    end
```

---

## 🧩 Frontend Components

### Component Tree

```mermaid
graph TD
    App --> Layout
    Layout --> FeedbackButton["FeedbackButton\n(floating, all pages)"]
    Layout --> LandingPage["/"]
    Layout --> HuntPage["/hunt/[sessionId]"]
    Layout --> FeedbackPageComp["/feedback"]
    Layout --> AdminPage["/admin"]
    Layout --> ChangelogPage["/changelog"]

    HuntPage --> NicknameModal
    HuntPage --> NavBar
    NavBar --> ShareLink
    NavBar --> OnlineMembers
    NavBar --> ExpiryCountdown

    HuntPage --> HomeTab
    HomeTab --> URLInput
    HomeTab --> HealthChecker

    HuntPage --> PropertiesTab
    PropertiesTab --> PropertyList
    PropertyList --> StatusBadge
    PropertiesTab --> PropertyDetail
    PropertyDetail --> ImageLightbox
    PropertyDetail --> AgentCard
    PropertyDetail --> PDFExport

    HuntPage --> InsightTab
    InsightTab --> BracketView
    BracketView --> MatchupCard
    BracketView --> ConfettiCanvas
```

### Key Components

| Component | Purpose |
|---|---|
| `HomeTab` | URL input, reCAPTCHA trigger, scrape call, backend health check |
| `PropertiesTab` | Split-view list + detail; responsive swipe on mobile |
| `PropertyList` | Searchable list with shortlist/reject/delete actions |
| `PropertyDetail` | Full property card — images, agent info, PDF, favourites |
| `InsightTab` | Bracket tournament logic, head-to-head vote, confetti on win |
| `NavBar` | Tab switcher, share link copy, online member list, session countdown |
| `NicknameModal` | Prompt on first visit, stores name to localStorage |
| `FeedbackButton` | Floating button, feedback modal with category + message |

---

## ⚙️ Feature-specific Flows

### Scraping Pipeline Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as FastAPI
    participant CF as curl-cffi
    participant SE as Selenium
    participant SITE as Property Site

    FE->>API: POST /api/scrape { url, token }
    API->>API: reCAPTCHA verify
    API->>CF: GET url (Chrome TLS impersonation)
    CF->>SITE: HTTP request
    SITE-->>CF: Response
    alt 200 OK
        CF-->>API: HTML body
        API->>API: BeautifulSoup parse\n__NEXT_DATA__ JSON extract
    else 403 / 429 / 503 blocked
        CF-->>API: Error status
        API->>SE: Launch headless Chrome
        SE->>SITE: Browser request via Xvfb
        SITE-->>SE: Rendered HTML
        SE-->>API: HTML body
        API->>API: BeautifulSoup parse
    end
    API->>API: Pydantic model validation
    API->>API: Save to session in MongoDB
    API-->>FE: Property data
    FE-->>FE: Switch to Properties Tab
```

### Bracket Tournament Flow

```mermaid
flowchart TD
    A([User opens Insight Tab]) --> B[Load all session properties]
    B --> C{Count is power of 2?}
    C -->|No| D[Pad with BYE slots]
    C -->|Yes| E[Render Round 1 bracket]
    D --> E
    E --> F[Show head-to-head matchup]
    F --> G{BYE match?}
    G -->|Yes| H[Auto-advance real property]
    G -->|No| I[User clicks winner]
    I --> J[PATCH /api/sessions/:id/bracket]
    H --> K{All matches in round done?}
    J --> K
    K -->|No| F
    K -->|Yes| L{Is this the Final?}
    L -->|No| M[Advance winners to next round]
    M --> F
    L -->|Yes| N[🎉 Confetti animation]
    N --> O[Display winner card]
    O --> P([Done])
```

### Feedback & Admin Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant DB as MongoDB
    participant A as Admin

    U->>FE: Click feedback button
    FE->>FE: Open modal
    U->>FE: Select category + write message
    FE->>API: POST /api/feedback
    API->>DB: Insert feedback (read: false)
    DB-->>API: OK
    API-->>FE: { ok: true }
    FE-->>U: Submitted toast

    Note over A,DB: Admin replies
    A->>FE: Open /admin + enter token
    FE->>API: GET /api/feedback (Bearer token)
    API-->>FE: All feedback list
    FE-->>A: Panel with unread badge
    A->>FE: Click reply on feedback item
    FE->>API: PATCH /api/feedback/:id/reply { reply }
    API->>DB: Update reply + repliedAt + read: true
    DB-->>API: OK
    API-->>FE: { ok: true }
    FE-->>A: Reply saved

    Note over U,DB: User sees reply
    U->>FE: Open /feedback
    FE->>API: GET /api/feedback/public
    API->>DB: Find feedback with reply != null
    DB-->>API: Replied feedback
    API-->>FE: Public feedback list
    FE-->>U: Feedback + dev reply shown
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>=18`
- Python `>=3.11`
- Docker + Docker Compose
- Google reCAPTCHA v3 site + secret key

### Installation

```bash
git clone https://github.com/snsyaqirah/SurveyLuhh.git
cd SurveyLuhh
```

### Running with Docker (Recommended)

```bash
# Copy env files
cp .env.example .env

# Start all services (MongoDB + Selenium + API + Frontend)
docker compose up --build
```

```mermaid
graph LR
    subgraph Dev ["docker-compose.yml"]
        FE["frontend\nNext.js :3000\nhot reload"]
        BE["api\nFastAPI :8000\n--reload + Xvfb"]
        DB[("mongodb\nMongo 7.0 :27017")]
        SE["selenium\nChrome :4444"]
        FE -. "NEXT_PUBLIC_API_URL" .-> BE
        BE --> DB
        BE -. "SELENIUM_REMOTE_URL" .-> SE
    end
    Browser["Browser"] --> FE
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MongoDB | localhost:27017 |
| Selenium | http://localhost:4444 |

### Running locally (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

> You'll need a running MongoDB instance and optionally a Selenium Grid for full scraping support.

---

## 🔑 Environment Variables

### Backend

```env
# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/surveyluhh

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Selenium (Docker sets this automatically)
SELENIUM_REMOTE_URL=http://selenium:4444/wd/hub

# Admin panel
ADMIN_TOKEN=your_secret_admin_token_here
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

> Copy `.env.example` to `.env` and fill in your values.

---

## ☁️ Deployment

| Service | Purpose |
|---|---|
| Vercel / Railway | Frontend hosting |
| Railway / Render | Backend hosting (needs Chrome/Xvfb support) |
| MongoDB Atlas | Cloud database |

```mermaid
graph LR
    GitHub -->|push to main| CI[CI/CD]
    CI --> FE["Vercel\n(Frontend)"]
    CI --> BE["Railway\n(FastAPI + Chrome)"]
    BE --> DB[("MongoDB Atlas")]
    BE --> RC["Google reCAPTCHA API"]
    BE --> SITES["mudah.my\nPropertyGuru\niProperty"]
```

> **Note:** The backend requires Chrome and Xvfb. Use a platform that supports Docker (Railway, Render) rather than serverless functions.

---

## 📁 Project Structure

```
SurveyLuhh/
├── docker-compose.yml
├── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── layout.tsx                # Root layout
│   │   ├── hunt/[sessionId]/
│   │   │   └── page.tsx             # Main hunt dashboard
│   │   ├── feedback/page.tsx         # Public feedback board
│   │   ├── admin/page.tsx            # Admin panel
│   │   └── changelog/page.tsx        # Changelog
│   ├── components/
│   │   ├── FeedbackButton.tsx
│   │   ├── hunt/
│   │   │   ├── HomeTab.tsx
│   │   │   ├── PropertiesTab.tsx
│   │   │   ├── PropertyDetail.tsx
│   │   │   ├── PropertyList.tsx
│   │   │   ├── InsightTab.tsx
│   │   │   ├── NavBar.tsx
│   │   │   └── NicknameModal.tsx
│   │   └── landing/
│   ├── lib/
│   │   ├── api.ts                    # API client
│   │   └── types.ts                  # TypeScript interfaces
│   ├── package.json
│   └── Dockerfile
│
└── backend/
    ├── main.py                       # App entry, CORS, rate limiter
    ├── models/
    │   ├── property.py               # Session, Property, Member models
    │   └── feedback.py               # Feedback models
    ├── routers/
    │   ├── sessions.py
    │   ├── scrape.py
    │   └── feedback.py
    ├── services/
    │   ├── db.py                     # MongoDB client + TTL setup
    │   └── scraper/
    │       ├── base.py               # curl-cffi + Selenium fetcher
    │       ├── mudah.py
    │       ├── propertyguru.py
    │       └── iproperty.py
    ├── requirements.txt
    └── Dockerfile
```

---

## 🗺 Roadmap

- [x] Session creation + shareable link
- [x] mudah.my scraping (curl-cffi)
- [x] PropertyGuru + iProperty scraping (Selenium fallback)
- [x] Collaborative property list with member tracking
- [x] Shortlist / Reject / Delete status
- [x] Bracket tournament with confetti
- [x] Favourites (localStorage)
- [x] PDF export
- [x] Anonymous feedback system + admin reply panel
- [x] Docker Compose setup
- [ ] WebSocket real-time sync (replace 30s polling)
- [ ] Full PropertyGuru scraping (Cloudflare bypass)
- [ ] Full iProperty scraping (Akamai bypass)
- [ ] Price history tracking
- [ ] Map view for nearby places
- [ ] Email session link

---

## 📄 License

[MIT](LICENSE) © 2025 Syaqirah
