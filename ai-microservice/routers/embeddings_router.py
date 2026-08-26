from fastapi import APIRouter
from core.models import EmbeddingRequest, EmbeddingResponse, SimilarityRequest, SimilarityResponse
from services.embeddings_service import generate_text_embeddings, rank_similar_candidates

router = APIRouter(prefix="/embeddings", tags=["Embeddings"])

@router.post("/generate", response_model=EmbeddingResponse)
def create_embeddings(request: EmbeddingRequest):
    """Generates normalized vector embeddings for pgvector storage and semantic search."""
    vectors = generate_text_embeddings(request.texts)
    dim = len(vectors[0]) if vectors else 0
    return EmbeddingResponse(embeddings=vectors, dimension=dim)

@router.post("/similarity", response_model=SimilarityResponse)
def evaluate_similarity(request: SimilarityRequest):
    """Evaluates cosine semantic similarity between a query and candidate task texts."""
    ranked = rank_similar_candidates(request.query_text, request.candidate_texts)
    return SimilarityResponse(results=ranked)
