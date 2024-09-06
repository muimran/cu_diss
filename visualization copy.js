document.addEventListener("DOMContentLoaded", function() {
    let articleDetails = [];
    let svg, g;
    let colorScale;
  
    const width = 1123;
    const height = 900;
    const margin = 40;
    const lineSpacing = 12;
    const radius = 4;
    const dotSpacing = 8;
    const numCols = Math.floor((width - 2 * margin) / (radius * 2 + dotSpacing));
  
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
  
      // Define a color scale for categories
      const colorScheme = d3.schemeCategory10.slice();
      colorScheme[1] = '#1f77b4';
  
      colorScale = d3.scaleOrdinal()
        .domain(categories)
        .range(colorScheme);
  
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
          .attr("fill", initialState ? "#686666" : d => colorScale(d.category));
  
        yPosition += Math.ceil(yearData.length / numCols) * (radius * 2 + dotSpacing) + lineSpacing;
      });
    }
  
    // Function to setup Scrollama for step-chart elements
    function setupScrollama() {
      const scroller = scrollama();
  
      scroller
        .setup({
          step: ".step-chart", // Target the steps correctly in your HTML
          offset: 0.75,        // Adjust this value to control the trigger point
          debug: true
        })
        .onStepEnter(function(response) {  
          // Check the response index and apply the correct animation or state change
          handleStepChange(response.index, "enter");
        })
        .onStepExit(function(response) {  
          // Handle the state change or animation revert based on scroll direction
          handleStepChange(response.index, "exit", response.direction);
        });
    }
  
    // Function to handle step changes based on index and type (enter/exit)
    function handleStepChange(index, type, direction) {
      d3.selectAll(".element1, .element2, .element3").classed("visible", false); // Reset visibility on all steps
  
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
          // Revert to the previous state when scrolling up
          if (index === 1) {
            d3.select(".element1").classed("visible", true);
            updateDots();
          } else if (index === 2) {
            d3.select(".element2").classed("visible", true);
            filterDotsForSelectedMonths();
          }
        } else if (direction === "down") {
          // Reset to initial state when scrolling down
          resetDots();
        }
      }
    }
  
    // Function to update dots' color
    function updateDots() {
      g.selectAll("circle")
        .transition()
        .duration(500)
        .attr("fill", d => colorScale(d.category));
    }
  
    // Function to filter dots for selected months
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
            return "#686666";
          }
        })
        .attr("r", d => {
          const date = new Date(d.date);
          const year = date.getFullYear();
          const month = date.getMonth();
  
          if ((year === 2013 && month === 4) || (year === 2016 && (month >= 6 && month <= 9))) {
            return radius * 1.25;
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
  
    // Function to sort dots by category frequency
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
  
      g.selectAll("circle")
        .data(articleDetails, d => d.serial)
        .join("circle")
        .transition()
        .duration(2500)
        .attr("cx", (d) => categoryPositions[d.serial].x)
        .attr("cy", (d) => categoryPositions[d.serial].y)
        .attr("fill", d => colorScale(d.category));
    }
  
    // Function to reset dots to the initial state
    function resetDots() {
      g.selectAll("circle")
        .transition()
        .duration(500)
        .attr("fill", "#686666")
        .attr("r", radius)
        .attr("filter", null);
    }
  });
  