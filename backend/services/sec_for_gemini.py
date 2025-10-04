#!/usr/bin/env python3
"""
Simple SEC Parser for Gemini Integration
Parse SEC filings for any company and return clean JSON output
"""

import json
import os
import requests
from bs4 import BeautifulSoup
from sec_parser import parse_sec_filings
from dotenv import load_dotenv
from ai_tools import predict_impact_vector_search
import re
load_dotenv()

FINAL_STOP_PHRASES = ["SIGNATURE"] 
# These are internal stops to prevent one Item's content from bleeding into the next Item.
INTERNAL_STOP_PHRASES = ["EXHIBIT INDEX", "FINANCIAL STATEMENTS"]
ITEM_HEADER_PATTERN = re.compile(r"Item\s\d\.\d{2}", re.IGNORECASE)

def fetch_document_content(url: str):
    """
    Fetches an SEC 8-K filing and extracts the entire narrative block
    following any 'Item X.XX' disclosure, stopping only at the next Item, 
    the Exhibit Index, or the mandatory SIGNATURE block.

    Args:
        url: The direct link to the SEC 8-K filing.

    Returns:
        A dictionary mapping the Item heading (e.g., "Item 5.02") to its single, 
        concatenated narrative text block.
    """
    
    try:
        # 1. Fetch the HTML Content with a detailed, polite User-Agent
        headers = {
            'User-Agent': 'Veritas contact@example.com (Contact: yourname@yourdomain.com)',
            'Accept-Encoding': 'gzip, deflate',
            'Host': 'www.sec.gov'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status() 
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
    except requests.exceptions.RequestException as e:
        return {"ERROR": f"Failed to fetch content: {e}"}
    extracted_data = []
    # We iterate through all elements that are likely to contain structured text
    # This loop tracks where we are in the document flow.
    for tag in soup.find_all(lambda tag: tag.get_text(strip=True) and tag.name not in ['head', 'script', 'style']):
        text = tag.get_text(strip=True)
        start = "Item"
        end = "SIGNATURE"
        start_index = text.find(start)
        narrative_start = start_index + len(start)
        signature_index = text.find(end)
        clean_narrative = re.sub(
            r'\s+',                                      # Regex to find one or more whitespace characters
            ' ',                                        # Replace them with a single space
            text[narrative_start:signature_index]  # Slice the exact substring
        ).strip() 
        extracted_data.append(clean_narrative)
    return extracted_data[0]

def analyze_with_gemini(sec_data):
    """
    Analyze SEC filings with Gemini Flash 2.0.
    
    Args:
        sec_data: Parsed SEC data dictionary
    
    Returns:
        Dictionary with summary per document, sentiment, and links
    """
    analysis = predict_impact_vector_search(sec_data)

    return {
        "vector_prediction": analysis,
        "summary": sec_data
    }

def get_sec_filings_json(cik, form_types=["8-K"], limit=4):
    """
    Get SEC filings for a company as JSON (for Gemini input)
    
    Args:
        cik: Company CIK number (string or int)
        form_types: List of form types ["8-K"]
        limit: Number of recent filings per type
    
    Returns:
        JSON string ready for Gemini analysis
    """
    try:
        results = parse_sec_filings(str(cik), limit, form_types=form_types)
        return json.dumps(results, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": f"Failed to parse SEC filings: {e}"})

def getSentiment(cik):
    """Example usage. Will default to Apple if none provided.

    when in virtual environment
    python services/sec_for_gemini.py CIK
    """
    
    try:
        results = parse_sec_filings(str(cik), 2, ["8-K"])
        anals = []
        filings = results["filings"]
        eightklist = filings["8-K"]
        for item in eightklist:
            words = fetch_document_content(item["filing_metadata"]["url"])
            analysis = analyze_with_gemini(words)
            dat = {
                "vector_prediction":analysis,
                "filing_date":item["filing_metadata"]["filingDate"],
                "url":item["filing_metadata"]["url"]
            }
            anals.append(dat)
        output = {
            "analysis": anals
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"Failed to process: {e}"}))