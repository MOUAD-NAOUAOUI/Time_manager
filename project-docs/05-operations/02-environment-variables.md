# Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `smart_time` | Database name |
| `DB_USER` | `admin` | Database username |
| `DB_PASSWORD` | `ONEPIECE1000ONEPIECE56` | Database password |
| `JWT_SECRET` | *(256-bit key)* | Secret key for signing JWTs |
| `JWT_EXPIRATION` | `86400000` | JWT validity in ms (24 hours) |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `GROQ_API_KEY` | *(empty)* | Groq LLM API Key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | LLM model name |
| `AI_SERVICE_INTERNAL_TOKEN` | `dev-internal-token` | Shared secret between Java & Python |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8080` | Core backend URL for browser |
| `NEXT_PUBLIC_AI_API_URL` | `http://127.0.0.1:8000` | AI service URL for browser |
