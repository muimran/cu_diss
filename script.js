// Your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiaW1yYW5kYXRhIiwiYSI6ImNtMDRlaHh1YTA1aDEybHI1ZW12OGh4cDcifQ.fHLLFYQx7JKPUp2Sl1jtYg';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded and ready.');

    let map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/imrandata/cm071umhs00jt01pl9byi9r2l',
        center: [90.4125, 23.8103], // Centering on Bangladesh
        zoom: 6.5
    });

    console.log('Map initialized.');

    const publications = document.querySelectorAll('.publication');
    const locationData = new Map();
    let markers = [];

    // Fetch and parse location data from the CSV file
    fetch('location.csv')
        .then(response => {
            console.log('Fetching location data...');
            return response.text();
        })
        .then(data => {
            console.log('Location data loaded:', data);
            const rows = data.split('\n').slice(1); // Skip the header row
            rows.forEach(row => {
                const [location, lat, long] = row.split(',');
                locationData.set(location.trim(), {lat: parseFloat(lat), long: parseFloat(long)});
            });
            console.log('Location data parsed and stored:', locationData);
        });

    // Fetch and parse the article details JSON file 
    fetch('article_details.json')
        .then(response => {
            console.log('Fetching article details...');
            return response.json();
        })
        .then(articleDetails => {
            console.log('Article details loaded:', articleDetails);
            let aggregatedData = {};

            publications.forEach(publication => {
                publication.addEventListener('change', () => {
                    console.log('Publication selection changed.');
                    aggregatedData = {}; // Reset aggregated data

                    publications.forEach(pub => {
                        if (pub.checked) {
                            console.log('Processing publication:', pub.value);
                            articleDetails.forEach(article => {
                                if (article.publication === pub.value) {
                                    console.log(`Processing article for publication ${pub.value}:`, article);
                                    for (const [location, frequency] of Object.entries(article.district_frequencies)) {
                                        if (aggregatedData[location]) {
                                            aggregatedData[location] += frequency;
                                        } else {
                                            aggregatedData[location] = frequency;
                                        }
                                    }
                                }
                            });
                        }
                    });

                    console.log('Aggregated data after selection change:', aggregatedData);
                    updateMap(aggregatedData);
                });
            });
        });

    function updateMap(data) {
        console.log('Updating map with new data:', data);

        // Clear existing markers
        markers.forEach(marker => marker.remove());
        markers = [];
        console.log('Cleared existing markers.');

        // Add new markers
        for (const [location, frequency] of Object.entries(data)) {
            const locData = locationData.get(location);

            if (locData) {
                const radius = getCircleRadius(frequency);
                console.log(`Adding marker for ${location} with frequency ${frequency} and radius ${radius}`);

                const el = document.createElement('div');
                el.style.backgroundColor = '#1434A4';
                el.style.borderRadius = '50%';
                el.style.opacity = '0.85';
                el.style.width = `${radius * 2}px`;
                el.style.height = `${radius * 2}px`;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([locData.long, locData.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`<strong>${location}</strong><br>Frequency: ${frequency}`))
                    .addTo(map);

                markers.push(marker); // Store the marker to remove it later
            } else {
                console.log(`Location data not found for ${location}`);
            }
        }
    }

    function getCircleRadius(frequencyCount) {
        const baseRadius = 1.5; // Base radius in pixels
        const scaleFactor = 0.30; // Scale factor for additional size based on frequency
        const radius = baseRadius + (Math.sqrt(frequencyCount) * scaleFactor);
        console.log(`Calculated radius for frequency ${frequencyCount}: ${radius}`);
        return radius;
    }
});
