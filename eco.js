// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Test API connection
async function testAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/cities`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('✅ API Connection successful, cities loaded:', data.length);
        return true;
    } catch (error) {
        console.error('❌ API Connection failed:', error);
        console.log('🔧 Make sure backend server is running on port 3000');
        return false;
    }
}

// Upload logic with CSV parsing and backend integration
const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const progressBar = document.getElementById("progressBar");
const progress = document.getElementById("progress");
const uploadedList = document.getElementById("uploadedList");

// Store parsed data
let parsedCSVData = {
    routes: [],
    materials: []
};

// Audit Trail System (frontend display - backend will store actual data)
const auditTrail = {
    transactions: [],

    async loadFromBackend() {
        try {
            const response = await fetch(`${API_BASE_URL}/audit-trail`);
            const data = await response.json();
            this.transactions = data.transactions;
        } catch (error) {
            console.error('Failed to load audit trail:', error);
        }
    },

    async clearFromBackend() {
        try {
            await fetch(`${API_BASE_URL}/audit-trail`, { method: 'DELETE' });
            this.transactions = [];
        } catch (error) {
            console.error('Failed to clear audit trail:', error);
        }
    },

    generateReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            totalTransactions: this.transactions.length,
            summary: {
                csvUploads: this.getTransactionsByType('csv_upload').length,
                routeOptimizations: this.getTransactionsByType('route_optimization').length,
                materialSubstitutions: this.getTransactionsByType('material_substitution').length
            },
            transactions: this.transactions
        };
        return report;
    },

    getTransactionsByType(type) {
        return this.transactions.filter(t => t.type === type);
    }
};

dropArea.addEventListener("click", () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    console.log('File input changed, files:', e.target.files);
    console.log('File input change event triggered');
    
    for (let file of e.target.files) {
        console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            await uploadCSVFile(file);
        } else {
            let div = document.createElement("div");
            div.textContent = file.name + " ❌ (Not CSV)";
            uploadedList.appendChild(div);
        }
    }
});

async function uploadCSVFile(file) {
    console.log('Starting upload for:', file.name);
    const formData = new FormData();
    formData.append('csvFile', file);

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Upload successful:', result);

        // Store parsed data
        parsedCSVData.routes = result.routes || [];
        parsedCSVData.materials = result.materials || [];

        // Display success message
        let div = document.createElement("div");
        div.innerHTML = `${file.name} ✅<br><small>${result.routes?.length || 0} routes, ${result.materials?.length || 0} materials</small>`;
        uploadedList.appendChild(div);

        // Update summary
        updateSummary();

        // Store uploaded data with file info
        const datasetInfo = {
            fileName: file.name,
            uploadTime: new Date().toISOString(),
            routes: result.routes || [],
            materials: result.materials || []
        };
        
        // Add to datasets array
        if (!window.uploadedDatasets) {
            window.uploadedDatasets = [];
        }
        window.uploadedDatasets.push(datasetInfo);

        // Update global parsed data for backward compatibility
        parsedCSVData.routes = result.routes || [];
        parsedCSVData.materials = result.materials || [];

        console.log('📊 Data extracted:', {
            routes: parsedCSVData.routes.length,
            materials: parsedCSVData.materials.length,
            datasets: window.uploadedDatasets.length
        });

        // Show data selection section
        showDataSelection();

        // Initialize map and charts if data is available
        if (parsedCSVData.routes.length > 0) {
            const mapInitialized = initializeMap();
            if (mapInitialized) {
                visualizeRoutes(parsedCSVData.routes);
            }
            updateMaterialDistribution();
        }

    } catch (error) {
        console.error('Upload error:', error);
        let div = document.createElement("div");
        div.textContent = file.name + " ❌ " + error.message;
        uploadedList.appendChild(div);
    }
}

// Show data selection section after upload
function showDataSelection() {
    const dataSelection = document.getElementById('dataSelection');
    dataSelection.classList.remove('hidden');
    
    // Populate routes and materials lists
    populateRoutesList();
    populateMaterialsList();
}

// Populate routes list for selection
function populateRoutesList() {
    const routesList = document.getElementById('routesList');
    routesList.innerHTML = '';
    
    if (!window.uploadedDatasets || window.uploadedDatasets.length === 0) {
        routesList.innerHTML = '<p>No routes data available</p>';
        return;
    }
    
    window.uploadedDatasets.forEach((dataset, datasetIndex) => {
        const datasetDiv = document.createElement('div');
        datasetDiv.className = 'dataset-group';
        datasetDiv.innerHTML = `
            <h5>📁 ${dataset.fileName}</h5>
            <div class="routes-grid">
                ${dataset.routes.map((route, routeIndex) => `
                    <div class="route-item">
                        <input type="checkbox" id="route_${datasetIndex}_${routeIndex}" 
                               data-dataset="${datasetIndex}" data-route="${routeIndex}">
                        <label for="route_${datasetIndex}_${routeIndex}">
                            <strong>${route.origin}</strong> → <strong>${route.destination}</strong><br>
                            <small>Material: ${route.material} | Weight: ${route.weight}kg | Qty: ${route.quantity}</small>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
        routesList.appendChild(datasetDiv);
    });
}

// Populate materials list for selection
function populateMaterialsList() {
    const materialsList = document.getElementById('materialsList');
    materialsList.innerHTML = '';
    
    if (!window.uploadedDatasets || window.uploadedDatasets.length === 0) {
        materialsList.innerHTML = '<p>No materials data available</p>';
        return;
    }
    
    // Aggregate materials from all datasets
    const allMaterials = {};
    window.uploadedDatasets.forEach((dataset, datasetIndex) => {
        dataset.materials.forEach((material, materialIndex) => {
            const key = `${material.name}_${datasetIndex}`;
            allMaterials[key] = {
                ...material,
                datasetIndex,
                materialIndex,
                fileName: dataset.fileName
            };
        });
    });
    
    Object.values(allMaterials).forEach((material) => {
        const materialDiv = document.createElement('div');
        materialDiv.className = 'material-item';
        materialDiv.innerHTML = `
            <input type="checkbox" id="material_${material.datasetIndex}_${material.materialIndex}" 
                   data-dataset="${material.datasetIndex}" data-material="${material.materialIndex}">
            <label for="material_${material.datasetIndex}_${material.materialIndex}">
                <strong>${material.name}</strong><br>
                <small>Dataset: ${material.fileName} | Quantity: ${material.quantity} | Carbon: ${material.carbon_footprint || 'N/A'}</small>
            </label>
        `;
        materialsList.appendChild(materialDiv);
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Select all routes
function selectAllRoutes() {
    const checkboxes = document.querySelectorAll('#routesList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
}

// Select all materials
function selectAllMaterials() {
    const checkboxes = document.querySelectorAll('#materialsList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
}

// Process selected routes for optimization
async function processSelectedRoutes() {
    const selectedRoutes = [];
    const checkboxes = document.querySelectorAll('#routesList input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('Please select at least one route to optimize');
        return;
    }
    
    checkboxes.forEach(checkbox => {
        const datasetIndex = parseInt(checkbox.dataset.dataset);
        const routeIndex = parseInt(checkbox.dataset.route);
        const route = window.uploadedDatasets[datasetIndex].routes[routeIndex];
        selectedRoutes.push(route);
    });
    
    console.log('Processing selected routes:', selectedRoutes);
    
    // Optimize each selected route
    for (const route of selectedRoutes) {
        await optimizeRouteForData(route);
    }
    
    // Show success message
    alert(`Successfully optimized ${selectedRoutes.length} routes! Check the map for results.`);
}

// Optimize a specific route
async function optimizeRouteForData(route) {
    try {
        const response = await fetch(`${API_BASE_URL}/optimize-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin: route.origin,
                destination: route.destination,
                weight: parseFloat(route.weight)
            })
        });
        
        if (!response.ok) {
            throw new Error(`Optimization failed: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Route optimization result:', result);
        
        // Visualize the optimized route
        if (result.routes && result.routes.length > 0) {
            // Add origin and destination to the result for visualization
            result.origin = route.origin;
            result.destination = route.destination;
            await visualizeOptimizedRoutes(result);
        }
        
        // Add to audit trail
        await auditTrail.loadFromBackend();
        auditTrail.transactions.push({
            type: 'route_optimization',
            timestamp: new Date().toISOString(),
            data: {
                originalRoute: route,
                optimizedResult: result
            }
        });
        
    } catch (error) {
        console.error('Route optimization error:', error);
        alert('Route optimization failed for ' + route.origin + ' → ' + route.destination + ': ' + error.message);
    }
}

// Process selected materials for substitution
async function processSelectedMaterials() {
    const selectedMaterials = [];
    const checkboxes = document.querySelectorAll('#materialsList input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('Please select at least one material for substitution recommendations');
        return;
    }
    
    checkboxes.forEach(checkbox => {
        const datasetIndex = parseInt(checkbox.dataset.dataset);
        const materialIndex = parseInt(checkbox.dataset.material);
        const material = window.uploadedDatasets[datasetIndex].materials[materialIndex];
        selectedMaterials.push(material);
    });
    
    console.log('Processing selected materials:', selectedMaterials);
    
    // Get recommendations for each selected material
    const allRecommendations = [];
    for (const material of selectedMaterials) {
        const recommendations = await getMaterialRecommendations(material.name);
        allRecommendations.push({
            original: material,
            recommendations: recommendations
        });
    }
    
    // Display recommendations
    displayMaterialRecommendations(allRecommendations);
}

// Get material substitution recommendations
async function getMaterialRecommendations(materialName) {
    try {
        const response = await fetch(`${API_BASE_URL}/search-materials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                material: materialName
            })
        });
        
        if (!response.ok) {
            throw new Error(`Material search failed: ${response.status}`);
        }
        
        const result = await response.json();
        return result.alternatives || [];
        
    } catch (error) {
        console.error('Material recommendation error:', error);
        return [];
    }
}

