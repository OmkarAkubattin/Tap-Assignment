# Smart Emergency Responder App

A web application that automatically detects emergencies and alerts contacts when the user is in distress, offline, or in poor network conditions.

## Features

- 🚨 **Automatic Emergency Detection**
  - Triggers alerts when user is inactive for extended periods
  - Detects when device goes offline
  - Identifies poor network conditions (2G/slow networks)

- 📍 **Real-time Location Tracking**
  - Continuous GPS monitoring
  - Location updates during emergencies

- 📶 **Network Status Monitoring**
  - Detects offline status
  - Identifies slow network connections
  - Monitors connection quality (downlink speed, latency)

- ⚙️ **Background Health Checks**
  - Periodic system monitoring
  - Web Worker-based background tasks

## Technologies Used

- **Frontend**: React.js
- **APIs Used**:
  - Geolocation API
  - Network Information API
  - Page Visibility API
  - Web Workers API
- **Styling**: CSS3

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/smart-emergency-responder.git
