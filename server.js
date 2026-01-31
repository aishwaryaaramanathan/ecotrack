const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// In-memory storage for audit trail
let auditTrail = [];

// Tamil Nadu cities data
const tamilNaduCitiesData = [
    { name: "Chennai", latitude: 13.0827, longitude: 80.2707, hasRail: true, hasSea: true, hasAir: true },
    { name: "Coimbatore", latitude: 11.0168, longitude: 76.9558, hasRail: true, hasSea: false, hasAir: true },
    { name: "Madurai", latitude: 9.9252, longitude: 78.1198, hasRail: true, hasSea: false, hasAir: true },
    { name: "Tiruchirappalli", latitude: 10.7905, longitude: 78.7047, hasRail: true, hasSea: true, hasAir: true },
    { name: "Salem", latitude: 11.6643, longitude: 78.1460, hasRail: true, hasSea: false, hasAir: false },
    { name: "Erode", latitude: 11.3410, longitude: 77.7172, hasRail: true, hasSea: false, hasAir: false },
    { name: "Vellore", latitude: 12.9165, longitude: 79.1325, hasRail: true, hasSea: false, hasAir: false },
    { name: "Thanjavur", latitude: 10.7870, longitude: 79.1378, hasRail: true, hasSea: true, hasAir: false },
    { name: "Tirunelveli", latitude: 8.7139, longitude: 77.7567, hasRail: true, hasSea: true, hasAir: false }
];

// Material database
const materialDatabase = [
    {
        name: "Steel",
        category: "metal",
        carbonEmissions: 1.85,
        carbonReduction: 0,
        costDifference: 0,
        costComparison: "similar",
        availability: "widely",
        performance: "excellent",
        properties: ["High strength", "Durable", "Versatile", "100% recyclable"],
        applications: ["construction", "automotive", "infrastructure", "manufacturing"]
    },
    {
        name: "Recycled Steel",
        category: "metal",
        carbonEmissions: 0.6,
        carbonReduction: 68,
        costDifference: -10,
        costComparison: "lower",
        availability: "widely",
        performance: "equal",
        properties: ["High strength", "Corrosion resistant", "100% recyclable", "Energy efficient"],
        applications: ["construction", "automotive", "infrastructure", "manufacturing"]
    },
    {
        name: "Concrete",
        category: "construction",
        carbonEmissions: 0.15,
        carbonReduction: 0,
        costDifference: 0,
        costComparison: "similar",
        availability: "widely",
        performance: "excellent",
        properties: ["High compressive strength", "Durable", "Fire resistant", "Versatile"],
        applications: ["construction", "infrastructure", "residential", "commercial"]
    },
    {
        name: "Geopolymer Concrete",
        category: "construction",
        carbonEmissions: 0.08,
        carbonReduction: 47,
        costDifference: 5,
        costComparison: "higher",
        availability: "moderately",
        performance: "equal",
        properties: ["High durability", "Chemical resistant", "Fast curing", "Low carbon"],
        applications: ["construction", "infrastructure", "industrial", "precast"]
    },
    {
        name: "Aluminum",
        category: "metal",
        carbonEmissions: 11.5,
        carbonReduction: 0,
        costDifference: 0,
        costComparison: "similar",
        availability: "widely",
        performance: "excellent",
        properties: ["Lightweight", "Corrosion resistant", "Conductive", "Malleable"],
        applications: ["automotive", "aerospace", "packaging", "construction"]
    },
    {
        name: "Recycled Aluminum",
        category: "metal",
        carbonEmissions: 0.4,
        carbonReduction: 97,
        costDifference: -20,
        costComparison: "lower",
        availability: "widely",
        performance: "equal",
        properties: ["Same properties", "100% recyclable", "Energy efficient", "Low carbon"],
        applications: ["packaging", "automotive", "construction", "consumer goods"]
    },
    {
        name: "Plastic",
        category: "polymer",
        carbonEmissions: 2.5,
        carbonReduction: 0,
        costDifference: 0,
        costComparison: "similar",
        availability: "widely",
        performance: "good",
        properties: ["Versatile", "Lightweight", "Durable", "Water resistant"],
        applications: ["packaging", "automotive", "consumer goods", "construction"]
    },
    {
        name: "PLA Bioplastic",
        category: "polymer",
        carbonEmissions: 1.8,
        carbonReduction: 28,
        costDifference: 25,
        costComparison: "higher",
        availability: "moderately",
        performance: "good",
        properties: ["Biodegradable", "Renewable", "Compostable", "Food safe"],
        applications: ["packaging", "3d printing", "disposable items", "food service"]
    },
    {
        name: "Bamboo",
        category: "natural",
        carbonEmissions: 0.2,
        carbonReduction: 60,
        costDifference: -5,
        costComparison: "lower",
        availability: "moderately",
        performance: "good",
        properties: ["Renewable", "Fast growing", "Strong", "Carbon sequestering"],
        applications: ["construction", "furniture", "textiles", "flooring"]
    }
];

