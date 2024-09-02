// Load the JSON data for articles
let articlesData;

// Fetch the articles data once and store it
d3.json("article_details.json")
  .then((data) => {
    articlesData = data;
  })
  .catch((error) => console.error("Error loading articles data:", error)); // Error handling

  function displayNewsHeadlinesForYear(selectedWord, year) {
    const lowerCaseWord = selectedWord.toLowerCase();
    const regex = new RegExp(`\\b${lowerCaseWord}\\b`, "i");
    let filteredArticles = articlesData
      .filter(
        (article) =>
          regex.test(article.content.toLowerCase()) &&
          new Date(article.date).getFullYear() === +year
      );
  
    // Randomize the filtered articles
    filteredArticles = filteredArticles.sort(() => Math.random() - 0.5).slice(0, 3);
  
    const newsContainer = d3.select("#news-container");
    newsContainer.html("");
  
    if (filteredArticles.length === 0) {
      newsContainer
        .append("div")
        .attr("class", "no-results")
        .text("No articles found for the year " + year);
      return;
    }
  
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
        `<span class="news-date">${new Date(
          article.date
        ).getFullYear()}:</span> ${highlightWord(
          article.headline,
          selectedWord
        )}`
      );
  
      const snippet = getSnippet(article.content, selectedWord, 10);
  
      newsItem
        .append("div")
        .attr("class", "news-snippet")
        .html(snippet);
    });
  }
  

// Function to highlight the selected word in the headline
function highlightWord(text, word) {
  const regex = new RegExp(`(${word})`, "gi");
  return text.replace(regex, '<span class="highlight">$1</span>');
}

