// Material Database with Carbon Emission Data
const materialDatabase = {
    "steel": {
        carbonEmissions: 1.85, // kg CO2 per kg
        alternatives: [
            {
                name: "Recycled Steel",
                carbonEmissions: 0.67,
                costDifference: -10,
                properties: ["High strength", "Corrosion resistant", "100% recyclable"],
                applications: ["construction", "automotive", "infrastructure"],
                carbonReduction: 64
            },
            {
                name: "Aluminum Alloy",
                carbonEmissions: 1.7,
                costDifference: 15,
                properties: ["Lightweight", "Corrosion resistant", "High strength-to-weight ratio"],
                applications: ["automotive", "aerospace", "construction"],
                carbonReduction: 8
            },
            {
                name: "Carbon Fiber Composite",
                carbonEmissions: 2.5,
                costDifference: 200,
                properties: ["Extremely lightweight", "High strength", "Durable"],
                applications: ["automotive", "aerospace", "sports equipment"],
                carbonReduction: -35
            }
        ]
    },
    "concrete": {
        carbonEmissions: 0.13, // kg CO2 per kg
        alternatives: [
            {
                name: "Geopolymer Concrete",
                carbonEmissions: 0.06,
                costDifference: 5,
                properties: ["High durability", "Chemical resistant", "Fast curing"],
                applications: ["construction", "infrastructure", "industrial"],
                carbonReduction: 54
            },
            {
                name: "Hempcrete",
                carbonEmissions: -0.02, // Carbon negative
                costDifference: 20,
                properties: ["Carbon negative", "Lightweight", "Good insulation"],
                applications: ["construction", "residential", "insulation"],
                carbonReduction: 115
            },
            {
                name: "Timbercrete",
                carbonEmissions: 0.08,
                costDifference: 10,
                properties: ["Lightweight", "Good insulation", "Renewable"],
                applications: ["construction", "residential", "commercial"],
                carbonReduction: 38
            }
        ]
    },
    "aluminum": {
        carbonEmissions: 11.5, // kg CO2 per kg
        alternatives: [
            {
                name: "Recycled Aluminum",
                carbonEmissions: 0.4,
                costDifference: -20,
                properties: ["Same properties", "100% recyclable", "Energy efficient"],
                applications: ["packaging", "automotive", "construction"],
                carbonReduction: 97
            },
            {
                name: "Magnesium Alloy",
                carbonEmissions: 5.2,
                costDifference: 30,
                properties: ["Lightweight", "High strength", "Good machinability"],
                applications: ["automotive", "aerospace", "electronics"],
                carbonReduction: 55
            },
            {
                name: "Titanium Alloy",
                carbonEmissions: 8.8,
                costDifference: 150,
                properties: ["High strength", "Corrosion resistant", "Biocompatible"],
                applications: ["aerospace", "medical", "marine"],
                carbonReduction: 23
            }
        ]
    },
    "plastic": {
        carbonEmissions: 2.5, // kg CO2 per kg
        alternatives: [
            {
                name: "PLA Bioplastic",
                carbonEmissions: 1.8,
                costDifference: 25,
                properties: ["Biodegradable", "Renewable", "Compostable"],
                applications: ["packaging", "3d printing", "disposable items"],
                carbonReduction: 28
            },
            {
                name: "Recycled PET",
                carbonEmissions: 1.2,
                costDifference: -15,
                properties: ["Recyclable", "Durable", "Food safe"],
                applications: ["packaging", "textiles", "beverage containers"],
                carbonReduction: 52
            },
            {
                name: "Mushroom Packaging",
                carbonEmissions: 0.3,
                costDifference: 40,
                properties: ["Compostable", "Renewable", "Lightweight"],
                applications: ["packaging", "insulation", "disposable products"],
                carbonReduction: 88
            }
        ]
    },
    "glass": {
        carbonEmissions: 0.85, // kg CO2 per kg
        alternatives: [
            {
                name: "Recycled Glass",
                carbonEmissions: 0.3,
                costDifference: -10,
                properties: ["100% recyclable", "Same clarity", "Energy efficient"],
                applications: ["packaging", "construction", "automotive"],
                carbonReduction: 65
            },
            {
                name: "Bio-Glass",
                carbonEmissions: 0.6,
                costDifference: 20,
                properties: ["Renewable materials", "Durable", "Unique aesthetics"],
                applications: ["construction", "decorative", "interior design"],
                carbonReduction: 29
            },
            {
                name: "Polycarbonate",
                carbonEmissions: 2.8,
                costDifference: 15,
                properties: ["Impact resistant", "Lightweight", "Versatile"],
                applications: ["automotive", "electronics", "safety equipment"],
                carbonReduction: -229
            }
        ]
    }
};