// Display material recommendations
function displayMaterialRecommendations(recommendationsData) {
    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.innerHTML = '';
    
    recommendationsData.forEach(item => {
        const original = item.original;
        const recommendations = item.recommendations;
        
        const materialCard = document.createElement('div');
        materialCard.className = 'material-card';
        materialCard.innerHTML = `
            <h4>🔬 ${original.name}</h4>
            <p><strong>Current Usage:</strong> ${original.quantity} units</p>
            <p><strong>Carbon Footprint:</strong> ${original.carbon_footprint || 'N/A'}</p>
            
            <h5>🌱 Recommended Alternatives:</h5>
            <div class="alternatives-list">
                ${recommendations && recommendations.length > 0 ? recommendations.map(alt => `
                    <div class="alternative-item">
                        <h6>${alt.name}</h6>
                        <p><strong>Carbon Reduction:</strong> ${alt.carbonReduction || 0}%</p>
                        <p><strong>Cost Impact:</strong> ${alt.costComparison || 'N/A'}</p>
                        <p><strong>Availability:</strong> ${alt.availability || 'N/A'}</p>
                        <p><strong>Applications:</strong> ${alt.applications ? alt.applications.join(', ') : 'Various'}</p>
                        <p><strong>Properties:</strong> ${alt.properties ? alt.properties.slice(0, 3).join(', ') : 'N/A'}</p>
                        <button onclick="selectAlternative('${original.name}', '${alt.name}')" 
                                class="btn-small btn-primary">Select This Alternative</button>
                    </div>
                `).join('') : '<p>No alternatives found for this material.</p>'}
            </div>
        `;
        recommendationsDiv.appendChild(materialCard);
    });
    
    // Show results section
    document.getElementById('materialResults').classList.remove('hidden');
    
    // Scroll to materials section
    document.getElementById('materials').scrollIntoView({ behavior: 'smooth' });
}