// Function to get a snippet of text around a word
function getSnippet(text, word, numWords) {
  const lowerCaseText = text.toLowerCase();
  const lowerCaseWord = word.toLowerCase();
  const words = lowerCaseText.split(/\s+/);
  const wordIndex = words.findIndex((w) =>
    new RegExp(`\\b${lowerCaseWord}\\b`).test(w)
  );

  if (wordIndex === -1) return "";

  const start = Math.max(0, wordIndex - numWords);
  const end = Math.min(words.length, wordIndex + numWords + 1);
  const snippetWords = words.slice(start, end);

  return snippetWords
    .join(" ")
    .replace(new RegExp(`(${word})`, "gi"), '<span class="highlight">$1</span>');
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

// Track currently selected word
let selectedWord = null;

// List of all unique words for suggestion
let wordList = [];

// Load the CSV data
d3.csv("top100_content_pub.csv").then((data) => {
  const nestedData = d3.groups(data, (d) => d.Publication);

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
      .attr("fill", (d) => (selectedWord === d.Word ? "orange" : "steelblue"))
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
            selectedWord === dd.Word ? "orange" : "steelblue"
          ); // Revert to selected or default color
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .on("click", function (event, d) {
        selectWord(d.Word);
      });
  });

  function selectWord(word) {
    selectedWord = word;

    // Reset color for all bars
    svg.selectAll("rect").attr("fill", "steelblue");

    // Highlight all bars with the same word
    svg
      .selectAll("rect")
      .filter((dd) => dd.Word === word)
      .attr("fill", "orange");

      d3.csv("top500_content_year.csv").then((fullData) => {
        const wordData = fullData.filter(
          (row) => row.Word.toLowerCase() === word.toLowerCase()
        );
        wordData.sort((a, b) => d3.ascending(+a.Year, +b.Year));
        const newData = wordData.map((row) => [+row.Year, +row.Frequency]);
      
        document.getElementById("container").style.display = "block";
      
        if (Highcharts.charts[0] && Highcharts.charts[0].renderTo === document.getElementById('container')) {
          const chart = Highcharts.charts[0];
          chart.setTitle({
            text: `Frequency of the Word "${word}" Over Time`,
          });
          chart.series[0].setData(newData, true, {
            duration: 1500,
            easing: "easeInOutQuad",
          });
        } else {
            Highcharts.chart("container", {
                chart: {
                  type: "spline",
                  animation: {
                    duration: 1500,
                  },
                  margin: [70, 50, 60, 80],
                  events: {
                    click: function (event) {
                      // Get the clicked position in terms of the x-axis value (year)
                      const xAxis = this.xAxis[0];
                      const selectedYear = Math.round(xAxis.toValue(event.chartX));
              
                      // Check if a word is currently selected
                      if (selectedWord) {
                        // Display news headlines for the currently selected word
                        displayNewsHeadlinesForYear(selectedWord.toLowerCase(), selectedYear);
                      } else {
                        console.log("No word selected.");
                      }
                    },
                  },
                },
                title: {
                  text: `Frequency of the Word "${selectedWord}" Over Time`,
                  align: "center",
                  style: {
                    fontFamily: "IBM Plex Sans, sans-serif",
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
                          // Ensure the current selectedWord is used
                          if (selectedWord) {
                            displayNewsHeadlinesForYear(selectedWord.toLowerCase(), selectedYear);
                          } else {
                            console.log("No word selected.");
                          }
                        },
                      },
                    },
                  },
                },
                tooltip: {
                  formatter: function () {
                    return "Frequency: " + this.y + "<br>Year: " + this.x;
                  },
                },
                series: [
                  {
                    data: newData,
                    showInLegend: false,
                  },
                ],
                exporting: {
                  enabled: false,
                },
                credits: {
                  enabled: false,
                },
              });
              
        }
      
        // Find the year with the highest frequency for the selected word
        const maxFrequencyData = wordData.reduce((max, row) =>
          +row.Frequency > max.Frequency ? row : max,
          { Frequency: 0 }
        );
      
        // Display news headlines and snippets for the year with the highest frequency
        displayNewsHeadlinesForYear(word.toLowerCase(), maxFrequencyData.Year);
      });
      
      
  }

  // Event listener for input changes to show suggestions
  document
    .getElementById("word-search")
    .addEventListener("input", function () {
      showSuggestions(this.value); // Show suggestions as user types
    });

  // Event listener for Enter key to trigger search
  document
    .getElementById("word-search")
    .addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        // Trigger search when Enter is pressed
        const searchTerm = this.value.toLowerCase();
        if (searchTerm) {
          const wordToSelect = wordList.find(
            (word) => word.toLowerCase() === searchTerm
          );
          if (wordToSelect) {
            selectWord(wordToSelect);
          } else {
            alert("Word not found in the chart data.");
          }
        }
      }
    });

// Function to display suggestions based on input
function showSuggestions(input) {
    const suggestionsContainer = document.getElementById("suggestions-container");
    suggestionsContainer.innerHTML = ""; // Clear previous suggestions
  
    if (!input) return; // Exit if input is empty
  
    const inputLowerCase = input.toLowerCase();
    const matchedWords = wordList
      .filter((word) => word.startsWith(inputLowerCase))
      .slice(0, 5); // Limit to top 5 suggestions
  
    if (matchedWords.length === 0) {
      // No matching words found
      const noResultsItem = document.createElement("div");
      noResultsItem.className = "no-results";
      noResultsItem.innerText = "NO RESULTS FOUND";
      suggestionsContainer.appendChild(noResultsItem);
    } else {
      // Display matching words
      matchedWords.forEach((word) => {
        const suggestionItem = document.createElement("div");
        suggestionItem.className = "suggestion-item";
  
        // Highlight matching part in bold
        const regex = new RegExp(`(${inputLowerCase})`, "i");
        const highlightedWord = word.replace(regex, '<strong>$1</strong>');
  
        suggestionItem.innerHTML = highlightedWord;
        suggestionItem.onclick = () => {
          document.getElementById("word-search").value = word;
          suggestionsContainer.innerHTML = ""; // Clear suggestions
          selectWord(word); // Trigger word selection
        };
        suggestionsContainer.appendChild(suggestionItem);
      });
    }
  }
  

  svg
    .selectAll(".logo")
    .data(nestedData)
    .enter()
    .append("image")
    .attr("href", (d) => `logo/${d[1][0].Logo}`)
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
