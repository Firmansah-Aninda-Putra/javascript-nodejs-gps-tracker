
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
          div.innerHTML = `
            <button id="zoomInBtn" class="map-control-btn" title="Zoom In">+</button>
            <button id="zoomOutBtn" class="map-control-btn" title="Zoom Out">-</button>
            <button id="centerMapBtn" class="map-control-btn" title="Center Map"><i class="fas fa-crosshairs"></i></button>
          `;
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
        notification.className = `notification notification-${type}`;
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
          showNotification(`Focusing on ambulance: ${ambulanceData[id].username}`, 'info');
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
          item.innerHTML = `
            <div class="ambulance-info">
              <div class="ambulance-name">${ambulance.username}</div>
              <div class="ambulance-status">
                <span class="${statusClass}">${statusIcon} ${statusText}</span>
               </div>
               <div class="ambulance-details">
                 <small>Speed: ${speed} • Last Updated: ${lastUpdate.toLocaleTimeString()}</small>
               </div>
             </div>
             <div class="ambulance-actions">
               <button class="action-btn focus-btn" data-id="${id}">
                 <i class="fas fa-map-marker-alt"></i> Focus
               </button>
             </div>
           `;
          
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
            html: `<div class="marker-content marker-${markerColor}">
                     <i class="fas fa-ambulance"></i>
                     <div class="pulse"></div>
                   </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          // Format speed in km/h if available
          const speed = data.location.speed ? (data.location.speed * 3.6).toFixed(1) : 'N/A';
          const movementStatus = isMoving ? 'Moving' : 'Stationary';
          
          // Create a new marker if it doesn't exist
          if (!markers[id]) {
            markers[id] = L.marker([data.location.lat, data.location.lng], {icon: markerIcon}).addTo(map);
            markers[id].bindPopup(`
              <div class="custom-popup">
                <h3>${data.username}</h3>
                <p><strong>Status:</strong> <span class="status-${isMoving ? 'moving' : 'active'}">${movementStatus}</span></p>
                <p><strong>Speed:</strong> ${speed} km/h</p>
                <p><strong>Last Update:</strong> ${new Date(data.location.timestamp).toLocaleString()}</p>
              </div>
            `);
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
  