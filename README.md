# ecotrack🍃

EcoTrack is a web-based sustainability tool that analyzes **Scope 3 supply chain emissions** using uploaded CSV data and provides **AI-driven recommendations**, including **low-carbon material substitution**.

The system is built using **Node.js for the backend** and a **simple HTML/CSS/JS frontend**.

---

## Features

- CSV upload for supply chain data
- Scope 3 emission analysis
- Material-based emission comparison
- Recommendation engine for lower-carbon alternatives
- Lightweight frontend interface

---

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express (via `server.js`)

---

## Project Structure

```text
ecotrack/
├── node_modules/
├── recom/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── uploads/
│   └── (uploaded CSV files stored here)
├── eco.html
├── eco.js
├── eco.css
├── server.js
├── package.json
├── package-lock.json
├── sample_data.csv
├── test_upload.csv
├── start.bat
└── README.md
```
---

## CSV Upload Format (IMPORTANT)

The application requires a **CSV file upload** with the following **exact column format**.

### Required Columns

| Column Name | Description |
|------------|------------|
| origin | Shipment starting location |
| destination | Shipment ending location |
| weight | Weight of goods transported |
| material | Material being transported |
| quantity | Number of units transported |

⚠️ Column names **must match exactly**, otherwise the upload will fail.

---

## How It Works

1. User uploads a CSV file through the frontend
2. File is stored in the `uploads/` folder
3. Backend parses and processes the data
4. Emissions are calculated based on material and logistics
5. System recommends lower-carbon material alternatives
6. Results are displayed on the UI

---

## Use Cases

- ESG & Sustainability Analysis
- Supply Chain Emission Tracking
- Hackathons & Climate-Tech Projects
- Educational Demonstrations

---

