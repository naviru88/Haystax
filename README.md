# Haystax - Boarding Management System (Monorepo)

Welcome to **Haystax**, a 3-member Boarding Management System built with **Angular**, **Spring Boot**, and **Supabase PostgreSQL**.

---

## 📁 Repository Structure Overview

```text
haystax/
├── frontend/             # Angular SPA (Shared by Member 1, Member 2, Member 3)
├── backend/              # Spring Boot Main App (Discovery + Owner + Engagement Services)
├── notification-service/ # Spring Boot WebSocket/SSE Consumer (Member 3 Ownership)
├── infra/                # Docker Compose, Nginx Reverse Proxy, PostgreSQL Scripts
├── docs/                 # OpenAPI Spec, Page Contracts, Event Schemas, Architecture Records
├── .github/workflows/    # CI/CD Pipelines
└── docker-compose.yml    # Monorepo Docker Compose Root
```

---

## 👑 Ownership Map & Rules

| Path | Owner | Editable by Others? |
| :--- | :--- | :--- |
| `frontend/src/app/features/discovery/` | **Member 1** | ❌ No (PR review only) |
| `frontend/src/app/features/owner-identity/` | **Member 2** | ❌ No (PR review only) |
| `frontend/src/app/features/engagement/` | **Member 3** | ❌ No (PR review only) |
| `frontend/src/app/core/` | Shared | ⚠️ Yes (with review) |
| `frontend/src/app/shared/` | Shared | ⚠️ Yes (with review) |
| `backend/src/main/java/com/haystax/discovery/` | **Member 1** | ❌ No (PR review only) |
| `backend/src/main/java/com/haystax/owner/` | **Member 2** | ❌ No (PR review only) |
| `backend/src/main/java/com/haystax/engagement/` | **Member 3** | ❌ No (PR review only) |
| `backend/src/main/java/com/haystax/common/` | Shared | ⚠️ Yes (with review) |
| `notification-service/` | **Member 3** | ❌ No (PR review only) |
| `infra/` | Shared | ⚠️ Yes (with review) |
| `docs/` | Shared | ⚠️ Yes (with review) |

---

## 📌 Strict Architectural Rules for Member Isolation (Weeks 1–3)

1. **No Direct Slice Imports**: Feature modules (`discovery`, `owner-identity`, `engagement`) must **never** import files directly from another feature folder. Cross-slice communication is done strictly through shared contracts in `docs/` or interfaces in `core/models/`.
2. **Private Repositories & Data**: Backend packages (`com.haystax.discovery`, `com.haystax.owner`, `com.haystax.engagement`) must not query or inject another member's Spring Data Repositories or PostgreSQL table groups directly. Inter-slice interaction is strictly via REST API or RabbitMQ events.
3. **Isolated Mocks**: Each member owns their mock fixtures in `frontend/src/app/features/<slice>/mocks/` and mock services. In Week 4, mocks will be cleanly swapped out for live API calls behind identical service interfaces.
