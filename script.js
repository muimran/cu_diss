// Your Mapbox access token
mapboxgl.accessToken = 'your_mapbox_access_token';

document.addEventListener('DOMContentLoaded', () => {
    let map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [90.4125, 23.8103], // Centering on Bangladesh
        zoom: 6
    });

    const publications = document.querySelectorAll('.publication');
    const locationData = new Map();

    // Fetch and parse location data from the CSV file
    fetch('location.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').slice(1); // Skip the header row
            rows.forEach(row => {
                const [district, lat, lon] = row.split(',');
                locationData.set(district.trim(), {lat: parseFloat(lat), lon: parseFloat(lon)});
            });
        });

    // Fetch and parse the article details JSON file
    fetch('article_details.json')
        .then(response => response.json())
        .then(articleDetails => {
            let aggregatedData = {};

            publications.forEach(publication => {
                publication.addEventListener('change', () => {
                    aggregatedData = {}; // Reset aggregated data

                    publications.forEach(pub => {
                        if (pub.checked) {
                            articleDetails.forEach(article => {
                                if (article.publication === pub.value) {
                                    for (const [district, frequency] of Object.entries(article.district_frequencies)) {
                                        if (aggregatedData[district]) {
                                            aggregatedData[district] += frequency;
                                        } else {
                                            aggregatedData[district] = frequency;
                                        }
                                    }
                                }
                            });
                        }
                    });

                    updateMap(aggregatedData);
                });
            });
        });

    function updateMap(data) {
        // Clear existing markers
        map.eachLayer(layer => {
            if (layer.type === 'symbol') {
                map.removeLayer(layer.id);
                map.removeSource(layer.id);
            }
        });

        // Add new markers
        for (const [district, frequency] of Object.entries(data)) {
            const location = locationData.get(district);

            if (location) {
                const radius = getCircleRadius(frequency);

                const el = document.createElement('div');
                el.style.backgroundColor = '#1434A4';
                el.style.borderRadius = '50%';
                el.style.opacity = '0.85';
                el.style.width = `${radius * 2}px`;
                el.style.height = `${radius * 2}px`;

                new mapboxgl.Marker(el)
                    .setLngLat([location.lon, location.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`<strong>${district}</strong><br>Frequency: ${frequency}`))
                    .addTo(map);
            }
        }
    }

    function getCircleRadius(frequencyCount) {
        const baseRadius = 1.5; // Base radius in pixels
        const scaleFactor = 0.30; // Scale factor for additional size based on frequency
        return baseRadius + (Math.sqrt(frequencyCount) * scaleFactor);
    }
});
