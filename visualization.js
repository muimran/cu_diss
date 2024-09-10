document.addEventListener("DOMContentLoaded", function() {
    let articleDetails = [];
    let svg, g;
    let colorScale;
    let isGreyState = true;  // Flag to track if chart is in grey state

    const width = 1110;
    const height = 900;
    const margin = 40;
    const lineSpacing = 12;
    const radius = 4;
    const dotSpacing = 8;
    const numCols = Math.floor((width - 2 * margin) / (radius * 2 + dotSpacing));

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
    fetch('article_details.json')
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

    // Function to visualize the data using D3.js
    function visualizeData(data) {
        svg = d3.select("#canvas")
            .attr("viewBox", [0, 0, width, height]);

        g = svg.append("g");

        const categories = [...new Set(data.map(d => d.category))];
        const years = [...new Set(data.map(d => d.year))];

        // Use a custom color scale with many distinct colors
        colorScale = d3.scaleOrdinal()
            .domain(categories)
            .range(d3.quantize(d3.interpolateRainbow, categories.length));

        drawDotsByYear(data, years, colorScale, true);
    }

    // Function to draw dots grouped by year
    function drawDotsByYear(data, years, colorScale, initialState) {
        g.selectAll("*").remove();

        let yPosition = margin;
        const xScale = d3.scaleLinear()
            .domain([0, numCols - 1])
            .range([margin, width - margin]);

        years.forEach(year => {
            const yearData = data.filter(d => d.year === year);

            g.append("line")
                .attr("class", "year-line")
                .attr("x1", margin)
                .attr("x2", width - margin)
                .attr("y1", yPosition)
                .attr("y2", yPosition)
                .attr("stroke", "#686666")
                .attr("stroke-width", 1);

            g.append("text")
                .attr("class", "year-label")
                .attr("x", margin + 5)
                .attr("y", yPosition - 5)
                .attr("text-anchor", "start")
                .attr("font-size", "14px")
                .attr("font-family", "'Roboto', sans-serif")
                .attr("font-weight", "600")
                .attr("fill", "#666")
                .text(year);

            yPosition += lineSpacing;

            g.selectAll(`.dot-${year}`)
                .data(yearData, d => d.serial)
                .enter()
                .append("circle")
                .attr("class", `dot-${year}`)
                .attr("cx", (d, i) => xScale(i % numCols))
                .attr("cy", (d, i) => yPosition + Math.floor(i / numCols) * (radius * 2 + dotSpacing))
                .attr("r", radius)
                .attr("fill", initialState ? "#686666" : d => colorScale(d.category))
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
                        const tooltipHeight = tooltip.node().offsetHeight;

                        // Get the viewBox dimensions or parent container dimensions
                        const svgRect = svg.node().getBoundingClientRect();

                        // Calculate new tooltip positions based on mouse coordinates
                        let left = event.pageX + 10;
                        let top = event.pageY - 30;

                        // Adjust if tooltip exceeds the right edge
                        if (left + tooltipWidth > svgRect.right) {
                            left = event.pageX - tooltipWidth - 10;
                        }

                        // Adjust if tooltip exceeds the bottom edge
                        if (top + tooltipHeight > svgRect.bottom) {
                            top = event.pageY - tooltipHeight - 10;
                        }

                        // Set the new tooltip position
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

            yPosition += Math.ceil(yearData.length / numCols) * (radius * 2 + dotSpacing) + lineSpacing;
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

    // Function to handle step changes based on index and type (enter/exit)
    function handleStepChange(index, type, direction) {
        d3.selectAll(".element1, .element2, .element3").classed("visible", false);

        if (type === "enter") {
            if (index === 0) {
                d3.select(".element1").classed("visible", true);
                updateDots();
            } else if (index === 1) {
                d3.select(".element2").classed("visible", true);
                filterDotsForSelectedMonths();
            } else if (index === 2) {
                d3.select(".element3").classed("visible", true);
                sortByCategoryFrequency();
            }
        } else if (type === "exit") {
            if (direction === "up") {
                if (index === 2) {
                    d3.select(".legend").remove();
                    revertToFilteredState();
                } else if (index === 1) {
                    resetDots();
                } else if (index === 0) {
                    resetDotsToInitialState();
                }
            } else if (direction === "down") {
                if (index === 2) {
                    d3.select(".legend").remove();
                }
                resetDots();
            }
        }
    }

    // Function to update dots' color to category colors
    function updateDots() {
        isGreyState = false;
        g.selectAll("circle")
            .transition()
            .duration(500)
            .attr("fill", d => colorScale(d.category));
    }

    // Function to reset dots to the initial state (grey color or the initial category colors)
    function resetDotsToInitialState() {
        isGreyState = true;
        g.selectAll("circle")
            .transition()
            .duration(500)
            .attr("fill", "#686666")
            .attr("r", radius)
            .attr("filter", null);
    }

    // Function to filter dots for selected months and color blurred dots by category
    function filterDotsForSelectedMonths() {
        let defs = svg.select("defs");
        if (defs.empty()) {
            defs = svg.append("defs");
        }

        let blurFilter = defs.select("#blur");
        if (blurFilter.empty()) {
            blurFilter = defs.append("filter")
                .attr("id", "blur")
                .attr("x", "-20%")
                .attr("y", "-20%")
                .attr("width", "140%")
                .attr("height", "140%");
            blurFilter.append("feGaussianBlur")
                .attr("stdDeviation", 2);
        }

        g.selectAll("circle")
            .transition()
            .duration(500)
            .attr("fill", d => {
                const date = new Date(d.date);
                const year = date.getFullYear();
                const month = date.getMonth();

                if ((year === 2013 && month === 4) || (year === 2016 && (month >= 6 && month <= 9))) {
                    return colorScale(d.category);
                } else {
                    return colorScale(d.category);
                }
            })
            .attr("r", d => {
                const date = new Date(d.date);
                const year = date.getFullYear();
                const month = date.getMonth();

                if ((year === 2013 && month === 4) || (year === 2016 && (month >= 6 && month <= 9))) {
                    return radius * 1.45;
                } else {
                    return radius;
                }
            })
            .attr("filter", d => {
                const date = new Date(d.date);
                const year = date.getFullYear();
                const month = date.getMonth();

                if ((year === 2013 && month === 4) || (year === 2016 && (month >= 6 && month <= 9))) {
                    return null;
                } else {
                    return "url(#blur)";
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
    let currentX = margin;
    let currentY = margin;

    sortedCategories.forEach(category => {
        const categoryData = articleDetails.filter(d => d.category === category);

        categoryData.forEach((d, i) => {
            if (currentX > width - margin) {
                currentX = margin;
                currentY += (radius * 2 + dotSpacing);
            }

            categoryPositions[d.serial] = {
                x: currentX,
                y: currentY
            };

            currentX += (radius * 2 + dotSpacing);
        });

        currentX += dotSpacing;
    });

    g.selectAll(".year-line, .year-label")
        .transition()
        .duration(1000)
        .attr("opacity", 0)
        .remove();

    // Dot sorting transition
    g.selectAll("circle")
        .transition()
        .duration(2500) // Duration of dot sorting
        .attr("cx", d => categoryPositions[d.serial].x)
        .attr("cy", d => categoryPositions[d.serial].y)
        .attr("r", radius)
        .attr("fill", d => colorScale(d.category))
        .on("end", function(_, i) {
            if (i === articleDetails.length - 1) {
                createLegend(sortedCategories, currentY + 40); // Create the legend right after last dot transition ends
            }
        });
}

// Function to create the legend after the dots have finished sorting
function createLegend(sortedCategories, legendStartY) {
    const topCategories = sortedCategories.slice(0, 17);
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin}, ${legendStartY})`);

    let currentLegendX = 0;
    let currentLegendY = 0;
    const legendLineHeight = 25;
    const maxLegendWidth = width - 2 * margin;

    topCategories.forEach((category, i) => {
        const circle = legend.append("circle")
            .attr("cx", currentLegendX + 10)
            .attr("cy", currentLegendY + 10)
            .attr("r", 6)
            .attr("fill", colorScale(category))
            .attr("opacity", 0);  // Start with zero opacity

        const text = legend.append("text")
            .attr("x", currentLegendX + 25)
            .attr("y", currentLegendY + 14)
            .attr("font-size", "12px")
            .attr("font-family", "'Roboto', sans-serif")
            .attr("fill", "#666")
            .text(category)
            .attr("opacity", 0);  // Start with zero opacity

        const textWidth = text.node().getBBox().width;

        if (currentLegendX + 50 + textWidth > maxLegendWidth) {
            currentLegendX = 0;
            currentLegendY += legendLineHeight;
        } else {
            currentLegendX += 50 + textWidth;
        }
    });

    // Fade in all the legend circles and text simultaneously
    legend.selectAll("circle, text")
        .transition()
        .duration(500)  // Fade-in duration for all legend elements
        .attr("opacity", 1);  // Set opacity to 1 to fade in
}



    function resetDots() {
        g.selectAll("circle")
            .transition()
            .duration(500)
            .attr("fill", d => colorScale(d.category))
            .attr("r", radius)
            .attr("filter", null);
    }

    function revertToFilteredState() {
        drawDotsByYear(articleDetails, [...new Set(articleDetails.map(d => d.year))], colorScale, false);
        filterDotsForSelectedMonths();
    }
});
