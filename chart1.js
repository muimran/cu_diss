//  Load the JSON data for articles
let articlesData;

// Fetch the articles data once and store it
d3.json("data/article_details.json")
  .then((data) => {
    articlesData = data;
  })
  .catch((error) => console.error("Error loading articles data:", error)); // Error handling

// Function to display news headlines for a selected word and year
function displayNewsHeadlinesForYear(selectedWord, year) {
  const lowerCaseWord = selectedWord.toLowerCase().trim(); // Convert selected word to lowercase and trim spaces
  const regex = new RegExp(`\\b${lowerCaseWord}\\b`, "i"); // Create a case-insensitive regex to match the word or phrase

  // Ensure articlesData is loaded
  if (!articlesData || articlesData.length === 0) {
    console.error("Articles data is not loaded or empty.");
    return;
  }

  let filteredArticles = articlesData.filter(
    (article) =>
      regex.test(article.content.toLowerCase()) && // Check if the word or phrase exists in article content
      new Date(article.date).getFullYear() === +year // Check if the article's year matches the selected year
  );

  // Debugging: Log the filtered articles count
  console.log(`Filtered articles count: ${filteredArticles.length}`);

  // Randomize the filtered articles
  filteredArticles = filteredArticles.sort(() => Math.random() - 0.5).slice(0, 3); // Select up to 3 random articles

  const newsContainer = d3.select("#news-container"); // Select the container to display news
  newsContainer.html(""); // Clear the news container

  if (filteredArticles.length === 0) { // If no articles are found
    newsContainer
      .append("div")
      .attr("class", "no-results")
      .text("No articles found for the year " + year); // Display a "no results" message
    return;
  }

  // For each filtered article, create a display element
  filteredArticles.forEach((article) => {
    const newsItem = newsContainer
      .append("a")
      .attr("href", article.url)
      .attr("target", "_blank")
      .attr("rel", "noopener noreferrer")
      .attr("class", "news-item")
      .style("text-decoration", "none")
      .style("color", "inherit");

    const newsContent = newsItem.append("div").attr("class", "news-content");

    newsContent.html(
      `<span class="news-date">${new Date(article.date).getFullYear()}:</span> ${highlightWord(
        article.headline,
        selectedWord
      )}` // Highlight the selected word in the headline
    );

    const snippet = getSnippet(article.content, selectedWord, 10); // Get a snippet of the content around the selected word

    newsItem
      .append("div")
      .attr("class", "news-snippet")
      .html(snippet); // Display the snippet with the highlighted word
  });
}

// Function to highlight the selected word or phrase in the headline or snippet
function highlightWord(text, word) {
  const escapedWord = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape regex special characters
  const regex = new RegExp(`(${escapedWord})`, "gi"); // Case-insensitive regex to match the word or phrase
  return text.replace(regex, '<span class="highlight">$1</span>'); // Wrap matched word or phrase in a span for highlighting
}

