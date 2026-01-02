from flask import Flask, jsonify, request
from flask_cors import CORS
import gspread
from google.oauth2.service_account import Credentials
import os
from datetime import datetime
from dotenv import load_dotenv
import numpy as np
from scipy.optimize import newton
import sys
import os as os_module
import json

# Force unbuffered output
os_module.environ['PYTHONUNBUFFERED'] = '1'

load_dotenv()

# Configure logging to ensure output is visible
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Disable Flask's default request logging to use our custom one
log = logging.getLogger('werkzeug')
log.setLevel(logging.WARNING)

# Google Sheets configuration
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

# Mock data for local testing (when Google Sheets is not configured)
MOCK_PORTFOLIO_DATA = {
    "totalValue": 1250000,
    "totalInvested": 1000000,
    "unrealizedPL": 250000,
    "realizedPL": 50000,
    "assetBreakdown": [
        {"class": "Equity", "value": 750000, "percentage": 60},
        {"class": "Mutual Funds", "value": 300000, "percentage": 24},
        {"class": "PPF", "value": 150000, "percentage": 12},
        {"class": "Gold", "value": 50000, "percentage": 4}
    ]
}

MOCK_ASSETS = {
    "equity": [
        {
            "id": "hdfc", "name": "HDFC Bank", "units": 100,
            "value": 165025, "invested": 155075, "profit": 9950,
            "realizedProfit": 0, "unrealizedProfit": 9950,
            "profitPercent": 6.41
        },
        {
            "id": "tcs", "name": "TCS", "units": 50,
            "value": 172537.5, "invested": 160025, "profit": 12512.5,
            "realizedProfit": 0, "unrealizedProfit": 9950,
            "profitPercent": 6.41
        },
        {
            "id": "tcs", "name": "TCS", "units": 50,
            "value": 172537.5, "invested": 160025, "profit": 12512.5,
            "realizedProfit": 0, "unrealizedProfit": 12512.5,
            "profitPercent": 7.82
        }
    ],
    "mutual_funds": [
        {
            "id": "ppfas", "name": "Parag Parikh Flexi Cap Fund", "units": 500,
            "value": 27700, "invested": 25125, "profit": 2575,
            "realizedProfit": 0, "unrealizedProfit": 2575,
            "profitPercent": 10.25
        }
    ],
    "ppf": [
        {
            "id": "ppf1", "name": "PPF Account", "units": 1,
            "value": 215000, "invested": 200000, "profit": 15000,
            "realizedProfit": 0, "unrealizedProfit": 15000,
            "profitPercent": 7.5
        }
    ],
    "gold": [
        {
            "id": "sgb", "name": "Sovereign Gold Bond", "units": 100,
            "value": 50000, "invested": 45000, "profit": 5000,
            "realizedProfit": 0, "unrealizedProfit": 5000,
            "profitPercent": 11.11
        }
    ]
}

# --- Authentication & Middleware ---

API_KEY = os.environ.get('API_KEY')

@app.before_request
def check_api_key():
    """Ensure a valid API key is provided for all API routes (except OPTIONS)."""
    if request.method == 'OPTIONS':
        return
        
    # Skip auth for root/health check if desired, or strictly enforce for everything
    if request.path == '/' or request.path == '/favicon.ico':
        return

    key = request.headers.get('X-API-Key')
    if key != API_KEY:
        print(f"DEBUG: Auth Failed. Expected: '{API_KEY}' Received: '{key}'")
        # For development/local testing, you might want to bypass if API_KEY is not set
        if not API_KEY and app.debug:
            return
            
        return jsonify({"error": "Unauthorized: Invalid or missing API Key"}), 401

MOCK_GOALS = [
    {
        "id": "retirement", "name": "Retirement Fund", "value": 600000,
        "targetAmount": 5000000, "targetDate": "2050-12-31",
        "category": "retirement", "progress": 12
    },
    {
        "id": "emergency", "name": "Emergency Fund", "value": 200000,
        "targetAmount": 300000, "targetDate": "2026-12-31",
        "category": "emergency", "progress": 67
    },
    {
        "id": "house", "name": "House Down Payment", "value": 300000,
        "targetAmount": 1000000, "targetDate": "2028-06-30",
        "category": "house", "progress": 30
    },
    {
        "id": "education", "name": "Children Education", "value": 150000,
        "targetAmount": 500000, "targetDate": "2035-04-30",
        "category": "education", "progress": 30
    }
]

MOCK_GOAL_DETAILS = {
    "retirement": [
        {"id": "eq1", "name": "Equity", "allocation": "50%", "value": 300000},
        {"id": "mf1", "name": "Mutual Funds", "allocation": "30%", "value": 180000},
        {"id": "ppf1", "name": "PPF", "allocation": "20%", "value": 120000}
    ],
    "emergency": [
        {"id": "fd1", "name": "Fixed Deposit", "allocation": "70%", "value": 140000},
        {"id": "liq1", "name": "Liquid Funds", "allocation": "30%", "value": 60000}
    ],
    "house": [
        {"id": "debt1", "name": "Debt Funds", "allocation": "100%", "value": 300000}
    ],
    "education": [
        {"id": "edu1", "name": "Education Fund", "allocation": "100%", "value": 150000}
    ]
}

MOCK_TRANSACTIONS = [
    {
        "id": "txn001", "date": "2024-01-15", "assetClass": "equity",
        "security": "HDFC Bank", "type": "BUY", "units": 50,
        "pricePerUnit": 1550.50, "totalAmount": 77525
    },
    {
        "id": "txn002", "date": "2024-02-10", "assetClass": "equity",
        "security": "TCS", "type": "BUY", "units": 50,
        "pricePerUnit": 3200.50, "totalAmount": 160025
    },
    {
        "id": "txn003", "date": "2024-03-20", "assetClass": "equity",
        "security": "HDFC Bank", "type": "BUY", "units": 50,
        "pricePerUnit": 1550.00, "totalAmount": 77550
    }
]

# Global Google Sheets client
gs_client = None
sheet = None

