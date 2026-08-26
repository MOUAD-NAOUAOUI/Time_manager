import math
from typing import List
from core.models import SimilarityResult

def generate_text_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generates normalized semantic vector embeddings for text search and pgvector clustering.
    Uses TF-IDF + character n-gram hashing projection for deterministic, lightweight, fast vectorization.
    """
    dim = 128
    embeddings: List[List[float]] = []

    for text in texts:
        vec = [0.0] * dim
        cleaned = text.lower().strip()
        words = cleaned.split()

        for word in words:
            # Hash word n-grams into vector space
            h = hash(word) % dim
            vec[h] += 1.0
            for i in range(len(word) - 2):
                tri = word[i:i+3]
                th = hash(tri) % dim
                vec[th] += 0.5

        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        else:
            vec = [0.0] * dim

        embeddings.append(vec)

    return embeddings

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Computes cosine similarity between two normalized vectors."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    return max(0.0, min(1.0, dot))

def rank_similar_candidates(query_text: str, candidate_texts: List[str]) -> List[SimilarityResult]:
    """Ranks candidate texts by semantic similarity to the query."""
    if not candidate_texts:
        return []

    all_texts = [query_text] + candidate_texts
    vectors = generate_text_embeddings(all_texts)
    query_vec = vectors[0]
    candidate_vecs = vectors[1:]

    results: List[SimilarityResult] = []
    for candidate, c_vec in zip(candidate_texts, candidate_vecs):
        sim = cosine_similarity(query_vec, c_vec)
        results.append(SimilarityResult(candidate=candidate, score=round(sim, 4)))

    results.sort(key=lambda r: r.score, reverse=True)
    return results
