mapboxgl.accessToken = 'pk.eyJ1IjoiaW1yYW5kYXRhIiwiYSI6ImNtMDRlaHh1YTA1aDEybHI1ZW12OGh4cDcifQ.fHLLFYQx7JKPUp2Sl1jtYg';
const map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/imrandata/cm060ra9x00hl01pl9g2uc3xc', // style URL
    center: [90.4125, 23.8103], // starting position [lng, lat] centered on Bangladesh
    zoom: 6 // starting zoom
});

const locations = {};  // Store locations from the CSV

// Function to load CSV data
function loadCSVData() {
    d3.csv('location.csv').then(function(data) {
        data.forEach(function(row) {
            locations[row.location.toLowerCase()] = {
                lat: parseFloat(row.lat),
                long: parseFloat(row.long)
            };
        });
    });
}

// Function to add circles based on selected publication
function updateMap(publication) {
    d3.json('path_to_your_json.json').then(function(data) {
        const selectedArticles = data.filter(article => article.publication === publication);

        // Remove existing layers and sources to avoid overlapping
        map.eachLayer(function (layer) {
            if (layer.id !== 'background') {
                map.removeLayer(layer.id);
                map.removeSource(layer.id);
            }
        });

        // Add circles for each location in the selected articles
        selectedArticles.forEach(function(article) {
            const places = article.place_frequencies;
            for (const [place, frequency] of Object.entries(places)) {
                const locationData = locations[place.toLowerCase()];
                if (locationData) {
                    const circle = new mapboxgl.Marker({
                        color: '#007cbf', // Example color for the circles
                        scale: frequency * 0.1 // Example: scale based on frequency
                    })
                    .setLngLat([locationData.long, locationData.lat])
                    .addTo(map);
                }
            }
        });
    });
}

// Event listener for checkbox changes
document.querySelectorAll('.publication').forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            updateMap(this.value);
        } else {
            // Optionally clear the map if no publication is selected
            map.eachLayer(function (layer) {
                if (layer.id !== 'background') {
                    map.removeLayer(layer.id);
                    map.removeSource(layer.id);
                }
            });
        }
    });
});

// Initial data load
loadCSVData();