# Cache for Google Sheets data with statistics
class CacheManager:
    def __init__(self, ttl_seconds=300):
        self.cache = {
            'transactions': {'data': None, 'timestamp': None, 'size': 0},
            'goals': {'data': None, 'timestamp': None, 'size': 0}
        }
        self.ttl = ttl_seconds
        self.stats = {
            'transactions': {'hits': 0, 'misses': 0, 'invalidations': 0},
            'goals': {'hits': 0, 'misses': 0, 'invalidations': 0}
        }
        # Maximum cache size in bytes (10 MB per cache entry)
        self.max_cache_size = 10 * 1024 * 1024
    
    def get_cache_size(self, data):
        """Estimate cache size in bytes"""
        import sys
        return sys.getsizeof(str(data))
    
    def is_valid(self, cache_key):
        """Check if cache is still valid"""
        if cache_key not in self.cache or self.cache[cache_key]['data'] is None:
            self.stats[cache_key]['misses'] += 1
            return False
        
        import time
        current_time = time.time()
        cache_time = self.cache[cache_key]['timestamp']
        
        if (current_time - cache_time) < self.ttl:
            self.stats[cache_key]['hits'] += 1
            return True
        else:
            self.stats[cache_key]['misses'] += 1
            return False
    
    def get(self, cache_key):
        """Get cached data if valid"""
        if self.is_valid(cache_key):
            return self.cache[cache_key]['data']
        return None
    
    def set(self, cache_key, data):
        """Set cache data with size check"""
        import time
        data_size = self.get_cache_size(data)
        
        # Check if data exceeds max cache size
        if data_size > self.max_cache_size:
            print(f"⚠ Warning: Cache data for '{cache_key}' ({data_size / 1024 / 1024:.2f} MB) exceeds max size. Not caching.")
            return False
        
        self.cache[cache_key] = {
            'data': data,
            'timestamp': time.time(),
            'size': data_size
        }
        return True
    
    def invalidate(self, cache_key):
        """Invalidate cache for a specific key"""
        if cache_key in self.cache:
            self.cache[cache_key] = {'data': None, 'timestamp': None, 'size': 0}
            self.stats[cache_key]['invalidations'] += 1
    
    def get_stats(self):
        """Get cache statistics"""
        stats_summary = {}
        for key in self.cache:
            total_requests = self.stats[key]['hits'] + self.stats[key]['misses']
            hit_rate = (self.stats[key]['hits'] / total_requests * 100) if total_requests > 0 else 0
            stats_summary[key] = {
                'hits': self.stats[key]['hits'],
                'misses': self.stats[key]['misses'],
                'invalidations': self.stats[key]['invalidations'],
                'hit_rate': f"{hit_rate:.2f}%",
                'cached': self.cache[key]['data'] is not None,
                'size_kb': self.cache[key]['size'] / 1024 if self.cache[key]['size'] > 0 else 0
            }
        return stats_summary

# Initialize cache manager with 5-minute TTL (300 seconds)
# This balances freshness with API call reduction
cache_manager = CacheManager(ttl_seconds=300)

SHEET_NAME = os.environ.get('SHEET_NAME', 'WealthManagement')

def init_google_sheets():
    """Initialize Google Sheets client using environment variable or file."""
    global gs_client, sheet
    try:
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        
        # 1. Try loading from Environment Variable (Best for Vercel/Production)
        creds_json = os.environ.get('GOOGLE_SHEETS_CREDENTIALS')
        
        if creds_json:
            try:
                # Parse the string into a dictionary
                creds_dict = json.loads(creds_json)
                creds = Credentials.from_service_account_info(creds_dict, scopes=scope)
                gs_client = gspread.authorize(creds)
                
                # Open the sandbox file
                sheet = gs_client.open(SHEET_NAME)
                print("✓ Connected to Google Sheets using Environment Variable")
                return True
            except Exception as e:
                print(f"Error parsing GOOGLE_SHEETS_CREDENTIALS: {e}")
                # Fallthrough to try file

        # 2. Try loading from local file (Best for Local Development)
        creds_file = 'credentials.json' # Or key.json
        # Check if file exists to avoid generic FileNotFoundError
        if os.path.exists(creds_file):
            creds = Credentials.from_service_account_file(creds_file, scopes=scope)
            gs_client = gspread.authorize(creds)
            
            # Open the sandbox file
            sheet = gs_client.open(SHEET_NAME)
            print(f"✓ Connected to Google Sheets using {creds_file}")
            return True
        elif os.path.exists('key.json'):
             creds = Credentials.from_service_account_file('key.json', scopes=scope)
             gs_client = gspread.authorize(creds)
             sheet = gs_client.open(SHEET_NAME)
             print("✓ Connected to Google Sheets using key.json")
             return True

        print("⚠ Could not find credentials in Env Var or local JSON file.")
        return False
        
    except Exception as e:
        print(f"Error connecting to Google Sheets: {e}")
        return False

def invalidate_cache(cache_key):
    """Invalidate cache for a specific key"""
    cache_manager.invalidate(cache_key)

def is_cache_valid(cache_key):
    """Check if cache is still valid"""
    return cache_manager.is_valid(cache_key)

