# CyberGuardian AI - Autonomous Cyber Defense Platform

The goal of this project is to build an industry-level AI-powered Autonomous Cyber Defense Platform. The platform will act as an autonomous AI Security Analyst, taking user inputs (URLs, IPs, logs) and automatically deciding which security modules to execute, analyzing the findings, generating severity scores, providing recommendations, and generating PDF reports.

## User Review Required

> [!IMPORTANT]
> **Frontend Framework**
> The prompt mentions "Frontend: Antigravity" (which is me!). For a complex web application like this, I propose using **React with Vite** and **Vanilla CSS** to ensure a highly responsive, modern, and modular UI. Is React with Vite acceptable for the frontend?

> [!IMPORTANT]
> **Docker Compose for Development**
> Since the backend requires Django, MySQL, Redis, and Celery, I propose setting up a `docker-compose.yml` file from the start to spin up the database, Redis broker, and Celery workers seamlessly. This will make development much smoother. Do you agree with this approach?

> [!IMPORTANT]
> **AI Models (Ollama)**
> You mentioned using LangChain/LangGraph with Ollama, Qwen 3, Llama. I will configure the LangChain agent to communicate with a local Ollama instance. Please ensure you have Ollama installed and the required models (e.g., `llama3` or `qwen2`) pulled on your machine.

## Open Questions

> [!WARNING]
> **API Keys**
> Modules like Threat Intelligence rely on VirusTotal, AbuseIPDB, URLScan, and IPInfo. Do you already have these API keys ready to be placed in a `.env` file, or would you like me to implement mock responses for the initial development phases?

> [!WARNING]
> **Database Models**
> I will design the database schema based on your requirements (Users, Reports, Threats, etc.). Would you prefer Django's default authentication model, or a completely custom User model?

## Proposed Changes

We will build this project systematically in phases as requested. 

### Project Architecture Setup
- Initialize Git repository.
- Setup `docker-compose.yml` for MySQL, Redis, Celery, and Django.
- Setup Django backend (`backend/` folder).
- Setup React + Vite frontend (`frontend/` folder).

### Phase 1: Authentication, Dashboard, Database Setup
- Implement Custom User model and JWT Authentication in Django.
- Design the Dashboard UI (Dark mode, responsive, Chart.js integration).
- Implement frontend routing and protected routes.

### Phase 2: Core Scanners (Website, URL, SSL)
- Implement Website Security Scanner, URL Scanner, and SSL Analyzer endpoints.
- Integrate Python `ssl`, `socket`, and `requests` for analysis.

### Phase 3: Threat Intelligence
- Integrate VirusTotal, AbuseIPDB, URLScan, IPInfo APIs.
- Build abstract API service classes for easy integration.

### Phase 4: AI Agent Integration
- Implement LangGraph workflow for autonomous decision-making.
- Create the AI decision router: Input -> Decide Modules -> Execute -> Synthesize.

### Phase 5 - 10: Advanced Features
- **Log Analyzer & SOC Analyst:** Implement log parsing (Apache, Nginx, etc.) and brute-force detection.
- **Incident Response & AI Assistant:** Interactive chat interfaces using LangChain.
- **Recommendations & Reports:** Implement `ReportLab` for PDF generation.
- **Notifications:** Real-time or polled notifications for the dashboard.

### Phase 11: Deployment
- Finalize Dockerfiles for frontend (Nginx) and backend.
- Setup GitHub Actions for CI/CD.

## Verification Plan

### Automated Tests
- Unit tests for Django REST APIs (Authentication, Scanner logic).
- Mocking external API responses to test Threat Intelligence modules without exhausting API quotas.

### Manual Verification
- Manually test the autonomous AI workflow by inputting a test URL/IP and verifying if it triggers the correct sub-modules.
- Verify JWT login and Dashboard chart rendering.
- Verify PDF generation format and contents.
