// app.js
// Server-side code for Ambulance GPS Tracker

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Initialize application
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory database for simplicity
// In a production environment, use a real database
const users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'superadmin', password: 'super123', role: 'admin' }
];

// Store ambulances with location history for movement tracking
const ambulances = {};

// Create public directory and necessary files if they don't exist
function setupPublicFiles() {
  // Create public directory if it doesn't exist
  if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public');
    console.log('Created public directory');
  }

  // Create CSS directory if it doesn't exist
  if (!fs.existsSync('./public/css')) {
    fs.mkdirSync('./public/css');
    console.log('Created CSS directory');
  }

  // Create JS directory if it doesn't exist
  if (!fs.existsSync('./public/js')) {
    fs.mkdirSync('./public/js');
    console.log('Created JS directory');
  }
  
  // Create images directory if it doesn't exist
  if (!fs.existsSync('./public/images')) {
    fs.mkdirSync('./public/images');
    console.log('Created images directory');
    
    // Create placeholder images
    createPlaceholderImages();
  }

  // Write CSS file
  fs.writeFileSync('./public/css/styles.css', `
    :root {
      --primary-color: #1976d2;
      --secondary-color: #f50057;
      --success-color: #4caf50;
      --warning-color: #ff9800;
      --danger-color: #f44336;
      --light-bg: #f8f9fa;
      --dark-bg: #343a40;
      --text-dark: #212529;
      --text-light: #f8f9fa;
      --border-radius: 8px;
      --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      --transition: all 0.3s ease;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Poppins', 'Segoe UI', 'Roboto', sans-serif;
      margin: 0;
      padding: 0;
      background-color: var(--light-bg);
      color: var(--text-dark);
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    /* Navbar */
    .navbar {
      background-color: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 0.8rem 2rem;
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .navbar-brand {
      display: flex;
      align-items: center;
    }
    
    .navbar-logo {
      height: 40px;
      margin-right: 15px;
    }
    
    .navbar-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0;
    }
    
    /* Welcome Section */
    .welcome-section {
      text-align: center;
      padding: 2rem 0;
    }
    
    .welcome-title {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: var(--primary-color);
    }
    
    .welcome-subtitle {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      color: #666;
    }
    
    .city-image {
      width: 40%;
      max-width: 100px;
      margin-bottom: 2rem;
    }
    
    .button-container {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 2rem;
    }
    
    .btn {
      display: inline-block;
      min-width: 200px;
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 500;
      text-align: center;
      text-decoration: none;
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: var(--transition);
    }
    
    .btn-primary {
      background-color: var(--primary-color);
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #1565c0;
      transform: translateY(-2px);
    }
    
    .btn-secondary {
      background-color: white;
      color: var(--primary-color);
      border: 2px solid var(--primary-color);
    }
    
    .btn-secondary:hover {
      background-color: #f0f7ff;
      transform: translateY(-2px);
    }

    .btn-success {
      background-color: var(--success-color);
      color: white;
    }
    
    .btn-success:hover {
      background-color: #3d8b40;
    }
    
    .btn-danger {
      background-color: var(--danger-color);
      color: white;
    }
    
    .btn-danger:hover {
      background-color: #d32f2f;
    }
    
    /* Login Section */
    .login-container, .admin-panel, .map-container {
      background: white;
      padding: 30px;
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
      margin-top: 20px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .section-title {
      text-align: center;
      margin-bottom: 1.5rem;
      color: var(--primary-color);
      font-size: 1.75rem;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
    }
    
    .form-control {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: var(--border-radius);
      font-size: 1rem;
      transition: var(--transition);
    }
    
    .form-control:focus {
      border-color: var(--primary-color);
      outline: none;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.25);
    }
    
    .form-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #666;
    }
    
    .form-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
      transition: var(--transition);
    }
    
    .form-link:hover {
      text-decoration: underline;
    }
    
    /* Map Section */
    .map-container {
      max-width: 1200px;
    }
    
    #map {
      height: 500px;
      width: 100%;
      border-radius: var(--border-radius);
      margin-bottom: 1.5rem;
      border: 1px solid #ddd;
    }
    
    .controls-section {
      margin-bottom: 1.5rem;
    }
    
    .control-group {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    
    .control-checkbox {
      margin-right: 0.5rem;
    }
    
    /* Ambulance List */
    .ambulance-list {
      background: white;
      border-radius: var(--border-radius);
      padding: 1.5rem;
      margin-top: 1.5rem;
      box-shadow: var(--box-shadow);
    }
    
    .ambulance-list-title {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: var(--primary-color);
    }
    
    .ambulance-item {
      background-color: #f9f9f9;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: var(--border-radius);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 5px solid var(--primary-color);
    }
    
    .ambulance-info {
      flex-grow: 1;
    }
    
    .ambulance-name {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .status-active {
      color: var(--success-color);
      font-weight: 600;
    }
    
    .status-inactive {
      color: var(--danger-color);
      font-weight: 600;
    }
    
    .status-moving {
      color: var(--primary-color);
      font-weight: 600;
    }
    
    .ambulance-actions {
      display: flex;
      gap: 10px;
    }
    
    .action-btn {
      padding: 8px 16px;
      border-radius: var(--border-radius);
      border: none;
      background-color: var(--primary-color);
      color: white;
      cursor: pointer;
      transition: var(--transition);
    }
    
    .action-btn:hover {
      background-color: #1565c0;
    }
    
    /* Admin Panel */
    .admin-panel {
      text-align: center;
    }
    
    .admin-welcome {
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
    }
    
    .admin-controls {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 1.5rem;
    }
    
    .status-message {
      padding: 12px;
      border-radius: var(--border-radius);
      background-color: #f0f7ff;
      margin-top: 1.5rem;
      text-align: center;
      font-weight: 500;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem 0;
      margin-top: 2rem;
      background-color: white;
      border-top: 1px solid #eee;
    }
    
    .footer-text {
      color: #666;
      font-size: 0.9rem;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      .btn {
        min-width: 180px;
      }
      
      .button-container {
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }
      
      .ambulance-item {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .ambulance-actions {
        margin-top: 10px;
        width: 100%;
      }
      
      .action-btn {
        flex-grow: 1;
        text-align: center;
      }
    }
    
    /* Utility Classes */
    .text-center {
      text-align: center;
    }
    
    .mt-1 { margin-top: 0.5rem; }
    .mt-2 { margin-top: 1rem; }
    .mt-3 { margin-top: 1.5rem; }
    .mt-4 { margin-top: 2rem; }
    
    .mb-1 { margin-bottom: 0.5rem; }
    .mb-2 { margin-bottom: 1rem; }
    .mb-3 { margin-bottom: 1.5rem; }
    .mb-4 { margin-bottom: 2rem; }
  `);

  // Write client-side JS file
  fs.writeFileSync('./public/js/app.js', `
    // Global variables
    const socket = io();
    let map;
    let userLocation;
    let markers = {};
    let paths = {};
    let watchId = null;
    let currentUser = null;
    let isTracking = false;
    let selectedAmbulanceId = null;
    let autoFocus = true;
    let ambulanceData = {};
    let locationUpdateInterval;
    let mapInitialized = false;
    
    // DOM Elements
    document.addEventListener('DOMContentLoaded', function() {
      const welcomeSection = document.getElementById('welcomeSection');
      const loginSection = document.getElementById('loginSection');
      const adminPanel = document.getElementById('adminPanel');
      const mapSection = document.getElementById('mapSection');
      const loginBtn = document.getElementById('loginBtn');
      const startTrackingBtn = document.getElementById('startTrackingBtn');
      const stopTrackingBtn = document.getElementById('stopTrackingBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const backToLoginBtn = document.getElementById('backToLoginBtn');
      const startBtn = document.getElementById('startBtn');
      const loginAdminBtn = document.getElementById('loginAdminBtn');
      const adminInfo = document.getElementById('adminInfo');
      const statusMessage = document.getElementById('statusMessage');
      const ambulanceList = document.getElementById('ambulanceList');
      const autoFocusCheckbox = document.getElementById('autoFocus');
      const backToHomeBtn = document.getElementById('backToHomeBtn');
      
      // Initialize the map
      function initMap() {
        if (mapInitialized) return;
        
        // Center on Madiun, East Java, Indonesia
        const madiunCoordinates = [-7.6298, 111.5300];
        map = L.map('map').setView(madiunCoordinates, 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add custom map controls
        const customControl = L.control({ position: 'topright' });
        customControl.onAdd = function(map) {
          const div = L.DomUtil.create('div', 'custom-map-control');
          div.innerHTML = \`
            <button id="zoomInBtn" class="map-control-btn" title="Zoom In">+</button>
            <button id="zoomOutBtn" class="map-control-btn" title="Zoom Out">-</button>
            <button id="centerMapBtn" class="map-control-btn" title="Center Map"><i class="fas fa-crosshairs"></i></button>
          \`;
          return div;
        };
        customControl.addTo(map);
        
        // Add event listeners to custom map controls
        setTimeout(() => {
          document.getElementById('zoomInBtn').addEventListener('click', () => map.zoomIn());
          document.getElementById('zoomOutBtn').addEventListener('click', () => map.zoomOut());
          document.getElementById('centerMapBtn').addEventListener('click', () => {
            if (selectedAmbulanceId && ambulanceData[selectedAmbulanceId]) {
              const pos = [ambulanceData[selectedAmbulanceId].location.lat, ambulanceData[selectedAmbulanceId].location.lng];
              map.setView(pos, 15);
            } else {
              map.setView(madiunCoordinates, 13);
            }
          });
        }, 100);
        
        mapInitialized = true;
      }

      // Function to handle login
      function login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
          showNotification('Please enter both username and password', 'error');
          return;
        }
        
        showNotification('Logging in...', 'info');
        socket.emit('login', { username, password });
      }

      // Show notification
      function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = \`notification notification-\${type}\`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Show the notification
        setTimeout(() => {
          notification.classList.add('show');
        }, 10);
        
        // Remove the notification after 3 seconds
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 300);
        }, 3000);
      }

      // Start GPS tracking
      function startTracking() {
        if (!navigator.geolocation) {
          statusMessage.textContent = 'Geolocation is not supported by your browser';
          showNotification('Geolocation is not supported by your browser', 'error');
          return;
        }

        statusMessage.textContent = 'Initializing GPS tracking...';
        showNotification('Initializing GPS tracking...', 'info');
        
        // Set high accuracy for better tracking
        watchId = navigator.geolocation.watchPosition(
          position => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || 0, // Speed in m/s
              heading: position.coords.heading || 0, // Direction in degrees
              timestamp: new Date().toISOString()
            };
            
            isTracking = true;
            startTrackingBtn.style.display = 'none';
            stopTrackingBtn.style.display = 'block';
            
            statusMessage.textContent = 'GPS tracking active. Your location is being shared.';
            socket.emit('updateLocation', { 
              userId: currentUser.id, 
              username: currentUser.username,
              location: location 
            });
          },
          error => {
            console.error('Error getting location:', error);
            showNotification('Error: ' + error.message, 'error');
            statusMessage.textContent = 'Error: ' + error.message;
          },
          { 
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
          }
        );
        
        // Also send updates at a regular interval to ensure continuous tracking
        locationUpdateInterval = setInterval(() => {
          if (isTracking) {
            navigator.geolocation.getCurrentPosition(
              position => {
                const location = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  speed: position.coords.speed || 0,
                  heading: position.coords.heading || 0,
                  timestamp: new Date().toISOString()
                };
                
                socket.emit('updateLocation', { 
                  userId: currentUser.id, 
                  username: currentUser.username,
                  location: location 
                });
              },
              error => {
                console.error('Error updating location:', error);
              },
              { 
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
              }
            );
          }
        }, 3000);
      }

      // Stop GPS tracking
      function stopTracking() {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
          isTracking = false;
          startTrackingBtn.style.display = 'block';
          stopTrackingBtn.style.display = 'none';
          statusMessage.textContent = 'GPS tracking stopped';
          showNotification('GPS tracking stopped', 'warning');
          
          if (locationUpdateInterval) {
            clearInterval(locationUpdateInterval);
            locationUpdateInterval = null;
          }
          
          socket.emit('stopTracking', { 
            userId: currentUser.id,
            username: currentUser.username
          });
        }
      }

      // Focus map on a specific ambulance
      function focusOnAmbulance(id) {
        selectedAmbulanceId = id;
        
        if (ambulanceData[id] && map && markers[id]) {
          const position = [ambulanceData[id].location.lat, ambulanceData[id].location.lng];
          map.setView(position, 16); // Zoom level 16 for better visibility
          markers[id].openPopup();
          showNotification(\`Focusing on ambulance: \${ambulanceData[id].username}\`, 'info');
        }
      }

      // Calculate if ambulance is moving based on speed or location changes
      function isAmbulanceMoving(id) {
        const ambulance = ambulanceData[id];
        
        // If we have speed data and it's greater than threshold (2 km/h = ~0.56 m/s)
        if (ambulance.location.speed && ambulance.location.speed > 0.56) {
          return true;
        }
        
        // If we have location history, check if it's moved significantly in the last minute
        if (ambulance.locationHistory && ambulance.locationHistory.length >= 2) {
          const latest = ambulance.locationHistory[ambulance.locationHistory.length - 1];
          const previous = ambulance.locationHistory[0];
          
          const timeDiff = (new Date(latest.timestamp) - new Date(previous.timestamp)) / 1000; // in seconds
          
          // Only compare if we have points from different times (at least 5 seconds apart)
          if (timeDiff > 5) {
            // Calculate distance between points using Haversine formula
            const lat1 = previous.lat;
            const lon1 = previous.lng;
            const lat2 = latest.lat;
            const lon2 = latest.lng;
            
            const R = 6371e3; // Earth radius in meters
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c; // in meters
            
            const speed = distance / timeDiff; // meters per second
            
            // If speed is greater than 0.56 m/s (2 km/h), consider it moving
            return speed > 0.56;
          }
        }
        
        return false;
      }

      // Update ambulance list
      function updateAmbulanceList(ambulances) {
        ambulanceList.innerHTML = '<h3 class="ambulance-list-title">Active Ambulances</h3>';
        
        if (Object.keys(ambulances).length === 0) {
          ambulanceList.innerHTML += '<p class="no-ambulances">No active ambulances at the moment</p>';
          return;
        }
        
        for (const id in ambulances) {
          const ambulance = ambulances[id];
          const lastUpdate = new Date(ambulance.location.timestamp);
          const now = new Date();
          const timeDiff = (now - lastUpdate) / 1000; // in seconds
          
          let statusClass = 'status-active';
          let statusText = 'Active (Stationary)';
          let statusIcon = '⬤'; // Green circle
          
          // If last update was more than 30 seconds ago, consider inactive
          if (timeDiff > 30) {
            statusClass = 'status-inactive';
            statusText = 'Inactive';
            statusIcon = '⬤'; // Red circle
          } else if (isAmbulanceMoving(id)) {
            statusClass = 'status-moving';
            statusText = 'Active (Moving)';
            statusIcon = '⬤'; // Blue circle
          }
          
          // Format speed if available
          const speed = ambulance.location.speed 
            ? (ambulance.location.speed * 3.6).toFixed(1) + ' km/h' 
            : 'N/A';
          
          const item = document.createElement('div');
          item.className = 'ambulance-item';
          item.innerHTML = \`
            <div class="ambulance-info">
              <div class="ambulance-name">\${ambulance.username}</div>
              <div class="ambulance-status">
                <span class="\${statusClass}">\${statusIcon} \${statusText}</span>
               </div>
               <div class="ambulance-details">
                 <small>Speed: \${speed} • Last Updated: \${lastUpdate.toLocaleTimeString()}</small>
               </div>
             </div>
             <div class="ambulance-actions">
               <button class="action-btn focus-btn" data-id="\${id}">
                 <i class="fas fa-map-marker-alt"></i> Focus
               </button>
             </div>
           \`;
          
          ambulanceList.appendChild(item);
        }
        
        // Add click event for focus buttons
        document.querySelectorAll('.focus-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            focusOnAmbulance(id);
          });
        });
      }

      // Draw path for ambulance movement
      function drawAmbulancePath(id) {
        if (!map || !ambulanceData[id] || !ambulanceData[id].locationHistory || ambulanceData[id].locationHistory.length < 2) {
          return;
        }
        
        // Remove old path if exists
        if (paths[id]) {
          map.removeLayer(paths[id]);
        }
        
        // Create path points from location history
        const points = ambulanceData[id].locationHistory.map(loc => [loc.lat, loc.lng]);
        
        // Add current location
        points.push([ambulanceData[id].location.lat, ambulanceData[id].location.lng]);
        
        // Create and add path to map
        paths[id] = L.polyline(points, {
          color: '#1976d2',
          weight: 4,
          opacity: 0.6,
          lineJoin: 'round'
        }).addTo(map);
      }

      // Show user on the map
      function updateMarker(id, data) {
        // Store the data for later use
        if (!ambulanceData[id]) {
          ambulanceData[id] = {
            ...data,
            locationHistory: []
          };
        } else {
          // Keep location history, max 20 points
          if (!ambulanceData[id].locationHistory) {
            ambulanceData[id].locationHistory = [];
          }
          
          // Only add to history if position has changed
          const lastPos = ambulanceData[id].location;
          if (lastPos && (lastPos.lat !== data.location.lat || lastPos.lng !== data.location.lng)) {
            ambulanceData[id].locationHistory.push({...lastPos});
            if (ambulanceData[id].locationHistory.length > 20) {
              ambulanceData[id].locationHistory.shift();
            }
          }
          
          ambulanceData[id].location = data.location;
        }
        
        if (map) {
          const isMoving = isAmbulanceMoving(id);
          let markerColor = isMoving ? 'blue' : 'red';
          let markerIcon = L.divIcon({
            className: 'custom-marker',
            html: \`<div class="marker-content marker-\${markerColor}">
                     <i class="fas fa-ambulance"></i>
                     <div class="pulse"></div>
                   </div>\`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          // Format speed in km/h if available
          const speed = data.location.speed ? (data.location.speed * 3.6).toFixed(1) : 'N/A';
          const movementStatus = isMoving ? 'Moving' : 'Stationary';
          
          // Create a new marker if it doesn't exist
          if (!markers[id]) {
            markers[id] = L.marker([data.location.lat, data.location.lng], {icon: markerIcon}).addTo(map);
            markers[id].bindPopup(\`
              <div class="custom-popup">
                <h3>\${data.username}</h3>
                <p><strong>Status:</strong> <span class="status-\${isMoving ? 'moving' : 'active'}">\${movementStatus}</span></p>
                <p><strong>Speed:</strong> \${speed} km/h</p>
                <p><strong>Last Update:</strong> \${new Date(data.location.timestamp).toLocaleString()}</p>
              </div>
            \`);
          } else {
            // Update existing marker
            markers[id].setIcon(markerIcon);
            markers[id].setLatLng([data.location.lat, data.location.lng]);
          // Update popup content with latest data
          markers[id].bindPopup(
            '<div class="custom-popup">' +
              '<div>' +
                '<h3>' + data.username + '</h3>' +
                '<p><strong>Status:</strong> <span class="status-' + (isMoving ? 'moving' : 'active') + '">' + movementStatus + '</span></p>' +
                '<p><strong>Speed:</strong> ' + speed + ' km/h</p>' +
                '<p><strong>Last Update:</strong> ' + new Date(data.location.timestamp).toLocaleString() + '</p>' +
              '</div>' +
            '</div>'
          );
          }
          
          // Draw path for ambulance movement
          drawAmbulancePath(id);
          
          // If this is the selected ambulance and auto-focus is enabled, center the map
          if ((id === selectedAmbulanceId || Object.keys(markers).length === 1) && autoFocus) {
            map.setView([data.location.lat, data.location.lng], map.getZoom());
          }
        }
      }

      // Remove marker when user stops tracking
      function removeMarker(id) {
        if (map && markers[id]) {
          map.removeLayer(markers[id]);
          delete markers[id];
        }
        
        // Remove path if exists
        if (paths[id]) {
          map.removeLayer(paths[id]);
          delete paths[id];
        }
        
        // Also remove from ambulanceData
        if (ambulanceData[id]) {
          delete ambulanceData[id];
        }
        
        // Reset selected ambulance if it was this one
        if (selectedAmbulanceId === id) {
          selectedAmbulanceId = null;
        }
      }

      // Show welcome screen
      function showWelcomeScreen() {
        welcomeSection.style.display = 'block';
        loginSection.style.display = 'none';
        adminPanel.style.display = 'none';
        mapSection.style.display = 'none';
      }

      // Show login screen
      function showLoginScreen() {
        welcomeSection.style.display = 'none';
        loginSection.style.display = 'block';
        adminPanel.style.display = 'none';
        mapSection.style.display = 'none';
      }

      // Show map screen
      function showMapScreen() {
        welcomeSection.style.display = 'none';
        loginSection.style.display = 'none';
        adminPanel.style.display = 'none';
        mapSection.style.display = 'block';
        
        if (!mapInitialized) {
          setTimeout(initMap, 100);
        }
        
        // Request current ambulance data
        socket.emit('getAmbulances');
      }

      // Socket events
      socket.on('loginResponse', data => {
        if (data.success) {
          currentUser = data.user;
          showNotification('Welcome ' + currentUser.username + '!', 'success');
          welcomeSection.style.display = 'none';
          loginSection.style.display = 'none';
          adminPanel.style.display = 'block';
          mapSection.style.display = 'none';
          adminInfo.textContent = 'Welcome, ' + currentUser.username + '!';
        } else {
          showNotification('Login failed: ' + data.message, 'error');
        }
      });

      socket.on('ambulancesUpdate', data => {
        // Update markers on the map
        for (const id in data) {
          updateMarker(id, data[id]);
        }
        
        // Update the list
        updateAmbulanceList(data);
      });

      socket.on('ambulanceRemoved', id => {
        removeMarker(id);
        showNotification('An ambulance has gone offline', 'warning');
      });

      // Event listeners for welcome screen
      if (startBtn) {
        startBtn.addEventListener('click', e => {
          e.preventDefault();
          showMapScreen();
        });
      }
      
      if (loginAdminBtn) {
        loginAdminBtn.addEventListener('click', e => {
          e.preventDefault();
          showLoginScreen();
        });
      }

      // Event listeners for login
      if (loginBtn) {
        loginBtn.addEventListener('click', login);
        
        // Also allow Enter key to submit
        document.getElementById('password').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            login();
          }
        });
      }
      
      // Tracking controls
      if (startTrackingBtn) startTrackingBtn.addEventListener('click', startTracking);
      if (stopTrackingBtn) stopTrackingBtn.addEventListener('click', stopTracking);
      
      // Auto-focus checkbox
      if (autoFocusCheckbox) {
        autoFocusCheckbox.addEventListener('change', function() {
          autoFocus = this.checked;
        });
      }
      
      // Navigation buttons
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          if (isTracking) {
            stopTracking();
          }
          currentUser = null;
          showNotification('You have been logged out', 'info');
          showWelcomeScreen();
          statusMessage.textContent = '';
        });
      }
      
      if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
          showLoginScreen();
        });
      }
      
      if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
          showWelcomeScreen();
        });
      }

      // Handle page unload/close to stop tracking
      window.addEventListener('beforeunload', () => {
        if (isTracking && currentUser) {
          socket.emit('stopTracking', { userId: currentUser.id });
        }
      });
    });
  `);

  // Create addtional CSS for custom markers and notifications
  fs.writeFileSync('./public/css/markers.css', `
    .custom-marker {
      width: 40px;
      height: 40px;
    }
    
    .marker-content {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }
    
    .marker-red {
      color: white;
      background-color: #f44336;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    }
    
    .marker-blue {
      color: white;
      background-color: #1976d2;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    }
    
    .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      animation: pulse 2s infinite;
      opacity: 0;
    }
    
    .marker-red .pulse {
      background-color: rgba(244, 67, 54, 0.6);
    }
    
    .marker-blue .pulse {
      background-color: rgba(25, 118, 210, 0.6);
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.7;
      }
      70% {
        transform: scale(1.5);
        opacity: 0;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
    
    .custom-popup {
      padding: 5px;
    }
    
    .custom-popup h3 {
      margin: 0 0 10px 0;
      color: #1976d2;
    }
    
    .custom-popup p {
      margin: 5px 0;
    }
    
    .custom-map-control {
      background: white;
      padding: 5px;
      border-radius: 4px;
      box-shadow: 0 1px 5px rgba(0,0,0,0.4);
    }
    
    .map-control-btn {
      width: 30px;
      height: 30px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 2px;
      display: block;
      text-align: center;
      line-height: 30px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      margin-bottom: 5px;
    }
    
    .map-control-btn:hover {
      background: #f4f4f4;
    }
    
    /* Notifications */
    .notification {
      position: fixed;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      z-index: 9999;
      transition: top 0.3s ease;
    }
    
    .notification.show {
      top: 20px;
    }
    
    .notification-info {
      background-color: #1976d2;
    }
    
    .notification-success {
      background-color: #4caf50;
    }
    
    .notification-warning {
      background-color: #ff9800;
    }
    
    .notification-error {
      background-color: #f44336;
    }
  `);

  // Write HTML file
  fs.writeFileSync('./public/index.html', `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Madiun City Ambulance Tracker</title>
      <!-- Leaflet CSS -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css" />
      <!-- Font Awesome -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      <!-- Google Fonts -->
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" />
      <!-- Custom CSS -->
      <link rel="stylesheet" href="/css/styles.css" />
      <link rel="stylesheet" href="/css/markers.css" />
      <!-- Leaflet JS -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js"></script>
      <!-- Socket.IO -->
      <script src="/socket.io/socket.io.js"></script>
      <!-- Custom JS -->
      <script src="/js/app.js"></script>
    </head>
    <body>
      <!-- Navbar -->
      <nav class="navbar">
        <div class="navbar-brand">
          <img src="/images/ppid.jpg" alt="PPID Logo" class="navbar-logo">
         
        </div>
        <div class="navbar-actions">
          <a href="#" class="form-link">Emergency: 118</a>
        </div>
      </nav>
      
      <!-- Main Content -->
      <div class="container">
        <!-- Welcome Section -->
        <div id="welcomeSection" class="welcome-section">
          <h1 class="welcome-title">Madiun City Ambulance Tracker</h1>
          <p class="welcome-subtitle">Real-time tracking system for emergency services</p>
          
          <img src="/images/kota madiun.jpeg" alt="Kota Madiun" class="city-image">
          
          <div class="button-container">
            <button id="startBtn" class="btn btn-primary">
              <i class="fas fa-map-marked-alt"></i> Mulai
            </button>
            <button id="loginAdminBtn" class="btn btn-secondary">
              <i class="fas fa-user-shield"></i> Login Sebagai Admin
            </button>
          </div>
          
          <div class="features">
            <div class="feature">
              <i class="fas fa-location-arrow"></i>
              <h3>Real-Time Tracking</h3>
              <p>Monitor ambulance locations in real-time across Madiun City</p>
            </div>
            <div class="feature">
              <i class="fas fa-route"></i>
              <h3>Route Visualization</h3>
              <p>See ambulance movement paths and current routes</p>
            </div>
            <div class="feature">
              <i class="fas fa-tachometer-alt"></i>
              <h3>Status Updates</h3>
              <p>Get instant alerts on ambulance movement and availability</p>
            </div>
          </div>
        </div>
        
        <!-- Login Section -->
        <div id="loginSection" class="login-container" style="display: none;">
          <h2 class="section-title">Admin Login</h2>
          <div class="form-group">
            <label for="username" class="form-label">Username:</label>
            <input type="text" id="username" placeholder="Enter username" class="form-control">
          </div>
          <div class="form-group">
            <label for="password" class="form-label">Password:</label>
            <input type="password" id="password" placeholder="Enter password" class="form-control">
          </div>
          <button id="loginBtn" class="btn btn-primary">
            <i class="fas fa-sign-in-alt"></i> Login
          </button>
          <p class="form-text mt-3 text-center">
            <a href="#" id="backToHomeBtn" class="form-link">
              <i class="fas fa-arrow-left"></i> Back to Home
            </a>
          </p>
        </div>

        <!-- Admin Panel -->
        <div id="adminPanel" class="admin-panel" style="display: none;">
          <h2 class="section-title">Admin Control Panel</h2>
          <p id="adminInfo" class="admin-welcome"></p>
          
          <div class="admin-controls">
            <button id="startTrackingBtn" class="btn btn-success">
              <i class="fas fa-play-circle"></i> Start GPS Tracking
            </button>
            <button id="stopTrackingBtn" class="btn btn-danger" style="display: none;">
              <i class="fas fa-stop-circle"></i> Stop GPS Tracking
            </button>
            <button id="viewMapBtn" class="btn btn-primary">
              <i class="fas fa-map"></i> View Map
            </button>
            <button id="logoutBtn" class="btn btn-secondary">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
          
          <div id="statusMessage" class="status-message"></div>
        </div>

        <!-- Map Section -->
        <div id="mapSection" class="map-container" style="display: none;">
          <h2 class="section-title">Lokasi Ambulan</h2>
          
          <div id="map"></div>
          
          <div class="controls-section">
            <div class="control-group">
              <input type="checkbox" id="autoFocus" class="control-checkbox" checked>
              <label for="autoFocus">Auto-focus on ambulance</label>
            </div>
          </div>
          
          <div id="ambulanceList" class="ambulance-list"></div>
          
          <button id="backToLoginBtn" class="btn btn-secondary mt-3">
            <i class="fas fa-arrow-left"></i> Back to Login
          </button>
        </div>
      </div>
      
      <!-- Footer -->
      <footer class="footer">
        <p class="footer-text">© 2025 Madiun City Emergency Services. All rights reserved.</p>
      </footer>
    </body>
    </html>
  `);
}