def calculate_xirr(transactions, current_date=None):
    """
    Calculate XIRR (Extended Internal Rate of Return) for a set of transactions
    
    Args:
        transactions: List of transaction dicts with 'date', 'totalAmount' (negative for investments), 
                     and 'value' (current value for unrealized)
        current_date: Date to use as current date (defaults to today)
    
    Returns:
        XIRR as a percentage (e.g., 12.5 for 12.5% annual return), or None if calculation fails
    """
    if not transactions or len(transactions) == 0:
        return None
    
    if current_date is None:
        current_date = datetime.now()
    elif isinstance(current_date, str):
        try:
            current_date = datetime.strptime(current_date, '%Y-%m-%d')
        except:
            current_date = datetime.now()
    
    # Build cash flow list: (date, amount)
    cash_flows = []
    total_current_value = 0
    latest_valuation_date = None  # Track the latest XIRR sell date for unrealized holdings
    
    for txn in transactions:
        try:
            # Prioritize XIRR-specific date over regular date
            txn_date_str = txn.get('xirrBuyDate', '') or txn.get('date', '')
            if not txn_date_str:
                continue
            
            # Handle different date formats
            for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%d-%b-%y', '%d-%b-%Y', '%d-%B-%y', '%d-%B-%Y']:
                try:
                    txn_date = datetime.strptime(txn_date_str, fmt)
                    break
                except:
                    continue
            else:
                continue  # Skip if date parsing failed
            
            # Prioritize XIRR-specific buy value over regular totalAmount
            # Only use XIRR value if the XIRR date column also has data
            xirr_buy = txn.get('xirrBuyValue', 0)
            xirr_buy_date = txn.get('xirrBuyDate', '')
            
            # Use XIRR value only if XIRR date exists (indicates XIRR data is populated)
            if xirr_buy_date and xirr_buy != 0:
                investment_amount = xirr_buy
            else:
                investment_amount = txn.get('totalAmount', 0)
                # For regular totalAmount, ensure it's negative (outflow)
                if investment_amount > 0:
                    investment_amount = -investment_amount
            
            # Use the amount as-is - XIRR columns already have correct signs
            # Negative = cash outflow (purchase), Positive = cash inflow (redemption)
            if investment_amount != 0:
                cash_flows.append((txn_date, investment_amount))
            
            # Check if transaction is realized
            is_realized = str(txn.get('realised', 'FALSE')).upper() == 'TRUE'
            
            # For Realized transactions: Add Sell Cash Flow (Intermediate)
            if is_realized:
                # Get sell date
                sell_date_str = txn.get('xirrSellDate', '') or txn.get('sellDate', '')
                if not sell_date_str:
                    continue # Skip if no sell date
                    
                txn_sell_date = None
                for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%d-%b-%y', '%d-%b-%Y', '%d-%B-%y', '%d-%B-%Y']:
                    try:
                        txn_sell_date = datetime.strptime(sell_date_str, fmt)
                        break
                    except:
                        continue
                
                if not txn_sell_date:
                    continue # Skip if date parsing failed
                
                # Get sell value (Prioritize XIRR specific, else standard SellValue)
                xirr_sell = txn.get('xirrSellValue', 0)
                sell_amount = xirr_sell if xirr_sell != 0 else txn.get('sellValue', 0)
                
                if sell_amount != 0:
                    cash_flows.append((txn_sell_date, abs(sell_amount))) # Ensure inflow is positive
                    
            # For Unrealized transactions: Add to Terminal Value
            else:
                # Prioritize XIRR-specific sell value over regular value for unrealized
                # Only use XIRR value if it's non-zero (meaning the column has data)
                xirr_sell = txn.get('xirrSellValue', 0)
                xirr_sell_date_str = txn.get('xirrSellDate', '')
                
                txn_current_value = xirr_sell if xirr_sell != 0 else txn.get('value', 0)
                total_current_value += txn_current_value
                
                # Track the latest XIRR sell date (valuation date) if provided
                if xirr_sell_date_str:
                    for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%d-%b-%y', '%d-%b-%Y', '%d-%B-%y', '%d-%B-%Y']:
                        try:
                            xirr_sell_date = datetime.strptime(xirr_sell_date_str, fmt)
                            if latest_valuation_date is None or xirr_sell_date > latest_valuation_date:
                                latest_valuation_date = xirr_sell_date
                            break
                        except:
                            continue
        except Exception as e:
            print(f"Error processing transaction for XIRR: {e}")
            continue
    
    
    # Add final cash flow (current value as positive)
    # Use the latest XIRR sell date if available, otherwise use current_date
    valuation_date = latest_valuation_date if latest_valuation_date else current_date
    if total_current_value > 0:
        cash_flows.append((valuation_date, total_current_value))
    
    if len(cash_flows) < 2:
        print(f"XIRR failed: Insufficient cash flows ({len(cash_flows)})")
        return None
    
    # Sort by date
    cash_flows.sort(key=lambda x: x[0])
    
    # Calculate days from first transaction
    first_date = cash_flows[0][0]
    dates_in_years = [(cf[0] - first_date).days / 365.25 for cf in cash_flows]
    amounts = [cf[1] for cf in cash_flows]

    # Debug logging
    # print(f"XIRR Inputs - Dates: {dates_in_years}, Amounts: {amounts}")
    
    # XIRR calculation using Newton's method
    def npv(rate, dates, amounts):
        """Calculate NPV for given rate"""
        return sum(amt / ((1 + rate) ** date) for amt, date in zip(amounts, dates))
    
    def npv_derivative(rate, dates, amounts):
        """Calculate derivative of NPV"""
        return sum(-date * amt / ((1 + rate) ** (date + 1)) for amt, date in zip(amounts, dates))
    
    try:
        # Initial guess: 10% annual return
        guess = 0.1
        
        # Use Newton's method to find the rate where NPV = 0
        xirr_rate = newton(
            lambda r: npv(r, dates_in_years, amounts),
            guess,
            fprime=lambda r: npv_derivative(r, dates_in_years, amounts),
            maxiter=100,
            tol=1e-6
        )
        
        # Convert to percentage
        xirr_percentage = xirr_rate * 100
        
        # Sanity check: return should be between -100% and 1000%
        if -100 <= xirr_percentage <= 1000:
            return round(xirr_percentage, 2)
        else:
            print(f"XIRR out of bounds: {xirr_percentage}")
            return None
    except Exception as e:
        print(f"XIRR calculation failed during optimization: {e}")
        return None

# Try to initialize Google Sheets on startup
init_google_sheets()

# ============================================================
# Google Sheets Helper Functions
# ============================================================

def get_or_create_worksheet(workbook_name, worksheet_name, headers):
    """Get existing worksheet or create new one with headers"""
    try:
        workbook = gs_client.open(workbook_name)
        try:
            worksheet = workbook.worksheet(worksheet_name)
        except:
            # Worksheet doesn't exist, create it
            worksheet = workbook.add_worksheet(title=worksheet_name, rows=1000, cols=20)
            worksheet.append_row(headers)
        return worksheet
    except Exception as e:
        print(f"Error accessing worksheet: {e}")
        return None

def write_transaction_to_sheets(transaction):
    """Write a transaction to Google Sheets"""
    if not gs_client:
        return False
    try:
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        # User's actual data structure
        headers = ['ID', 'FY', 'Account', 'AssetType', 'TranType', 'Realised', 'Security', 
                   'Quantity', 'BuyDate', 'SellDate', 'BuyRate', 'SellRate', 'CurrentRate',
                   'Holding Period', 'Gain/Loss', 'BuyValue', 'SellValue', 'CurrentValue', 'Entity']
        worksheet = get_or_create_worksheet(sheet_name, 'Transactions', headers)
        
        if worksheet:
            # Map from our simple format to user's detailed format
            quantity = transaction.get('units', 0)
            buy_rate = transaction.get('pricePerUnit', 0)
            current_rate = transaction.get('currentPrice', buy_rate)
            buy_value = quantity * buy_rate
            current_value = quantity * current_rate
            gain_loss = current_value - buy_value
            
            row = [
                transaction['id'],
                transaction.get('fy', ''),  # Financial year
                transaction.get('account', 'Investment'),  # Account
                transaction.get('assetClass', ''),  # Maps to AssetType
                transaction.get('type', 'BUY'),  # Maps to TranType
                'FALSE',  # Realised - FALSE for active holdings
                transaction.get('security', ''),
                transaction.get('security', ''),
                quantity,
                transaction.get('buyDate', transaction.get('date', '')),  # BuyDate
                transaction.get('sellDate', ''),  # SellDate
                buy_rate,
                '',  # SellRate - empty until sold
                current_rate,
                '',  # Holding Period - can be calculated
                gain_loss,
                buy_value,
                '',  # SellValue - empty until sold
                current_value,
                transaction.get('entity', 'Guru MF')  # Entity/source
            ]
            worksheet.append_row(row)
            invalidate_cache('transactions')  # Invalidate cache after write
            return True
    except Exception as e:
        print(f"Error writing transaction to sheets: {e}")
    return False

