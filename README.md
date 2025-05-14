# Network Traffic Analyzer & Anomaly Detection

A modern web application for analyzing network traffic logs and detecting anomalies using AI. This tool provides a clean, intuitive interface for visualizing network data, filtering logs, and identifying potential security threats with Gemini AI.

## Features

- **Log Visualization**: Interactive charts and tables for network traffic analysis
- **PCAP File Support**: Upload and analyze packet capture files
- **Real-time Filtering**: Filter logs by source, severity, and time range
- **AI-Powered Anomaly Detection**: Identify suspicious patterns using Google's Gemini AI
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v20 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- [Python 3](https://www.python.org/) and [Scapy](https://scapy.net/) (for PCAP file analysis)

## Getting Started

### 1. Clone the repository

```bash
git clone [https://github.com/yourusername/network-traffic-analyzer.git](https://github.com/jmason112/studio.git)
cd studio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables (optional)

Create a `.env` file in the root directory with the following content:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

You can obtain a Gemini API key from the [Google AI Studio](https://makersuite.google.com/app/apikey).

### 4. Run the development server

```bash
npm run dev
```

### 5. Open the application

Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Using the Application

1. **View Logs**: The main dashboard displays all ingested logs with visualization charts
2. **Filter Logs**: Use the filter controls to narrow down logs by source, severity, or time range
3. **Upload PCAP Files**: Navigate to the PCAP Visualizer section to upload and analyze packet capture files
4. **Detect Anomalies**: Click the "Scan Logs for Anomalies" button to use AI to identify suspicious patterns

## AI Anomaly Detection

The application uses Google's Gemini AI to analyze log patterns and identify potential security threats. The AI examines:

- Unusual access patterns
- Suspicious IP addresses
- Potential intrusion attempts
- Abnormal network behavior
- Authentication failures

For this feature to work, you must provide a valid Gemini API key in your `.env` file.

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [Genkit](https://firebase.google.com/docs/genkit) - AI framework
- [Google Gemini AI](https://ai.google.dev/) - AI model for anomaly detection
- [Scapy](https://scapy.net/) - Python packet manipulation
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - UI components