// Function to get a snippet of text around a word or phrase
function getSnippet(text, word, numWords) {
  const lowerCaseText = text.toLowerCase(); // Convert the article content to lowercase
  const lowerCaseWord = word.toLowerCase(); // Convert the word or phrase to lowercase
  const wordsArray = lowerCaseText.split(/\s+/); // Split the content into words

  // Convert the entire text to a string array split by spaces to handle snippet extraction
  const wordIndex = wordsArray.findIndex((_, index) =>
    wordsArray.slice(index, index + lowerCaseWord.split(/\s+/).length).join(" ") === lowerCaseWord // Find the index of the exact phrase
  );

  if (wordIndex === -1) return "Snippet not available."; // If the phrase is not found, return a default message

  const start = Math.max(0, wordIndex - numWords); // Determine the start index for the snippet
  const end = Math.min(wordsArray.length, wordIndex + lowerCaseWord.split(/\s+/).length + numWords); // Determine the end index for the snippet
  const snippetWords = wordsArray.slice(start, end); // Extract the words for the snippet

  return snippetWords
    .join(" ")
    .replace(new RegExp(`(${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi"), '<span class="highlight">$1</span>'); // Highlight the word or phrase in the snippet
}

// Set dimensions and margins of the D3 graph
const margin = { top: 40, right: 30, bottom: 60, left: 30 },
  width = 1000 - margin.left - margin.right,
  height = 600 - margin.top - margin.bottom;

const svg = d3
  .select("#chart1")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("pointer-events", "none");

// Track currently selected words
let selectedWord = null;
let compareWord = null; // To keep track of the word selected in the compare box

// List of all unique words for suggestion
let wordList = [];

// Load the CSV data
d3.csv("data/top100_content_pub.csv").then((data) => {
  const nestedData = d3.groups(data, (d) => d.Publication);

  // Define the logo paths for each publication
  const logoPaths = {
    "BBC": "logo/bbc_logo.svg",
    "CNN": "logo/cnn_logo.svg",
    "foxnews": "logo/foxnews_logo.svg",
    "telegraph": "logo/telegraph_logo.svg",
    "Guardian": "logo/guardian_logo.svg",
    "New York Times": "logo/nytimes_logo.svg",
    "Overall": "logo/all_outlets.svg"
    // Add more mappings for other publications as needed
  };

  // Populate word list for autocomplete suggestions, removing duplicates
  wordList = Array.from(new Set(data.map((d) => d.Word.toLowerCase())));

  nestedData.forEach((pub) => {
    pub[1].sort((a, b) => d3.descending(+a.Frequency, +b.Frequency));
  });

  const x = d3
    .scaleBand()
    .domain(nestedData.map((d) => d[0]))
    .range([0, width * 0.5])
    .padding(0.2);

  const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

  const barHeight = height / 110;

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(0).tickFormat(""))
    .selectAll("text")
    .remove();

  svg.selectAll(".domain").remove();

  nestedData.forEach((pub) => {
    const pubName = pub[0];
    const words = pub[1];

    svg
      .selectAll(`.bar-${pubName}`)
      .data(words)
      .enter()
      .append("rect")
      .attr("class", `bar-${pubName}`)
      .attr("x", (d) => x(pubName))
      .attr("y", (d, i) => i * (barHeight + 0.6))
      .attr("width", x.bandwidth())
      .attr("height", barHeight)
      .attr("fill", "steelblue") // Set the default fill color for all bars
      .on("mouseover", function (event, d) {
        svg
          .selectAll("rect")
          .filter((dd) => dd.Word === d.Word)
          .attr("fill", "#164369"); // Hover color for all bars with the same word

        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(d.Word.toUpperCase());

        const rightMostColumnX =
          x(nestedData[nestedData.length - 1][0]) + x.bandwidth();
        tooltip
          .style("left", rightMostColumnX + margin.left + 85 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function (event, d) {
        svg
          .selectAll("rect")
          .filter((dd) => dd.Word === d.Word)
          .attr("fill", (dd) =>
            (selectedWord === dd.Word || compareWord === dd.Word) ? (dd.Word === selectedWord ? "orange" : "green") : "steelblue"
          ); // Revert to selected or default color
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .on("click", function (event, d) {
        handleWordSelection(d.Word);
      });
  });

  // Function to handle word selection, chart update, and news display
  function handleWordSelection(word) {
    // Set selectedWord to the word
    selectedWord = word; // Update selectedWord instead of nullifying it
    compareWord = null;  // Clear compareWord for simplicity

    // Clear the search boxes
    document.getElementById("word-search").value = ""; // Clear main search box
    document.getElementById("compare-search").value = ""; // Clear compare search box

    // Refresh suggestions after clearing search boxes
    showSuggestions("", document.getElementById("suggestions-container"));
    showSuggestions("", document.getElementById("compare-suggestions-container"));

    // Reset all bars to the default color
    svg.selectAll("rect").attr("fill", "steelblue");

    // Highlight only the selected word's bars
    svg
      .selectAll("rect")
      .filter((d) => d.Word === word)
      .attr("fill", "orange");

    // Clear all lines in Highcharts
    if (Highcharts.charts.length > 0 && Highcharts.charts[0].renderTo === document.getElementById('container')) {
      const chart = Highcharts.charts[0];
      while (chart.series.length > 0) {
        chart.series[0].remove(false);
      }

      // Update the chart title dynamically
      chart.setTitle({ text: `Frequency of the Word "${selectedWord}" Over Time` });

      // Load data for the clicked word and add it to Highcharts
      d3.csv("data/top1000_content_year.csv").then((fullData) => {
        const wordData = fullData.filter(
          (row) => row.Word.toLowerCase() === word.toLowerCase()
        );
        wordData.sort((a, b) => d3.ascending(+a.Year, +b.Year));
        const newData = wordData.map((row) => [+row.Year, +row.Frequency]);

        chart.addSeries({
          name: `Word "${word}"`,
          data: newData,
          color: "orange", // Set color for the selected word's line
          animation: {
            duration: 1500,
          },
        });

        // Find the year with the highest frequency for the selected word
        const maxFrequencyData = wordData.reduce((max, row) =>
          +row.Frequency > max.Frequency ? row : max,
          { Frequency: 0 }
        );

        // Display news headlines and snippets for the year with the highest frequency
        displayNewsHeadlinesForYear(word.toLowerCase(), maxFrequencyData.Year);
      });
    }
  }

  // Function to initialize the chart with a default word
  function initializeChart(defaultWord) {
    d3.csv("data/top1000_content_year.csv").then((fullData) => {
      const wordData = fullData.filter(
        (row) => row.Word.toLowerCase() === defaultWord.toLowerCase()
      );
      wordData.sort((a, b) => d3.ascending(+a.Year, +b.Year));
      const initialData = wordData.map((row) => [+row.Year, +row.Frequency]);

      Highcharts.chart("container", {
        chart: {
          type: "spline",
          animation: {
            duration: 1500,
          },
          margin: [70, 50, 60, 80],
          events: {
            click: function (event) {
              const xAxis = this.xAxis[0];
              const yAxis = this.yAxis[0];
              const clickX = xAxis.toValue(event.chartX);
              const clickY = yAxis.toValue(event.chartY);
      
              let closestPoint = null;
              let minDistance = Infinity;
      
              // Iterate through all series to find the closest point
              this.series.forEach((series) => {
                series.data.forEach((point) => {
                  const distance = Math.sqrt(
                    Math.pow(point.plotX - event.chartX + this.plotLeft, 2) +
                    Math.pow(point.plotY - event.chartY + this.plotTop, 2)
                  );
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                  }
                });
              });
      
              if (closestPoint) {
                const selectedYear = closestPoint.x;
                const word = closestPoint.series.name.replace(/Word\s"(.+?)"/, "$1").replace(/\s*\(compare\)/i, '').toLowerCase();
      
                // Debugging: Log selected word and year
                console.log(`Selected word: ${word}, Selected year: ${selectedYear}`);
      
                // Display news headlines for the word and year closest to the click
                displayNewsHeadlinesForYear(word, selectedYear);
              }
            },
          },
        },
        title: {
          text: `Frequency of the Word "${defaultWord}" Over Time`,
          align: "center",
          style: {
            fontFamily: "IBM Plex Sans, sans-serif",
            fontSize: "16px",
            fontWeight: "bold",
            color: "#333333",
          },
        },
        subtitle: {
          text: 'Normalized for 100,000 words',
          align: 'center',
          style: {
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: "12px",
              color: "#666666",
          },
      },
        xAxis: {
          type: "linear",
          min: 2012,
          max: 2024,
          tickPositions: [2012, 2018, 2024],
          title: {
            text: null,
          },
          lineWidth: 3,
          minorTickLength: 0,
          tickLength: 0,
          labels: {
            formatter: function () {
              return this.value;
            },
          },
          gridLineWidth: 0,
        },
        yAxis: {
          title: {
            text: null,
          },
          gridLineWidth: 0,
          lineWidth: 0,
          labels: {
            enabled: true,
          },
        },
        plotOptions: {
          series: {
            marker: {
              enabled: false,
            },
            lineWidth: 2,
            animation: {
              duration: 1500,
              easing: "easeInOutQuad",
            },
            label: {
              enabled: false,
            },
            point: {
              events: {
                click: function () {
                  const selectedYear = this.x; // Get the year of the clicked point
                  const word = this.series.name.replace(/Word\s"(.+?)"/, "$1").replace(/\s*\(compare\)/i, '').toLowerCase();
      
                  // Debugging: Log selected word and year
                  console.log(`Point clicked. Word: ${word}, Year: ${selectedYear}`);
      
                  // Display news headlines for the word associated with the clicked point
                  displayNewsHeadlinesForYear(word, selectedYear);
                },
              },
            },
          },
        },
        tooltip: {
            useHTML: true, // Enable HTML in tooltips
            formatter: function () {
              // Remove "(Compare)" from the series name for tooltip display
              const word = this.series.name.replace(/Word\s"(.+?)"/, "$1").replace(/\s*\(Compare\)/i, '').trim();
              return `<span style="font-size: 12px; font-weight: bold;">${word}</span>`;
            },
            positioner: function (labelWidth, labelHeight, point) {
              const chart = this.chart;
              const x = point.plotX + chart.plotLeft + 10; // Initial position, 10 pixels to the right
              const y = point.plotY + chart.plotTop - (labelHeight / 2); // Centered vertically
          
              // Check if the tooltip would overflow on the right side
              const overflowRight = x + labelWidth > chart.chartWidth;
              
              // Adjust the x position if it would overflow
              const adjustedX = overflowRight ? x - labelWidth - 20 : x;
          
              return {
                x: adjustedX,
                y: y,
              };
            },
            backgroundColor: 'rgba(255, 255, 255, 0.85)', // Semi-transparent background
            borderWidth: 0,
            shadow: false,
          }
          ,
      });
      

      // Call handleWordSelection with the default word to trigger the initial selection
      handleWordSelection(defaultWord);
    });
  }

  // Initialize the chart with the default word "people"
  initializeChart("people");

  function selectWord(word, isCompare = false) {
    if (isCompare) {
      compareWord = word.replace(/\s*\(compare\)/i, ''); // Clean the word for comparison
    } else {
      selectedWord = word;
    }

    // Debugging: Log the selected words
    console.log(`Selected Word: ${selectedWord}, Compare Word: ${compareWord}`);

    // Reset all bars to the default color
    svg.selectAll("rect").attr("fill", "steelblue");

    // Highlight only the selected word's bars
    svg
      .selectAll("rect")
      .filter((d) => d.Word === selectedWord)
      .attr("fill", "orange");

    // Highlight only the compared word's bars
    svg
      .selectAll("rect")
      .filter((d) => d.Word === compareWord)
      .attr("fill", "green");

    // Load data and update the Highcharts graph
    d3.csv("top1000_content_year.csv").then((fullData) => {
      const wordData = fullData.filter(
        (row) => row.Word.toLowerCase() === word.toLowerCase()
      );
      wordData.sort((a, b) => d3.ascending(+a.Year, +b.Year));
      const newData = wordData.map((row) => [+row.Year, +row.Frequency]);

      let chart;
      if (Highcharts.charts.length > 0 && Highcharts.charts[0].renderTo === document.getElementById('container')) {
        chart = Highcharts.charts[0];

        // Clear the previous line for the specific search box
        const seriesIndexToRemove = chart.series.findIndex(
          (series) => (isCompare ? series.name.includes('(Compare)') : !series.name.includes('(Compare)'))
        );
        if (seriesIndexToRemove !== -1) {
          chart.series[seriesIndexToRemove].remove(false);
        }

        // Update the chart title dynamically
        chart.setTitle({ text: `Frequency of the Words "${selectedWord || ''}"${compareWord ? ' and "' + compareWord + '"' : ''} Over Time` });

      } else {
        chart = Highcharts.chart("container", {
          chart: {
            type: "spline",
            animation: {
              duration: 1500,
            },
            legend: {
                enabled: false
              },
              credits: {
                enabled: false // Remove Highcharts watermark
              },
              
            margin: [70, 50, 60, 80],
            events: {
              click: function (event) {
                const xAxis = this.xAxis[0];
                const yAxis = this.yAxis[0];
                const clickX = xAxis.toValue(event.chartX);
                const clickY = yAxis.toValue(event.chartY);

                let closestPoint = null;
                let minDistance = Infinity;

                // Iterate through all series to find the closest point
                this.series.forEach((series) => {
                  series.data.forEach((point) => {
                    const distance = Math.sqrt(
                      Math.pow(point.plotX - event.chartX + this.plotLeft, 2) +
                      Math.pow(point.plotY - event.chartY + this.plotTop, 2)
                    );
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestPoint = point;
                    }
                  });
                });

                if (closestPoint) {
                  const selectedYear = closestPoint.x;
                  const word = closestPoint.series.name.replace(/Word\s"(.+?)"/, "$1").replace(/\s*\(compare\)/i, '').toLowerCase();

                  // Debugging: Log selected word and year
                  console.log(`Selected word: ${word}, Selected year: ${selectedYear}`);

                  // Display news headlines for the word and year closest to the click
                  displayNewsHeadlinesForYear(word, selectedYear);
                }
              },
            },
          },
          title: {
            text: `Frequency of the Words "${selectedWord || ''}"${compareWord ? ' and "' + compareWord + '"' : ''} Over Time`,
            align: "center",
            style: {
              fontFamily: "IBM Plex Sans', sans-serif",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#333333",
            },
          },
          xAxis: {
            type: "linear",
            min: 2012,
            max: 2024,
            tickPositions: [2012, 2018, 2024],
            title: {
              text: null,
            },
            lineWidth: 3,
            minorTickLength: 0,
            tickLength: 0,
            labels: {
              formatter: function () {
                return this.value;
              },
            },
            gridLineWidth: 0,
          },
          yAxis: {
            title: {
              text: null,
            },
            gridLineWidth: 0,
            lineWidth: 0,
            labels: {
              enabled: true,
            },
          },
          plotOptions: {
            series: {
              marker: {
                enabled: false,
              },
              lineWidth: 2,
              animation: {
                duration: 1500,
                easing: "easeInOutQuad",
              },
              label: {
                enabled: false,
              },
              point: {
                events: {
                  click: function () {
                    const selectedYear = this.x; // Get the year of the clicked point
                    const word = this.series.name.replace(/Word\s"(.+?)"/, "$1").replace(/\s*\(compare\)/i, '').toLowerCase();

                    // Debugging: Log selected word and year
                    console.log(`Point clicked. Word: ${word}, Year: ${selectedYear}`);

                    // Display news headlines for the word associated with the clicked point
                    displayNewsHeadlinesForYear(word, selectedYear);
                  },
                },
              },
            },
          },
          tooltip: {
            useHTML: true, // Enable HTML in tooltips
            formatter: function () {
                // Remove "(Compare)" from the series name for tooltip display
                const word = this.series.name.replace(/Word\s"(.+?)"/, "$1").replace(/\s*\(Compare\)/i, '').trim();
                return `<span style="font-size: 12px; font-weight: bold;">${word}</span>`;
            },
            positioner: function (labelWidth, labelHeight, point) {
                // Position tooltip a few pixels to the right of the frequency line
                return {
                    x: point.plotX + this.chart.plotLeft + 10, // 10 pixels to the right
                    y: point.plotY + this.chart.plotTop - (labelHeight / 2), // Centered vertically
                };
            },
            backgroundColor: 'rgba(255, 255, 255, 0.85)', // Semi-transparent background
            borderWidth: 0,
            shadow: false,
        },
        
        });
      }

      const seriesName = isCompare ? `Word "${word}" (Compare)` : `Word "${word}"`;

      // Add new series to the chart
      chart.addSeries({
        name: seriesName,
        data: newData,
        color: isCompare ? "green" : "orange", // Different color for the compare line
        animation: {
          duration: 1500,
        },
      });

      // Find the year with the highest frequency for the selected word
      const maxFrequencyData = wordData.reduce((max, row) =>
        +row.Frequency > max.Frequency ? row : max,
        { Frequency: 0 }
      );

      // Display news headlines and snippets for the year with the highest frequency
      displayNewsHeadlinesForYear(word.toLowerCase(), maxFrequencyData.Year);
    });
  }

  // Initialize search functionality for both search boxes
  function initializeSearch(inputId, suggestionsContainerId) {
    const inputElement = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsContainerId);

    // Event listener for input changes to show suggestions
    inputElement.addEventListener("input", function () {
      showSuggestions(this.value, suggestionsContainer); // Show suggestions as user types
    });

    // Event listener for Enter key to trigger search
    inputElement.addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        // Trigger search when Enter is pressed
        const searchTerm = this.value.toLowerCase();
        if (searchTerm) {
          if (inputId === "compare-search" && searchTerm === selectedWord) {
            alert("The word is already selected in the first search box.");
            return;
          }
          const wordToSelect = wordList.find(
            (word) => word.toLowerCase() === searchTerm
          );
          if (wordToSelect) {
            selectWord(wordToSelect, inputId === "compare-search");
            this.value = ""; // Clear the input after selection
          } else {
            alert("Word not found in the chart data.");
          }
        }
      }
    });

    // Event listener to handle word deletion (e.g., by pressing backspace or delete)
    inputElement.addEventListener("input", function () {
      const currentValue = this.value.trim().toLowerCase();
      if (currentValue === "" && (inputId === "word-search" ? selectedWord : compareWord)) {
        if (inputId === "word-search") {
          selectedWord = null;
        } else {
          compareWord = null;
        }
        showSuggestions("", suggestionsContainer); // Refresh the suggestions when a word is deleted
      }
    });
  }

  // Initialize search for both search boxes
  initializeSearch("word-search", "suggestions-container"); // Original search box
  initializeSearch("compare-search", "compare-suggestions-container"); // Compare box

  // Function to show suggestions in the suggestion container
  function showSuggestions(input, container) {
    container.innerHTML = ""; // Clear previous suggestions
  
    if (!input) return; // Exit if input is empty
  
    const inputLowerCase = input.toLowerCase();
    const matchedWords = wordList
      .filter(
        (word) =>
          word.includes(inputLowerCase) && // Use includes() to match anywhere in the word
          word !== (selectedWord ? selectedWord.toLowerCase() : "") &&
          word !== (compareWord ? compareWord.toLowerCase() : "")
      )
      .slice(0, 5); // Limit to top 5 suggestions
  
    if (matchedWords.length === 0) {
      // No matching words found
      const noResultsItem = document.createElement("div");
      noResultsItem.className = "no-results";
      noResultsItem.innerText = "NO RESULTS FOUND";
      container.appendChild(noResultsItem);
    } else {
      // Display matching words
      matchedWords.forEach((word) => {
        const suggestionItem = document.createElement("div");
        suggestionItem.className = "suggestion-item";
  
        // Highlight matching part in bold
        const regex = new RegExp(`(${inputLowerCase})`, "i");
        const highlightedWord = word.replace(regex, "<strong>$1</strong>");
  
        suggestionItem.innerHTML = highlightedWord;
        suggestionItem.onclick = () => {
          document.getElementById(container.id === "suggestions-container" ? "word-search" : "compare-search").value = word; // Update input field
          container.innerHTML = ""; // Clear suggestions
          selectWord(word, container.id === "compare-suggestions-container"); // Trigger word selection
        };
        container.appendChild(suggestionItem);
      });
    }
  }
  

  // Additional logic for your D3 chart (logos, observers, etc.)

  // Append logos to the chart below the bars
  svg
    .selectAll(".logo")
    .data(nestedData)
    .enter()
    .append("image")
    .attr("href", (d) => logoPaths[d[0]]) // Use the publication name to get the logo path
    .attr("x", (d) => x(d[0]) + (x.bandwidth() - 50) / 2)
    .attr("y", height + 20)
    .attr("width", 50)
    .attr("height", 50);

  // Create the Intersection Observer to reload every time the container appears on screen
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Trigger click on the first bar in the first column to initialize or reload the chart
          const firstBar = svg.select(".bar-" + nestedData[0][0]).node();
          if (firstBar) firstBar.dispatchEvent(new Event("click"));
        }
      });
    },
    { threshold: 0.1 }
  ); // Adjust threshold as needed

  // Observe the container element
  const container = document.getElementById("container");
  observer.observe(container);
});

document.getElementById("container").style.display = "block";
