# Product Requirements Document (PRD): Agentic Skincare AI

## 1. Executive Summary
**Product Name:** Skincare AI (Working Title)
**Goal:** Build a mobile application that functions as a personal skincare consultant, utilizing an Agentic RAG (Retrieval-Augmented Generation) approach to recommend products based on user skin type, concerns, and scientific product data.
**Target Platforms:** Android (Phase 1), iOS (Phase 2).

## 2. User Architecture & Personas
### 2.1 Target User
- **Profile:** Individuals overwhelmed by skincare choices, looking for personalized, science-backed advice.
- **Goals:** Find products that work for their specific skin concerns (acne, aging, sensitivity) without trial-and-error.

### 2.2 User Stories
- **Onboarding:** "As a user, I want to create a secure account and log my allergies (e.g., peanuts, latex) and past skin conditions (e.g., eczema 2019)."
- **Product History:** "As a user, I want to list products that worked ('Safe List') and products that caused reactions ('Blacklist') with photos of the side effects."
- **BYOK:** "As a power user, I want to input my own OpenAI or Gemini API key to avoid subscription fees."
- **Discovery:** "As a user, I want to ask natural questions (e.g., 'What moisturizer is good for oily skin in winter?') and get specific product recommendations with explanations."
- **Buying Context:** "As a user, I want to know which recommended products are available at stores near me (e.g., Sephora, Ulta, Target) right now."
- **Analysis:** "As a user, I want to upload a photo of a product ingredient list and know if it matches my profile."

## 3. Technical Architecture

### 3.1 High-Level Diagram
`Mobile App` <--> `API Gateway` <--> `Backend Service` <--> `Orchestration Agent` <--> `Vector DB` & `SQL DB`

### 3.2 Mobile Client (Phase 1: Android)
- **Framework Recommendation:** React Native or Flutter.
    - *Why?* Allows for "Android First" deployment while sharing 90%+ code for the eventual iOS release, significantly reducing Phase 2 effort.
- **Key Features:**
    - Chat Interface (Streaming text response).
    - **Legal Gate:** Mandatory "I agree to Terms & Conditions" checkbox on signup (Critical for liability).
    - Camera/Gallery integration (for product photos/selfies).
    - Secure Auth (OAuth/Social Login).

### 3.3 Backend & API
- **Language:** Python (FastAPI or Django).
    - *Reason:* Native integration with top AI/RAG libraries (LangChain, LlamaIndex).
- **API Structure:** RESTful or GraphQL.

### 3.4 The Agentic RAG Engine
This is the core differentiator. It is not just a chatbot, but an **Agent** that can use tools.
- **Framework:** LangChain or LangGraph.
- **Tools:**
    1.  **ProductRetriever:** Semantic search over product descriptions/ingredients.
    2.  **IngredientAnalyzer:** SQL lookup for specific ingredient safety/comedogenic ratings.
    3.  **StoreLocator:** Uses Geolocation + Google Places API to find nearby stockists (Sephora, Ulta, CVS) for a recommended item.
    4.  **ContextManager:** Retrieves user's historical skin profile.
- **Workflow:**
    1.  User Query -> Agent Router.
    2.  Agent decides if it needs to look up ingredients, search products, or ask clarifying questions.
    3.  Retrieves chunks from Vector DB (RAG).
    4.  Synthesizes answer ("This CeraVe cleanser is great for you...") AND appends location context ("...and it's in stock at the Target 0.5 miles away").

### 3.5 Security & BYOK Strategy (Bring Your Own Key)
- **Problem:** Storing user API keys on our server is high risk.
- **Solution:** **Client-Side Storage**.
    - The App prompts for the API Key.
    - Key is stored in **Secure Enclave (iOS)** or **Keystore (Android)** directly on the user's device.
    - **Header Injection:** When the App calls the Backend, it sends the key in a secure header (e.g., `X-User-LLM-Key`).
    - **Backend Proxy:** The backend reads this header ephemerally to make the LLM call, then discards it immediately. It is *never* written to the database.

### 3.6 Tech Stack Analysis & Trade-offs
We have chosen **React Native** (Frontend) and **Python/FastAPI** (Backend).

