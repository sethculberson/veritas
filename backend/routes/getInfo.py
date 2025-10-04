from services.sec_for_gemini import getSentiment
from flask import Blueprint, jsonify
import requests
from bs4 import BeautifulSoup
import sys
import os

# Add the services directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services'))
from services.stockPrice import get_stock_data
from routes.autofill import get_stock_tickers

# create a Blueprint (name, import_name)
getInfo_bp = Blueprint('getInfo', __name__)

def get_company_by_cik(cik: int):
    data = get_stock_tickers()

    for entry in data.values():
        if entry["cik_str"] == cik:
            return entry["ticker"], entry["title"]
    return None, None

def get_company(cik):
    HEADERS = {"User-Agent": "Your Name your.email@example.com"}
    url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    
    try:
        resp = requests.get(url, headers=HEADERS)
        resp.raise_for_status()  # This will raise an exception for 4xx and 5xx status codes
        data = resp.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            print(f"Rate limit hit while fetching company submissions for CIK {cik}: {e}")
            # Re-raise the 429 error to be caught by the route handler
            raise e
        print(f"HTTP error fetching company submissions for CIK {cik}: {e}")
        raise e
    except requests.exceptions.RequestException as e:
        print(f"Error fetching company submissions for CIK {cik}: {e}")
        raise e
    
    form4_filings = []
    for filing, form in zip(data["filings"]["recent"]["accessionNumber"], 
                            data["filings"]["recent"]["form"]):
        if form == "4":
            form4_filings.append(filing)
            
    # Create dictionary to store owner information with trades
    owner_info = {}
    
    # Loop through the most recent 50 Form 4 filings and extract reporting owner details
    for idx, f in enumerate(form4_filings[:50]):
        accession = f.replace("-", "")
        
        # Try to fetch the filing directory listing first (index) and find XML link
        try:
            file_resp = requests.get(f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession}/", headers=HEADERS, timeout=10)
            file_resp.raise_for_status()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                print(f"Rate limit hit while fetching filing directory for {f}: {e}")
                # Immediately raise the 429 error to stop processing and return to frontend
                raise e
            print(f"HTTP error fetching filing directory for {f}: {e}")
            continue
        except requests.exceptions.RequestException as e:
            print(f"Error fetching filing directory for {f}: {e}")
            continue

        file_soup = BeautifulSoup(file_resp.text, 'html.parser')
        # look for .xml link
        xml_link_tag = file_soup.find('a', href=lambda href: href and href.endswith('.xml'))
        if not xml_link_tag:
            # sometimes the index page lists files differently; fallback to searching for files with .xml in text
            links = file_soup.find_all('a')
            xml_href = None
            for tag in links:
                href = tag.get('href', '')
                if '.xml' in href:
                    xml_href = href
                    break
            if xml_href:
                xml_file_url = xml_href
            else:
                print(f"No XML file link found for filing {f}")
                continue
        else:
            xml_file_url = xml_link_tag['href']

        # Ensure full URL
        if xml_file_url.startswith('/'):
            xml_full_url = f"https://www.sec.gov{xml_file_url}"
        elif xml_file_url.startswith('http'):
            xml_full_url = xml_file_url
        else:
            xml_full_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession}/{xml_file_url}"

        try:
            xml_resp = requests.get(xml_full_url, headers=HEADERS, timeout=10)
            xml_resp.raise_for_status()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                print(f"Rate limit hit while fetching XML file for {f}: {e}")
                # Immediately raise the 429 error to stop processing and return to frontend
                raise e
            print(f"HTTP error fetching XML file for {f}: {e}")
            continue
        except requests.exceptions.RequestException as e:
            print(f"Error fetching XML file for {f}: {e}")
            continue

        xml_soup = BeautifulSoup(xml_resp.text, 'xml')

        # Extract transactions from both tables
        transactions = []
        
        # Process non-derivative transactions
        non_deriv_transactions = xml_soup.find_all('nonDerivativeTransaction')
        for trans in non_deriv_transactions:
            trade = {}
            
            # Security title
            security_title = trans.find('securityTitle')
            trade['security'] = security_title.find('value').text if security_title and security_title.find('value') else 'N/A'
            
            # Transaction date
            trans_date = trans.find('transactionDate')
            trade['date'] = trans_date.find('value').text if trans_date and trans_date.find('value') else 'N/A'
            
            # Transaction code (M=Exercise, F=Tax withholding, S=Sale, etc.)
            trans_coding = trans.find('transactionCoding')
            if trans_coding:
                trade['transaction_code'] = trans_coding.find('transactionCode').text if trans_coding.find('transactionCode') else 'N/A'
            else:
                trade['transaction_code'] = 'N/A'
            
            # Transaction amounts
            trans_amounts = trans.find('transactionAmounts')
            if trans_amounts:
                shares = trans_amounts.find('transactionShares')
                trade['shares'] = float(shares.find('value').text) if shares and shares.find('value') else 0
                
                price = trans_amounts.find('transactionPricePerShare')
                if price and price.find('value'):
                    trade['price_per_share'] = float(price.find('value').text)
                else:
                    trade['price_per_share'] = None  # Could be exercise/grant with no price
                
                acq_disp = trans_amounts.find('transactionAcquiredDisposedCode')
                trade['acquired_disposed'] = acq_disp.find('value').text if acq_disp and acq_disp.find('value') else 'N/A'
            
            # Post-transaction amounts
            post_trans = trans.find('postTransactionAmounts')
            if post_trans:
                shares_owned = post_trans.find('sharesOwnedFollowingTransaction')
                trade['shares_owned_after'] = float(shares_owned.find('value').text) if shares_owned and shares_owned.find('value') else 0
            
            trade['transaction_type'] = 'non-derivative'
            transactions.append(trade)
        
        # Process derivative transactions (options, RSUs, etc.)
        deriv_transactions = xml_soup.find_all('derivativeTransaction')
        for trans in deriv_transactions:
            trade = {}
            
            # Security title
            security_title = trans.find('securityTitle')
            trade['security'] = security_title.find('value').text if security_title and security_title.find('value') else 'N/A'
            
            # Transaction date
            trans_date = trans.find('transactionDate')
            trade['date'] = trans_date.find('value').text if trans_date and trans_date.find('value') else 'N/A'
            
            # Transaction code
            trans_coding = trans.find('transactionCoding')
            if trans_coding:
                trade['transaction_code'] = trans_coding.find('transactionCode').text if trans_coding.find('transactionCode') else 'N/A'
            else:
                trade['transaction_code'] = 'N/A'
            
            # Transaction amounts
            trans_amounts = trans.find('transactionAmounts')
            if trans_amounts:
                shares = trans_amounts.find('transactionShares')
                trade['shares'] = float(shares.find('value').text) if shares and shares.find('value') else 0
                
                price = trans_amounts.find('transactionPricePerShare')
                if price and price.find('value'):
                    trade['price_per_share'] = float(price.find('value').text)
                else:
                    trade['price_per_share'] = None
                
                acq_disp = trans_amounts.find('transactionAcquiredDisposedCode')
                trade['acquired_disposed'] = acq_disp.find('value').text if acq_disp and acq_disp.find('value') else 'N/A'
            
            # Conversion/Exercise price
            conv_price = trans.find('conversionOrExercisePrice')
            if conv_price and conv_price.find('value'):
                trade['exercise_price'] = float(conv_price.find('value').text)
            else:
                trade['exercise_price'] = None
            
            # Underlying security
            underlying = trans.find('underlyingSecurity')
            if underlying:
                underlying_shares = underlying.find('underlyingSecurityShares')
                trade['underlying_shares'] = float(underlying_shares.find('value').text) if underlying_shares and underlying_shares.find('value') else 0
            
            # Post-transaction amounts
            post_trans = trans.find('postTransactionAmounts')
            if post_trans:
                shares_owned = post_trans.find('sharesOwnedFollowingTransaction')
                trade['shares_owned_after'] = float(shares_owned.find('value').text) if shares_owned and shares_owned.find('value') else 0
            
            trade['transaction_type'] = 'derivative'
            transactions.append(trade)

        # There can be multiple reportingOwner entries
        rptOwners = xml_soup.find_all('reportingOwner')
        if not rptOwners:
            print(f"No reportingOwner entries found in XML for {f}")
            continue

        for ro in rptOwners:
            name_tag = ro.find('rptOwnerName')
            owner_name = name_tag.text.strip() if name_tag else 'N/A'
            owner_cik_tag = ro.find('rptOwnerCik')
            owner_cik = owner_cik_tag.text.strip() if owner_cik_tag else 'N/A'

            # Get relationship information
            rel = ro.find('reportingOwnerRelationship')
            roles = []
            
            if rel:
                isDirector = rel.find('isDirector').text if rel.find('isDirector') else '0'
                isOfficer = rel.find('isOfficer').text if rel.find('isOfficer') else '0'
                officerTitle = rel.find('officerTitle').text if rel.find('officerTitle') else ''
                isTenPercentOwner = rel.find('isTenPercentOwner').text if rel.find('isTenPercentOwner') else '0'
                isOther = rel.find('isOther').text if rel.find('isOther') else '0'

                if isDirector == '1':
                    roles.append('Director')
                if isOfficer == '1':
                    roles.append(officerTitle or 'Officer')
                if isTenPercentOwner == '1':
                    roles.append('10% Owner')
                if isOther == '1':
                    roles.append('Other')

            # Update owner_info dictionary
            if owner_cik not in owner_info:
                owner_info[owner_cik] = {
                    'name': owner_name,
                    'cik': owner_cik,
                    'roles': set(roles),
                    'trades': transactions.copy()  # Copy transactions for this filing
                }
            else:
                # Update roles if new ones found
                owner_info[owner_cik]['roles'].update(roles)
                # Append new transactions
                owner_info[owner_cik]['trades'].extend(transactions.copy())
    
    # Convert sets to lists in the owner_info dictionary
    for owner_cik, info in owner_info.items():
        info['roles'] = list(info['roles'])
    
    # Convert the dictionary values to a list
    owner_info_list = list(owner_info.values())

    return owner_info_list