def read_transactions_from_sheets():
    """Read all transactions from Google Sheets with caching"""
    if not gs_client:
        return []
    
    # Check cache first
    cached_data = cache_manager.get('transactions')
    if cached_data is not None:
        print("✓ Using cached transactions data")
        return cached_data
    
    try:
        import time
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        workbook = gs_client.open(sheet_name)
        try:
            worksheet = workbook.worksheet('Transactions')
            records = worksheet.get_all_records()
            # Convert to our transaction format from user's structure
            transactions = []
            for record in records:
                try:
                    # User's data structure mapping
                    quantity = record.get('Quantity', '')
                    quantity = float(str(quantity).replace(',', '')) if quantity else 0
                    
                    # Helper function to parse currency values
                    def parse_currency(value):
                        if not value:
                            return 0
                        # Preserve negative sign, only remove currency symbols and commas
                        val_str = str(value).replace('₹', '').replace(',', '').strip()
                        # Handle empty strings after cleanup
                        if not val_str or val_str == '-':
                            return 0
                        try:
                            return float(val_str)
                        except ValueError:
                            return 0
                    
                    buy_rate = parse_currency(record.get('BuyRate', record.get(' BuyRate ', '')))
                    sell_rate = parse_currency(record.get('SellRate', record.get(' SellRate ', '')))
                    current_rate = record.get('CurrentRate', record.get(' CurrentRate ', ''))
                    current_rate = str(current_rate).replace('₹', '').replace(',', '').replace('#REF!', '').strip()
                    # Preserve negative values in current_rate
                    try:
                        current_rate = float(current_rate) if current_rate and current_rate != '' and current_rate != '#REF!' else buy_rate
                    except ValueError:
                        current_rate = buy_rate
                    
                    # Read BuyValue and CurrentValue directly from sheet
                    # These columns contain calculated values from the sheet
                    buy_value = parse_currency(record.get('BuyValue', record.get(' BuyValue ', '')))
                    current_value = parse_currency(record.get('CurrentValue', record.get(' CurrentValue ', '')))
                    sell_value = parse_currency(record.get('SellValue', record.get(' SellValue ', '')))
                    gain_loss = parse_currency(record.get('Gain/Loss', record.get(' Gain/Loss ', record.get(' Gain\n/Loss ', ''))))
                    
                    # For debugging: log if values are missing
                    if buy_value == 0 and quantity > 0:
                        buy_value = quantity * buy_rate
                    
                    if current_value == 0 and quantity > 0:
                        current_value = quantity * current_rate
                    
                    # Read XIRR-specific columns (exact column names from sheet with newlines)
                    xirr_buy_date = str(record.get('XIRR \nBuy date', record.get('XIRR Buy date', '')))
                    xirr_sell_date = str(record.get('XIRR \nSell date', record.get('XIRR Sell date', '')))
                    xirr_buy_value = parse_currency(record.get(' XIRR \nBuy Value ', record.get(' XIRR Buy Value ', '')))
                    xirr_sell_value = parse_currency(record.get(' XIRR \nSell Value ', record.get(' XIRR Sell Value ', '')))
                    
                    # Map to our internal structure
                    transactions.append({
                        'id': str(record.get('ID', '')),
                        'date': str(record.get('BuyDate', '')), # Keep date for backward compat
                        'buyDate': str(record.get('BuyDate', '')),
                        'sellDate': str(record.get('SellDate', '')),
                        'xirrBuyDate': xirr_buy_date,
                        'xirrSellDate': xirr_sell_date,
                        'assetClass': str(record.get('AssetType', '')),  # "Debt MF", "Equity MF", "Stocks", etc.
                        'security': str(record.get('Security', record.get(' Security ', ''))).strip(),
                        'type': str(record.get('TranType', '')),  # "Invest", "Dividend", etc.
                        'units': quantity,
                        'pricePerUnit': buy_rate if buy_rate > 0 else sell_rate,
                        'currentPrice': current_rate,
                        'totalAmount': buy_value,  # Use BuyValue from sheet
                        'value': current_value,  # Use CurrentValue from sheet for unrealized holdings
                        'sellValue': sell_value,  # SellValue for dividends and sold positions
                        'xirrBuyValue': xirr_buy_value,  # XIRR-specific buy value
                        'xirrSellValue': xirr_sell_value,  # XIRR-specific sell value
                        'gainLoss': gain_loss,  # Gain/Loss column - used for dividends
                        'realised': str(record.get('Realised', 'FALSE')),
                        'account': str(record.get('Account', '')),
                        'entity': str(record.get('Entity', record.get(' Entity ', ''))).strip(),
                        'notes': ''
                    })
                except Exception as e:
                    print(f"Error parsing transaction record: {e}, record: {record}")
                    continue
            
            # Update cache
            cache_manager.set('transactions', transactions)
            print(f"✓ Cached {len(transactions)} transactions ({cache_manager.cache['transactions']['size'] / 1024:.2f} KB)")
            return transactions
        except Exception as e:
            print(f"Error reading Transactions worksheet: {e}")
            return []
    except Exception as e:
        print(f"Error reading transactions from sheets: {e}")
        return []

def write_goal_to_sheets(goal):
    """Write a goal to Google Sheets"""
    if not gs_client:
        return False
    try:
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        headers = ['ID', 'Name', 'Category', 'Target Amount', 'Current Value', 'Target Date', 'Progress']
        worksheet = get_or_create_worksheet(sheet_name, 'Goals', headers)
        
        if worksheet:
            row = [
                goal['id'],
                goal['name'],
                goal['category'],
                goal['targetAmount'],
                goal.get('value', 0),
                goal['targetDate'],
                goal.get('progress', 0)
            ]
            worksheet.append_row(row)
            invalidate_cache('goals')  # Invalidate cache after write
            return True
    except Exception as e:
        print(f"Error writing goal to sheets: {e}")
    return False

def read_goals_from_sheets():
    """Read all goals from Google Sheets with caching"""
    if not gs_client:
        return []
    
    # Check cache first
    cached_data = cache_manager.get('goals')
    if cached_data is not None:
        print("✓ Using cached goals data")
        return cached_data
    
    try:
        import time
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        workbook = gs_client.open(sheet_name)
        try:
            worksheet = workbook.worksheet('Goals')
            records = worksheet.get_all_records()
            # Convert to our goal format
            goals = []
            for record in records:
                try:
                    # Handle empty values safely
                    target_amount = record.get('Target Amount', '')
                    target_amount = float(target_amount) if target_amount else 0
                    
                    current_value = record.get('Current Value', '')
                    current_value = float(current_value) if current_value else 0
                    
                    progress = record.get('Progress', '')
                    progress = float(progress) if progress else 0
                    
                    goals.append({
                        'id': str(record.get('ID', '')),
                        'name': str(record.get('Name', '')),
                        'category': str(record.get('Category', 'other')),
                        'targetAmount': target_amount,
                        'value': current_value,
                        'targetDate': str(record.get('Target Date', '')),
                        'progress': progress
                    })
                except Exception as e:
                    print(f"Error parsing goal record: {e}, record: {record}")
                    continue
            
            # Update cache
            cache_manager.set('goals', goals)
            print(f"✓ Cached {len(goals)} goals ({cache_manager.cache['goals']['size'] / 1024:.2f} KB)")
            return goals
        except Exception as e:
            print(f"Error reading Goals worksheet: {e}")
            return []
    except Exception as e:
        print(f"Error reading goals from sheets: {e}")
        return []