// Emission factors for predictions
const emissionFactors = {
    'steel': { current: 1.85, trend: 0.02, volatility: 0.05 },
    'concrete': { current: 0.15, trend: 0.01, volatility: 0.03 },
    'aluminum': { current: 11.5, trend: 0.015, volatility: 0.08 },
    'plastic': { current: 2.5, trend: 0.025, volatility: 0.06 },
    'glass': { current: 0.85, trend: 0.008, volatility: 0.04 },
    'wood': { current: 0.3, trend: -0.005, volatility: 0.02 },
    'bamboo': { current: 0.2, trend: -0.01, volatility: 0.03 },
    'recycled_steel': { current: 0.6, trend: 0.01, volatility: 0.04 },
    'recycled_aluminum': { current: 0.4, trend: 0.008, volatility: 0.05 },
    'recycled_plastic': { current: 1.2, trend: 0.015, volatility: 0.06 },
    'geopolymer': { current: 0.08, trend: -0.02, volatility: 0.05 },
    'hempcrete': { current: 0.04, trend: -0.03, volatility: 0.06 },
    'mycelium': { current: 0.02, trend: -0.04, volatility: 0.08 }
};

// Helper function to add audit trail entry
function addAuditEntry(type, data) {
    const entry = {
        id: 'TRX_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        timestamp: new Date().toISOString(),
        type: type,
        data: data,
        user: 'system'
    };
    auditTrail.push(entry);
    return entry;
}

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Helper function to generate predictions
function generatePredictions(materialName, quantity) {
    const baseMaterial = getBaseMaterialName(materialName);
    const factors = emissionFactors[baseMaterial];
    
    if (!factors) {
        return { current: 0, future6Months: 0, trend: 'unknown', confidence: 0 };
    }

    const current = factors.current * quantity;
    const monthlyChange = factors.current * factors.trend;
    const volatilityFactor = 1 + (Math.random() - 0.5) * factors.volatility;
    const future6Months = current + (monthlyChange * 6 * volatilityFactor);
    
    let trend = 'stable';
    if (factors.trend > 0.01) trend = 'increasing';
    else if (factors.trend < -0.01) trend = 'decreasing';
    
    const confidence = Math.max(0, Math.min(100, 100 - (factors.volatility * 100)));
    
    return {
        current: Math.round(current * 100) / 100,
        future6Months: Math.round(future6Months * 100) / 100,
        trend: trend,
        confidence: Math.round(confidence),
        monthlyChange: Math.round(monthlyChange * 100) / 100,
        totalChange: Math.round((future6Months - current) * 100) / 100,
        percentChange: Math.round(((future6Months - current) / current) * 100 * 100) / 100
    };
}

