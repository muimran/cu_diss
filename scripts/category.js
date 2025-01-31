document.addEventListener("DOMContentLoaded", function() {
    let articleDetails = [];
    let svg, g;
    let colorScale;
    let isGreyState = true;  // Flag to track if chart is in grey state
    let isLegendCreated = false;  // Flag to check if the legend has already been created

    // Get responsive dimensions
    const dims = getResponsiveDimensions();
    const numCols = Math.floor((dims.width - 2 * dims.margin) / (dims.radius * 2 + dims.dotSpacing));

    // Update SVG dimensions
    svg = d3.select("#visualization")
        .append("svg")
        .attr("width", dims.width)
        .attr("height", dims.height)
        .attr("viewBox", `0 0 ${dims.width} ${dims.height}`);

    // Inject the tooltip CSS dynamically to avoid conflicts
    const style = document.createElement('style');
    style.innerHTML = `
    .custom-tooltip {
        position: absolute;
        background-color: white;
        border: 0px solid #ccc;
        padding: 5px;
        border-radius: 10px;
        font-size: 12px;
        font-family: 'Roboto', sans-serif;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        z-index: 1000;
    }
    `;
    document.head.appendChild(style);

    // Create tooltip div with a unique class
    const tooltip = d3.select("body").append("div")
        .attr("class", "custom-tooltip");

    // Fetch the article details from a JSON file
    fetch('data/article_details.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            articleDetails = data;
            articleDetails.forEach(d => d.year = new Date(d.date).getFullYear());
            articleDetails.sort((a, b) => d3.ascending(a.year, b.year) || d3.ascending(new Date(a.date), new Date(b.date)));
            visualizeData(articleDetails);
            setupScrollama(); // Ensure Scrollama is set up after data is loaded and visualized
        })
        .catch(error => {
            console.error('Error fetching JSON data:', error);
        });

    // Define a mapping of inconsistent publication names to proper names
    const publicationNameMap = {
        'BBC': 'BBC',
        'CNN': 'CNN',
        'telegraph': 'The Telegraph',
        'foxnews': 'Fox News',
        'New York Times': 'The New York Times',
        'Guardian': 'The Guardian'
    };

    // Function to standardize publication names
    function getStandardizedPublicationName(pub) {
        return publicationNameMap[pub] || pub;  // Return mapped name or original if no match
    }

    // Function to visualize the data using D3.js
    function visualizeData(data) {
        svg = d3.select("#canvas")
            .attr("viewBox", [0, 0, dims.width, dims.height])
            .style("background-color", primaryColor);  // Set background color

        g = svg.append("g");

        const categories = [...new Set(data.map(d => d.category))];
        const years = [...new Set(data.map(d => d.year))];

        // Use a custom color scale with many distinct colors
        colorScale = d3.scaleOrdinal()
            .domain(categories)
            .range(d3.quantize(d3.interpolateRainbow, categories.length));

        drawDotsByYear(data, years, colorScale, isGreyState);
    }

    // Function to draw dots grouped by year
    function drawDotsByYear(data, years, colorScale, isGrey) {
        const dims = getResponsiveDimensions();
        const numCols = Math.floor((dims.width - 2 * dims.margin) / (dims.radius * 2 + dims.dotSpacing));
        
        g.selectAll("*").remove();

        let yPosition = dims.margin;
        const xScale = d3.scaleLinear()
            .domain([0, numCols - 1])
            .range([dims.margin, dims.width - dims.margin]);

        years.forEach(year => {
            const yearData = data.filter(d => d.year === year);

            g.append("line")
                .attr("class", "year-line")
                .attr("x1", dims.margin)
                .attr("x2", dims.width - dims.margin)
                .attr("y1", yPosition)
                .attr("y2", yPosition)
                .attr("stroke", "#686666")
                .attr("stroke-width", 1);

            g.append("text")
                .attr("class", "year-label")
                .attr("x", dims.margin + 5)
                .attr("y", yPosition - 5)
                .attr("text-anchor", "start")
                .attr("font-size", "14px")
                .attr("font-family", "'Roboto', sans-serif")
                .attr("font-weight", "600")
                .attr("fill", "#666")
                .text(year);

            yPosition += dims.lineSpacing;

            g.selectAll(`.dot-${year}`)
                .data(yearData, d => d.serial)
                .enter()
                .append("circle")
                .attr("class", `dot-${year}`)
                .attr("cx", (d, i) => {
                    const col = i % numCols;
                    return dims.margin + col * (dims.radius * 2 + dims.dotSpacing) + dims.radius;
                })
                .attr("cy", (d, i) => {
                    const row = Math.floor(i / numCols);
                    return dims.margin + row * (dims.radius * 2 + dims.dotSpacing) + dims.radius;
                })
                .attr("r", dims.radius)
                .attr("fill", d => isGrey ? "#ccc" : colorScale(d.category))
                .on("mouseover", function(event, d) {
                    if (!isGreyState) {  // Only show the tooltip if not in grey state
                        tooltip.style("opacity", 1)
                            .html(d.category)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 30) + "px");
                        d3.select(this)
                            .attr("stroke", "#000")
                            .attr("stroke-width", 2);
                    }
                })
                .on("mousemove", function(event) {
                    if (!isGreyState) {
                        const tooltipWidth = tooltip.node().offsetWidth;
                        const tooltipHeight = tooltip.node().getBoundingClientRect().height;

                        const svgRect = svg.node().getBoundingClientRect();

                        let left = event.pageX + 10;
                        let top = event.pageY - 30;

                        if (left + tooltipWidth > svgRect.right) {
                            left = event.pageX - tooltipWidth - 10;
                        }

                        if (top + tooltipHeight > svgRect.bottom) {
                            top = event.pageY - tooltipHeight - 10;
                        }

                        tooltip.style("left", left + "px").style("top", top + "px");
                    }
                })
                .on("mouseout", function() {
                    if (!isGreyState) {
                        tooltip.style("opacity", 0);
                        d3.select(this)
                            .attr("stroke", null);
                    }
                });

            yPosition += Math.ceil(yearData.length / numCols) * (dims.radius * 2 + dims.dotSpacing) + dims.lineSpacing;
        });
    }

    // Function to setup Scrollama for step-chart elements
    function setupScrollama() {
        const scroller = scrollama();

        scroller
            .setup({
                step: ".step-chart", // Target the steps correctly in your HTML
                offset: 0.7,         // Adjusted for smoother trigger points
                debug: false
            })
            .onStepEnter(function(response) {
                handleStepChange(response.index, "enter");
            })
            .onStepExit(function(response) {
                handleStepChange(response.index, "exit", response.direction);
            });
    }

    function handleStepChange(index, type, direction) {
        // Hide all elements initially
        d3.selectAll(".element0, .element1, .element2, .element3, .element4").classed("visible", false);
    
        if (type === "enter") {
            // Handle entering steps
            if (index === 0) {
                d3.select(".element0").classed("visible", true);
            } else if (index === 1) {
                d3.select(".element1").classed("visible", true);
                updateDots();  // Colors dots by category
            } else if (index === 2) {
                d3.select(".element2").classed("visible", true);
                filterDotsForSelectedMonths();  // Highlights selected months' dots but does not change size
            } else if (index === 3) {
                resetDots();  // Reset dots to original state before sorting
    
                // Only create the legend if it hasn't been created before
                if (!isLegendCreated) {
                    setTimeout(() => {
                        d3.select(".element3").classed("visible", true);
                        sortByCategoryFrequency();  // Sort dots by category frequency and show legend
                        isLegendCreated = true;  // Set the flag to true after creating the legend
                    }, 401);
                } else {
                    d3.select(".element3").classed("visible", true);  // Just show element3 without recreating the legend
                }
            } else if (index === 4) {
                d3.select(".element4").classed("visible", true);
                d3.select(".legend").classed("visible", true);  // Ensure the legend remains visible
                showPublicationButtons();  // Show publication filter buttons after legend in element4
                d3.select(".button-container").classed("visible", true);  // Make button container visible

            }
        } else if (type === "exit") {
            // Handle exiting steps
            if (direction === "up") {
                // Handle upward scrolling
                if (index === 4) {
                    d3.select(".button-container").remove();  // Remove publication buttons when scrolling back up
                    d3.select(".legend").classed("visible", true);  // Ensure legend is still visible when exiting element4
                } else if (index === 3) {
                    d3.select(".legend").remove();  // Remove the legend when exiting element3
                    isLegendCreated = false;  // Reset flag to allow legend recreation if needed later
                    revertToFilteredState();  // Reset dots to the state from element2
                } else if (index === 2) {
                    resetDots();  // Resets enlarged dots to original size and color
                } else if (index === 1) {
                    resetDotsToInitialState();  // Resets to grey state (initial state)
                }
            } else if (direction === "down") {
                // Handle downward scrolling (simplified)
                resetDots();  // Always reset dots on scroll down
                d3.select(".button-container").remove();
            }
        }
    }
    
    

    // Function to update dots' color to category colors
    function updateDots() {
        isGreyState = false;  // Set to non-grey state when updating to category colors
        g.selectAll("circle")
            .transition()
            .duration(0)
            .attr("fill", d => colorScale(d.category))
            .attr("opacity", 1);
    }

    // Function to reset dots to the initial state (grey color or the initial category colors)
    function resetDotsToInitialState() {
        isGreyState = true;
        g.selectAll("circle")
            .transition()
            .duration(500)
            .attr("fill", "#686666")  // Set dots to grey
            .attr("r", dims.radius);  // Reset size to original radius
    }

    // Function to filter dots for selected months and set opacity for unfiltered dots
    function filterDotsForSelectedMonths() {
        g.selectAll("circle")
            .transition()
            .duration(550)
            .attr("fill", d => colorScale(d.category))  // Apply the same fill color for all
            .attr("opacity", d => {
                const date = new Date(d.date);
                const year = date.getFullYear();
                const month = date.getMonth();
    
                // Adjust opacity based on the selected months
                if ((year === 2013 && month === 4) || (year === 2016 && (month >= 6 && month <= 9))) {
                    return 1;  // Full opacity for highlighted months
                } else {
                    return 0.20;  // Lower opacity for non-highlighted months
                }
            });
    }
    

    // Function to sort dots by category frequency and add legend
    function sortByCategoryFrequency() {
        const categoryCount = {};

        articleDetails.forEach(d => {
            categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
        });

        const sortedCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .map(d => d[0]);

        articleDetails.sort((a, b) => sortedCategories.indexOf(a.category) - sortedCategories.indexOf(b.category));

        const categoryPositions = {};
        let currentX = dims.margin;
        let currentY = dims.margin;

        sortedCategories.forEach(category => {
            const categoryData = articleDetails.filter(d => d.category === category);

            categoryData.forEach((d, i) => {
                if (currentX > dims.width - dims.margin) {
                    currentX = dims.margin;
                    currentY += (dims.radius * 2 + dims.dotSpacing);
                }

                categoryPositions[d.serial] = {
                    x: currentX,
                    y: currentY
                };

                currentX += (dims.radius * 2 + dims.dotSpacing);
            });

            currentX += dims.dotSpacing;
        });

        g.selectAll(".year-line, .year-label")
            .transition()
            .duration(1000)
            .attr("opacity", 0)
            .remove();

        g.selectAll("circle")
            .data(articleDetails, d => d.serial)
            .join("circle")
            .transition()
            .duration(2500)
            .attr("cx", (d) => categoryPositions[d.serial].x)
            .attr("cy", (d) => categoryPositions[d.serial].y)
            .attr("fill", d => colorScale(d.category));

        const topCategories = sortedCategories.slice(0, 17);
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${dims.margin}, ${currentY + 40})`);

        let currentLegendX = 0;
        let currentLegendY = 0;
        const legendLineHeight = 25;
        const maxLegendWidth = dims.width - 2 * dims.margin;
        const initialDelay = 1000;

        topCategories.forEach((category, i) => {
            const circle = legend.append("circle")
                .attr("cx", currentLegendX + 10)
                .attr("cy", currentLegendY + 10)
                .attr("r", 6)
                .attr("fill", colorScale(category))
                .attr("opacity", 0)
                .transition()
                .delay(initialDelay + i * 200)
                .duration(200)
                .attr("opacity", 1);

            const text = legend.append("text")
                .attr("x", currentLegendX + 25)
                .attr("y", currentLegendY + 14)
                .attr("font-size", "12px")
                .attr("font-family", "'Roboto', sans-serif")
                .attr("fill", "#666")
                .text(category)
                .attr("opacity", 0)
                .transition()
                .delay(initialDelay + i * 200)
                .duration(200)
                .attr("opacity", 1);

            const textWidth = text.node().getBBox().width;

            if (currentLegendX + 50 + textWidth > maxLegendWidth) {
                currentLegendX = 0;
                currentLegendY += legendLineHeight;
            } else {
                currentLegendX += 50 + textWidth;
            }
        });
    }

    // Function to reset dots to their category colors, original size, and full opacity
    function resetDots() {
        g.selectAll("circle")
            .transition()
            .duration(500)
            .attr("fill", d => colorScale(d.category))  // Reset to category color
            .attr("r", dims.radius)  // Reset size to original radius
            .attr("opacity", 1);  // Reset opacity to full (1) for all dots
    }

    // Function to revert dots from sorted state (Step 2) to filtered state (Step 1)
    function revertToFilteredState() {
        articleDetails.sort((a, b) => d3.ascending(a.year, b.year) || d3.ascending(new Date(a.date), new Date(b.date)));
        drawDotsByYear(articleDetails, [...new Set(articleDetails.map(d => d.year))], colorScale, true);
        filterDotsForSelectedMonths();
    }

// Function to create and show publication buttons after the legend (in element4)
// Function to create and show publication buttons after the legend (in element4)
function showPublicationButtons() {
    // First, get the bounding box of the legend to determine where to place the buttons
    const legendBox = d3.select(".legend").node().getBBox();
    
    // Calculate the Y offset to position the buttons below the legend
    const offsetY = legendBox.y + legendBox.height + 580;  // Adjusted for proper spacing
    
    // Extract unique publication names and standardize them
    const publicationCounts = {};

    // Count the number of articles for each publication
    articleDetails.forEach(d => {
        const standardizedPub = getStandardizedPublicationName(d.publication);
        publicationCounts[standardizedPub] = (publicationCounts[standardizedPub] || 0) + 1;
    });

    // Sort publications by article count in descending order
    const sortedPublications = Object.entries(publicationCounts)
        .sort((a, b) => b[1] - a[1])  // Sort by count (descending)
        .map(d => d[0]);  // Get the publication names

    // Define button dimensions and spacing
    const buttonWidth = 140;
    const buttonHeight = 25;
    const buttonSpacing = 10;
    const totalButtonWidth = sortedPublications.length * (buttonWidth + buttonSpacing) - buttonSpacing; // Total width of all buttons

    // Calculate the X offset to center the buttons
    const offsetX = (dims.width - totalButtonWidth) / 2;  // Center the button container based on the SVG width

    // Create a button container inside the chart after the legend, centered horizontally
    const buttonContainer = svg.append("g")
        .attr("class", "button-container")
        .attr("transform", `translate(${offsetX}, ${offsetY})`); // Centering the button container

    // Add buttons for each standardized publication name in sorted order
    let buttonX = 0;

    sortedPublications.forEach(pub => {
        const buttonGroup = buttonContainer.append("g")
            .attr("class", `button-group ${pub}`)
            .attr("transform", `translate(${buttonX}, 0)`);  // Position buttons horizontally

        const rect = buttonGroup.append("rect")
            .attr("width", buttonWidth)
            .attr("height", buttonHeight)
            .attr("rx", 10)  // Rounded corners
            .attr("ry", 10)  // Rounded corners
            .classed("active", pub === "The Guardian")  // Set 'active' class by default for The Guardian
            .on("click", function() {
                // Toggle active state
                const isActive = d3.select(this).classed("active");
                d3.select(this).classed("active", !isActive);
                console.log(`${pub} button clicked, active state: ${!isActive}`);
                filterDotsByPublication();
            });

        buttonGroup.append("text")
            .attr("x", buttonWidth / 2)
            .attr("y", buttonHeight / 2 + 5)
            .attr("text-anchor", "middle")  // Center text within the button
            .attr("font-size", "12px")
            .attr("font-family", "'Roboto', sans-serif")
            .attr("fill", "#333")
            .text(pub);

        buttonX += buttonWidth + buttonSpacing;  // Move to the right for the next button
    });

    // Trigger the filtering function to filter by 'The Guardian' on page load
    filterDotsByPublication();
}




// Function to filter dots by selected publications and rearrange them
function filterDotsByPublication() {
    // Get selected (active) publications
    const activeButtons = d3.selectAll(".button-container rect.active");
    const selectedPublications = activeButtons.nodes().map(node => {
        const parentGroup = d3.select(node.parentNode).select("text").text();
        return parentGroup;
    });
    
    console.log("Selected Publications:", selectedPublications);

    // Separate selected and unselected dots within each category
    const selectedDots = [];
    const unselectedDots = [];

    articleDetails.forEach(d => {
        const standardizedPub = getStandardizedPublicationName(d.publication);
        if (selectedPublications.includes(standardizedPub)) {
            selectedDots.push(d);  // Collect selected dots
        } else {
            unselectedDots.push(d);  // Collect unselected dots
        }
    });

    // Combine selected dots followed by unselected dots, but keep them grouped by category
    const sortedArticleDetails = [];

    const categories = [...new Set(articleDetails.map(d => d.category))];

    categories.forEach(category => {
        const selectedByCategory = selectedDots.filter(d => d.category === category);
        const unselectedByCategory = unselectedDots.filter(d => d.category === category);

        // Append selected dots first, then unselected dots for each category
        sortedArticleDetails.push(...selectedByCategory, ...unselectedByCategory);
    });

    // Re-arrange the dots in the SVG
    const categoryPositions = {};
    let currentX = dims.margin;
    let currentY = dims.margin;

    sortedArticleDetails.forEach((d, i) => {
        if (currentX > dims.width - dims.margin) {
            currentX = dims.margin;
            currentY += (dims.radius * 2 + dims.dotSpacing);
        }

        categoryPositions[d.serial] = {
            x: currentX,
            y: currentY
        };

        currentX += (dims.radius * 2 + dims.dotSpacing);
    });

    // Transition the dots to their new positions
    g.selectAll("circle")
        .data(sortedArticleDetails, d => d.serial)
        .join("circle")
        .transition()
        .duration(1000)
        .attr("cx", (d) => categoryPositions[d.serial].x)
        .attr("cy", (d) => categoryPositions[d.serial].y)
        .attr("opacity", d => {
            // Get the standardized name of the current dot's publication
            const standardizedPub = getStandardizedPublicationName(d.publication);

            if (selectedPublications.length === 0 || selectedPublications.includes(standardizedPub)) {
                console.log(`Showing dot from publication: ${standardizedPub}`);
                return 1; // Highlight selected publications
            } else {
                console.log(`Dimming dot from publication: ${standardizedPub}`);
                return 0.2; // Dim unselected publications
            }
        });

    // Rearrange the legend based on the frequency of categories within the selected publications
    updateLegend(selectedDots);
}

// Function to update the legend based on category frequency within selected publications
// Function to update the legend based on category frequency within selected publications
function updateLegend(selectedDots) {
    // Calculate category frequencies for selected dots
    const categoryCount = {};

    selectedDots.forEach(d => {
        categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
    });

    // Sort categories by frequency in descending order
    const sortedCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .map(d => d[0]);

    // Select the legend group
    const legend = d3.select(".legend");

    // Remove old legend items to start fresh
    legend.selectAll("*").remove();

    // Variables for positioning legend items dynamically
    let currentLegendX = 0;
    let currentLegendY = 0;
    const legendLineHeight = 25;  // Space between lines in the legend
    const canvasRightSpace = dims.width * 0.15;  // Reserve 10% of the canvas on the right side
    const maxLegendWidth = dims.width - 2 * dims.margin - canvasRightSpace;  // Max width for the legend row, considering the right space

    // Iterate over sorted categories and create new legend items dynamically
    sortedCategories.forEach((category, i) => {
        // Create legend circles
        legend.append("circle")
            .attr("cx", currentLegendX + 10)
            .attr("cy", currentLegendY + 10)
            .attr("r", 6)
            .attr("fill", colorScale(category));

        // Create legend text
        const text = legend.append("text")
            .attr("x", currentLegendX + 25)
            .attr("y", currentLegendY + 14)
            .attr("font-size", "12px")
            .attr("font-family", "'Roboto', sans-serif")
            .attr("fill", "#666")
            .text(category);

        // Calculate the width of the text to dynamically space items
        const textWidth = text.node().getBBox().width;

        // If the current row exceeds the max width (including the 5% right space), move to the next row
        if (currentLegendX + 50 + textWidth > maxLegendWidth) {
            currentLegendX = 0;
            currentLegendY += legendLineHeight;
        } else {
            // Move the X position to the right for the next legend item
            currentLegendX += 50 + textWidth;
        }
    });
}

// Add window resize handler
window.addEventListener('resize', () => {
    const newDims = getResponsiveDimensions();
    svg.attr("width", newDims.width)
       .attr("height", newDims.height);
    
    // Redraw dots with new dimensions
    const years = [...new Set(articleDetails.map(d => d.year))];
    drawDotsByYear(articleDetails, years, colorScale, isGreyState);
});

// Add responsive dimensions
const getResponsiveDimensions = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth <= 480) {  // Mobile breakpoint
        return {
            width: screenWidth - 40,
            height: 600,
            margin: 20,
            radius: 2,
            dotSpacing: 4,
            lineSpacing: 8
        };
    }
    return {
        width: 1110,
        height: 900,
        margin: 40,
        radius: 4,
        dotSpacing: 8,
        lineSpacing: 12
    };
};

});
