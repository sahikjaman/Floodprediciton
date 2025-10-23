/**
 * AiRISE Dashboard - Main JavaScript
 * Handles real-time data updates, UI interactions, and data visualization
 */

// Global state
const state = {
    currentFilter: 'all',
    currentRange: '7d',
    lastUpdate: new Date(),
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    darkMode: false
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 AiRISE Dashboard initializing...');
    
    initializeDashboard();
    setupEventListeners();
    startAutoRefresh();
    loadSensorData();
    
    console.log('✅ Dashboard initialized successfully');
});

/**
 * Initialize all dashboard components
 */
function initializeDashboard() {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    state.darkMode = savedTheme === 'dark';
    updateThemeIcon();
    
    // Update timestamps
    updateTimestamps();
    setInterval(updateTimestamps, 60000); // Update every minute
    
    // Load initial data
    updateMetricCards();
    loadAlerts();
    
    // Initialize map if exists
    if (document.getElementById('map')) {
        initializeMap();
    }
    
    // Initialize charts if exists
    if (document.getElementById('forecastChart')) {
        initializeForecastChart();
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    // Filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', function() {
            handleFilterChange(this.dataset.filter);
        });
    });
    
    // Range buttons
    document.querySelectorAll('[data-range]').forEach(btn => {
        btn.addEventListener('click', function() {
            handleRangeChange(this.dataset.range);
        });
    });
    
    // Metric cards click
    document.querySelectorAll('.metric-card').forEach(card => {
        card.addEventListener('click', function() {
            const metric = this.dataset.metric;
            if (metric) {
                openMetricModal(metric);
            }
        });
    });
    
    // Refresh sensors button
    const refreshBtn = document.getElementById('refreshSensors');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshSensorData();
            showToast('Data Refreshed', 'Sensor data updated successfully', 'success');
        });
    }
    
    // Modal close on backdrop click
    const modal = document.getElementById('metricModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    const newTheme = state.darkMode ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
    
    // Update charts if they exist
    if (window.forecastChart) {
        updateChartTheme(window.forecastChart);
    }
    
    // Animate transition
    document.body.style.transition = 'background-color 0.3s ease';
}

/**
 * Update theme icon
 */
function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = state.darkMode ? '☀️' : '🌙';
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 300);
    }
}

/**
 * Handle filter changes
 */
function handleFilterChange(filter) {
    state.currentFilter = filter;
    
    // Update active state
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Filter data based on selection
    if (filter !== 'all') {
        filterMetricCards(filter);
    } else {
        showAllMetricCards();
    }
    
    console.log(`Filter changed to: ${filter}`);
}

/**
 * Handle range changes
 */
function handleRangeChange(range) {
    state.currentRange = range;
    
    // Update active state
    document.querySelectorAll('[data-range]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === range);
    });
    
    // Reload data for new range
    updateMetricCards();
    
    if (window.forecastChart) {
        updateForecastChart(range);
    }
    
    console.log(`Range changed to: ${range}`);
}

/**
 * Filter metric cards based on hazard type
 */
function filterMetricCards(type) {
    document.querySelectorAll('.metric-card').forEach(card => {
        const metric = card.dataset.metric;
        if (metric === type) {
            card.style.display = 'block';
            card.classList.add('fade-in');
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Show all metric cards
 */
function showAllMetricCards() {
    document.querySelectorAll('.metric-card').forEach(card => {
        card.style.display = 'block';
        card.classList.add('fade-in');
    });
}

/**
 * Update metric cards with current data
 */
function updateMetricCards() {
    const data = generateCurrentMetrics();
    
    // Flood Risk
    const floodValue = document.getElementById('floodValue');
    const floodTrend = document.getElementById('floodTrend');
    if (floodValue) {
        animateValue(floodValue, parseFloat(floodValue.textContent), data.flood.value, 1000);
        if (floodTrend) floodTrend.textContent = data.flood.trend;
    }
    
    // Subsidence
    const subsidenceValue = document.getElementById('subsidenceValue');
    const subsidenceTrend = document.getElementById('subsidenceTrend');
    if (subsidenceValue) {
        subsidenceValue.textContent = data.subsidence.value + 'cm';
        if (subsidenceTrend) subsidenceTrend.textContent = data.subsidence.trend;
    }
    
    // Heat
    const heatValue = document.getElementById('heatValue');
    const heatTrend = document.getElementById('heatTrend');
    if (heatValue) {
        animateValue(heatValue, parseFloat(heatValue.textContent), data.heat.value, 1000);
        if (heatTrend) heatTrend.textContent = data.heat.trend;
    }
}

/**
 * Animate number changes
 */
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current) + '%';
    }, 16);
}