function getBaseMaterialName(materialName) {
    const lowerName = materialName.toLowerCase();
    if (lowerName.includes('steel') || lowerName.includes('iron')) return 'steel';
    if (lowerName.includes('concrete') || lowerName.includes('cement')) return 'concrete';
    if (lowerName.includes('aluminum') || lowerName.includes('aluminium')) return 'aluminum';
    if (lowerName.includes('plastic') || lowerName.includes('polymer')) return 'plastic';
    if (lowerName.includes('glass')) return 'glass';
    if (lowerName.includes('wood') || lowerName.includes('timber')) return 'wood';
    if (lowerName.includes('bamboo')) return 'bamboo';
    if (lowerName.includes('recycled')) {
        if (lowerName.includes('steel')) return 'recycled_steel';
        if (lowerName.includes('aluminum')) return 'recycled_aluminum';
        if (lowerName.includes('plastic')) return 'recycled_plastic';
    }
    if (lowerName.includes('geopolymer')) return 'geopolymer';
    if (lowerName.includes('hemp') || lowerName.includes('hempcrete')) return 'hempcrete';
    if (lowerName.includes('mycelium')) return 'mycelium';
    return materialName.toLowerCase();
}

// Serve the main HTML file at root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'eco.html'));
});

// API Routes

// Get Tamil Nadu cities data
app.get('/api/cities', (req, res) => {
    res.json(tamilNaduCitiesData);
});

// Upload and parse CSV
app.post('/api/upload', upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const routes = [];
    const materials = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            results.push(data);
            
            // Extract route data
            if (data.origin && data.destination) {
                routes.push({
                    origin: data.origin,
                    destination: data.destination,
                    weight: parseFloat(data.weight) || 25
                });
            }
            
            // Extract material data
            if (data.material) {
                materials.push({
                    name: data.material,
                    quantity: parseFloat(data.quantity) || 1
                });
            }
        })
        .on('end', () => {
            // Add audit trail entry
            const auditData = {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                uploadTimestamp: new Date().toISOString(),
                parsedData: { routes, materials }
            };
            addAuditEntry('csv_upload', auditData);
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            
            res.json({
                success: true,
                routes: routes,
                materials: materials,
                totalRows: results.length
            });
        })
        .on('error', (error) => {
            res.status(500).json({ error: 'Error parsing CSV file' });
        });
});