def update_transaction_in_sheets(txn_id, updated_data):
    """Update a transaction in Google Sheets"""
    if not gs_client:
        return False
    try:
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        workbook = gs_client.open(sheet_name)
        worksheet = workbook.worksheet('Transactions')
        
        # Find the row with matching ID
        cell = worksheet.find(txn_id)
        if cell:
            row_num = cell.row
            
            # Read current row with formulas
            current_row = worksheet.row_values(row_num, value_render_option='FORMULA')
            
            # Pad row if needed to ensure 19 columns
            while len(current_row) < 19:
                current_row.append('')
                
            # Helper to parse values safely
            quantity = float(updated_data.get('units', 0))
            buy_rate = float(updated_data.get('pricePerUnit', 0))
            
            # Update specific input columns only, preserving formulas in others
            # Mapping:
            # 0: ID (Keep)
            # 1: FY (Keep)
            # 2: Account
            current_row[2] = updated_data.get('account', 'Investment')
            # 3: AssetType
            current_row[3] = updated_data['assetClass']
            # 4: TranType
            current_row[4] = updated_data['type']
            # 5: Realised (Keep or Update? Usually calculated or set once. Let's keep existing unless we have explicit logic)
            # current_row[5] = updated_data.get('realised', 'FALSE') 
            
            # 6: Security
            current_row[6] = updated_data['security']
            # 7: Quantity
            current_row[7] = quantity
            # 8: BuyDate
            current_row[8] = updated_data.get('buyDate', updated_data.get('date', ''))
            # 9: SellDate
            current_row[9] = updated_data.get('sellDate', '')
            # 10: BuyRate
            current_row[10] = buy_rate
            # 11: SellRate (Keep empty/existing until we have sell logic)
            
            # 18: Entity
            current_row[18] = updated_data.get('entity', 'Guru MF')

            # Update the row with preserved formulas
            worksheet.update(f'A{row_num}:S{row_num}', [current_row], value_input_option='USER_ENTERED')
            
            invalidate_cache('transactions')
            return True
    except Exception as e:
        print(f"Error updating transaction in sheets: {e}")
    return False

def delete_transaction_from_sheets(txn_id):
    """Delete a transaction from Google Sheets"""
    if not gs_client:
        return False
    try:
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        workbook = gs_client.open(sheet_name)
        worksheet = workbook.worksheet('Transactions')
        
        # Find the row with matching ID
        cell = worksheet.find(txn_id)
        if cell:
            worksheet.delete_rows(cell.row)
            return True
    except Exception as e:
        print(f"Error deleting transaction from sheets: {e}")
    return False

def update_goal_in_sheets(goal_id, updated_data):
    """Update a goal in Google Sheets"""
    if not gs_client:
        return False
    try:
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        workbook = gs_client.open(sheet_name)
        worksheet = workbook.worksheet('Goals')
        
        # Find the row with matching ID
        cell = worksheet.find(goal_id)
        if cell:
            row_num = cell.row
            # Update the row
            worksheet.update(f'A{row_num}:G{row_num}', [[
                updated_data['id'],
                updated_data['name'],
                updated_data['category'],
                updated_data['targetAmount'],
                updated_data.get('value', 0),
                updated_data['targetDate'],
                updated_data.get('progress', 0)
            ]])
            return True
    except Exception as e:
        print(f"Error updating goal in sheets: {e}")
    return False

def delete_goal_from_sheets(goal_id):
    """Delete a goal from Google Sheets"""
    if not gs_client:
        return False
    try:
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        workbook = gs_client.open(sheet_name)
        worksheet = workbook.worksheet('Goals')
        
        # Find the row with matching ID
        cell = worksheet.find(goal_id)
        if cell:
            worksheet.delete_rows(cell.row)
            return True
    except Exception as e:
        print(f"Error deleting goal from sheets: {e}")
    return False

# ============================================================
# API ENDPOINTS
# ============================================================

@app.after_request
def log_request(response):
    """Log all HTTP requests"""
    from datetime import datetime
    timestamp = datetime.now().strftime('%H:%M:%S')
    logger.info(f"\n{'='*60}")
    logger.info(f"[{timestamp}] {request.method} {request.path} → {response.status_code}")
    logger.info(f"{'='*60}")
    sys.stdout.flush()
    return response

@app.route('/')
def home():
    return jsonify({
        "message": "Wealth Management API",
        "version": "1.0.0",
        "status": "running",
        "mode": "mock" if not gs_client else "google-sheets"
    })

@app.route('/api/v1/cache/stats', methods=['GET'])
def get_cache_stats():
    """Get cache statistics"""
    stats = cache_manager.get_stats()
    return jsonify({
        "cache_ttl_seconds": cache_manager.ttl,
        "max_cache_size_mb": cache_manager.max_cache_size / 1024 / 1024,
        "statistics": stats
    })

