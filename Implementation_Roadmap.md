# Implementation Roadmap: Skincare AI Agent

This document breaks down the PRD into tractable, testable coding units. Since you are building this with AI assistants, each unit is designed to be a "promptable" chunk of work.

---

## Phase 1: Foundation (Backend & Data)
**Goal:** A working API that can store users and products. No AI yet.

### Unit 1.1: Environment & Database
*   **Steps:**
    1.  Set up Python (FastAPI) project structure.
    2.  Provision PostgreSQL database (local or Docker).
    3.  Configure `SQLAlchemy` or `Prisma` for ORM.
*   **Tests (Definition of Done):**
    *   [ ] `GET /health` returns `200 OK`.
    *   [ ] Can connect to DB and run migrations without errors.

### Unit 1.2: User Auth & Profile Schema (Social Login)
*   **Steps:**
    1.  Implement User Model (Email, SocialProvider, SocialID). **No Passwords.**
    2.  Implement Profile Model (Age, Ethnicity, Location - Nullable).
    3.  Create `POST /auth/google` endpoint.
        *   Input: `id_token` from Mobile App.
        *   Action: Backend verifies token with Google -> Creates/Gets User -> Returns Session JWT.
*   **Tests:**
    *   [ ] **Flow:** Sending a valid (mock) Google Token creates a new user.
    *   [ ] **Idempotency:** Sending the same token twice logs in the existing user, doesn't create a duplicate.

---

## Phase 2: The Brain (RAG Engine & Hybrid Search)
**Goal:** The system can "think" and find products using both *Scientific Precision* and *Semantic Understanding*.

### Unit 2.1: Hybrid Vector Database Strategy
*   **Context:** Pure Vector Search is bad at exact matches (e.g., "5% Urea"). We need **Hybrid Search** (Keywords + Vectors).
*   **Steps:**
    1.  Enable `pgvector` extension in Postgres.
    2.  Create `Product` table with:
        *   `embedding` (Vector): For specific "feel" descriptions ("lightweight moisturizer").
        *   `ingredients_tsvector` (TSVector): For exact keyword search ("Ceramides", "Parabens").
        *   `metadata` (JSONB): For filtering (`skin_type: "oily"`, `price_range`).
    3.  Write Ingestion Script:
        *   Model: Use `text-embedding-3-small` (OpenAI) or `Gecko` (Google).
        *   Strategy: Do **NOT** chunk randomly. Embed the *Description* field. Keep *Ingredients* as structured text.
*   **Tests:**
    *   [ ] **Hybrid Test:** Query for "Non-comedogenic cream with Salicylic Acid". Check that it finds "Salicylic Acid" via Keyword AND "Non-comedogenic" via Vector/Metadata.
    *   [ ] **Filter Test:** Ensure searching "for dry skin" strictly filters out "oily skin only" products via Metadata.

### Unit 2.2: The Orchestrator Agent (The "Manager")
*   **Context:** This is not just a chatbot. It is a **Router**. It decides *which* tool to use.
*   **Steps:**
    1.  Setup `LangGraph` or `LangChain` StateGraph.
    2.  **The Router:**
        *   If User asks "Hi" -> Return conversational response (No RAG).
        *   If User asks "Best cream for acne" -> Call `ProductRetriever`.
        *   If User asks "Is this safe?" -> Call `IngredientChecker`.
    3.  **The Critic (Self-Correction):**
        *   Agent checks its own answer: "Did I actually check if the user has a nut allergy before recommending this Almond Scrub?"
*   **Tests:**
    *   [ ] **Router Test:** "Hello" does NOT trigger a database search (saves costs).
    *   [ ] **Safety Loop:** User with "Nut Allergy" + Agent recs "Almond Oil" -> Agent AUTO-CORRECTS itself before replying.

### Unit 2.3: The Evaluation Framework ("The Golden Set")
*   **Context:** How do we know if a code change made the AI *dumber*? Unit tests aren't enough for ML.
*   **Steps:**
    1.  Create `tests/golden_dataset.json` with 50 Q&A pairs.
        *   Input: "Best safe moisturizer for eczema."
        *   Golden Output: Must contain "National Eczema Association" seal products.
    2.  Write a script (`evaluate_agent.py`) using `Ragas` or `DeepEval`.
    3.  Run this script on every Pull Request (CI/CD).
