// Set up the Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiaW1yYW5kYXRhIiwiYSI6ImNtMDRlaHh1YTA1aDEybHI1ZW12OGh4cDcifQ.fHLLFYQx7JKPUp2Sl1jtYg';

// Global variables to store article data and map reference for map2
let articleData2 = [];
let map2; // This will hold the reference to the second Mapbox map
let markers2 = []; // To store all markers added to the second map
let aggregatedData2 = {}; // To store the aggregated data for currently selected sources in scrolly2
let totalMentions2 = 0; // New variable to store the total number of mentions
let publications2 = ["BBC", "CNN", "telegraph", "foxnews", "New York Times", "Guardian"]; // Define publications2 array
let steps2; // Define steps2 variable for scrolly steps

// Initialize scroller2 for Scrollama
const scroller2 = scrollama(); // Add this line to initialize scroller2

// Initial map state
const initialMapState = {
  center: [35.3563, 25.685], // Initial center coordinates
  zoom: 2 // Initial zoom level
};

// Function to create and initialize the Mapbox map for scrolly2
function createMap2() {
  map2 = new mapboxgl.Map({
    container: 'map2', // Ensure this matches the container ID in your HTML for the second map
    style: 'mapbox://styles/imrandata/cm09t5gjz00lu01qwg0fqc6nr',
    center: initialMapState.center,
    zoom: initialMapState.zoom,
    projection: 'mercator'
  });

  map2.scrollZoom.disable();
  document.getElementById("map2").style.backgroundColor = "white";

  // Wait for the map to load before adding layers and event listeners
  map2.on('load', function () {
    // Ensure the commonwealth layer starts as hidden
    map2.setLayoutProperty('commonwealth', 'visibility', 'none');
    
    // Load article data for the second map once initialized
    loadArticleData2();

    // Add event listeners to checkboxes dynamically for scrolly2
    addCheckboxEventListeners2();
  });
}

// Load article details from JSON for scrolly2
function loadArticleData2() {
  fetch('article_details.json')
    .then(response => response.json())
    .then(data => {
      articleData2 = data; // Store the data in a global variable for scrolly2
      console.log('Article data loaded for scrolly2, waiting for scroll event to show markers.');
    })
    .catch(error => console.error('Error loading article data for scrolly2:', error));
}

// Function to add event listeners to checkboxes for scrolly2
function addCheckboxEventListeners2() {
  const checkboxes = document.querySelectorAll('.publication2'); // Updated to '.publication2'
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange2);
  });
}

// Function to handle checkbox changes for scrolly2
function handleCheckboxChange2() {
  const selectedSources = Array.from(document.querySelectorAll('.publication2:checked')).map(checkbox => checkbox.value); // Updated to '.publication2:checked'

  console.log('Selected sources:', selectedSources); // Debugging line to check selected sources

  // Clear the current aggregated data and markers to recalculate
  aggregatedData2 = {};
  totalMentions2 = 0; // Reset the total mentions count

  if (selectedSources.length > 0) {
    updateAggregatedData2(selectedSources);
    updateMapWithAggregatedData2();
  } else {
    // Remove all markers if no sources are selected
    clearMarkers2();
  }
}

// Function to update the aggregated data based on selected sources for scrolly2
function updateAggregatedData2(selectedSources) {
  selectedSources.forEach(source => {
    articleData2.forEach(article => {
      if (article.publication === source) {
        // Aggregate data based on country_frequencies
        for (const [country, frequency] of Object.entries(article.country_frequencies)) {
          aggregatedData2[country] = (aggregatedData2[country] || 0) + frequency;
          totalMentions2 += frequency; // Increment total mentions
        }
      }
    });
  });

  console.log('Aggregated data:', aggregatedData2); // Debugging line to check aggregated data
  console.log('Total mentions:', totalMentions2); // Debugging line to check total mentions

  // New line to log the total number of unique countries
  const totalCountries = Object.keys(aggregatedData2).length;
  console.log('Total unique countries:', totalCountries);
}

