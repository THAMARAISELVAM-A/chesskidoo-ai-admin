# Chesskidoo AI Admin

## Introduction
Chesskidoo AI Admin is a web-based application designed to manage and enhance the Chesskidoo AI functionalities. This project allows users to interact with the AI, configure settings, and monitor performance through an intuitive interface.

## Features
- User-friendly interface for managing Chesskidoo AI settings
- Integration with OpenAI API for advanced AI functionalities
- Real-time performance monitoring
- Deployment capabilities to GitHub Pages for ease of access

## Setup Instructions
To set up the project locally, follow these steps:

1. **Clone the repository**  
   ```bash
   git clone https://github.com/THAMARAISELVAM-A/chesskidoo-ai-admin.git
   ```
   
2. **Navigate to the project directory**  
   ```bash
   cd chesskidoo-ai-admin
   ```

3. **Install dependencies**  
   Ensure you have Node.js installed. Then run:  
   ```bash
   npm install
   ```

4. **Start the development server**  
   ```bash
   npm start
   ```  
   You can view the application by navigating to `http://localhost:3000` in your web browser.

## OpenAI API Configuration
To configure the OpenAI API:

1. Go to [OpenAI's website](https://openai.com/) and create an account if you don't have one.
2. Generate your API key from the API section.
3. Create a `.env` file in the root of the project and add the following line replacing `YOUR_API_KEY` with your actual key:
   ```plaintext
   OPENAI_API_KEY=YOUR_API_KEY
   ```

## Deployment Guide to GitHub Pages
Follow these steps to deploy the project to GitHub Pages:

1. **Build the project for production**  
   ```bash
   npm run build
   ```

2. **Navigate to the `build` directory**  
   ```bash
   cd build
   ```

3. **Deploy to GitHub Pages**  
   You can use the following command to deploy:
   ```bash
   npx gh-pages -d build
   ```  
   Make sure you have `gh-pages` installed:
   ```bash
   npm install gh-pages --save-dev
   ```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.