# Portfolio Endpoints
@app.route('/api/v1/portfolio/overview', methods=['GET'])
def get_portfolio_overview():
    """Get portfolio overview with total value and asset breakdown"""
    if gs_client:
        # Calculate from Google Sheets transactions
        transactions = read_transactions_from_sheets()
        print(f"Total transactions read: {len(transactions)}")
        
        # Group by asset class - only count unrealized (active) holdings
        asset_summary = {}
        total_invested = 0
        total_current_value = 0
        total_realized_pl = 0
        total_dividends = 0
        realized_count = 0
        unrealized_count = 0
        
        for txn in transactions:
            realised = str(txn.get('realised', 'FALSE')).upper()
            txn_type = txn.get('type', 'Invest')
            asset_class = txn.get('assetClass', 'Other')
            
            if asset_class not in asset_summary:
                asset_summary[asset_class] = {
                    'invested': 0, 
                    'current_value': 0, 
                    'count': 0,
                    'realized_pl': 0,
                    'dividends': 0
                }
            
            # Handle realized transactions separately for P/L
            if realised == 'TRUE':
                realized_count += 1
                
                if txn_type == 'Dividend':
                    # Dividends tracked separately - use Gain/Loss column
                    div_amount = txn.get('gainLoss', 0)
                    total_dividends += div_amount
                    asset_summary[asset_class]['dividends'] += div_amount
                else:
                    # For realized transactions, add to realized P/L
                    # Use Gain/Loss column directly as requested
                    gain = txn.get('gainLoss', 0)
                    total_realized_pl += gain
                    asset_summary[asset_class]['realized_pl'] += gain
                continue  # Skip adding to portfolio value
            
            # For active (unrealized) holdings
            unrealized_count += 1
            invested = txn.get('totalAmount', 0)
            current_val = txn.get('value', 0)
            
            # Only add investment transactions to holdings
            if txn_type in ['Invest', 'Trade', 'Buy', 'BUY', 'SIP', 'SIP Installment', 'Purchase']:
                asset_summary[asset_class]['invested'] += invested
                asset_summary[asset_class]['current_value'] += current_val
                total_invested += invested
                total_current_value += current_val
                asset_summary[asset_class]['count'] += 1
        
        
        print(f"Realized: {realized_count}, Unrealized: {unrealized_count}")
        print(f"Total invested: {total_invested}, Total current value: {total_current_value}")
        print(f"Total dividends: {total_dividends}")
        
        # Calculate XIRR for overall unrealized portfolio
        unrealized_transactions = [txn for txn in transactions if str(txn.get('realised', 'FALSE')).upper() == 'FALSE' and txn.get('type', 'Invest') in ['Invest', 'Trade', 'Buy', 'BUY', 'SIP', 'SIP Installment', 'Purchase']]
        overall_xirr = calculate_xirr(unrealized_transactions)
        print(f"Overall Portfolio XIRR: {overall_xirr}%")
        
        # Calculate Realized XIRR
        realized_transactions_for_xirr = [txn for txn in transactions if str(txn.get('realised', 'FALSE')).upper() == 'TRUE' and txn.get('type', 'Invest') in ['Invest', 'Trade', 'Buy', 'BUY', 'SIP', 'SIP Installment', 'Purchase']]
        realized_xirr = calculate_xirr(realized_transactions_for_xirr)
        print(f"Overall Realized XIRR: {realized_xirr}%")
        
        # Calculate Realized Invested Amount
        total_realized_invested = 0
        for txn in realized_transactions_for_xirr:
            # Use XIRR buy value if present, else totalAmount. Ensure positive invested amount.
            xirr_buy = txn.get('xirrBuyValue', 0)
            amt = abs(xirr_buy) if (xirr_buy != 0 and txn.get('xirrBuyDate')) else abs(txn.get('totalAmount', 0))
            total_realized_invested += amt
            
        # Calculate XIRR per asset class
        
        # Calculate XIRR per asset class
        asset_xirr = {}
        for asset_class in asset_summary.keys():
            asset_txns = [txn for txn in unrealized_transactions if txn.get('assetClass') == asset_class]
            xirr = calculate_xirr(asset_txns)
            if xirr is not None:
                asset_xirr[asset_class] = xirr
                print(f"{asset_class} XIRR: {xirr}%")
        
        # Format for frontend
        allocation = [
            {
                'name': asset_class,
                'value': data['current_value'],
                'invested': data['invested'],
                'percentage': (data['current_value'] / total_current_value * 100) if total_current_value > 0 else 0,
                'xirr': asset_xirr.get(asset_class),
                'realizedPL': data['realized_pl'],
                'dividends': data['dividends']
            }
            for asset_class, data in asset_summary.items()
            if data['current_value'] > 0  # Only show asset classes with current holdings
        ]
        
        unrealized_pl = total_current_value - total_invested
        
        portfolio_data = {
            'totalValue': total_current_value,
            'totalInvested': total_invested,
            'unrealizedPL': unrealized_pl,
            'realizedPL': total_realized_pl,
            'dividends': total_dividends,  # Separate dividend tracking
            'xirr': overall_xirr,  # Overall portfolio XIRR
            'realizedXirr': realized_xirr, # Realized XIRR
            'realizedInvested': total_realized_invested, # Invested amount for realized positions
            'allocation': allocation,
            'assetBreakdown': allocation  # Dashboard expects this property
        }
        
        return jsonify(portfolio_data)
    
    return jsonify(MOCK_PORTFOLIO_DATA)

@app.route('/api/v1/portfolio/assets/<asset_class>', methods=['GET'])
def get_asset_detail(asset_class):
    """Get detailed view of specific asset class"""
    asset_class = asset_class.lower().replace('-', '_')
    if gs_client:
        # TODO: Implement Google Sheets fetching
        pass
    assets = MOCK_ASSETS.get(asset_class, [])
    return jsonify(assets)

@app.route('/api/v1/portfolio/performance', methods=['GET'])
def get_portfolio_performance():
    """Get historical portfolio performance data"""
    # Mock historical data
    performance_data = [
        {"date": "2024-01", "value": 1000000, "profit": 0},
        {"date": "2024-02", "value": 1050000, "profit": 50000},
        {"date": "2024-03", "value": 1100000, "profit": 50000},
        {"date": "2024-04", "value": 1080000, "profit": -20000},
        {"date": "2024-05", "value": 1150000, "profit": 70000},
        {"date": "2024-06", "value": 1200000, "profit": 50000},
        {"date": "2024-07", "value": 1250000, "profit": 50000}
    ]
    return jsonify(performance_data)

