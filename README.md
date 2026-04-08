# Chesskidoo AI Admin Panel

A comprehensive chess academy management system with AI assistant, payment processing, and GitHub backup capabilities.

## Features

- 🎓 Student and Coach Management
- 💰 Integrated Razorpay Payment Gateway (with simulation mode)
- 🤖 AI Assistant for instant analytics
- 🔄 Automatic GitHub Backup System
- 📊 Dashboard with Revenue/Profit Tracking
- 📝 Student Enrollment & Editing
- 🏆 Wall of Fame for Achievements
- 📅 Event Management
- 📈 Dark/Light Theme Toggle
- 📱 Responsive Design

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js with Vercel Serverless Functions
- **Database**: MongoDB
- **Payment**: Razorpay
- **Backup**: GitHub API
- **Charts**: Chart.js

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- MongoDB Atlas account (or local MongoDB)
- Razorpay account (for live payments)
- GitHub account (for backup functionality)

### Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=chesskidoo-secret-2024
PORT=5000
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/THAMARAISELVAM-A/chesskidoo-ai-admin.git
cd chesskidoo-ai-admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up your `.env` file (see above)

4. Run locally:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### Default Login Credentials

- **Admin**: Username: `admin`, Password: `admin123`
- **Students**: Use student name as username and phone number as password

## API Endpoints

### Database & Backup
- `GET /api/database` - Get all database data
- `POST /api/database` - Create full backup to GitHub
- `GET /api/github-backup` - List backup files

### Core Modules
- `GET/POST /api/students` - Student management
- `GET/POST /api/coaches` - Coach management  
- `GET/POST /api/payments` - Payment processing
- `GET/POST /api/events` - Event management
- `GET/POST /api/achievements` - Achievement tracking
- `GET/POST /api/ai` - AI Assistant

### Razorpay Integration
- `POST /api/razorpay/order` - Create payment order
- `POST /api/razorpay/verify` - Verify payment signature
- `GET /api/razorpay/config` - Check key configuration

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel`
4. Add environment variables in Vercel dashboard

### Manual Deployment

Ensure all API routes are properly configured for your hosting platform.

## Project Structure

```
chesskidoo-ai-admin/
├── api/
│   ├── achievements.js     # Achievement endpoints
│   ├── coaches.js          # Coach management
│   ├── database.js         # Full DB backup to GitHub
│   ├── events.js           # Event management
│   ├── github-backup.js    # Backup file listing
│   ├── hello.js            # Health check
│   ├── payments.js         # Payment processing
│   ├── students.js         # Student management
│   └── razorpay/
│       ├── config.js       # Razorpay key detection
│       ├── order.js        # Order creation
│       └── verify.js       # Payment verification
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── index.html              # Main application
├── package.json            # Dependencies & scripts
└── README.md               # This file
```

## Usage

### GitHub Backup
1. Navigate to the GitHub Backup page from the sidebar (Admin only)
2. Click "Create Backup Now" to backup all data
3. View backup history and download files as needed

### Payment Processing
1. Go to Payments section
2. Click "Pay Now" for any student with due status
3. Choose payment method (Google Pay, PhonePe, Paytm, or Credit/Debit Card)
4. Complete payment through secure checkout
5. Automatic receipt generation available

### AI Assistant
- Ask questions like:
  - "What is our total revenue?"
  - "Who has unpaid fees?"
  - "Who is the top student?"
  - "Show me upcoming events"

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For support or inquiries, please open an issue in the repository.

---
Built with ❤️ for chess academies worldwide