// Function to create placeholder images if real images are not available
function createPlaceholderImages() {
  // Create a placeholder for the PPID logo
  const ppidPlaceholder = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#1976d2"/>
      <text x="100" y="100" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">PPID LOGO</text>
      <text x="100" y="130" font-family="Arial" font-size="14" fill="white" text-anchor="middle" dominant-baseline="middle">Pejabat Pengelola Informasi dan Dokumentasi</text>
    </svg>
  `;

  // Create a placeholder for the Madiun City image
  const madiunPlaceholder = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
      <rect width="800" height="400" fill="#f5f5f5"/>
      <rect x="50" y="150" width="150" height="150" fill="#1976d2"/>
      <rect x="220" y="100" width="100" height="200" fill="#4caf50"/>
      <rect x="340" y="180" width="120" height="120" fill="#f44336"/>
      <rect x="480" y="120" width="80" height="180" fill="#ff9800"/>
      <rect x="580" y="80" width="170" height="220" fill="#9c27b0"/>
      <text x="400" y="350" font-family="Arial" font-size="24" fill="#333" text-anchor="middle">Kota Madiun</text>
    </svg>
  `;

  // Write SVG placeholders to files
  fs.writeFileSync('./public/images/ppid.jpg', Buffer.from(ppidPlaceholder));
  fs.writeFileSync('./public/images/kota-madiun.jpeg', Buffer.from(madiunPlaceholder));
  
  console.log('Created placeholder images');
}