@app.route('/api/v1/portfolio/holdings', methods=['GET'])
def get_holdings():
    """Get unrealized holdings aggregated by security"""
    asset_class_filter = request.args.get('assetClass')
    goal_filter = request.args.get('goal')
    view_type = request.args.get('type', 'unrealized')
    
    # Get transactions
    if gs_client:
        transactions = read_transactions_from_sheets()
    else:
        transactions = MOCK_TRANSACTIONS
    
    if view_type == 'realized':
        # Filter for realized transactions (Sold or Dividend) where gain/loss is recorded
        realized_txns = [
            txn for txn in transactions 
            if str(txn.get('realised', 'FALSE')).upper() == 'TRUE'
        ]
        
        # Filter by asset class if provided
        if asset_class_filter:
            realized_txns = [txn for txn in realized_txns if txn.get('assetClass') == asset_class_filter]

        # Filter by goal (account) if provided
        if goal_filter:
            realized_txns = [txn for txn in realized_txns if txn.get('account') == goal_filter]
            
        # Aggregate by security
        holdings = {}
        for txn in realized_txns:
            security = txn.get('security', 'Unknown')
            txn_type = txn.get('type')
            
            if security not in holdings:
                holdings[security] = {
                    'security': security,
                    'assetClass': txn.get('assetClass', ''),
                    'units': 0,
                    'invested': 0, 
                    'current_value': 0,
                    'realized_pl': 0,
                    'dividends': 0,
                    'transactions': []
                }
            
            # If Dividend, add to dividends
            if txn_type == 'Dividend':
                holdings[security]['dividends'] += float(txn.get('gainLoss', 0) or 0)
            else:
                # Realized Sell/Trade
                holdings[security]['units'] += float(txn.get('units', 0) or 0)
                holdings[security]['realized_pl'] += float(txn.get('gainLoss', 0) or 0)
            
            holdings[security]['transactions'].append(txn)
            
        result = []
        for security, data in holdings.items():
            result.append({
                'security': security,
                'assetClass': data['assetClass'],
                'units': data['units'], # Sold units
                'invested': 0, 
                'currentValue': 0, 
                'realizedPL': round(data['realized_pl'], 2),
                'dividends': round(data['dividends'], 2),
                'unrealizedPL': 0,
                'unrealizedPLPercent': 0,
                'xirr': None
            })
            
        # Sort by realized PL + dividends descending
        result.sort(key=lambda x: (x['realizedPL'] + x['dividends']), reverse=True)
        
    else:
        # Existing Unrealized Logic
        # Filter for unrealized transactions
        unrealized_txns = [
            txn for txn in transactions 
            if str(txn.get('realised', 'FALSE')).upper() == 'FALSE' and 
            txn.get('type', 'Invest') in ['Invest', 'Trade', 'Buy', 'BUY', 'SIP', 'SIP Installment', 'Purchase']
        ]
        
        # Filter by asset class if provided
        if asset_class_filter:
            unrealized_txns = [txn for txn in unrealized_txns if txn.get('assetClass') == asset_class_filter]

        # Filter by goal (account) if provided
        if goal_filter:
            unrealized_txns = [txn for txn in unrealized_txns if txn.get('account') == goal_filter]
            
        # Aggregate by security
        holdings = {}
        for txn in unrealized_txns:
            security = txn.get('security', 'Unknown')
            
            if security not in holdings:
                holdings[security] = {
                    'security': security,
                    'assetClass': txn.get('assetClass', ''),
                    'units': 0,
                    'invested': 0,
                    'current_value': 0,
                    'transactions': []
                }
                
            holdings[security]['units'] += float(txn.get('units', 0) or 0)
            holdings[security]['invested'] += float(txn.get('totalAmount', 0) or 0)
            holdings[security]['current_value'] += float(txn.get('value', 0) or 0)
            holdings[security]['transactions'].append(txn)
            
        # Calculate XIRR and format response
        result = []
        for security, data in holdings.items():
            # Calculate XIRR for this security
            xirr = calculate_xirr(data['transactions'])
            
            unrealized_pl = data['current_value'] - data['invested']
            unrealized_pl_pct = (unrealized_pl / data['invested'] * 100) if data['invested'] > 0 else 0
            
            result.append({
                'security': security,
                'assetClass': data['assetClass'],
                'units': data['units'],
                'invested': round(data['invested'], 2),
                'currentValue': round(data['current_value'], 2),
                'unrealizedPL': round(unrealized_pl, 2),
                'unrealizedPLPercent': round(unrealized_pl_pct, 2),
                'xirr': xirr
            })
            
        # Sort by value descending
        result.sort(key=lambda x: x['currentValue'], reverse=True)
    
    return jsonify({
        'holdings': result,
        'count': len(result)
    })

# Transaction Endpoints
@app.route('/api/v1/transactions', methods=['GET', 'POST'])
def handle_transactions():
    global MOCK_TRANSACTIONS
    if request.method == 'GET':
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        # Get transactions from Google Sheets if connected, otherwise use mock data
        if gs_client:
            transactions = read_transactions_from_sheets()
        else:
            transactions = MOCK_TRANSACTIONS
        
        # Return paginated transactions
        return jsonify({
            "transactions": transactions,
            "total": len(transactions),
            "page": page,
            "limit": limit
        })
    
    elif request.method == 'POST':
        data = request.json
        # Validate required fields
        required = ['date', 'assetClass', 'security', 'type', 'units', 'pricePerUnit']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Create new transaction
        new_txn = {
            "id": f"txn_{datetime.now().timestamp()}",
            "date": data['date'],
            "assetClass": data['assetClass'],
            "security": data['security'],
            "type": data['type'],
            "units": data['units'],
            "pricePerUnit": data['pricePerUnit'],
            "totalAmount": data['units'] * data['pricePerUnit'],
            "goalId": data.get('goalId'),
            "notes": data.get('notes', '')
        }
        
        # Write to Google Sheets if connected, otherwise use mock data
        if gs_client:
            if write_transaction_to_sheets(new_txn):
                return jsonify({
                    "success": True,
                    "data": new_txn,
                    "message": "Transaction saved to Google Sheets"
                }), 201
            else:
                return jsonify({"error": "Failed to save to Google Sheets"}), 500
        else:
            MOCK_TRANSACTIONS.append(new_txn)
            return jsonify({
                "success": True,
                "data": new_txn,
                "message": "Transaction created (mock mode)"
            }), 201

