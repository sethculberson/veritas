from flask import Blueprint, jsonify
import json
import os
#create a Blueprint (name, import_name)
autofill_bp = Blueprint('autofill', __name__)

def get_stock_tickers():
    # Use local company_tickers.json file instead of API call
    file_path = os.path.join(os.path.dirname(__file__), '..', 'company_tickers.json')
    
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
    except FileNotFoundError:
        print(f"Local company_tickers.json file not found at {file_path}")
        data = {}
    except json.JSONDecodeError as e:
        print(f"JSON decode error reading local file: {e}")
        data = {}
    except Exception as e:
        print(f"Error reading local company_tickers.json: {e}")
        data = {}

    return data

@autofill_bp.route('/autofill')
def autofill():
    data = get_stock_tickers()

    return jsonify(data)

