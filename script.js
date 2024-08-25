// Set Up Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoiaW1yYW5kYXRhIiwiYSI6ImNtMDRlaHh1YTA1aDEybHI1ZW12OGh4cDcifQ.fHLLFYQx7JKPUp2Sl1jtYg';

// Initialize Maps and Load Data
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded and ready.');

    // Initialize the first Mapbox map
    let map1 = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/imrandata/cm04fow1v00f001qs9c8881p8',
        center: [90.4125, 23.8103], // Centering on Bangladesh
        zoom: 6.5,
        projection: 'mercator'
    });

    // Initialize the second Mapbox map with a different style
    let map2 = new mapboxgl.Map({
        container: 'map2',
        style: 'mapbox://styles/imrandata/cm07d1ozg00j701qya9vk9o1k', // Replace with your new map style
        center: [0, 23.8103], // Centering on Bangladesh
        zoom: 2,
        projection: 'mercator'
    });

    console.log('Maps initialized.');

    // Initialize variables for storing publication elements, location data, and markers
    const publicationsMap1 = document.querySelectorAll('.publication');
    const publicationsMap2 = document.querySelectorAll('.publication-map2');
    const locationData = new Map();  // For both district and country locations
    let markers1 = [];
    let markers2 = [];

    // Load and Parse CSV Data for Location Information (Districts and Countries)
    fetch('location.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').slice(1); // Skip the header row
            rows.forEach(row => {
                const [location, lat, long] = row.split(',');
                locationData.set(location.trim(), {lat: parseFloat(lat), long: parseFloat(long)});
            });
            console.log('Location data (districts and countries) parsed and stored:', locationData);
        });

    // Load and Parse JSON Data for Article Details
    fetch('article_details.json')
        .then(response => response.json())
        .then(articleDetails => {
            let aggregatedData1 = {};
            let aggregatedData2 = {};

            // Event Listener for Publication Selection Changes for Map 1
            publicationsMap1.forEach(publication => {
                publication.addEventListener('change', () => {
                    aggregatedData1 = {}; // Reset aggregated data for the first map

                    publicationsMap1.forEach(pub => {
                        if (pub.checked) {
                            // Aggregate data for the first map (district_frequencies)
                            articleDetails.forEach(article => {
                                if (article.publication === pub.value) {
                                    for (const [location, frequency] of Object.entries(article.district_frequencies)) {
                                        aggregatedData1[location] = (aggregatedData1[location] || 0) + frequency;
                                    }
                                }
                            });
                        }
                    });

                    updateMap(map1, markers1, aggregatedData1, locationData); // Update the first map
                });
            });

            // Event Listener for Publication Selection Changes for Map 2
            publicationsMap2.forEach(publication => {
                publication.addEventListener('change', () => {
                    aggregatedData2 = {}; // Reset aggregated data for the second map

                    publicationsMap2.forEach(pub => {
                        if (pub.checked) {
                            // Aggregate data for the second map (country_frequencies)
                            articleDetails.forEach(article => {
                                if (article.publication === pub.value) {
                                    for (const [country, frequency] of Object.entries(article.country_frequencies)) {
                                        aggregatedData2[country] = (aggregatedData2[country] || 0) + frequency;
                                    }
                                }
                            });
                        }
                    });

                    updateMap(map2, markers2, aggregatedData2, locationData); // Update the second map
                });
            });
        });

    // Function to Update the Map with New Data
// Function to Update the Map with New Data
function updateMap(map, markers, data, locationData) {
    console.log('Updating map with new data:', data);

    // Clear existing markers from the map
    markers.forEach(marker => marker.remove());
    markers.length = 0;

    // Determine the circle color based on the map
    const circleColor = (map === map1) ? '#FF0000' : '#1434A4'; // Change color to red (#FF0000) for map1, keep default for others

    // Add new markers based on updated data
    for (const [location, frequency] of Object.entries(data)) {
        const locData = locationData.get(location);

        if (locData) {
            const radius = getCircleRadius(frequency);
            console.log(`Adding marker for ${location} with frequency ${frequency} and radius ${radius}`);

            const el = document.createElement('div');
            el.style.backgroundColor = circleColor; // Use the determined color
            el.style.borderRadius = '50%';
            el.style.opacity = '0.85';
            el.style.width = `${radius * 2}px`;
            el.style.height = `${radius * 2}px`;

            const marker = new mapboxgl.Marker(el)
                .setLngLat([locData.long, locData.lat])
                .setPopup(new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<strong>${location}</strong><br>Frequency: ${frequency}`))
                .addTo(map);

            markers.push(marker);
        } else {
            console.log(`Location data not found for ${location}`);
        }
    }
}


    // Helper Function to Calculate Circle Radius Based on Frequency
// Helper Function to Calculate Circle Radius Based on Frequency
function getCircleRadius(frequencyCount) {
    const baseRadius = 2; // Increased base radius in pixels
    const scaleFactor = 0.7; // Increased scale factor for more pronounced size differences
    const radius = baseRadius + (Math.sqrt(frequencyCount) * scaleFactor);
    return radius;
}
});
