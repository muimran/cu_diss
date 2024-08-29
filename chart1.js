// Set the dimensions and margins of the graph
const margin = {top: 40, right: 30, bottom: 60, left: 30},
      width = 1000 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

// Append the svg object to the body of the page
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
d3.csv("top100_words_yearwise.csv").then(data => {
    // Nest data by Publication
    const nestedData = d3.groups(data, d => d.Year);

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
            .attr("y", (d, i) => y(i + 1))  // Increment y position for each word
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

                // Get the x position of the 6th column
                const sixthColumnX = x(nestedData[5][0]) + x.bandwidth();

                // Position the tooltip to the right of the 6th column
                tooltip.style("left", (sixthColumnX + margin.left + 725) + "px")  // Adjust as needed
                    .style("top", (event.pageY - 6) + "px");  // Align vertically with the mouse
            })
            .on("mouseout", function() {
                // Reset the color of all bars to steelblue
                svg.selectAll("rect").attr("fill", "steelblue");

                tooltip.transition().duration(500).style("opacity", 0);
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
