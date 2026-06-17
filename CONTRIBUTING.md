# Contributing to GridLock 🚦

First off, thank you for considering contributing to GridLock! We are building an AI-Powered Traffic Command Center, and your help is highly appreciated.

This document provides guidelines and instructions for setting up your development environment and contributing to the repository.

---

## 🛠️ Tech Stack Overview

GridLock is built as a monorepo containing three primary services:
- **Frontend**: React + Vite + TypeScript + Leaflet.js
- **Backend API**: Node.js + Express + TypeScript + BullMQ + WebSockets
- **ML Engine**: Python + FastAPI + XGBoost/Scikit-learn
- **Infrastructure**: Redis (Cache/Queues), Neon DB (PostgreSQL)

---

## 🚀 Local Development Setup

We have configured the project to be as frictionless as possible. You only need **Node.js**, **Docker**, and **Git** installed on your system.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/gridlock_prototype.git
cd gridlock_prototype
```

### 2. Install IDE Dependencies
We use NPM Workspaces. Running `npm install` at the root will automatically install all dependencies for both the frontend and the backend simultaneously, ensuring your IDE (like VS Code) works perfectly without any red lines.
```bash
npm install
```

### 3. Environment Variables
Copy the example environment file and add your actual credentials.
```bash
cp .env.example .env
```
*Note: Since we use an external Neon PostgreSQL database, ensure `DATABASE_URL` in your `.env` contains your active Neon connection string.*

### 4. Start the Application
We use Docker Compose to orchestrate all services simultaneously (Frontend, Backend, ML API, and local Redis).
```bash
# To build and start the containers
npm run dev
# OR: docker-compose up --build
```
Once running:
- **Frontend App**: http://localhost:5173
- **Backend API**: http://localhost:4000
  - Health check: `GET http://localhost:4000/api/health`
- **ML API**: http://localhost:8000
  - Health check: `GET http://localhost:8000/api/health`

---

## 📁 Project Structure

```text
gridlock_prototype/
├── apps/
│   ├── backend/    # Express API, WebSocket, BullMQ queue processors
│   ├── frontend/   # React Vite App, Leaflet maps, dashboards
│   └── ml/         # Python FastAPI, XGBoost prediction models
├── docs/           # Documentation and feature specifications
├── docker-compose.yml
├── package.json    # Root workspace configuration
└── .env            # Environment variables
```

---

## 🌿 Branching & Commit Guidelines

### Branch Naming
Please follow a consistent naming convention for branches:
- `feature/your-feature-name`
- `fix/issue-description`
- `docs/what-you-documented`
- `chore/maintenance-work`

### Commit Messages
We prefer clean, descriptive commit messages.
- **Good**: `feat(backend): add WebSocket broadcast for congestion updates`
- **Good**: `fix(frontend): resolve map re-rendering issue on time slider change`
- **Bad**: `fixed bug` or `updated files`

---

## 🤝 Pull Request Process

1. **Fork the repo** and create your branch from `main`.
2. Ensure your code follows the existing style and architectural patterns.
3. If you've added code that should be tested, add tests.
4. Update the documentation (`README.md` or files in `/docs`) if your changes affect user/developer usage.
5. Submit a PR! Provide a clear description of the problem you're solving and how you've solved it.

---

## 💬 Getting Help
If you get stuck, please review the `docs/gridlock_feature_list.md` for architectural context and feature expectations. For specific issues, feel free to open a "Question" issue on GitHub.

Happy building! 🎉