// AI Recommendation Engine
class MaterialRecommendationEngine {
    constructor() {
        this.weights = {
            carbonReduction: 0.4,
            costEfficiency: 0.3,
            applicationMatch: 0.2,
            sustainability: 0.1
        };
    }

    analyzeMaterial(materialName, filters = {}) {
        const material = this.findMaterial(materialName);
        if (!material) {
            return { error: "Material not found in database" };
        }

        let recommendations = material.alternatives.map(alt => {
            const score = this.calculateRecommendationScore(alt, material, filters);
            return {
                ...alt,
                recommendationScore: score,
                matchReason: this.generateMatchReason(alt, material, filters)
            };
        });

        // Apply filters
        if (filters.reductionFilter) {
            recommendations = recommendations.filter(alt => 
                alt.carbonReduction >= parseInt(filters.reductionFilter)
            );
        }

        if (filters.costFilter) {
            recommendations = recommendations.filter(alt => {
                switch (filters.costFilter) {
                    case 'lower': return alt.costDifference < 0;
                    case 'similar': return Math.abs(alt.costDifference) <= 10;
                    case 'higher': return alt.costDifference > 0;
                    default: return true;
                }
            });
        }

        if (filters.applicationFilter) {
            recommendations = recommendations.filter(alt => 
                alt.applications.includes(filters.applicationFilter)
            );
        }

        // Sort by recommendation score
        recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

        return {
            originalMaterial: materialName,
            originalCarbon: material.carbonEmissions,
            recommendations: recommendations.slice(0, 6) // Top 6 recommendations
        };
    }

    findMaterial(materialName) {
        const normalizedName = materialName.toLowerCase().trim();
        return materialDatabase[normalizedName] || 
               Object.keys(materialDatabase).find(key => 
                   key.includes(normalizedName) || normalizedName.includes(key)
               );
    }

    calculateRecommendationScore(alternative, original, filters) {
        let score = 0;

        // Carbon reduction score (0-100)
        const carbonScore = Math.max(0, Math.min(100, alternative.carbonReduction));
        score += carbonScore * this.weights.carbonReduction;

        // Cost efficiency score (0-100)
        let costScore = 100;
        if (alternative.costDifference > 0) {
            costScore = Math.max(0, 100 - alternative.costDifference / 2);
        } else {
            costScore = 100 + Math.min(50, Math.abs(alternative.costDifference) / 2);
        }
        score += costScore * this.weights.costEfficiency;

        // Application match score (0-100)
        const appScore = alternative.applications.length * 20; // More applications = more versatile
        score += Math.min(100, appScore) * this.weights.applicationMatch;

        // Sustainability score (0-100)
        let sustainabilityScore = 50;
        if (alternative.carbonEmissions < 0) sustainabilityScore += 50; // Carbon negative
        if (alternative.properties.some(prop => prop.toLowerCase().includes('recyclable'))) sustainabilityScore += 25;
        if (alternative.properties.some(prop => prop.toLowerCase().includes('renewable'))) sustainabilityScore += 25;
        score += Math.min(100, sustainabilityScore) * this.weights.sustainability;

        return Math.round(score);
    }

    generateMatchReason(alternative, original, filters) {
        const reasons = [];
        
        if (alternative.carbonReduction > 0) {
            reasons.push(`${alternative.carbonReduction}% carbon reduction`);
        }
        
        if (alternative.costDifference < 0) {
            reasons.push(`${Math.abs(alternative.costDifference)}% cost savings`);
        } else if (alternative.costDifference <= 10) {
            reasons.push('Similar cost');
        }
        
        if (alternative.properties.some(prop => prop.toLowerCase().includes('recyclable'))) {
            reasons.push('Fully recyclable');
        }
        
        if (alternative.carbonEmissions < 0) {
            reasons.push('Carbon negative material');
        }

        return reasons.join(', ') || 'Sustainable alternative with comparable properties';
    }
}

// Initialize the recommendation engine
const recommendationEngine = new MaterialRecommendationEngine();

