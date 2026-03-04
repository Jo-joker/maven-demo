# AGENTS.md

## Cursor Cloud specific instructions

This is a **Spring Boot 2.2.1 Java demo application** (Alibaba Codeup). It is a single self-contained service with no external dependencies (no database, no Docker, no Node.js).

### Prerequisites

- **Java JDK 21** (pre-installed; pom.xml targets Java 8 but builds fine on 21)
- **Maven 3.8+** (installed via `sudo apt-get install -y maven`; the `mvnw` wrapper is broken because `.mvn/wrapper/` is missing from the repo)

### Key commands

| Task | Command |
|---|---|
| Build | `mvn -B package --file pom.xml` |
| Test | `mvn -B test` |
| Run (dev) | `mvn spring-boot:run` |

### Application endpoints (port 8080)

- `GET /` — random greeting ("Welcome to Codeup" or "Nice to meet you")
- `POST /upload` — file upload (multipart form, field name `file`); redirects to `/success.html` or `/error.html`
- `GET /upload.html` — upload form UI
- `GET /china-5a-travel/index.html` — static travel attractions browser (use `/index.html` explicitly; trailing-slash route returns 404)

### Gotchas

- The Maven wrapper (`./mvnw`) will fail because `.mvn/wrapper/` directory is absent. Use system `mvn` instead.
- The travel page must be accessed at `/china-5a-travel/index.html` (not `/china-5a-travel/`).
- No linter is configured in this project (no Checkstyle, PMD, or SpotBugs plugins in pom.xml). The CI only runs `mvn -B package`.
