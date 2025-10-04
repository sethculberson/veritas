import yfinance as yf
from datetime import datetime

# Get current date
current_date = datetime.now().strftime("%Y-%m-%d")
# Get date one year ago
start_date = (datetime.now().replace(year=datetime.now().year - 1)).strftime("%Y-%m-%d")

print(current_date, start_date)

stock_data = yf.download("AAPL", start=start_date, end=current_date)

def get_stock_data(ticker, period="1y", interval="1d"):
    """
    Fetch stock data for a given ticker symbol over a specified period and interval.
    """
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period, interval=interval)
    
    # Reset index to include date as a column
    hist_reset = hist.reset_index()
    
    # Convert to records with proper date handling
    records = []
    for _, row in hist_reset.iterrows():
        record = {
            'Date': row['Date'].strftime('%Y-%m-%d'),
            'Close': row['Close'],
        }
        records.append(record)
    
    return records