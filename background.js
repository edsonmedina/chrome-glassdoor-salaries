/* background.js */
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "glassdoorSalaries",
        title: "Search Glassdoor Salaries",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "glassdoorSalaries") {
        try {
            const query = encodeURIComponent(info.selectionText);
            const searchUrl = `https://www.glassdoor.com/Search/results.htm?keyword=${query}`;

            const response = await fetch(searchUrl);
            const data = await response.text();

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }

            // Use scripting API to execute content script on the tab
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: parseGlassdoorHTML,
                args: [data],
            });
        } catch (error) {
            handleError(error.message);
        }
    }
});

// Error handling function
function handleError(message) {
    console.error("Error fetching Glassdoor page:", message);

    chrome.notifications.create('', {
        type: "basic",
        iconUrl: "icon.png", // Ensure this path is correct
        title: "Glassdoor Salaries Extension",
        message: `Error: ${message}`,
    });
}

// Content script function to parse HTML
function parseGlassdoorHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    console.log("HTML: ", doc)

    const resultLink = doc.querySelector('a[data-test="company-tile"]');
    if (resultLink) {
        const overviewURL = "https://www.glassdoor.com/" + resultLink.getAttribute("href");

        const idMatch = overviewURL.match(/E\d+/);
        const nameMatch = overviewURL.match(/Working-at-(.*?)-EI/);

        if (idMatch && nameMatch) {
            const id = idMatch[0];
            const companyName = nameMatch[1];
            const salariesURL = `https://www.glassdoor.com/Salary/${companyName}-Salaries-${id}.htm`;

            window.open(salariesURL, '_blank');
        } else {
            console.log("Failed to extract company details.");
        }
    } else {
        console.log("Salaries link not found. Please try with a different company name.");
    }
}