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
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def fetch_document_content(url, form_type=""):
    """
    Fetch and parse content from SEC document URL
    
    Args:
        url: SEC document URL
        form_type: Type of SEC form (e.g., "10-K", "10-Q", "8-K")
    
    Returns:
        Extracted text content (full content for 10-K, limited for others)
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        text_content = soup.get_text()
        lines = [line.strip() for line in text_content.splitlines() if line.strip()]
        content = ' '.join(lines)
        
        # For 10-K forms, return full content without character limit
        if form_type == "10-K":
            return content
        else:
            return content[:8000]
    except Exception as e:
        return f"Failed to fetch content: {str(e)}"

def analyze_with_gemini(sec_data):
    """
    Analyze SEC filings with Gemini Flash 2.0.
    
    Args:
        sec_data: Parsed SEC data dictionary
    
    Returns:
        Dictionary with summary per document, sentiment, and links
    """
    try:
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        document_analyses = []
        
        if "filings" in sec_data:
            for form_type, filings in sec_data["filings"].items():
                for filing in filings:
                    filing_url = filing.get("filing_metadata", {}).get("url", "")
                    
                    if filing_url:
                
                        document_content = fetch_document_content(filing_url, form_type)
                        
                        linked_content = []
                        for link in filing.get("links", [])[:3]:
                            link_content = fetch_document_content(link, form_type)
                            if form_type == "10-K":
                                linked_content.append(link_content)
                            else:
                                linked_content.append(link_content[:6000])
                        
                        all_content = document_content
                        if linked_content:
                            all_content += "\n\nLinked Documents:\n" + "\n".join(linked_content)
                        
                        # Different prompts based on form type
                        if form_type == "10-K":
                            prompt = f"""Analyze this comprehensive {form_type} SEC annual filing and provide exactly:
                                1. A detailed summary in 5-10 sentences covering key business developments, financial performance, strategic initiatives, risks, and outlook
                                2. Sentiment: positive/negative/neutral

                                Company: {sec_data.get('company', {}).get('name', 'Unknown')}
                                Filing Type: {form_type}
                                Document Content: {all_content}

                                Format your response as:
                                Summary: [5-10 sentences about key developments, financial highlights, strategic initiatives, and business outlook]
                                Sentiment: [positive/negative/neutral]"""
                        else:
                            prompt = f"""Analyze this {form_type} SEC filing and provide exactly:
                                1. One sentence summary of key developments and financial highlights
                                2. Sentiment: positive/negative/neutral

                                Company: {sec_data.get('company', {}).get('name', 'Unknown')}
                                Filing Type: {form_type}
                                Document Content: {all_content[:6000]}

                                Format your response as:
                                Summary: [one sentence about key developments]
                                Sentiment: [positive/negative/neutral]"""
                        
                        response = model.generate_content(prompt)
                        analysis_text = response.text.strip()
                        
                        summary_line = ""
                        sentiment = "neutral"
                        
                        for line in analysis_text.split('\n'):
                            if line.startswith('Summary:'):
                                summary_line = line.replace('Summary:', '').strip()
                            elif line.startswith('Sentiment:'):
                                sentiment = line.replace('Sentiment:', '').strip().lower()
                        
                        if not summary_line:
                            summary_line = analysis_text.split('\n')[0]
                        
                        filing_info = {
                            "form": form_type,
                            "summary": summary_line,
                            "sentiment": sentiment,
                            "url": filing_url,
                            "date": filing.get("filing_metadata", {}).get("filingDate", ""),
                            "links": filing.get("links", [])
                        }
                        
                        document_analyses.append(filing_info)
        
        return {
            "documents": document_analyses
        }
    except Exception as e:
        return {
            "error": str(e),
            "documents": []
        }

def get_sec_filings_json(cik, form_types=["8-K", "10-Q", "10-K"], limit=4):
    """
    Get SEC filings for a company as JSON (for Gemini input)
    
    Args:
        cik: Company CIK number (string or int)
        form_types: List of form types ["8-K", "10-Q", "10-K"]
        limit: Number of recent filings per type
    
    Returns:
        JSON string ready for Gemini analysis
    """
    try:
        results = parse_sec_filings(str(cik), limit, form_types=form_types)
        return json.dumps(results, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": f"Failed to parse SEC filings: {e}"})

def main():
    """Example usage. Will default to Apple if none provided.

    when in virtual environment
    python services/sec_for_gemini.py CIK
    """
    import sys
    
    cik = sys.argv[1] if len(sys.argv) > 1 else "320193"
    
    try:
        results = parse_sec_filings(str(cik), 2, ["8-K", "10-Q", "10-K"])
        analysis = analyze_with_gemini(results)
        
        output = {
            "analysis": analysis
        }
        
        print(json.dumps(output, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"Failed to process: {e}"}))

if __name__ == "__main__":
    main()