// Optimize route
app.post('/api/optimize-route', (req, res) => {
    console.log('🔍 Backend received request body:', req.body);
    
    const { origin, destination, weight, priority } = req.body;
    const weightNum = Number.parseFloat(weight);
    const normalizedWeight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1;
    const normalizedPriority = priority || 'carbon';
    
    console.log('🔍 Extracted values:', { origin, destination, weight: normalizedWeight, priority: normalizedPriority });
    
    if (!origin || !destination) {
        console.log('❌ Missing origin or destination');
        return res.status(400).json({ error: 'Origin and destination are required' });
    }
    
    const originCity = tamilNaduCitiesData.find(c => c.name === origin);
    const destCity = tamilNaduCitiesData.find(c => c.name === destination);
    
    console.log('🔍 Found cities:', { 
        originFound: originCity?.name, 
        destFound: destCity?.name,
        availableCities: tamilNaduCitiesData.map(c => c.name)
    });
    
    if (!originCity || !destCity) {
        console.log('❌ Cities not found in backend data');
        return res.status(400).json({ 
            error: 'Invalid cities',
            received: { origin, destination },
            available: tamilNaduCitiesData.map(c => c.name)
        });
    }
    
    const distance = calculateDistance(originCity.latitude, originCity.longitude, destCity.latitude, destCity.longitude);
    
    console.log('📏 Calculated distance:', distance, 'km');
    
    // Generate route options
    const routes = [];
    
    // Road route
    routes.push({
        id: 'road_primary',
        transport_mode: 'road',
        distance: distance,
        time: distance / 60, // 60 km/h average
        cost: distance * 8, // ₹8 per km
        emissions: distance * 0.092 * normalizedWeight, // 0.092 kg CO2 per ton-km
        segments: [{ transport_mode: 'road', distance: distance }]
    });
    
    // Rail route (if available)
    if (originCity.hasRail && destCity.hasRail) {
        routes.push({
            id: 'rail_primary',
            transport_mode: 'rail',
            distance: distance * 1.2, // Rail routes are longer
            time: distance * 1.2 / 80, // 80 km/h average
            cost: distance * 1.2 * 4, // ₹4 per km
            emissions: distance * 1.2 * 0.025 * normalizedWeight, // 0.025 kg CO2 per ton-km
            segments: [{ transport_mode: 'rail', distance: distance * 1.2 }]
        });
    }
    
    // Sea route (if available)
    if (originCity.hasSea && destCity.hasSea) {
        routes.push({
            id: 'sea_primary',
            transport_mode: 'sea',
            distance: distance * 1.5, // Sea routes are longer
            time: distance * 1.5 / 25, // 25 km/h average
            cost: distance * 1.5 * 3, // ₹3 per km
            emissions: distance * 1.5 * 0.018 * normalizedWeight, // 0.018 kg CO2 per ton-km
            segments: [{ transport_mode: 'sea', distance: distance * 1.5 }]
        });
    }
    
    // Multi-modal route
    if (originCity.hasRail && destCity.hasSea) {
        routes.push({
            id: 'multimodal_1',
            transport_mode: 'multimodal',
            distance: distance * 1.1,
            time: (distance * 0.3 / 60) + (distance * 0.8 / 80), // Road + Rail
            cost: (distance * 0.3 * 8) + (distance * 0.8 * 4),
            emissions: (distance * 0.3 * 0.092 * normalizedWeight) + (distance * 0.8 * 0.025 * normalizedWeight),
            segments: [
                { transport_mode: 'road', distance: distance * 0.3 },
                { transport_mode: 'rail', distance: distance * 0.8 }
            ]
        });
    }
    
    const getMetric = (route) => {
        if (normalizedPriority === 'time') return route.time;
        if (normalizedPriority === 'cost') return route.cost;
        return route.emissions;
    };

    // Sort for display (robust against NaN)
    routes.sort((a, b) => {
        const av = getMetric(a);
        const bv = getMetric(b);
        const aVal = Number.isFinite(av) ? av : Number.POSITIVE_INFINITY;
        const bVal = Number.isFinite(bv) ? bv : Number.POSITIVE_INFINITY;
        return aVal - bVal;
    });

    // Choose best route by metric (ensures rail wins when it truly has lower emissions)
    const bestRoute = routes[0];
    const worstRoute = routes[routes.length - 1];
    const worstEmissions = Number.isFinite(worstRoute.emissions) && worstRoute.emissions > 0 ? worstRoute.emissions : 0;
    const carbonReduction = worstEmissions ? ((worstEmissions - bestRoute.emissions) / worstEmissions) * 100 : 0;
    
    console.log('✅ Generated routes:', routes.length, 'Best route:', bestRoute.transport_mode, 'Carbon reduction:', carbonReduction);
    
    // Add audit trail entry
    const auditData = {
        origin: origin,
        destination: destination,
        weight: normalizedWeight,
        priority: normalizedPriority,
        calculationTimestamp: new Date().toISOString(),
        emissionFactors: { road: 0.092, rail: 0.025, sea: 0.018, air: 0.520 },
        costFactors: { road: 8, rail: 4, sea: 3, air: 50 },
        results: { routes, best_route: bestRoute, carbon_reduction: carbonReduction },
        selectedRoute: bestRoute,
        carbonReduction: carbonReduction,
        totalOptions: routes.length
    };
    addAuditEntry('route_optimization', auditData);
    
    const response = {
        routes: routes,
        best_route: bestRoute,
        carbon_reduction: carbonReduction
    };
    
    console.log('✅ Sending response to frontend:', response);
    res.json(response);
});