*   **Tests:**
    *   [ ] **Accuracy Score:** The Agent must achieve >90% retrieval accuracy on the Golden Set before we merge new code.

### Unit 2.4: DevOps & Performance Assurance
*   **Context:** `TestClient` is fake. It doesn't test Docker networking, Latency, or DB Connection Pools.
*   **Steps:**
    1.  **Container Smoke Test:** A script (`smoke_test.sh`) that uses `curl` to hit the *running* Docker container (Port 8000). Verifies networking.
    2.  **Load Test (Locust):** Simulate 50 concurrent users searching for products.
        *   Goal: Ensure `pgvector` doesn't crash Postgres when under load.
        *   Goal: Verify connection pool settings (prevent `FATAL: remaining connection slots are reserved`).
*   **Tests:**
    *   [ ] **Smoke:** `curl localhost:8000/health` returns 200 via Docker network.
    *   [ ] **Load:** 95th Percentile Latency < 500ms at 50 RPS.

---

## Phase 3: The Body (Mobile App)
**Goal:** A phone app that allows login and navigation.

### Unit 3.1: Scaffolding & Auth UI
*   **Steps:**
    1.  Initialize React Native (Expo recommended for ease).
    2.  Build "Sign Up" Screens (Email + Password).
    3.  Build "Profile Setup" Wizard (Age, Skin Type, Allergy inputs).
    4.  Store JWT in SecureStore/KeyChain.
*   **Tests:**
    *   [ ] **Flow:** User can sign up -> lands on Home Screen.
    *   [ ] **Persistance:** Restarting app keeps user logged in.

### Unit 3.2: EULA & Legal Gate
*   **Steps:**
    1.  Add "Terms of Service" checkbox to Sign Up.
    2.  Block "Submit" button until checked.
*   **Tests:**
    *   [ ] **Legal:** Cannot proceed without checking the box.

---

## Phase 4: Integration (The Chat Loop)
**Goal:** The App talks to the Brain.

### Unit 4.1: Chat Interface
*   **Steps:**
    1.  Build Chat UI (Bubbles, Input field).
    2.  Connect to Backend Streaming Endpoint.
    3.  Handle "Loading" states and Markdown rendering (for bold text/lists).
*   **Tests:**
    *   [ ] **Latency:** User sees first token within <3 seconds.
    *   [ ] **UI:** Markdown lists render correctly (not raw text).

### Unit 4.2: Structured Recommendations
*   **Steps:**
    1.  Modify Agent to return "Product Cards" (JSON) alongside text.
    2.  Frontend renders interactive "Product Cards" (Image, Name, Price) inside chat.
*   **Tests:**
    *   [ ] **Visual:** Chat text says "Here is a suggestion:", Product Card appears below it.

---

## Phase 5: Advanced Features
**Goal:** Google Health-level differentiators.

### Unit 5.1: Location & Store Locator
*   **Steps:**
    1.  Frontend: Request GPS permissions.
    2.  Backend: Create `StoreLocator` tool (Google Places API).
    3.  Agent: Trigger `StoreLocator` when user asks "Where can I buy this?".
*   **Tests:**
    *   [ ] **Privacy:** App does not crash if user Denies GPS permission.
    *   [ ] **Accuracy:** "Buy CeraVe" returns stores within 5 miles, not random cities.

### Unit 5.2: Hybrid Vision (Camera)
*   **Steps:**
    1.  Frontend: Add Camera button to Chat.
    2.  Frontend: Integrate `MobileNet` (TFLite) for "Redness Score" (just a random number generator for v0, then real model).
    3.  Backend: Allow uploading image for VLM analysis.
*   **Tests:**
    *   [ ] **Flow:** Take photo -> Image appears in chat -> Agent comments on it.

---

## Phase 6: Polish
**Goal:** User Retention.

### Unit 6.1: Product Journal (Positive/Negative)
*   **Steps:**
    1.  Create `JournalEntry` table.
    2.  UI: "Add to Safe List" / "Report Reaction" buttons on Product Cards.
*   **Tests:**
    *   [ ] **Memory:** Agent refuses to recommend a "Negative" product in future chats.
