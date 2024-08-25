// First, we set up the Mapbox access token, which is needed for initializing the second map later on.
mapboxgl.accessToken = 'pk.eyJ1IjoiaW1yYW5kYXRhIiwiYSI6ImNtMDRlaHh1YTA1aDEybHI1ZW12OGh4cDcifQ.fHLLFYQx7JKPUp2Sl1jtYg';

// Next, we wait for the entire document to be loaded and ready.
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded and ready.');

    // Now, we initialize the Leaflet map (map1). This map has restricted zoom levels and some custom settings.
    let map1 = L.map("map", {
        minZoom: 5.45, // The minimum zoom level is set to 5.45.
        scrollWheelZoom: false, // Scroll wheel zoom is disabled to avoid accidental zooming.
        doubleClickZoom: true,  // Double-click zoom is enabled (default behavior).
    }).setView([23.685, 90.3563], 7.45); // The initial view is centered at specific coordinates with a zoom level of 7.45.

    // We also set the background color of the map container to white.
    document.getElementById("map").style.backgroundColor = "white";

    // After setting up the map, we proceed to add a GeoJSON layer with custom styling.
    fetch("https://cdn.glitch.global/43656fdd-7bdb-46f2-8c73-40dcd257e516/bd_districts.geojson?v=1724549232976")
        .then((response) => response.json())
        .then((geojsonData) => {
            // Here, we define the styling and popup behavior for the GeoJSON layer.
            L.geoJSON(geojsonData, {
                style: function (feature) {
                    return {
                        fillColor: "#6F9379",
                        color: "#6F9379",
                        weight: 1,
                        fillOpacity: 0.7,
                        opacity: 1,
                    };
                },
                onEachFeature: function (feature, layer) {
                    // If the GeoJSON feature has a 'name' property, bind it to a popup.
                    if (feature.properties && feature.properties.name) {
                        layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
                    }
                },
            }).addTo(map1); // Finally, add the styled GeoJSON layer to the Leaflet map.
        })
        .catch((error) => console.error("Error loading GeoJSON data:", error)); // Handle any errors that occur during the fetch operation.

    // Moving on, we initialize the second map, which uses Mapbox.
    let map2 = new mapboxgl.Map({
        container: 'map2', // The container element ID for the Mapbox map.
        style: 'mapbox://styles/imrandata/cm09t5gjz00lu01qwg0fqc6nr', // The style URL for the map's appearance.
        center: [0, 32.8103], // Initial geographical center of the map.
        zoom: 1.7, // Initial zoom level.
        projection: 'naturalEarth', // The map's projection style.
    });

    // Disable scroll zoom for the Mapbox map as well.
    map2.scrollZoom.disable();

    // Note that double-click zoom is enabled by default in Mapbox, so no need to enable it explicitly unless previously disabled.
    console.log('Maps initialized.');

    // Next, we select all publication checkboxes that will be used to filter the data displayed on the maps.
    const publicationsMap1 = document.querySelectorAll('.publication');
    const publicationsMap2 = document.querySelectorAll('.publication-map2');

    // We create a Map object to store location data (latitude and longitude for each location).
    const locationData = new Map();
    let markers1 = []; // Array to hold Leaflet map markers.
    let markers2 = []; // Array to hold Mapbox map markers.

    // We begin by loading and parsing a CSV file containing location information (districts and countries).
    fetch('location.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').slice(1); // Split the CSV data into rows, skipping the header.
            rows.forEach(row => {
                const [location, lat, long] = row.split(','); // Split each row into its respective fields.
                locationData.set(location.trim(), {lat: parseFloat(lat), long: parseFloat(long)}); // Store the location data in the Map object.
            });
            console.log('Location data (districts and countries) parsed and stored:', locationData);
        });

    // We also load and parse a JSON file containing article details.
    fetch('article_details.json')
        .then(response => response.json())
        .then(articleDetails => {
            let aggregatedData1 = {}; // Object to store aggregated data for Leaflet map.
            let aggregatedData2 = {}; // Object to store aggregated data for Mapbox map.

            // Adding event listeners for each publication checkbox related to the Leaflet map.
            publicationsMap1.forEach(publication => {
                publication.addEventListener('change', () => {
                    aggregatedData1 = {}; // Reset the aggregated data for each change.

                    // Loop through each checked publication to aggregate data.
                    publicationsMap1.forEach(pub => {
                        if (pub.checked) {
                            articleDetails.forEach(article => {
                                if (article.publication === pub.value) {
                                    for (const [location, frequency] of Object.entries(article.district_frequencies)) {
                                        aggregatedData1[location] = (aggregatedData1[location] || 0) + frequency;
                                    }
                                }
                            });
                        }
                    });

                    // Update the Leaflet map with the new aggregated data.
                    updateLeafletMap(map1, markers1, aggregatedData1, locationData);
                });
            });

            // Similarly, add event listeners for each publication checkbox related to the Mapbox map.
            publicationsMap2.forEach(publication => {
                publication.addEventListener('change', () => {
                    aggregatedData2 = {}; // Reset the aggregated data for each change.

                    // Loop through each checked publication to aggregate data.
                    publicationsMap2.forEach(pub => {
                        if (pub.checked) {
                            articleDetails.forEach(article => {
                                if (article.publication === pub.value) {
                                    for (const [country, frequency] of Object.entries(article.country_frequencies)) {
                                        aggregatedData2[country] = (aggregatedData2[country] || 0) + frequency;
                                    }
                                }
                            });
                        }
                    });

                    // Update the Mapbox map with the new aggregated data.
                    updateMapboxMap(map2, markers2, aggregatedData2, locationData);
                });
            });
        });

    // This function updates the Leaflet map with new data when publication selections change.
    function updateLeafletMap(map, markers, data, locationData) {
        console.log('Updating Leaflet map with new data:', data);

        // First, remove any existing markers from the map.
        markers.forEach(marker => map.removeLayer(marker));
        markers.length = 0; // Clear the markers array.

        // Then, add new markers based on the updated data.
        for (const [location, frequency] of Object.entries(data)) {
            const locData = locationData.get(location); // Get location data from the Map.

            if (locData) {
                const radius = getCircleRadius(frequency); // Calculate the marker's radius based on frequency.
                console.log(`Adding marker for ${location} with frequency ${frequency} and radius ${radius}`);

                const marker = L.circleMarker([locData.lat, locData.long], {
                    radius: radius,
                    color: 'transparent', // Removing the border around the circle.
                    fillColor: '#D02D00', // Fill color of the marker.
                    fillOpacity: 0.85
                }).bindPopup(`<strong>${location}</strong><br>Frequency: ${frequency}`).addTo(map);

                markers.push(marker); // Add the new marker to the markers array.
            } else {
                console.log(`Location data not found for ${location}`);
            }
        }
    }

    // Similarly, this function updates the Mapbox map with new data when publication selections change.
    function updateMapboxMap(map, markers, data, locationData) {
        console.log('Updating Mapbox map with new data:', data);

        // Remove existing markers from the Mapbox map.
        markers.forEach(marker => marker.remove());
        markers.length = 0; // Clear the markers array.

        const circleColor = '#FFA500'; // Define the color for the circle markers.

        // Add new markers based on the updated data.
        for (const [location, frequency] of Object.entries(data)) {
            const locData = locationData.get(location); // Get location data from the Map.

            if (locData) {
                const radius = getCircleRadius(frequency); // Calculate the marker's radius based on frequency.
                console.log(`Adding marker for ${location} with frequency ${frequency} and radius ${radius}`);

                // Create a custom HTML element for the marker.
                const el = document.createElement('div');
                el.style.backgroundColor = circleColor;
                el.style.borderRadius = '50%';
                el.style.opacity = '0.85';
                el.style.width = `${radius * 2}px`;
                el.style.height = `${radius * 2}px`;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([locData.long, locData.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`<strong>${location}</strong><br>Frequency: ${frequency}`))
                    .addTo(map);

                markers.push(marker); // Add the new marker to the markers array.
            } else {
                console.log(`Location data not found for ${location}`);
            }
        }
    }

    // This helper function calculates the radius of a marker circle based on the frequency count.
    function getCircleRadius(frequencyCount) {
        const baseRadius = 2; // Base radius for the markers.
        const scaleFactor = 0.7; // Scaling factor to adjust the radius.
        const radius = baseRadius + (Math.sqrt(frequencyCount) * scaleFactor);
        return radius; // Return the calculated radius.
    }
});