// Search materials
app.post('/api/search-materials', (req, res) => {
    const { material, materialName, filters = {} } = req.body;
    
    // Use either 'material' or 'materialName' parameter
    const searchName = material || materialName;
    
    if (!searchName) {
        return res.json({ error: 'Material name is required' });
    }
    
    const foundMaterial = materialDatabase.find(mat => 
        mat.name.toLowerCase().includes(searchName.toLowerCase()) ||
        mat.category.toLowerCase().includes(searchName.toLowerCase())
    );
    
    if (!foundMaterial) {
        return res.json({ 
            error: 'Material not found',
            alternatives: materialDatabase.slice(0, 5).map(mat => ({
                name: mat.name,
                category: mat.category,
                carbonReduction: mat.carbonReduction
            }))
        });
    }
    
    let recommendations = materialDatabase.filter(mat => mat.name !== foundMaterial.name);
    
    // Apply filters
    if (filters.applicationFilter) {
        recommendations = recommendations.filter(mat => 
            mat.applications.includes(filters.applicationFilter)
        );
    }
    
    if (filters.reductionFilter) {
        const minReduction = parseInt(filters.reductionFilter);
        recommendations = recommendations.filter(mat => 
            mat.carbonReduction >= minReduction
        );
    }
    
    if (filters.costFilter) {
        recommendations = recommendations.filter(mat => 
            mat.costComparison === filters.costFilter
        );
    }
    
    // Calculate scores and add predictions
    recommendations = recommendations.map(mat => {
        let score = 0;
        score += mat.carbonReduction * 0.4;
        if (mat.costComparison === 'lower') score += 25;
        else if (mat.costComparison === 'similar') score += 15;
        else score += 5;
        if (mat.availability === 'widely') score += 20;
        else if (mat.availability === 'moderately') score += 12;
        else score += 5;
        if (mat.performance === 'equal') score += 15;
        else if (mat.performance === 'superior') score += 12;
        else score += 8;
        
        const predictions = generatePredictions(mat.name, 1000);
        
        return {
            ...mat,
            score: score,
            predictions: predictions,
            recommendation: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'
        };
    }).sort((a, b) => b.score - a.score).slice(0, 6);
    
    const originalCarbon = generatePredictions(foundMaterial.name, 1000).current;
    
    // Add audit trail entry
    const auditData = {
        searchMaterial: searchName,
        filters: filters,
        searchTimestamp: new Date().toISOString(),
        originalMaterial: foundMaterial.name,
        originalCarbon: originalCarbon,
        recommendations: recommendations,
        totalRecommendations: recommendations.length,
        bestAlternative: recommendations[0] || null,
        maxCarbonReduction: Math.max(...recommendations.map(r => r.carbonReduction))
    };
    addAuditEntry('material_substitution', auditData);
    
    res.json({
        originalMaterial: foundMaterial.name,
        originalCarbon: originalCarbon,
        alternatives: recommendations,
        totalAlternatives: recommendations.length,
        bestAlternative: recommendations[0] || null,
        maxCarbonReduction: Math.max(...recommendations.map(r => r.carbonReduction)),
        searchTimestamp: new Date().toISOString()
    });
});

// Get audit trail
app.get('/api/audit-trail', (req, res) => {
    res.json({
        transactions: auditTrail,
        summary: {
            totalTransactions: auditTrail.length,
            csvUploads: auditTrail.filter(t => t.type === 'csv_upload').length,
            routeOptimizations: auditTrail.filter(t => t.type === 'route_optimization').length,
            materialSubstitutions: auditTrail.filter(t => t.type === 'material_substitution').length
        }
    });
});

// Clear audit trail
app.delete('/api/audit-trail', (req, res) => {
    auditTrail = [];
    res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 EcoTrack Backend Server running on http://localhost:${PORT}`);
    console.log(`📊 API Endpoints available:`);
    console.log(`   GET  /api/cities - Get Tamil Nadu cities data`);
    console.log(`   POST /api/upload - Upload and parse CSV files`);
    console.log(`   POST /api/optimize-route - Optimize shipping routes`);
    console.log(`   POST /api/search-materials - Search material alternatives`);
    console.log(`   GET  /api/audit-trail - Get audit trail data`);
    console.log(`   DELETE /api/audit-trail - Clear audit trail`);
});