@app.route('/api/v1/transactions/<txn_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_transaction(txn_id):
    global MOCK_TRANSACTIONS
    
    if request.method == 'GET':
        txn = next((t for t in MOCK_TRANSACTIONS if t['id'] == txn_id), None)
        if not txn:
            return jsonify({"error": "Transaction not found"}), 404
        return jsonify(txn)
    
    elif request.method == 'PUT':
        data = request.json
        
        if gs_client:
            # Read all transactions to find the one to update
            transactions = read_transactions_from_sheets()
            txn = next((t for t in transactions if t['id'] == txn_id), None)
            if not txn:
                return jsonify({"error": "Transaction not found"}), 404
            
            # Update fields
            txn.update(data)
            txn['totalAmount'] = float(txn['units']) * float(txn['pricePerUnit'])
            
            # Update in Google Sheets
            if update_transaction_in_sheets(txn_id, txn):
                return jsonify({"success": True, "data": txn, "message": "Transaction updated"})
            else:
                return jsonify({"error": "Failed to update transaction"}), 500
        else:
            # Mock mode
            txn = next((t for t in MOCK_TRANSACTIONS if t['id'] == txn_id), None)
            if not txn:
                return jsonify({"error": "Transaction not found"}), 404
            txn.update(data)
            txn['totalAmount'] = txn['units'] * txn['pricePerUnit']
            return jsonify({"success": True, "data": txn, "message": "Transaction updated"})
    
    elif request.method == 'DELETE':
        if gs_client:
            if delete_transaction_from_sheets(txn_id):
                return jsonify({"success": True, "message": "Transaction deleted"})
            else:
                return jsonify({"error": "Failed to delete transaction"}), 500
        else:
            # Mock mode
            MOCK_TRANSACTIONS = [t for t in MOCK_TRANSACTIONS if t['id'] != txn_id]
            return jsonify({"success": True, "message": "Transaction deleted"})

# Goal Endpoints
@app.route('/api/v1/goals', methods=['GET', 'POST'])
def handle_goals():
    global MOCK_GOALS
    if request.method == 'GET':
        # Get goals from Google Sheets and calculate progress from transactions
        if gs_client:
            goals = read_goals_from_sheets()
            transactions = read_transactions_from_sheets()
            
            # Calculate unrealized holdings by account/goal name
            account_values = {}
            account_transactions = {}  # Store transactions per account for XIRR
            for txn in transactions:
                account = txn.get('account', '')
                realised = str(txn.get('realised', 'FALSE')).upper()
                
                # Only count unrealized (active) holdings
                if realised == 'TRUE':
                    continue
                
                if account not in account_values:
                    account_values[account] = 0
                    account_transactions[account] = []
                
                account_values[account] += txn.get('value', 0)
                account_transactions[account].append(txn)
            
            # Calculate XIRR per account
            account_xirr = {}
            for account, txns in account_transactions.items():
                xirr = calculate_xirr(txns)
                if xirr is not None:
                    account_xirr[account] = xirr
            
            # Update goal progress based on account values
            for goal in goals:
                goal_name = goal.get('name', '')
                # Match goal name to account name
                current_value = account_values.get(goal_name, 0)
                target_amount = goal.get('targetAmount', 0)
                
                # Update current value and progress
                goal['value'] = current_value
                if target_amount > 0:
                    goal['progress'] = min((current_value / target_amount * 100), 100)
                else:
                    goal['progress'] = 0
                
                # Add XIRR for this goal
                goal['xirr'] = account_xirr.get(goal_name)
            
            return jsonify(goals)
        else:
            # Mock mode
            return jsonify(MOCK_GOALS)
    
    elif request.method == 'POST':
        data = request.json
        new_goal = {
            "id": f"goal_{datetime.now().timestamp()}",
            "name": data['name'],
            "targetAmount": data['targetAmount'],
            "targetDate": data['targetDate'],
            "category": data.get('category', 'other'),
            "value": 0,
            "progress": 0
        }
        
        # Write to Google Sheets if connected, otherwise use mock data
        if gs_client:
            if write_goal_to_sheets(new_goal):
                return jsonify({
                    "success": True,
                    "data": new_goal,
                    "message": "Goal saved to Google Sheets"
                }), 201
            else:
                return jsonify({"error": "Failed to save to Google Sheets"}), 500
        else:
            MOCK_GOALS.append(new_goal)
            return jsonify({
                "success": True,
                "data": new_goal,
                "message": "Goal created (mock mode)"
            }), 201

@app.route('/api/v1/goals/<goal_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_goal(goal_id):
    global MOCK_GOALS
    
    if request.method == 'GET':
        goal = next((g for g in MOCK_GOALS if g['id'] == goal_id), None)
        if not goal:
            return jsonify({"error": "Goal not found"}), 404
        return jsonify(goal)
    
    elif request.method == 'PUT':
        data = request.json
        
        if gs_client:
            # Read all goals to find the one to update
            goals = read_goals_from_sheets()
            goal = next((g for g in goals if g['id'] == goal_id), None)
            if not goal:
                return jsonify({"error": "Goal not found"}), 404
            
            # Update fields
            goal.update(data)
            
            # Update in Google Sheets
            if update_goal_in_sheets(goal_id, goal):
                return jsonify({"success": True, "data": goal})
            else:
                return jsonify({"error": "Failed to update goal"}), 500
        else:
            # Mock mode
            goal = next((g for g in MOCK_GOALS if g['id'] == goal_id), None)
            if not goal:
                return jsonify({"error": "Goal not found"}), 404
            goal.update(data)
            return jsonify({"success": True, "data": goal})
    
    elif request.method == 'DELETE':
        if gs_client:
            if delete_goal_from_sheets(goal_id):
                return jsonify({"success": True, "message": "Goal deleted"})
            else:
                return jsonify({"error": "Failed to delete goal"}), 500
        else:
            # Mock mode
            MOCK_GOALS = [g for g in MOCK_GOALS if g['id'] != goal_id]
            return jsonify({"success": True, "message": "Goal deleted"})

@app.route('/api/v1/goals/<goal_id>/progress', methods=['GET'])
def get_goal_progress(goal_id):
    """Get detailed progress for a specific goal"""
    details = MOCK_GOAL_DETAILS.get(goal_id, [])
    goal = next((g for g in MOCK_GOALS if g['id'] == goal_id), None)
    
    return jsonify({
        "goal": goal,
        "allocations": details
    })

# Analytics Endpoints
@app.route('/api/v1/analytics/summary', methods=['GET'])
def get_analytics_summary():
    """Get analytics summary including XIRR, returns, etc."""
    return jsonify({
        "xirr": 12.5,
        "absoluteReturns": 300000,
        "percentageReturns": 30.0,
        "dayChange": 2500,
        "weekChange": 15000,
        "monthChange": 50000,
        "topGainers": [
            {"name": "TCS", "profit": 12512.5, "percentage": 7.82},
            {"name": "HDFC Bank", "profit": 9950, "percentage": 6.41}
        ],
        "topLosers": []
    })

# Reports Endpoints  
@app.route('/api/v1/reports/export', methods=['POST'])
def export_data():
    """Export portfolio data as JSON/CSV"""
    format_type = request.json.get('format', 'json')
    
    data = {
        "portfolio": MOCK_PORTFOLIO_DATA,
        "transactions": MOCK_TRANSACTIONS,
        "goals": MOCK_GOALS,
        "exportDate": datetime.now().isoformat()
    }
    
    if format_type == 'json':
        return jsonify(data)
    else:
        return jsonify({"error": "CSV export not implemented"}), 501

# Settings Endpoints
@app.route('/api/v1/settings/sheets', methods=['GET'])
def get_sheets_settings():
    """Get Google Sheets connection status"""
    return jsonify({
        "connected": gs_client is not None,
        "mode": "mock" if not gs_client else "google-sheets",
        "sheetName": os.getenv('SHEET_NAME', 'Not configured')
    })



def read_historical_data():
    """Read data from Historical and Historical-Other sheets"""
    if not gs_client:
        return []
    
    try:
        sheet_name = os.getenv('SHEET_NAME', 'WealthManagement')
        workbook = gs_client.open(sheet_name)
        
        all_data = []
        
        # Define sheets to read
        target_sheets = ['Historical', 'Historical-Other']
        
        for sheet_title in target_sheets:
            try:
                worksheet = workbook.worksheet(sheet_title)
                rows = worksheet.get_all_values()
                
                if not rows or len(rows) < 2:
                    continue
                    
                headers = rows[0]
                
                for r in rows[1:]:
                    if not r or not r[0]:
                        continue
                        
                    date_val = r[0]
                    entry = {'date': date_val, 'type': sheet_title}
                    
                    # Parse numerical columns
                    for i in range(1, len(r)):
                        header = headers[i] if i < len(headers) else f"Column_{i}"
                        val_str = r[i].replace('₹', '').replace(',', '').strip()
                        try:
                            val = float(val_str) if val_str else 0.0
                            entry[header] = val
                        except ValueError:
                            entry[header] = 0.0
                            
                    all_data.append(entry)
                    
            except Exception as e:
                print(f"Warning: Could not read sheet {sheet_title}: {e}")
                
        return all_data

    except Exception as e:
        print(f"Error reading historical data: {e}")
        return []

@app.route('/api/v1/history', methods=['GET'])
def get_historical_data():
    """Get historical performance data"""
    data = read_historical_data()
    return jsonify({"history": data})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
