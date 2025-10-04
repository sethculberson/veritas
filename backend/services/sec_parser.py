import requests
import json
from urllib.parse import urljoin
from bs4 import BeautifulSoup

class UniversalSECParser:
    """
    Universal SEC form parser for 8-K, 10-Q, and 10-K documents.
    Extracts links and content from all form types.
    """
    def __init__(self):
        self.headers = {
            # Use your email here per SEC fair-use policy
            'User-Agent': 'Individual Researcher fynnbuesnel@gmail.com'
        }

    def get_company_filings(self, cik, form_type, limit):
        """
        Get recent SEC filings for any company by CIK.
        """
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"

        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            data = response.json()

            company_info = {
                "name": data.get('name', 'Unknown'),
                "cik": cik.lstrip('0'),
                "sic": data.get('sic', ''),
                "sicDescription": data.get('sicDescription', ''),
                "phone": data.get('phone', ''),
                "businessAddress": data.get('businessAddress', {})
            }

            recent_filings = data.get('filings', {}).get('recent', {})

            if recent_filings:
                forms = recent_filings.get('form', [])
                filing_dates = recent_filings.get('filingDate', [])
                accession_numbers = recent_filings.get('accessionNumber', [])
                primary_documents = recent_filings.get('primaryDocument', [])

                filtered_filings = []
                count = 0

                for i, form in enumerate(forms):
                    if form == form_type and count < limit:
                        filing_info = {
                            "form": form,
                            "filingDate": filing_dates[i],
                            "accessionNumber": accession_numbers[i],
                            "primaryDocument": primary_documents[i],
                            "url": self._construct_filing_url(cik.lstrip('0'), accession_numbers[i], primary_documents[i])
                        }
                        filtered_filings.append(filing_info)
                        count += 1

                return company_info, filtered_filings

            return company_info, []

        except Exception:
            # Keep same surface behavior you had
            return None, []

    def _construct_filing_url(self, cik, accession_number, primary_document):
        """Construct the URL to the actual filing document"""
        accession_clean = accession_number.replace('-', '')
        return f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession_clean}/{primary_document}"

    def get_links_form(self, filing_url):
        """
        Get all <a href> links and their text from a 10-Q filing page.
        Returns a dict: {"links": [ absolute_urls ]}
        """
        try:
            resp = requests.get(filing_url, headers=self.headers, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            links = []
            for a in soup.find_all('a', href=True):
                href = a['href'].strip()
                # Skip mailto/javascript/etc.
                if href.lower().startswith(('mailto:', 'javascript:', '#')):
                    continue

                abs_url = urljoin(filing_url, href)
                links.append(abs_url)

            return {"links": links}

        except Exception as e:
            return {"error": f"Failed to fetch 10-Q links: {e}"}

def parse_sec_filings(cik, limit, form_types=["8-K", "10-Q", "10-K"]):
    """
    Parse SEC filings and return structured JSON data.
    For 8-K, 10-Q, and 10-K, we extract all links from each filing page.
    """
    parser = UniversalSECParser()

    results = {
        "company": None,
        "filings": {}
    }

    for form_type in form_types:
        company_info, filings = parser.get_company_filings(cik, form_type, limit)

        if not company_info:
            # Skip this form type on error / no company
            continue

        if not results["company"]:
            results["company"] = company_info

        parsed_filings = []

        for filing in filings:
            if form_type == "8-K":
                parsed_data = parser.get_links_form(filing['url'])
            elif form_type == "10-Q":
                parsed_data = parser.get_links_form(filing['url'])
            elif form_type == "10-K":
                parsed_data = parser.get_links_form(filing['url'])
            else:
                # Skip unsupported form types
                continue

            # Ensure parsed_data is a dict so we can attach metadata
            if isinstance(parsed_data, dict):
                parsed_data["filing_metadata"] = filing
            else:
                # Fallback: wrap in dict
                parsed_data = {
                    "links": parsed_data,
                    "filing_metadata": filing
                }

            parsed_filings.append(parsed_data)

        results["filings"][form_type] = parsed_filings

    return results

def main():
    """CLI entrypoint"""
    import sys

    # Get CIK from command line argument or default to Apple
    cik = sys.argv[1] if len(sys.argv) > 1 else "320193"

    results = parse_sec_filings(cik, limit=5, form_types=["8-K", "10-Q", "10-K"])
    print(json.dumps(results, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