// Select a material alternative
async function selectAlternative(originalMaterial, alternativeMaterial) {
    try {
        // Add to audit trail
        await auditTrail.loadFromBackend();
        auditTrail.transactions.push({
            type: 'material_substitution',
            timestamp: new Date().toISOString(),
            data: {
                original: originalMaterial,
                alternative: alternativeMaterial
            }
        });
        
        alert(`Successfully selected ${alternativeMaterial} as an alternative to ${originalMaterial}!`);
        
    } catch (error) {
        console.error('Error selecting alternative:', error);
        alert('Failed to select alternative: ' + error.message);
    }
}

// Search for material alternatives
async function searchMaterial() {
    const materialInput = document.getElementById('materialInput');
    const materialName = materialInput.value.trim();
    
    if (!materialName) {
        alert('Please enter a material name');
        return;
    }
    
    console.log('🔍 Searching for material:', materialName);
    
    // Show loading state
    const materialResults = document.getElementById('materialResults');
    const recommendations = document.getElementById('recommendations');
    
    materialResults.classList.remove('hidden');
    recommendations.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Searching for material alternatives...</p></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/search-materials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                material: materialName
            })
        });
        
        if (!response.ok) {
            throw new Error(`Material search failed: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Material search result:', result);
        
        if (result.error) {
            recommendations.innerHTML = `
                <div class="material-card">
                    <h4>🔍 Search Results</h4>
                    <p>Material "${materialName}" not found.</p>
                    <p><strong>Suggested alternatives:</strong></p>
                    <div class="alternatives-list">
                        ${result.alternatives ? result.alternatives.map(alt => `
                            <div class="alternative-item">
                                <h6>${alt.name}</h6>
                                <p>Category: ${alt.category}</p>
                                <p>Carbon Reduction: ${alt.carbonReduction}%</p>
                                <button onclick="searchMaterial('${alt.name}')" class="btn-small btn-primary">Search This Material</button>
                            </div>
                        `).join('') : '<p>No alternatives available.</p>'}
                    </div>
                </div>
            `;
        } else {
            // Create a mock material object for display
            const mockMaterial = {
                name: result.originalMaterial,
                quantity: 1,
                carbon_footprint: 'N/A'
            };
            
            displayMaterialRecommendations([{
                original: mockMaterial,
                recommendations: result.alternatives || []
            }]);
        }
        
        // Add to audit trail
        try {
            await auditTrail.loadFromBackend();
            auditTrail.transactions.push({
                type: 'material_search',
                timestamp: new Date().toISOString(),
                data: {
                    searchedMaterial: materialName,
                    result: result
                }
            });
            updateSummary();
        } catch (auditError) {
            console.error('❌ Audit trail error:', auditError);
        }
        
    } catch (error) {
        console.error('❌ Material search error:', error);
        recommendations.innerHTML = `
            <div class="material-card">
                <h4>❌ Search Error</h4>
                <p>Failed to search for material: ${error.message}</p>
                <button onclick="searchMaterial()" class="btn-small btn-primary">Try Again</button>
            </div>
        `;
    }
}

// Initialize map
let map;
let routeLayers = [];

// Test function to manually draw a green rail route
function testGreenRoute() {
    console.log('🧪 Testing green route drawing...');
    
    if (!map) {
        console.error('❌ Map not initialized');
        return;
    }
    
    // Clear all existing routes first
    routeLayers.forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    routeLayers = [];
    
    // Draw a simple green line between Chennai and Coimbatore
    const chennaiCoords = [13.0827, 80.2707]; // Chennai
    const coimbatoreCoords = [11.0168, 76.9558]; // Coimbatore
    
    const greenLine = L.polyline([chennaiCoords, coimbatoreCoords], {
        color: '#28a745',
        weight: 15,
        opacity: 1.0,
        smoothFactor: 1
    }).addTo(map);
    
    routeLayers.push(greenLine);
    
    // Add markers
    const chennaiMarker = L.marker(chennaiCoords).addTo(map);
    const coimbatoreMarker = L.marker(coimbatoreCoords).addTo(map);
    
    chennaiMarker.bindPopup('🟢 Chennai (Test Green Route)');
    coimbatoreMarker.bindPopup('🟢 Coimbatore (Test Green Route)');
    
    routeLayers.push(chennaiMarker, coimbatoreMarker);
    
    // Fit map to show the route
    const group = new L.featureGroup([greenLine, chennaiMarker, coimbatoreMarker]);
    map.fitBounds(group.getBounds().pad(0.1));
    
    console.log('✅ Green test route drawn successfully!');
}

// Audit Trail Functions
async function generateAuditReport() {
    console.log('📊 Generating audit report...');
    
    try {
        await auditTrail.loadFromBackend();
        
        const summary = {
            totalTransactions: auditTrail.transactions.length,
            csvUploads: auditTrail.getTransactionsByType('csv_upload').length,
            routeOptimizations: auditTrail.getTransactionsByType('route_optimization').length,
            materialSubstitutions: auditTrail.getTransactionsByType('material_substitution').length,
            materialSearches: auditTrail.getTransactionsByType('material_search').length
        };
        
        // Calculate carbon savings
        const routeOptimizations = auditTrail.getTransactionsByType('route_optimization');
        const totalCarbonReduction = routeOptimizations.reduce((total, tx) => {
            return total + (tx.data?.carbonReduction || 0);
        }, 0);
        
        // Generate report HTML
        const reportHTML = `
            <div style="padding: 20px;">
                <h3>📊 EcoTrack Audit Report</h3>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                
                <h4>📈 Summary Statistics</h4>
                <ul>
                    <li><strong>Total Transactions:</strong> ${summary.totalTransactions}</li>
                    <li><strong>CSV Uploads:</strong> ${summary.csvUploads}</li>
                    <li><strong>Route Optimizations:</strong> ${summary.routeOptimizations}</li>
                    <li><strong>Material Substitutions:</strong> ${summary.materialSubstitutions}</li>
                    <li><strong>Material Searches:</strong> ${summary.materialSearches}</li>
                    <li><strong>Total Carbon Reduction:</strong> ${totalCarbonReduction.toFixed(2)} kg CO₂</li>
                </ul>
                
                <h4>📋 Recent Transactions</h4>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${auditTrail.transactions.slice(-10).reverse().map(tx => `
                        <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 5px;">
                            <strong>${tx.type.replace('_', ' ').toUpperCase()}</strong><br>
                            <small>${new Date(tx.timestamp).toLocaleString()}</small><br>
                            ${formatTransactionData(tx.data)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Display report
        const reportDiv = document.createElement('div');
        reportDiv.innerHTML = reportHTML;
        reportDiv.style.cssText = 'position: fixed; top: 50px; left: 50px; right: 50px; bottom: 50px; background: white; border: 2px solid #28a745; border-radius: 10px; z-index: 10000; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '❌ Close';
        closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;';
        closeBtn.onclick = () => document.body.removeChild(reportDiv);
        reportDiv.appendChild(closeBtn);
        
        document.body.appendChild(reportDiv);
        
        console.log('✅ Audit report generated');
        
    } catch (error) {
        console.error('❌ Error generating audit report:', error);
        alert('Failed to generate audit report: ' + error.message);
    }
}

async function exportAuditData() {
    console.log('📥 Exporting audit data...');
    
    try {
        await auditTrail.loadFromBackend();
        
        const exportData = {
            exportTimestamp: new Date().toISOString(),
            summary: {
                totalTransactions: auditTrail.transactions.length,
                csvUploads: auditTrail.getTransactionsByType('csv_upload').length,
                routeOptimizations: auditTrail.getTransactionsByType('route_optimization').length,
                materialSubstitutions: auditTrail.getTransactionsByType('material_substitution').length,
                materialSearches: auditTrail.getTransactionsByType('material_search').length
            },
            transactions: auditTrail.transactions
        };
        
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Show export section
        const exportSection = document.getElementById('auditExport');
        const exportTextarea = document.getElementById('exportedData');
        
        exportSection.style.display = 'block';
        exportTextarea.value = jsonData;
        
        // Scroll to export section
        exportSection.scrollIntoView({ behavior: 'smooth' });
        
        console.log('✅ Audit data exported');
        
    } catch (error) {
        console.error('❌ Error exporting audit data:', error);
        alert('Failed to export audit data: ' + error.message);
    }
}

async function clearAuditTrail() {
    console.log('🗑️ Clearing audit trail...');
    
    if (!confirm('Are you sure you want to clear all audit trail data? This action cannot be undone.')) {
        return;
    }
    
    try {
        await auditTrail.clearFromBackend();
        updateSummary();
        updateTransactionsList();
        
        // Hide export section if visible
        document.getElementById('auditExport').style.display = 'none';
        
        console.log('✅ Audit trail cleared');
        alert('Audit trail cleared successfully!');
        
    } catch (error) {
        console.error('❌ Error clearing audit trail:', error);
        alert('Failed to clear audit trail: ' + error.message);
    }
}

function copyToClipboard() {
    const textarea = document.getElementById('exportedData');
    textarea.select();
    document.execCommand('copy');
    alert('Audit data copied to clipboard!');
}

function formatTransactionData(data) {
    if (!data) return 'No data available';
    
    // Try to determine the type from the data structure
    if (data.origin && data.destination) {
        return `Route: ${data.origin} → ${data.destination}<br>
                Weight: ${data.weight || 'N/A'} tons<br>
                Priority: ${data.priority || 'N/A'}<br>
                Carbon Reduction: ${data.carbonReduction ? data.carbonReduction.toFixed(2) + '%' : 'N/A'}`;
    }
    
    if (data.searchMaterial) {
        return `Search: ${data.searchMaterial}<br>
                Original: ${data.originalMaterial || 'Unknown'}<br>
                Recommendations: ${data.totalRecommendations || 0}<br>
                Best Alternative: ${data.bestAlternative?.name || 'N/A'}`;
    }
    
    if (data.fileName) {
        return `File: ${data.fileName}<br>
                Size: ${(data.fileSize || 0).toLocaleString()} bytes<br>
                Routes: ${data.parsedData?.routes?.length || 0}<br>
                Materials: ${data.parsedData?.materials?.length || 0}`;
    }
    
    return JSON.stringify(data, null, 2).substring(0, 200) + '...';
}

function updateTransactionsList() {
    const transactionsList = document.getElementById('transactionsList');
    
    if (!transactionsList) return;
    
    if (auditTrail.transactions.length === 0) {
        transactionsList.innerHTML = '<p>No audit data available. Perform some actions to generate audit trail.</p>';
        return;
    }
    
    const recentTransactions = auditTrail.transactions.slice(-10).reverse();
    
    transactionsList.innerHTML = `
        <div class="transactions-table">
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Timestamp</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentTransactions.map(tx => `
                        <tr>
                            <td><span class="badge badge-${tx.type}">${tx.type.replace('_', ' ').toUpperCase()}</span></td>
                            <td>${new Date(tx.timestamp).toLocaleString()}</td>
                            <td>${formatTransactionData(tx.data)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function initializeMap() {
    console.log('🗺️ Initializing map...');
    
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet library not loaded');
        return false;
    }
    
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('❌ Map container not found');
        return false;
    }
    
    if (!map) {
        try {
            console.log('📍 Creating new map instance...');
            map = L.map('map').setView([11.1271, 78.6569], 7); // Center of Tamil Nadu
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            console.log('✅ Map created successfully');
            return true;
        } catch (error) {
            console.error('❌ Error creating map:', error);
            return false;
        }
    } else {
        console.log('🗺️ Map already exists');
        return true;
    }
}

// Visualize routes on map
async function visualizeRoutes(routes) {
    try {
        // Get cities data
        const citiesResponse = await fetch(`${API_BASE_URL}/cities`);
        const cities = await citiesResponse.json();
        
        routes.forEach(route => {
            const originCity = cities.find(c => c.name === route.origin);
            const destCity = cities.find(c => c.name === route.destination);
            
            if (originCity && destCity) {
                // Add markers
                const originMarker = L.marker([originCity.latitude, originCity.longitude])
                    .addTo(map)
                    .bindPopup(`<b>Origin:</b> ${route.origin}<br><b>Material:</b> ${route.material}`);
                
                const destMarker = L.marker([destCity.latitude, destCity.longitude])
                    .addTo(map)
                    .bindPopup(`<b>Destination:</b> ${route.destination}<br><b>Weight:</b> ${route.weight}kg`);
                
                routeLayers.push(originMarker, destMarker);
                
                // Add route line
                const routeLine = L.polyline([
                    [originCity.latitude, originCity.longitude],
                    [destCity.latitude, destCity.longitude]
                ], {
                    color: '#007bff',
                    weight: 3,
                    opacity: 0.7
                }).addTo(map);
                
                routeLayers.push(routeLine);
            }
        });
        
        // Fit map to show all routes
        if (routeLayers.length > 0) {
            const group = new L.featureGroup(routeLayers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
    } catch (error) {
        console.error('Error visualizing routes:', error);
    }
}

// Update material distribution chart
function updateMaterialDistribution() {
    const materialCounts = {};
    
    parsedCSVData.materials.forEach(material => {
        materialCounts[material.name] = (materialCounts[material.name] || 0) + material.quantity;
    });
    
    const ctx = document.getElementById('materialChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(materialCounts),
                datasets: [{
                    data: Object.values(materialCounts),
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Material Distribution'
                    }
                }
            }
        });
    }
}

// Update summary statistics
function updateSummary() {
    const totalTransactions = document.getElementById('totalTransactions');
    const csvUploads = document.getElementById('csvUploads');
    
    if (totalTransactions) totalTransactions.textContent = auditTrail.transactions.length;
    if (csvUploads) csvUploads.textContent = auditTrail.getTransactionsByType('csv_upload').length;
}

// Load cities into dropdowns
async function loadCities() {
    try {
        const response = await fetch(`${API_BASE_URL}/cities`);
        const cities = await response.json();
        
        const originSelect = document.getElementById('origin');
        const destinationSelect = document.getElementById('destination');
        
        if (originSelect && destinationSelect) {
            // Clear existing options
            originSelect.innerHTML = '<option value="">Select origin...</option>';
            destinationSelect.innerHTML = '<option value="">Select destination...</option>';
            
            // Add city options
            cities.forEach(city => {
                const originOption = document.createElement('option');
                originOption.value = city.name;
                originOption.textContent = city.name;
                originSelect.appendChild(originOption);
                
                const destOption = document.createElement('option');
                destOption.value = city.name;
                destOption.textContent = city.name;
                destinationSelect.appendChild(destOption);
            });
            
            console.log(`✅ Loaded ${cities.length} cities into dropdowns`);
        }
    } catch (error) {
        console.error('❌ Error loading cities:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing EcoTrack...');
    
    // Test API connection
    const apiConnected = await testAPIConnection();
    
    if (apiConnected) {
        // Load cities into dropdowns
        await loadCities();
        
        // Load audit trail and update display
        await auditTrail.loadFromBackend();
        updateSummary();
        updateTransactionsList();
        
        // Initialize map
        initializeMap();
    }
});

// Route optimization function
async function optimizeRoute() {
    console.log('🚀 Starting route optimization...');
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const weight = document.getElementById('weight').value;
    
    console.log('📍 Route data:', { origin, destination, weight });
    
    if (!origin || !destination || !weight) {
        alert('Please fill in all route details');
        return;
    }
    
    try {
        console.log('📡 Sending optimization request...');
        const response = await fetch(`${API_BASE_URL}/optimize-route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origin,
                destination,
                weight: parseFloat(weight)
            })
        });
        
        if (!response.ok) {
            throw new Error(`Optimization failed: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Route optimization result:', result);
        
        // Add to audit trail
        try {
            await auditTrail.loadFromBackend();
            auditTrail.transactions.push({
                type: 'route_optimization',
                timestamp: new Date().toISOString(),
                data: {
                    origin,
                    destination,
                    weight: parseFloat(weight),
                    result: result
                }
            });
            console.log('✅ Added to audit trail');
            updateSummary();
        } catch (auditError) {
            console.error('❌ Audit trail error:', auditError);
        }
        
        // Visualize optimized routes
        if (result.routes && result.routes.length > 0) {
            console.log('🗺️ Visualizing routes...');
            // Add origin and destination to the result for visualization
            result.origin = origin;
            result.destination = destination;
            await visualizeOptimizedRoutes(result);
        } else {
            console.log('⚠️ No routes found in result');
        }
        
    } catch (error) {
        console.error('❌ Route optimization error:', error);
        alert('Route optimization failed: ' + error.message);
    }
}

// Visualize optimized routes
async function visualizeOptimizedRoutes(results) {
    console.log('🗺️ Starting route visualization...', results);
    
    // Keep the map but clear all existing layers properly
    if (!map) {
        console.log('📍 Map not initialized, creating now...');
        const mapCreated = initializeMap();
        if (!mapCreated) {
            console.error('❌ Failed to create map');
            return;
        }
    } else {
        console.log('🗺️ Using existing map, clearing routes...');
    }
    
    // Clear all existing route layers properly
    routeLayers.forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    routeLayers = [];
    console.log('🧹 Cleared existing routes');
    
    // Get cities data
    console.log('🏙️ Fetching cities data...');
    const citiesResponse = await fetch(`${API_BASE_URL}/cities`);
    const cities = await citiesResponse.json();
    console.log(`✅ Loaded ${cities.length} cities`);
    
    // Extract origin and destination from the first route or from the result object
    let origin, destination;
    
    // Try to get from result object first
    if (results.origin && results.destination) {
        origin = results.origin;
        destination = results.destination;
    } else if (results.routes && results.routes.length > 0) {
        // Get from the first route's segments
        const firstRoute = results.routes[0];
        if (firstRoute.segments && firstRoute.segments.length > 0) {
            origin = firstRoute.segments[0].origin;
            destination = firstRoute.segments[firstRoute.segments.length - 1].destination;
        }
    }
    
    console.log('🔍 Extracted origin/destination:', { origin, destination });
    
    const originCity = cities.find(c => c.name === origin);
    const destCity = cities.find(c => c.name === destination);
    
    console.log('🔍 City lookup:', {
        origin: origin,
        destination: destination,
        originCity: originCity,
        destCity: destCity
    });
    
    if (!originCity || !destCity) {
        console.error('❌ Cities not found:', origin, destination);
        console.log('Available cities:', cities.map(c => c.name));
        alert(`Cities not found: ${origin} or ${destination}`);
        return;
    }
    
    console.log('✅ Cities found:', originCity.name, '→', destCity.name);
    
    // Add origin and destination markers
    console.log('📍 Adding markers...');
    let originMarker, destMarker;
    
    try {
        originMarker = L.marker([originCity.latitude, originCity.longitude], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background: #28a745; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">A</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        destMarker = L.marker([destCity.latitude, destCity.longitude], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background: #dc3545; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">B</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        routeLayers.push(originMarker, destMarker);
        console.log('✅ Markers added to map');
    } catch (error) {
        console.error('❌ Error adding markers:', error);
        return;
    }
    
    // Add popups
    originMarker.bindPopup(`
        <div style="padding: 10px;">
            <h4 style="margin: 0 0 5px 0; color: #28a745;">📍 Origin: ${originCity.name}</h4>
            <p style="margin: 5px 0; font-size: 12px;">Coordinates: ${originCity.latitude.toFixed(4)}, ${originCity.longitude.toFixed(4)}</p>
        </div>
    `);
    
    destMarker.bindPopup(`
        <div style="padding: 10px;">
            <h4 style="margin: 0 0 5px 0; color: #dc3545;">📍 Destination: ${destCity.name}</h4>
            <p style="margin: 5px 0; font-size: 12px;">Coordinates: ${destCity.latitude.toFixed(4)}, ${destCity.longitude.toFixed(4)}</p>
        </div>
    `);
    
    // Draw all routes
    console.log('🛣️ Drawing routes...');
    console.log('🔍 Full results object:', results);
    console.log('🔍 Best route from backend:', results.best_route);
    console.log('🔍 Available routes:', results.routes.map(r => ({ id: r.id, mode: r.transport_mode, emissions: r.emissions })));
    
    const allEmissions = results.routes.map(r => r.total_emissions || r.emissions || 0);
    const minEmissions = allEmissions.length ? Math.min(...allEmissions) : 0;
    const bestRouteId = results.best_route?.id ?? results.bestRoute?.id ?? null;
    
    console.log('🔍 Calculated values:', { allEmissions, minEmissions, bestRouteId });
    
    // Only draw the best route (rail) - skip all other routes
    const bestRoute = results.routes.find(route => {
        return bestRouteId ? route.id === bestRouteId : (route.total_emissions || route.emissions || 0) === minEmissions;
    });
    
    if (bestRoute) {
        console.log(`🚛 Drawing ONLY best route: ${bestRoute.transport_mode} (Emissions: ${(bestRoute.total_emissions || bestRoute.emissions || 0).toFixed(1)}kg)`);
        
        const emissions = bestRoute.total_emissions || bestRoute.emissions || 0;
        const color = getCarbonColor(emissions, allEmissions);
        const isBestRoute = true; // This is the best route
        
        // Create route coordinates
        const routeCoords = [
            [originCity.latitude, originCity.longitude],
            [destCity.latitude, destCity.longitude]
        ];
        
        // Enhanced styling for best route (lowest emissions)
        const polyline = L.polyline(routeCoords, {
            color: '#00ff00', // Bright green for best route
            weight: 25, // Very thick
            opacity: 1.0,
            smoothFactor: 1,
            className: 'best-route-line',
            zIndex: 1000
        });
        
        // Add to map immediately
        polyline.addTo(map);
        routeLayers.push(polyline);
        
        // Force bring to front
        polyline.bringToFront();
        console.log('🔝 Brought rail route to front');
        
        console.log(`🎨 Route styling: BRIGHT GREEN (BEST) - Weight: 25`);
        
        // Create popup content
        const transportModes = bestRoute.segments ? 
            bestRoute.segments.map(seg => `<span class="transport-mode mode-${seg.transport_mode}">${seg.transport_mode.toUpperCase()}</span>`).join(' → ') : 
            bestRoute.transport_mode.toUpperCase();
        
        const popupContent = `
            <div style="padding: 12px; min-width: 220px;">
                <h4 style="margin: 0 0 10px 0; font-weight: bold; color: #28a745;">
                    🌱 OPTIMAL LOW-EMISSION ${bestRoute.transport_mode.toUpperCase()} Route
                </h4>
                <div style="margin-bottom: 8px;">
                    <strong>Transport:</strong> ${transportModes}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 12px;">
                    <div><strong>Distance:</strong> ${(bestRoute.distance || bestRoute.total_distance || 0).toFixed(1)} km</div>
                    <div><strong>Time:</strong> ${(bestRoute.time || bestRoute.total_time || 0).toFixed(1)} hrs</div>
                    <div><strong>Cost:</strong> ₹${(bestRoute.cost || bestRoute.total_cost || 0).toLocaleString('en-IN')}</div>
                    <div><strong style="color: #28a745;">CO₂:</strong> <span style="color: #28a745; font-weight: bold;">${emissions.toFixed(1)} kg</span></div>
                </div>
                <div style="margin-top: 8px; padding: 8px; background: #d4edda; border-radius: 4px; font-size: 12px; text-align: center; color: #155724; font-weight: bold;">
                    🌱 OPTIMAL LOW-EMISSION ROUTE
                </div>
            </div>
        `;
        
        polyline.bindPopup(popupContent);
        
        // Add route label
        const midPoint = [
            (originCity.latitude + destCity.latitude) / 2, 
            (originCity.longitude + destCity.longitude) / 2
        ];
        
        const routeLabel = L.divIcon({
            className: 'route-label',
            html: `<div style="background: #00ff00; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; white-space: nowrap; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); animation: pulse 2s infinite;">🌱 ${bestRoute.transport_mode.toUpperCase()} (OPTIMAL)</div>`,
            iconSize: [150, 30],
            iconAnchor: [75, 15]
        });
        
        const labelMarker = L.marker(midPoint, { icon: routeLabel }).addTo(map);
        routeLayers.push(labelMarker);
        
        console.log(`✅ Drew 1 optimal route (rail) on map`);
    } else {
        console.error('❌ No best route found!');
    }
    
    // Force map redraw and add small delay for rendering
    setTimeout(() => {
        map.invalidateSize();
        console.log('🗺️ Map redraw forced');
    }, 100);
    
    // Fit map to show all routes
    if (routeLayers.length > 0) {
        console.log('🗺️ Fitting map bounds...');
        const group = new L.featureGroup(routeLayers);
        map.fitBounds(group.getBounds().pad(0.15), {
            animate: true,
            duration: 1
        });
        console.log('✅ Map bounds fitted');
    }
    
    console.log('✅ Route visualization complete');
}

function getCarbonColor(emissions, allEmissions) {
    if (allEmissions.length === 0) return '#28a745';
    const minEmissions = Math.min(...allEmissions);
    const maxEmissions = Math.max(...allEmissions);
    if (maxEmissions === minEmissions) return '#28a745';
    const normalized = (emissions - minEmissions) / (maxEmissions - minEmissions);
    if (normalized < 0.33) return '#28a745';
    if (normalized < 0.67) return '#ffc107';
    return '#dc3545';
}