// Function to update the map with aggregated data for scrolly2
function updateMapWithAggregatedData2() {
  clearMarkers2(); // Ensure no previous markers remain

  // Load location data from CSV for scrolly2
  fetch('location.csv')
    .then(response => response.text())
    .then(data => {
      const locationData2 = new Map();
      const rows = data.split('\n').slice(1);
      rows.forEach(row => {
        const [location, lat, long] = row.split(',');
        locationData2.set(location.trim(), { lat: parseFloat(lat), long: parseFloat(long) });
      });

      // Add new markers based on the updated aggregated data
      for (const [country, frequency] of Object.entries(aggregatedData2)) {
        const locData = locationData2.get(country);
        if (locData) {
          const circleRadius = getCircleRadius(frequency);

          let el = document.createElement('div');
          el.className = 'marker';
          el.style.width = `${circleRadius * 2}px`;
          el.style.height = `${circleRadius * 2}px`;
          el.style.backgroundColor = '#D02D00';
          el.style.borderRadius = '50%';
          el.style.opacity = '0.85';

          const percentage = ((frequency / totalMentions2) * 100).toFixed(2); // Calculate percentage

          let marker = new mapboxgl.Marker(el)
            .setLngLat([locData.long, locData.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${country}</strong><br>Percentage: ${percentage}%`)) // Display percentage
            .addTo(map2);

          markers2.push(marker);
        } else {
          console.log(`Location data not found for ${country}`);
        }
      }
    })
    .catch(error => console.error('Error loading location data for scrolly2:', error));
}

// Function to clear all markers from map2
function clearMarkers2() {
  markers2.forEach(marker => marker.remove());
  markers2 = [];
  console.log('Markers cleared'); // Debugging line to confirm markers are cleared
}

// Helper function to calculate the radius of a marker circle based on the frequency count
function getCircleRadius(frequencyCount) {
  const baseRadius = 2;
  const scaleFactor = 0.9;
  const radius = baseRadius + (Math.sqrt(frequencyCount) * scaleFactor);
  return radius;
}

// Scrollama event handlers for scrolly2
function handleStepEnter2(response) {
  // response = { element, direction, index }
  var el = response.element;
  console.log('Entering step:', response.index); // Debugging line to check step index
  console.log('scrolly2 step:', el);

  // Remove is-active from all steps
  steps2.forEach(step => step.classList.remove('is-active'));
  el.classList.add('is-active');

  // Toggle "commonwealth" layer visibility based on step index
  if (response.index === 0) {
    // Show the "commonwealth" layer when the first step enters
    map2.setLayoutProperty('commonwealth', 'visibility', 'visible');
  } else if (response.index === 1) {
    // Hide the "commonwealth" layer and zoom to Africa when the second step enters
    map2.setLayoutProperty('commonwealth', 'visibility', 'none');
    map2.flyTo({
      center: [20.0, 10.0], // Coordinates for Africa
      zoom: 4, // Zoom level for Africa
      speed: 1.2, // Optional: adjust speed of transition
      curve: 1.5 // Optional: adjust 'smoothness' of flight
    });
  } else if (response.index === 2) {
    // Return to initial zoom and center when the third step enters
    map2.setLayoutProperty('commonwealth', 'visibility', 'none');
    map2.flyTo({
      center: initialMapState.center, // Initial center coordinates
      zoom: initialMapState.zoom, // Initial zoom level
      speed: 1.2, // Optional: adjust speed of transition
      curve: 1.5 // Optional: adjust 'smoothness' of flight
    });
  }

  // Determine which publication to select based on the step index for scrolly2
  const publicationToSelect2 = publications2[response.index]; // Get the corresponding publication value
  const checkboxToSelect2 = document.querySelector(`input[type="checkbox"].publication2[value="${publicationToSelect2}"]`);
  console.log('Checkbox to select:', checkboxToSelect2); // Debugging line to check checkbox selection

  if (checkboxToSelect2) {
    // Uncheck all checkboxes first
    publications2.forEach((publication) => {
      const checkboxToDeselect2 = document.querySelector(`input[type="checkbox"].publication2[value="${publication}"]`);
      if (checkboxToDeselect2 && checkboxToDeselect2.checked) {
        checkboxToDeselect2.checked = false; // Uncheck the checkbox
        checkboxToDeselect2.dispatchEvent(new Event('change')); // Trigger the change event to remove markers
      }
    });

    // Check the checkbox for the current step
    if (!checkboxToSelect2.checked) {
      checkboxToSelect2.checked = true; // Check the corresponding checkbox
      checkboxToSelect2.dispatchEvent(new Event('change')); // Trigger the change event
    }
  }
}

// New function to handle when a step is exited
function handleStepExit2(response) {
  // Check if all steps are inactive
  if (document.querySelectorAll("#scrolly2 .step2.is-active").length === 0) {
    // Uncheck all checkboxes
    publications2.forEach((publication) => {
      const checkboxToDeselect2 = document.querySelector(`input[type="checkbox"].publication2[value="${publication}"]`);
      if (checkboxToDeselect2 && checkboxToDeselect2.checked) {
        checkboxToDeselect2.checked = false;
        checkboxToDeselect2.dispatchEvent(new Event('change')); // Trigger the change event to remove markers
      }
    });
  }
}

// Initialize scrollama for scrolly2
function init2() {
  // Initialize the steps2 array
  steps2 = document.querySelectorAll('#scrolly2 article .step2'); // Updated to select elements with the new class name 'step2'

  // Setup the scroller passing options for scrolly2
  scroller2
    .setup({
      step: "#scrolly2 article .step2", // Updated to target '.step2'
      offset: 0.53,
      debug: false
    })
    .onStepEnter(handleStepEnter2)
    .onStepExit(handleStepExit2); // Add the step exit event

  // Setup resize event for scrolly2
  window.addEventListener("resize", scroller2.resize);
}

// Kick things off for scrolly2
createMap2(); // Initialize the Mapbox map for scrolly2
init2(); // Initialize the scrollama for scrolly2
