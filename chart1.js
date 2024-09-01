// Set the dimensions and margins of the D3 graph
const margin = {top: 40, right: 30, bottom: 60, left: 30},
      width = 1000 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

// Append the svg object to the body of the page for D3 chart
const svg = d3.select("#chart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip setup
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")  // Ensure tooltip is positioned absolutely
    .style("pointer-events", "none"); // Prevent tooltip from affecting mouse events

// Load the CSV data
d3.csv("top100_content_pub.csv").then(data => {
    // Nest data by Publication
    const nestedData = d3.groups(data, d => d.Publication);

    // Sort the data within each publication by frequency in descending order
    nestedData.forEach(pub => {
        pub[1].sort((a, b) => d3.descending(+a.Frequency, +b.Frequency));
    });

    // Set the scales
    const x = d3.scaleBand()
        .domain(nestedData.map(d => d[0]))
        .range([0, width * 0.5])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, 100])  // 100 words per publication
        .range([height, 0]);

    const barHeight = height / 110;  // Adjusted thickness for bars with space

    // X Axis - render only once to keep it fixed
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(0).tickFormat(''))
        .selectAll("text")
        .remove();  // Remove the publication names (ticks) on X axis

    svg.selectAll(".domain").remove();  // This line removes the x-axis line

    // Draw bars
    nestedData.forEach(pub => {
        const pubName = pub[0];
        const words = pub[1];

        svg.selectAll(`.bar-${pubName}`)
            .data(words)
            .enter()
            .append("rect")
            .attr("class", `bar-${pubName}`)
            .attr("x", d => x(pubName))
            .attr("y", (d, i) => i * (barHeight + 0.6))  // Modify this line to add a vertical gap
            .attr("width", x.bandwidth())
            .attr("height", barHeight)
            .attr("fill", "steelblue")
            .on("mouseover", function(event, d) {
                // Highlight all bars with the same word across all columns
                svg.selectAll("rect").filter(function(dd) {
                    return dd.Word === d.Word;
                }).attr("fill", "orange");

                // Update tooltip content
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(d.Word.toUpperCase());

                // Position the tooltip to the right of the rightmost column
                const rightMostColumnX = x(nestedData[nestedData.length - 1][0]) + x.bandwidth();
                tooltip.style("left", (rightMostColumnX + margin.left + 85) + "px")
                       .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                // Reset the color of all bars to steelblue
                svg.selectAll("rect").attr("fill", "steelblue");

                tooltip.transition().duration(500).style("opacity", 0);
            })

            
            .on("click", function(event, d) {
                // Load data for the clicked word
                d3.csv("top500_content_year.csv").then(fullData => {
                    // Filter data for the selected word
                    const wordData = fullData.filter(row => row.Word.toLowerCase() === d.Word.toLowerCase());
            
                    // Sort the filtered data by year
                    wordData.sort((a, b) => d3.ascending(+a.Year, +b.Year));
            
                    // Extract years and frequencies for Highcharts
                    const newData = wordData.map(row => [+row.Year, +row.Frequency]);
            
                    // Show the Highcharts container when a bar is clicked
                    document.getElementById('container').style.display = 'block';
            
                    // Check if a chart already exists
                    if (Highcharts.charts[0]) {
                        // Update the existing chart's series data with animation
                        const chart = Highcharts.charts[0];
                        
                        // Update the chart title with the new word
                        chart.setTitle({
                            text: `Frequency of the Word "${d.Word}" Over Time`
                        });
            
                        // Directly update the series data with a smooth transition
                        chart.series[0].setData(newData, true, {
                            duration: 1500, // Increase animation duration for smoother transition
                            easing: 'easeInOutQuad' // Easing function for smooth transition
                        });
                    } else {
                        // Create a new chart if it doesn't exist
                        Highcharts.chart('container', {
                            chart: {
                                type: 'spline',
                                animation: {
                                    duration: 1500 // Overall animation duration for chart
                                },
                                margin: [70, 50, 60, 80]  // Fixed margins to prevent resizing
                            },
                            title: {
                                text: `Frequency of the Word "${d.Word}" Over Time`,
                                align: 'center',
                                style: {
                                    fontFamily: 'IBM Plex Sans, sans-serif', // Specify the font family
                                    fontSize: '16px', // Specify the font size
                                    fontWeight: 'bold', // Specify the font weight
                                    color: '#333333' // Specify the font color
                                }
                            },
                            xAxis: {
                                type: 'linear', // Use a linear scale for the x-axis
                                min: 2012, // Set minimum value to 2012
                                max: 2024, // Set maximum value to 2024
                                tickPositions: [2012, 2018, 2024], // Set specific ticks at 2012, 2018, 2024
                                title: {
                                    text: null // Remove the "Year" title
                                },
                                lineWidth: 2,  // Increase X-axis line thickness here
                                minorTickLength: 0, // Remove minor ticks (tiny lines under the axis)
                                tickLength: 0,  // Remove all ticks
                                labels: {
                                    formatter: function() {
                                        return this.value; // Display the year values directly
                                    }
                                },
                                gridLineWidth: 0 // Remove any grid lines on the X-axis
                            },
                            yAxis: {
                                title: {
                                    text: null // Remove the "Frequency" title
                                },
                                gridLineWidth: 0, // Disable grid lines on the Y-axis
                                lineWidth: 0, // Remove Y-axis line
                                labels: {
                                    enabled: true
                                }
                            },
                            plotOptions: {
                                series: {
                                    marker: {
                                        enabled: false // Disable markers
                                    },
                                    lineWidth: 2,
                                    animation: {
                                        duration: 1500, // Increase animation duration for series update
                                        easing: 'easeInOutQuad' // Smooth easing function
                                    },
                                    label: {
                                        enabled: false
                                    }
                                }
                            },
                            tooltip: {
                                formatter: function() {
                                    return 'Frequency: ' + this.y + '<br>Year: ' + this.x;
                                }
                            },
                            series: [{
                                data: newData, // Use an array of arrays for linear x-axis
                                showInLegend: false
                            }],
                            exporting: {
                                enabled: false
                            },
                            credits: {
                                enabled: false
                            }
                        });
                    }
                });
            });
            
            
            
            
            
            
            
            
    });

    // Add publication logos under each column
    svg.selectAll(".logo")
        .data(nestedData)
        .enter()
        .append("image")
        .attr("href", d => `logo/${d[1][0].Logo}`)  // Construct the relative path to the logo folder
        .attr("x", d => x(d[0]) + (x.bandwidth() - 50) / 2)  // Center the logo
        .attr("y", height + 20)
        .attr("width", 50)
        .attr("height", 50);
});

// Function to hide the Highcharts container
function hideHighcharts() {
    document.getElementById('container').style.display = 'none';
}

// Add an event listener to the document to hide the Highcharts chart when clicking outside
document.addEventListener('click', function(event) {
    // Check if the click is inside the Highcharts container or a D3 bar
    const isClickInsideHighcharts = document.getElementById('container').contains(event.target);
    const isClickOnBar = event.target.nodeName === 'rect';

    if (!isClickInsideHighcharts && !isClickOnBar) {
        hideHighcharts();
    }
});

// Ensure the Highcharts container is initially hidden
hideHighcharts();
