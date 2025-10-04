import os
from datetime import datetime
from typing import List, Dict, Optional
from pymongo import MongoClient
import json
from dotenv import load_dotenv
import re
load_dotenv()
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Warning: SentenceTransformers not installed. Please run 'pip install sentence-transformers'")
    SentenceTransformer = None

MONGO_URI = os.environ.get("MONGO_URI")

# MongoDB Settings
DB_NAME = "HackHarvard"
VECTOR_COLLECTION = "sentiment_vectors" 
VECTOR_INDEX_NAME = "vector_index_sentiment"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
VECTOR_DIMENSIONS = 384

try:
    if SentenceTransformer:
        # Load model from disk/cache - this is the slow step that happens once
        model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print(f"Local embedding model {EMBEDDING_MODEL_NAME} loaded.")
    else:
        model = None
    mongo_client = MongoClient(MONGO_URI)
    db_collection = mongo_client[DB_NAME][VECTOR_COLLECTION]
    print("MongoDB client initialized successfully.")

except Exception as e:
    print(f"Initialization failed: {e}")
    model = None
    mongo_client = None
    db_collection = None

def get_embedding(text: str) -> Optional[List[float]]:
    """Generates a 384-dimensional vector embedding for the input text using SBERT."""
    if not model:
        return None
    try:
        embedding = model.encode(text).tolist()
        return embedding
    except Exception as e:
        print(f"Error generating local embedding: {e}")
        return None

def setup_initial_sentiment_vectors():
    """
    TRAINS THE MODEL by generating vectors for pre-labeled text snippets and 
    inserting them into the MongoDB Atlas collection. This should only be run ONCE.
    """
    if db_collection is None:
        print("Cannot run setup: MongoDB or local model not initialized.")
        return
    
    db_collection.delete_many({})
    print(f"Cleared collection and preparing to insert {len(TRAINING_DATA)} training vectors...")
    
    documents_to_insert = []
    for text, impact in TRAINING_DATA:
        # Generate embedding using the local model
        embedding = get_embedding(text)
        if embedding:
            documents_to_insert.append({
                "text_snippet": text,
                "impact": impact,
                "plot_embedding": embedding, 
                "timestamp": datetime.utcnow()
            })
            
    if documents_to_insert:
        db_collection.insert_many(documents_to_insert)
        print(f"Successfully inserted {len(documents_to_insert)} labeled vectors.")
    else:
        print("Failed to generate any embeddings for insertion.")

def predict_impact_vector_search(filing_text: str) -> Dict[str, str]:
    """
    Classifies financial impact using near-instant Vector Search.
    FIX: Increased search candidates and adjusted confidence thresholds 
    to prevent uniform 'NEUTRAL, LOW CONFIDENCE' results.
    """
    if db_collection is None:
        return {"impact": "ERROR", "confidence": "None"}

    query_vector = get_embedding(filing_text)
    
    if not query_vector:
        return {"impact": "NEUTRAL", "confidence": "Low"}

    filing_text = re.sub(r'[^a-zA-Z0-9]', '', filing_text)

    try:
        pipeline = [
            {
                '$vectorSearch': {
                    "queryVector": query_vector,
                    "path": "plot_embedding",
                    "numCandidates": 100,  # INCREASED from 50 to 150 for better search breadth
                    "limit": 10,           # Increased from 5 to 10 for more votes
                    "index": VECTOR_INDEX_NAME,
                }
            },
            {
                '$project': {
                    "impact": 1,
                    "score": {'$meta': 'vectorSearchScore'}, 
                    "_id": 0 
                }
            }
        ]
        
        results = list(db_collection.aggregate(pipeline))
        
        if not results:
             return {"impact": "NEUTRAL", "confidence": "Low"}

        # 3. Aggregate Votes and Determine Confidence
        vote_counts = {"STOCK_UP": 0, "STOCK_DOWN": 0, "NEUTRAL": 0}
        total_score_sum = 0
        
        # Weigh votes by score (cosine similarity score)
        for res in results:
            impact_type = res.get('impact', 'NEUTRAL')
            score = res.get('score', 0)
            
            if impact_type in vote_counts:
                vote_counts[impact_type] += score 
            total_score_sum += score

        # Determine the winner based on weighted votes
        most_voted_impact = max(vote_counts, key=vote_counts.get)
        
        # Confidence is the winning weighted score divided by the total score
        confidence_level = vote_counts[most_voted_impact] / total_score_sum
        
        # ADJUSTED CONFIDENCE THRESHOLDS (A simple majority is now "High" confidence)
        confidence = "High" if confidence_level >= 0.60 else "Moderate" if confidence_level >= 0.4 else "Low"

        return {"impact": most_voted_impact, "confidence": confidence}

    except Exception as e:
        print(f"MongoDB Vector Search error: {e}")
        return {"impact": "ERROR", "confidence": "None"}
    