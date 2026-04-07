# Chesskidoo AI Admin

## Introduction
Chesskidoo AI Admin is a high-performance, real-time management console for Chesskidoo Academy. It features student lifecycle management, revenue tracking, an automated AI Intelligence Hub, and an public Wall of Fame to celebrate cadet achievements.

## Features
- **Smart Dashboard**: Real-time ELO distribution and financial metrics.
- **Student & Coach Management**: Full CRUD capabilities for institutional data.
- **AI Intelligence Hub**: Query your academy data using common language.
- **Wall of Fame**: Publicly celebrate student victories.
- **Financial Tracking**: Manage payments and generate receipts instantly.

## Setup Instructions

### Pre-requisites
1. **Node.js** (v18+)
2. **MongoDB Database**: A working cluster (e.g., MongoDB Atlas).
3. **Vercel CLI** (Recommended for local API testing): `npm i -g vercel`.

### Installation
1. **Clone the repository**  
   ```bash
   git clone https://github.com/THAMARAISELVAM-A/chesskidoo-ai-admin.git
   cd chesskidoo-ai-admin
   ```
   
2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root and add:
   ```plaintext
   MONGODB_URI=your_mongodb_connection_string
   OPENAI_API_KEY=your_openai_key (optional, for AI Hub)
   ```

4. **Run Locally**
   To run both the frontend and backend (recommended):
   ```bash
   npm run dev
   ```
   Or for just the static frontend:
   ```bash
   npm start
   ```

## API Documentation
The API is built using Vercel Serverless Functions and acts as a bridge between the frontend and MongoDB.
- `/api/students`: Manage cadets.
- `/api/coaches`: Manage instructors.
- `/api/achievements`: Manage Wall of Fame content.
- `/api/events`: Manage academy events.
- `/api/payments`: Track financial transactions.

## License
MIT License.