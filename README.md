# CyberGuardian AI - Autonomous Cybersecurity Platform

A comprehensive, AI-powered cybersecurity platform designed to automate security analysis, threat intelligence, risk management, and incident response. The platform provides real-time protection insights, compliance assessments, and security scoring for individuals and organizations.

## Features

- **🛡️ Multi-Source Threat Intelligence**:
  - Integrates with VirusTotal, PhishTank, AbuseIPDB, and URLScan.io for comprehensive threat detection.
  - AI-powered analysis engine to correlate multi-provider signals and detect advanced threats.

- **🤖 AI-Powered Analysis Engine**:
  - **Core Engine**: Decision-tree and AI-driven analysis for multi-source threat correlation.
  - **LLM Integration**: Uses Ollama (CyberGuardian-AI & CyberGuardian-Phishing) for deep contextual analysis and report generation.
  - **Phishing Detection**: Specialized engine with PhishTank integration to detect credential harvesting and phishing scams.
  - **Risk & Compliance**: Calculates risk scores, generates remediation recommendations, and detects compliance gaps.

- **🌐 Vulnerability Scanning**:
  - **Website Scanner**: Detects OWASP Top 10 vulnerabilities, HTTP security headers, TLS/SSL misconfigurations, and open ports.
  - **Port Scanner**: Advanced port scanning with vulnerability detection capabilities.

- **📊 Security Dashboards**:
  - **User Dashboard**: Real-time metrics, recent activity, vulnerability trends, and risk exposure.
  - **SOC Dashboard**: Advanced analytics for Security Operations Center with Threat Matrix, Incident Management, and AI correlation.

- **📝 Automated Reporting**:
  - **PDF Reports**: Automatic generation of detailed security reports with full-text indexing.
  - **Quick Reports**: On-demand PDF generation for immediate sharing and compliance needs.

- **🔐 Identity & Access Management**:
  - **RBAC**: Role-Based Access Control with User, SOC Analyst, and Admin roles.
  - **Multi-Tenancy**: Secure isolation of user data and scans.

- **🔧 Enterprise Features**:
  - **Mobile Agent**: Dedicated mobile app for security officers and SOC teams.
  - **Automation**: Auto-email alerts, scheduled scans, and remediation tracking.
  - **Notifications**: Configurable email and OTP-based two-factor authentication.

## Technology Stack

### Backend
- **Framework**: Django 4.2
- **Database**: PostgreSQL
- **AI/ML**: Ollama (Llama 3 variants), Scikit-learn
- **Scanning**: Nmap integration, Requests, BeautifulSoup
- **Intel Providers**: VirusTotal, PhishTank, AbuseIPDB, URLScan.io
- **Reports**: WeasyPrint for PDF generation
- **Caching**: Redis
- **Architecture**: Microservices architecture with Django Channels for real-time features

### Frontend
- **Framework**: React (CRA)
- **UI Library**: Material-UI (MUI)
- **Charts**: Recharts
- **Maps**: Leaflet
- **Real-time**: Socket.IO Client

## Project Structure

```
backend/
├── scanner/                # Core scanning engine and threat intelligence
├── core_engine/            # AI analysis, scoring, and decision logic
├── reports/                # PDF generation and reporting module
├── user_profile/           # User management and RBAC
├── agent/                  # Mobile agent backend & SOC features
├── analytics/              # Dashboard data and statistics
├── security_ assessments/  # Vulnerability assessment tools
├── notifications/          # Email and alert management
└── api/                    # API endpoints and routing
```

## Setup Guide

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL
- Ollama (running locally or remote)

### Backend Installation

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your settings (DATABASE_URL, OLLAMA_BASE_URL, API keys, etc.)
   ```

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Create superuser (optional):
   ```bash
   python manage.py createsuperuser
   ```

7. Start development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Installation

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm start
   ```

The app will be accessible at `http://localhost:3000`.

## Usage

### Quick Start
1. Log in with your credentials.
2. Navigate to **Dashboard** to view security posture.
3. Use **Scanner** to analyze websites, domains, or IPs.
4. Explore **Threat Intelligence** for comprehensive risk analysis.
5. Access **SOC** features for advanced incident management.
6. Download **Reports** for compliance and sharing.

## Contributing

1. Create a feature branch: `git checkout -b feature/AwesomeFeature`
2. Make your changes.
3. Ensure code follows linting standards.
4. Open a Pull Request with detailed description.

## License

Proprietary - All rights reserved