// Ensure public files exist
setupPublicFiles();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Login handling
  socket.on('login', (data) => {
    const user = users.find(u => u.username === data.username && u.password === data.password);
    
    if (user) {
      socket.emit('loginResponse', { success: true, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      socket.emit('loginResponse', { success: false, message: 'Invalid username or password' });
    }
  });
  
  // Location update handling
  socket.on('updateLocation', (data) => {
    // Make sure location data is valid
    if (!data.location || isNaN(data.location.lat) || isNaN(data.location.lng)) {
      return;
    }
    
    // Initialize ambulance object if it doesn't exist
    if (!ambulances[data.userId]) {
      ambulances[data.userId] = {
        userId: data.userId,
        username: data.username,
        location: data.location,
        locationHistory: []
      };
    } else {
      // Update location and keep history
      if (!ambulances[data.userId].locationHistory) {
        ambulances[data.userId].locationHistory = [];
      }
      
      // Keep last 20 locations for movement tracking and path drawing
      ambulances[data.userId].locationHistory.push({...ambulances[data.userId].location});
      if (ambulances[data.userId].locationHistory.length > 20) {
        ambulances[data.userId].locationHistory.shift();
      }
      
      ambulances[data.userId].location = data.location;
    }
    
    // Broadcast to all clients
    io.emit('ambulancesUpdate', ambulances);
  });
  
  // Stop tracking
  socket.on('stopTracking', (data) => {
    if (ambulances[data.userId]) {
      delete ambulances[data.userId];
      io.emit('ambulanceRemoved', data.userId);
      io.emit('ambulancesUpdate', ambulances);
    }
  });
  
  // Get all ambulances
  socket.on('getAmbulances', () => {
    socket.emit('ambulancesUpdate', ambulances);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

// Function to clean up inactive ambulances (not updated in the last 2 minutes)
function cleanupInactiveAmbulances() {
  const now = new Date();
  let hasChanges = false;
  
  for (const id in ambulances) {
    const lastUpdate = new Date(ambulances[id].location.timestamp);
    const timeDiffMinutes = (now - lastUpdate) / (1000 * 60);
    
    // Remove if last update was more than 2 minutes ago
    if (timeDiffMinutes > 2) {
      delete ambulances[id];
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    io.emit('ambulancesUpdate', ambulances);
  }
}

// Run cleanup every minute
setInterval(cleanupInactiveAmbulances, 60000);