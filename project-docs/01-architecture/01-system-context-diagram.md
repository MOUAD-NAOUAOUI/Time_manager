# System Context Diagram

## 1. Overview
The System Context Diagram establishes the boundaries of the TimeSpace system, illustrating how external human actors and external software systems interact with TimeSpace.

## 2. Mermaid Diagram
`mermaid
flowchart TD
    User([End User / Knowledge Worker])
    
    subgraph TimeSpaceSystem [TimeSpace Intelligent System]
        Core[TimeSpace Application Platform]
    end
    
    GroqCloud[Groq Cloud LLM API\nllama-3.3-70b / gpt-oss-120b]
    StripeAPI[Stripe Billing & Subscription API]
    
    User -->|Tracks sessions, creates tasks, views coaching| Core
    Core -->|Sends LLM prompts for reasoning & coaching| GroqCloud
    Core -->|Processes customer checkout & subscription webhooks| StripeAPI
`

## 3. External Entities
- **End User**: Interacts via web browser over HTTPS; manages focus sessions, reviews AI coaching, and plans weekly time.
- **Groq Cloud API**: Provides ultra-fast inference for natural language decomposition, productivity analysis, and schedule explanations.
- **Stripe API**: Manages customer billing, subscription tiers (Free, Pro), and payment webhooks.
