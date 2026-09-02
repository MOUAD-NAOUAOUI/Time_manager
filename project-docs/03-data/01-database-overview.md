# Database Overview

## 1. Database Technologies
- **Primary Relational Store**: PostgreSQL 16
  - Chosen for ACID transactional guarantees, strong foreign key constraints, and mature index types (B-Tree, GiST, GIN).
- **Vector Database Capability**: `pgvector` Extension
  - Enables in-database similarity search (`vector(1536)`) without introducing an additional external vector database (like Pinecone or Weaviate).
- **In-Memory Cache & Rate Limiting**: Redis 7
  - Provides sub-millisecond atomic key-value operations for sliding-window token-bucket rate limiting.

## 2. Migration & Schema Initialization
- Schema definitions are declared in `database/init.sql` and `core-backend/src/main/resources/schema.sql`.
- Hibernate JPA DDL (`spring.jpa.hibernate.ddl-auto=update`) automatically keeps entities synchronized in development environments.