// Search functionality
function searchMaterial() {
    const materialInput = document.getElementById('materialInput').value.trim();
    
    if (!materialInput) {
        showMessage('Please enter a material name', 'error');
        return;
    }

    const filters = {
        applicationFilter: document.getElementById('applicationFilter').value,
        reductionFilter: document.getElementById('reductionFilter').value,
        costFilter: document.getElementById('costFilter').value
    };

    showLoading(true);
    
    // Simulate AI processing time
    setTimeout(() => {
        const results = recommendationEngine.analyzeMaterial(materialInput, filters);
        
        if (results.error) {
            showMessage(results.error, 'error');
            showLoading(false);
            return;
        }

        displayResults(results);
        showLoading(false);
    }, 1500);
}

// Display results
function displayResults(results) {
    const resultsSection = document.getElementById('results');
    const recommendationsDiv = document.getElementById('recommendations');
    
    recommendationsDiv.innerHTML = '';
    
    results.recommendations.forEach((rec, index) => {
        const card = createRecommendationCard(rec, results.originalCarbon, index);
        recommendationsDiv.appendChild(card);
    });
    
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Create recommendation card
function createRecommendationCard(recommendation, originalCarbon, index) {
    const card = document.createElement('div');
    card.className = `material-card ${index === 0 ? 'recommended' : 'alternative'} fade-in`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    const carbonClass = recommendation.carbonEmissions < originalCarbon * 0.5 ? 'low' : 
                       recommendation.carbonEmissions < originalCarbon ? 'medium' : 'high';
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h4 class="text-xl font-bold text-gray-800">${recommendation.name}</h4>
            <span class="carbon-score ${carbonClass}">
                ${recommendation.carbonReduction > 0 ? '-' : '+'}${Math.abs(recommendation.carbonReduction)}% CO₂
            </span>
        </div>
        
        <div class="mb-4">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
                <span>Carbon Emissions:</span>
                <span>${recommendation.carbonEmissions} kg CO₂/kg</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.max(10, 100 - recommendation.carbonReduction)}%"></div>
            </div>
        </div>
        
        <div class="mb-4">
            <p class="text-sm font-semibold text-gray-700 mb-2">Key Properties:</p>
            <div class="flex flex-wrap gap-2">
                ${recommendation.properties.map(prop => 
                    `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${prop}</span>`
                ).join('')}
            </div>
        </div>
        
        <div class="mb-4">
            <p class="text-sm font-semibold text-gray-700 mb-2">Applications:</p>
            <div class="flex flex-wrap gap-2">
                ${recommendation.applications.map(app => 
                    `<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">${app}</span>`
                ).join('')}
            </div>
        </div>
        
        <div class="border-t pt-3">
            <div class="flex justify-between items-center">
                <span class="text-sm ${recommendation.costDifference < 0 ? 'text-green-600' : 'text-orange-600'}">
                    <i class="fas fa-${recommendation.costDifference < 0 ? 'arrow-down' : 'arrow-up'}"></i>
                    ${Math.abs(recommendation.costDifference)}% cost ${recommendation.costDifference < 0 ? 'savings' : 'increase'}
                </span>
                <div class="flex items-center">
                    <span class="text-sm text-gray-600 mr-2">Match Score:</span>
                    <span class="font-bold text-green-600">${recommendation.recommendationScore}/100</span>
                </div>
            </div>
        </div>
        
        <div class="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <i class="fas fa-lightbulb text-yellow-500 mr-1"></i>
            ${recommendation.matchReason}
        </div>
    `;
    
    return card;
}

// Loading state
function showLoading(show) {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    
    if (show) {
        loading.classList.remove('hidden');
        results.classList.add('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message fade-in`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2"></i>
        ${message}
    `;
    
    const heroSection = document.querySelector('#home .max-w-2xl');
    heroSection.insertBefore(messageDiv, heroSection.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Enter key support for search
    document.getElementById('materialInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMaterial();
        }
    });
    
    // Filter change support
    ['applicationFilter', 'reductionFilter', 'costFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            const materialInput = document.getElementById('materialInput').value.trim();
            if (materialInput) {
                searchMaterial();
            }
        });
    });
    
    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Auto-suggestions (optional enhancement)
function setupAutoSuggestions() {
    const materials = Object.keys(materialDatabase);
    const input = document.getElementById('materialInput');
    
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        const suggestions = materials.filter(material => 
            material.includes(value) && value.length > 1
        );
        
        // You could implement a dropdown suggestions UI here
        console.log('Suggestions:', suggestions);
    });
}

// Initialize auto-suggestions
setupAutoSuggestions();
