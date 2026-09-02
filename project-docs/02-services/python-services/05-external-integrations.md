# External Integrations

## 1. Groq Cloud LLM API
- **Client**: `groq.Groq(api_key=os.environ.get("GROQ_API_KEY"))`
- **Default Model**: `llama-3.3-70b-versatile` (with fallback to `openai/gpt-oss-120b`).
- **Features**: Ultra-low latency inference (<500ms response time) enabling real-time conversational scheduling.

## 2. Internal Auth Handshake
- Requests from the Java backend include an internal security header `X-Internal-Token` to prevent unauthorized external access when exposed on a shared network.
