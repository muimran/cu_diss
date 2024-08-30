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
    .style("opacity", 0);

// Load the CSV data
d3.csv("top100_words.csv").then(data => {
    // Nest data by Publication
    const nestedData = d3.groups(data, d => d.Publication);

    // Sort the data within each publication by frequency in descending order
    nestedData.forEach(pub => {
        pub[1].sort((a, b) => d3.descending(+a.Frequency, +b.Frequency));
    });

    // Set the scales
    const x = d3.scaleBand()
        .domain(nestedData.map(d => d[0]))
        .range([0, width * .5])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, 100])  // 100 words per publication
        .range([height, 0]);

    const barHeight = height / 110;  // Adjusted thickness for bars with space

    // X Axis
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
            .attr("y", (d, i) => i * (barHeight + .6))  // Modify this line to add a vertical gap
            .attr("width", x.bandwidth())
            .attr("height", barHeight)
            .attr("fill", "steelblue")
            .on("mouseover", function(event, d) {
                // Highlight all bars with the same word across all columns
                svg.selectAll("rect").filter(function(dd) {
                    return dd.Word === d.Word;
                }).attr("fill", "orange");

                // Update tooltip content
                tooltip.transition().duration(200).style("opacity", .9);
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
                d3.csv("top100_words_articles_yearwise.csv").then(fullData => {
                    // Filter data for the selected word
                    const wordData = fullData.filter(row => row.Word.toLowerCase() === d.Word.toLowerCase());

                    // Sort the filtered data by year
                    wordData.sort((a, b) => d3.ascending(+a.Year, +b.Year));

                    // Extract years and frequencies for Highcharts
                    const years = wordData.map(row => +row.Year);
                    const frequencies = wordData.map(row => +row.Frequency);

                    // Show the Highcharts container when a bar is clicked
                    document.getElementById('container').style.display = 'block';

                    // Update Highcharts with the new data
                    Highcharts.chart('container', {
                        chart: {
                            type: 'spline',
                            animation: {
                                duration: 1000
                            }
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
                            categories: years,
                            title: {
                                text: null
                            },
                            gridLineWidth: 0,
                            labels: {
                                formatter: function() {
                                    return (this.value == years[0] || this.value == years[years.length - 1]) ? this.value : '';
                                }
                            }
                        },
                        yAxis: {
                            title: {
                                text: null
                            },
                            gridLineWidth: 0,
                            labels: {
                                enabled: true
                            }
                        },
                        plotOptions: {
                            series: {
                                marker: {
                                    enabled: false
                                },
                                lineWidth: 2,
                                animation: {
                                    duration: 1000
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
                            data: frequencies,
                            showInLegend: false
                        }],
                        exporting: {
                            enabled: false
                        },
                        credits: {
                            enabled: false
                        }
                    });
                    
                });
            });
    });

    // Add publication logos under each column
    svg.selectAll(".logo")
        .data(nestedData)
        .enter()
        .append("image")
        .attr("xlink:href", d => d[1][0].Logo)
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
