from flask import Blueprint, jsonify
import requests
#create a Blueprint (name, import_name)
autofill_bp = Blueprint('autofill', __name__)

@autofill_bp.route('/autofill')
def autofill():
    url = "https://www.sec.gov/files/company_tickers.json"
    headers = {"User-Agent": "MyApp/1.0 (email@example.com)"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise an error for 4xx/5xx codes
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        data = {}
    except ValueError as e:  # JSON decode error
        print(f"JSON decode error: {e}")
        data = {}

    return jsonify(data)