#### **Why this is the best choice:**
1.  **Cross-Platform (Adaptability):** React Native allows us to write **one single codebase** that deploys to both Android and iOS with ~95% code sharing. It also supports **React Native Web**, enabling a future Web App launch with minimal extra work.
2.  **AI Native (Backend):** Python is the native language of AI. Using FastAPI means we can integrate RAG libraries (LangChain) directly without "bridging" across languages.
3.  **Speed to Market:** We can launch on Android and iOS simultaneously (or sequentially) without hiring two separate teams (Swift vs Kotlin).

#### **The Drawbacks (Risks):**
1.  **Performance:** React Native is ever-so-slightly slower than "Pure Native" (Swift/Kotlin) for complex animations (like 3D games). *Mitigation: For a text/image-based skincare app, this difference is imperceptible.*
2.  **Dependency Hell:** Cross-platform frameworks sometimes break when iOS/Android release major OS updates. *Mitigation: We stick to stable, long-term-support (LTS) versions.*

#### **Security Strategy (User Protection):**
-   **No "Middle-man" Storage:** User API Keys (BYOK) are stored in the device's hardware (Secure Enclave), not our cloud.
-   **Biometric Separation:** Photos are stored in secure buckets (S3) with separated permissions from the metadata database. Even if the DB is compromised, the photos are harder to access.

## 4. Data Strategy

### 4.1 Database Choice
- **Relational DB (PostgreSQL):** Users, Auth, Saved Products, Ingredient Taxonomy.
- **Vector DB:** Store embeddings of product reviews, descriptions, and scientific claims.
    - *Options:* `pgvector` (keeps everything in Postgres), Pinecone, or Weaviate.

### 4.2 Data Models (Profile & History)
- **Core Profile:** Age, Ethnicity, Location, Skin Type.
- **Medical/Health:**
    - **Allergies:** List of ingredients/foods (e.g., "Bee Venom", "Peanuts").
    - **Conditions:** Historical timeline (e.g., "Cystic Acne: 2020-2022").
- **Product Journal (The "Smart" History):**
    - **Positive Log:** Products that worked.
        - *Meta:* Rating, "Why I liked it", **Before/After Photos**.
    - **Negative Log:** Products that failed.
        - *Meta:* Specific Reaction (Redness, Hives, Breakout), **Reaction Photos**.
        - *Agent Action:* The AI uses this "Negative Log" to inversely deduce ingredients to avoid in future recommendations.

### 4.3 Image Storage
- **Requirement:** Store product images and potentially user skin progress photos.
- **Solution:** Object Storage (S3-compatible).

## 5. Hosting & Infrastructure Recommendation

### 5.1 Cloud Provider: AWS (Recommended)
AWS is the industry standard and highly suitable for this architecture.
- **Compute:** AWS Lambda (backend serverless) or ECS (containers).
- **Database:** Amazon RDS for PostgreSQL (supports `pgvector` for vector search).
- **Storage:** Amazon S3 for images.
- **AI/Models:** Amazon Bedrock (access to Claude/Llama models) or host custom models on SageMaker.

### 5.2 Alternative: Google Cloud (GCP)
- **Firebase:** Excellent for fast mobile app development (Auth, Firestore, Crashlytics).
- **Vertex AI:** For managing the RAG models.

### 5.3 External Location Services
- **Google Maps Platform (Places API):**
    - Mandatory for accurate "Products near me" functionality.
    - **Geocoding API:** To convert user city/zip to coordinates.
    - **Places API:** To search for "Sephora" or "Dermatologist" near the user's coordinates.

## 6. Security & Privacy
- **Privacy Standard (GDPR/CCPA):** Mandatory.
    - *Why?* Even if not "Medical", you are collecting **Biometric Data** (Face Photos) and **Sensitive Personal Data** (Ethnicity, Skin Issues). This legally requires GDPR compliance in EU and CCPA in California.
- **Not HIPAA:** Typically this does *not* require HIPAA (US Healthcare Law) unless you are connecting to doctors or insurance, but it *does* require strict PII protection.
- **Data Protection:** Encryption at rest and in transit is mandatory.

