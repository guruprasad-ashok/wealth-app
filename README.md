# Wealth Management Application

A modern, full-stack wealth management application built with React and Flask.

## Features

- 📊 **Portfolio Dashboard** - Real-time portfolio overview with interactive charts
- 💰 **Transaction Management** - Track all buy/sell transactions across asset classes
- 🎯 **Goal Tracking** - Set and monitor financial goals with progress tracking
- 📈 **Analytics** - Performance charts and P/L analysis
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

### Backend
- **Flask** - Python web framework
- **Google Sheets API** - Data storage (with mock mode for local testing)
- **Flask-CORS** - Cross-origin support

### Frontend
- **React** - UI library
- **Material-UI (MUI)** - Component library
- **Recharts** - Charts and visualizations
- **React Router** - Navigation
- **Axios** - HTTP client

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd wealth-app/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend server:
```bash
python app.py
```

Backend will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd wealth-app/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Portfolio
- `GET /api/v1/portfolio/overview` - Get portfolio summary
- `GET /api/v1/portfolio/assets/:class` - Get asset details
- `GET /api/v1/portfolio/performance` - Get performance history

### Transactions
- `GET /api/v1/transactions` - List all transactions
- `POST /api/v1/transactions` - Create transaction
- `PUT /api/v1/transactions/:id` - Update transaction
- `DELETE /api/v1/transactions/:id` - Delete transaction

### Goals
- `GET /api/v1/goals` - List all goals
- `POST /api/v1/goals` - Create goal
- `GET /api/v1/goals/:id/progress` - Get goal progress

## Google Sheets Integration (Optional)

To use Google Sheets as data backend:

1. Create a Google Cloud project and enable Sheets API
2. Download credentials.json
3. Place credentials.json in backend directory
4. Update .env with your sheet name

The app will automatically fall back to mock mode if credentials are not found.

## Project Structure

```
wealth-app/
├── backend/
│   ├── app.py              # Flask application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
└── frontend/
    ├── src/
    │   ├── components/     # React components
    │   │   ├── Dashboard.js
    │   │   ├── Transactions.js
    │   │   └── Goals.js
    │   ├── services/       # API services
    │   │   └── api.js
    │   ├── App.js         # Main app component
    │   └── index.js       # Entry point
    ├── package.json        # Node dependencies
    └── .env               # Environment variables
```

## Features in Detail

### Dashboard
- Total portfolio value with P/L
- Asset allocation pie chart
- Performance area chart
- Real-time summary cards

### Transactions
- Add/Edit/Delete transactions
- Support for multiple asset classes
- Automatic total amount calculation
- Sortable and filterable table

### Goals
- Create financial goals with targets
- Track progress with visual indicators
- Multiple goal categories
- Progress percentage calculation

## Development

- Backend runs in debug mode with auto-reload
- Frontend uses React hot reload
- Mock data available for testing without database

## Contributing

This is a demonstration project built based on comprehensive business requirements.

## License

MIT

---

Built with ❤️ using React and Flask