@getInfo_bp.route('/getInfo/<string:CIK>')
def getInfo(CIK):
    try:
        # Pad the CIK with leading zeros to ensure it's 10 digits
        # SEC expects CIKs to be 10 digits with leading zeros
        padded_cik = CIK.zfill(10)
        
        # Call the get_company function to fetch insider trading data
        owner_data = get_company(padded_cik)
        
        # Get stock data using the existing stock data function
        # For now, always use AAPL ticker
        ticker, _ = get_company_by_cik(int(CIK))
        print(ticker)

        # Get 1 year of stock data
        stock_data_raw = get_stock_data(ticker, period="1y", interval="1d")
        
        # Transform data for frontend consumption
        formatted_stock_data = []
        for entry in stock_data_raw:
            if entry and 'Close' in entry:
                # Convert timestamp to date string if needed
                date_str = entry.get('Date', entry.get('Datetime', ''))
                if hasattr(date_str, 'strftime'):
                    date_str = date_str.strftime('%Y-%m-%d')
                
                formatted_stock_data.append({
                    'date': str(date_str),
                    'price': round(float(entry['Close']), 2),
                    'open': round(float(entry.get('Open', 0)), 2),
                    'high': round(float(entry.get('High', 0)), 2),
                    'low': round(float(entry.get('Low', 0)), 2),
                    'volume': int(entry.get('Volume', 0))
                })

        # Calculate the sentiment
        sentiment = getSentiment(int(CIK))
        print("Sentiment:", sentiment)
        
        # Return the combined data as JSON
        return jsonify({
            "success": True,
            "cik": CIK,
            "padded_cik": padded_cik,
            "total_insiders": len(owner_data),
            "insiders": owner_data,
            "stock_data": formatted_stock_data,
            "ticker": ticker,
            "sentiment": sentiment,
        })
    
    except requests.exceptions.HTTPError as e:
        # Check if it's a rate limit error from SEC
        if hasattr(e, 'response') and e.response.status_code == 429:
            return jsonify({
                "success": False,
                "error": "SEC API rate limit exceeded. Please wait and try again.",
                "error_type": "rate_limit",
                "cik": CIK
            }), 429
        
        return jsonify({
            "success": False,
            "error": f"HTTP error occurred: {str(e)}",
            "cik": CIK
        }), 404
    
    except requests.exceptions.RequestException as e:
        return jsonify({
            "success": False,
            "error": f"Error fetching data from SEC: {str(e)}",
            "cik": CIK
        }), 500
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"An error occurred: {str(e)}",
            "cik": CIK
        }), 500