### 6.1 Compliance & Approval Strategy
**There is no "Government Approval" queue for GDPR, but you must pass:**
1.  **App Store Review (Apple/Google):** They *will* reject you if you don't have a valid Privacy Policy link and "Delete Account" feature.
2.  **Medical Disclaimer (Crucial):** To avoid requiring FDA/Medical approval, the App **MUST** explicitly state it is for "Cosmetic Advice Only" and **NOT** for "Medical Diagnosis" (e.g., do not claim to cure eczema or detect cancer).
3.  **Terms of Service (ToS) & EULA:**
    - **Liability Shield:** Users must agree to a contract stating they will not sue you if a recommendation causes irritation.
    - **Mechanism:** "Click-wrap" agreement (Checkbox) during onboarding. Without this, your disclaimer might be ignored by a court.

## 7. Strategic Roadmap & Differentiators (The "Google Health" Perspective)
*To distinguish this app from generic chatbots, we will implement these "Professional Grade" features in Phase 2:*

### 7.1 Computer Vision (Hybrid Strategy)
-   **The Question:** "Are VLMs (like Gemini/GPT-4V) enough?"
-   **The Answer:** **No, not for daily tracking.**
    -   **VLMs (Cloud):** Great for *Qualitative* analysis ("That looks like Contact Dermatitis"). Use for initial consultation.
    -   **On-Device AI (Edge):** Mandatory for *Quantitative* tracking (Privacy & Consistency).
        -   *Why?* Sending daily selfies to the cloud is a privacy risk and expensive.
        -   *Tech:* Use a small model (MobileNet) trained/distilled from VLM data to run locally on the phone. This gives you a consistent "Redness Score" without data leaving the device.

### 7.2 Data Donation & Training Consent (The "Ethical AI" Approach)
-   **The Law:** You **cannot** secretly train on user biometric data (GDPR/ILBPA violation).
-   ** The Strategy:** **Explicit Opt-In ("Data Donation")**.
    -   **Mechanism:** A clear screen: "Help us get smarter? Donate your skin logs anonymously to improve accuracy."
    -   **Incentive:** Users who opt-in get early access to beta features (e.g., the "Timelapse" tool).
    -   **Future Tech (Federated Learning):** In Phase 3, we can improve the model *on their phone* and only send the mathematical updates (gradients) back to us, so the server *never* sees their actual photo.

### 7.3 Evidence Grading (Trust)
-   **Concept:** Not all advice is equal.
-   **Implementation:** When the Agent cites a source, it tags it:
    -   🟢 **Clinical Trial:** High Certainty.
    -   🟡 **Dermatologist Consensus:** Moderate Certainty.
    -   🔴 **Anecdotal/Reddit:** Low Certainty.

### 7.4 Longitudinal Timelapse (The "Feedback Loop")
-   **Concept:** Skincare takes 4-6 weeks to work.
-   **Feature:** "Smart Mirror" mode where users align their face daily. The AI computes a delta: "Redness decreased by 15% since starting Product X."

## 8. UX & Engagement (The "Habit" Loop)
*To keep users returning daily, not just when they have a problem:*

### 8.1 Routine Builder (Gamification)
-   **Insight:** Skincare is a discipline. People fail because they forget.
-   **Feature:** "Morning/Night Routine" checklist with **Streaks**.
-   **Value:** 10 days of consistency unlocks "Badge" or "Detailed Report". This turns a "Utility" into a "Game".

### 8.2 Predictive Insights (Proactive vs. Reactive)
-   **Insight:** Don't wait for the breakout. Predict it.
-   **Feature:** Connect to external data:
    -   **Weather:** "It's dry/cold tomorrow -> Switch to heavier moisturizer."
    -   **Cycle/Hormones:** "PMS week approaching -> Start Salicylic Acid *now* to prevent hormonal acne."

### 8.3 Explainability ("Why am I seeing this?")
-   **Insight:** Trust is fragile. If the AI suggests a $50 cream, the user is skeptical.
-   **Feature:** Every recommendation must have a "Why?" drawer.
    -   *"We chose this because matches your 'Oily' profile AND contains 'Green Tea' which worked for you in the past."*

### 7.3 Longitudinal Timelapse (The "Feedback Loop")
-   **Concept:** Skincare takes 4-6 weeks to work.
-   **Feature:** "Smart Mirror" mode where users align their face daily. The AI computes a delta: "Redness decreased by 15% since starting Product X."