/**
 * Load and display active alerts
 */
function loadAlerts() {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;
    
    const alerts = generateAlerts();
    
    const alertsHtml = alerts.map(alert => `
        <div class="alert alert-${alert.type} slide-in">
            <div class="alert-header">
                <span class="alert-icon">${alert.icon}</span>
                <div class="alert-title">${alert.title}</div>
            </div>
            <div class="alert-content">${alert.message}</div>
            <div class="alert-time">${alert.time}</div>
        </div>
    `).join('');
    
    alertsList.innerHTML = alertsHtml;
    
    // Update alert count
    const alertCount = document.getElementById('alertCount');
    if (alertCount) {
        alertCount.textContent = alerts.length + ' Active';
    }
}

/**
 * Load sensor data into table
 */
function loadSensorData() {
    const tableBody = document.getElementById('sensorTableBody');
    if (!tableBody) return;
    
    const sensors = getSensorList();
    
    const rowsHtml = sensors.slice(0, 5).map(sensor => {
        const statusClass = sensor.status === 'alert' ? 'badge-alert' : 
                           sensor.status === 'warning' ? 'badge-warning' : 'badge-success';
        
        return `
            <tr class="fade-in">
                <td><strong>${sensor.id}</strong></td>
                <td>${sensor.name}</td>
                <td><span class="badge ${statusClass}">${sensor.status.toUpperCase()}</span></td>
                <td>${sensor.waterLevel} cm</td>
                <td>${sensor.rainfall} mm/h</td>
                <td>${sensor.temperature}°C</td>
                <td>
                    <a href="sensor-detail.html?sensor=${sensor.id}" class="btn btn-sm btn-outline">
                        View
                    </a>
                </td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = rowsHtml;
    
    // Update sensor count
    const sensorCount = document.getElementById('sensorCount');
    if (sensorCount) {
        sensorCount.textContent = sensors.length + ' Sensors Active';
    }
}

/**
 * Refresh sensor data
 */
function refreshSensorData() {
    // Show loading state
    const tableBody = document.getElementById('sensorTableBody');
    if (tableBody) {
        tableBody.style.opacity = '0.5';
    }
    
    // Simulate API call
    setTimeout(() => {
        loadSensorData();
        if (tableBody) {
            tableBody.style.opacity = '1';
        }
        state.lastUpdate = new Date();
        updateTimestamps();
    }, 500);
}

/**
 * Open metric detail modal
 */
function openMetricModal(metric) {
    const modal = document.getElementById('metricModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDetails = document.getElementById('modalDetails');
    const modalActionBtn = document.getElementById('modalActionBtn');
    
    if (!modal) return;
    
    const details = getMetricDetails(metric);
    
    modalTitle.textContent = details.title;
    
    const detailsHtml = Object.entries(details.data).map(([key, value]) => `
        <div class="detail-item fade-in">
            <strong>${key}:</strong>
            <span>${value}</span>
        </div>
    `).join('');
    
    modalDetails.innerHTML = detailsHtml;
    
    if (modalActionBtn) {
        modalActionBtn.onclick = () => {
            window.location.href = `forecast.html?metric=${metric}`;
        };
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('metricModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Update all timestamps
 */
function updateTimestamps() {
    const now = new Date();
    const timeString = formatTimeAgo(state.lastUpdate);
    
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    if (lastUpdateTime) {
        lastUpdateTime.textContent = timeString;
    }
    
    const footerUpdateTime = document.getElementById('footerUpdateTime');
    if (footerUpdateTime) {
        footerUpdateTime.textContent = now.toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

/**
 * Format time ago
 */
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 minute ago';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 7200) return '1 hour ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    
    return date.toLocaleDateString();
}

/**
 * Start auto-refresh timer
 */
function startAutoRefresh() {
    if (state.autoRefresh) {
        setInterval(() => {
            console.log('🔄 Auto-refreshing data...');
            updateMetricCards();
            loadAlerts();
            refreshSensorData();
            state.lastUpdate = new Date();
            updateTimestamps();
        }, state.refreshInterval);
    }
}

/**
 * Show toast notification
 */
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastContainer';
        newContainer.className = 'toast-container';
        document.body.appendChild(newContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    const
