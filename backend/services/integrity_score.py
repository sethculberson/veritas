
import math
from statistics import mean
from datetime import datetime, timedelta
import yfinance as yf

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

# --- Core scoring components ---

def time_score(trade_date, event_date, W_before=30, tau=7):
    """Scores how close the trade is to a major event (before it)."""
    delta = (event_date - trade_date).days
    if delta <= 0 or delta > W_before:
        return 0.0
    return math.exp(-delta / tau)

def sentiment_match_score(trade_type, sentiment, confidence):
    """Scores whether the trade aligns suspiciously with sentiment."""
    pol = {'positive': 1, 'neutral': 0, 'negative': -1}.get(sentiment, 0)
    match = 0
    if trade_type == 'sell' and pol < 0:
        match = 1
    if trade_type == 'buy' and pol > 0:
        match = 1
    return match * confidence * abs(pol)

def compute_car(prices, event_idx, N=3, est_window=60):
    """Computes cumulative abnormal return (CAR) around the event."""
    def returns(series):
        return [(series[i+1] - series[i]) / series[i] for i in range(len(series)-1)]

    if event_idx < 2 or event_idx >= len(prices) - N - 1:
        return 0.0

    historical = [p[1] for p in prices[max(0, event_idx - est_window):event_idx + 1]]
    hist_rets = returns(historical)
    if not hist_rets:
        return 0.0
    expected = mean(hist_rets)

    window_prices = [p[1] for p in prices[event_idx:event_idx + N + 1]]
    window_rets = returns(window_prices)
    ar = [r - expected for r in window_rets]
    return sum(ar)

def price_movement_score(car, car_threshold=0.03, scale=0.02, sentiment=None):
    """Scores how strongly the price moved abnormally after the event."""
    mag = abs(car)
    raw = sigmoid((mag - car_threshold) / scale)
    bonus = 0.0
    if sentiment in ['positive', 'negative']:
        pol = {'positive': 1, 'negative': -1}[sentiment]
        if car * pol > 0:  # price moved in expected direction
            bonus = 0.5
    return min(1.0, raw * (1 + bonus))

def trade_size_score(shares, insider_shares=None, outstanding=None):
    """Scores how large the trade was relative to total or insider holdings."""
    denom = insider_shares or outstanding or 1e9
    q = shares / denom
    if q <= 0.0001:
        return 0.0
    if q >= 0.01:
        return 1.0
    return (q - 0.0001) / (0.01 - 0.0001)


# --- Main integrity function ---

def integrity_score(trade, prices, events):
    """
    trade: dict with keys {'type','shares','insider_holdings','total_outstanding','date'}
    prices: list of tuples [(date, close_price)]
    events: list of dicts [{'date','sentiment','confidence'}]
    insider_history: list of prior risk flags (optional)
    """
    # Find nearest event within 30 days after trade
    candidate_events = [e for e in events if 0 < (e['date'] - trade['date']).days <= 30]
    if not candidate_events:
        T = S = P = 0
    else:
        event = min(candidate_events, key=lambda e: (e['date'] - trade['date']).days)
        T = time_score(trade['date'], event['date'])
        S = sentiment_match_score(trade['type'], event['sentiment'], event['confidence'])
        # Find index of event date in price list
        event_idx = next((i for i, p in enumerate(prices) if p[0] == event['date']), None)
        if event_idx is None:
            P = 0
        else:
            CAR = compute_car(prices, event_idx)
            P = price_movement_score(CAR, sentiment=event['sentiment'])

    Q = trade_size_score(trade['shares'],
                         insider_shares=trade.get('insider_holdings'),
                         outstanding=trade.get('total_outstanding'))
    

    # Weighted combination
    wT, wS, wP, wQ = 0.30, 0.30, 0.25, 0.15,
    risk = wT*T + wS*S + wP*P + wQ*Q
    risk = max(0.0, min(1.0, risk))
    integrity = round(5 * (1 - risk), 2)

    return integrity, {'risk': risk, 'T': T, 'S': S, 'P': P, 'Q': Q}

