// ============================================================
// DATA: These two lists store everything the user enters.
// "items" holds each receipt item (name + price).
// "people" holds each person's name.
// ============================================================
let items = [];
let people = [];
let ocrResults = []; // holds parsed items from receipt scan

// ============================================================
// RECEIPT UPLOAD & OCR
// ============================================================

// Listen for file selection on the receipt input
document.getElementById("receipt-input").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Show the image preview
    const preview = document.getElementById("receipt-preview");
    const img = document.getElementById("receipt-image");
    const uploadArea = document.getElementById("upload-area");

    const reader = new FileReader();
    reader.onload = function (e) {
        img.src = e.target.result;
        preview.style.display = "block";
        uploadArea.style.display = "none";

        // Start OCR
        runOCR(e.target.result);
    };
    reader.readAsDataURL(file);
});

// Clear the uploaded receipt and reset
function clearReceipt() {
    document.getElementById("receipt-preview").style.display = "none";
    document.getElementById("upload-area").style.display = "";
    document.getElementById("ocr-status").style.display = "none";
    document.getElementById("ocr-results").style.display = "none";
    document.getElementById("receipt-input").value = "";
    ocrResults = [];
}

// Run Tesseract.js OCR on the image
function runOCR(imageData) {
    const statusEl = document.getElementById("ocr-status");
    const statusText = document.getElementById("ocr-status-text");
    const resultsEl = document.getElementById("ocr-results");

    statusEl.style.display = "flex";
    resultsEl.style.display = "none";
    statusText.textContent = "Reading receipt...";

    Tesseract.recognize(imageData, "eng", {
        logger: function (info) {
            if (info.status === "recognizing text") {
                const pct = Math.round(info.progress * 100);
                statusText.textContent = "Reading receipt... " + pct + "%";
            }
        }
    }).then(function (result) {
        statusEl.style.display = "none";
        var parsedItems = parseReceiptText(result.data.text);

        if (parsedItems.length === 0) {
            statusEl.style.display = "flex";
            statusText.textContent = "No items found. Try a clearer photo or enter items manually.";
            document.querySelector(".ocr-spinner").style.display = "none";
            return;
        }

        ocrResults = parsedItems;
        renderOcrResults();
    }).catch(function (err) {
        statusEl.style.display = "flex";
        statusText.textContent = "Error reading receipt. Please try again.";
        document.querySelector(".ocr-spinner").style.display = "none";
    });
}

// Parse the raw OCR text to extract item names and prices
function parseReceiptText(text) {
    var foundItems = [];
    var lines = text.split("\n");

    // Words that indicate non-item lines (totals, tax, etc.)
    var skipWords = [
        "subtotal", "sub total", "total", "tax", "tip", "gratuity",
        "balance", "change", "cash", "credit", "debit", "visa",
        "mastercard", "amex", "payment", "amount due", "thank you",
        "welcome", "guest", "server", "table", "order", "check",
        "date", "receipt"
    ];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        // Look for a price pattern: digits with decimal (e.g. 12.99, $12.99)
        var priceMatch = line.match(/\$?\s*(\d{1,6}\.\d{2})\s*$/);
        if (!priceMatch) continue;

        var price = parseFloat(priceMatch[1]);

        // Skip prices that are zero or unreasonably high
        if (price <= 0 || price > 9999) continue;

        // Get the item name: everything before the price
        var name = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();

        // Clean up common OCR artifacts
        name = name.replace(/^[\d]+[\s.)\-x]+/, ""); // remove leading numbers like "1. " or "1x "
        name = name.replace(/[^a-zA-Z0-9\s&'/\-().]+/g, ""); // remove stray symbols
        name = name.trim();

        if (!name || name.length < 2) continue;

        // Skip lines that look like totals/tax/etc
        var lowerName = name.toLowerCase();
        var shouldSkip = false;
        for (var j = 0; j < skipWords.length; j++) {
            if (lowerName.indexOf(skipWords[j]) !== -1) {
                shouldSkip = true;
                break;
            }
        }
        if (shouldSkip) continue;

        foundItems.push({ name: name, price: price });
    }

    return foundItems;
}

// Show the parsed OCR items with checkboxes so the user can pick which to add
function renderOcrResults() {
    var container = document.getElementById("ocr-items-list");
    var resultsEl = document.getElementById("ocr-results");
    resultsEl.style.display = "block";

    var html = "";
    for (var i = 0; i < ocrResults.length; i++) {
        html += '<div class="ocr-item-row">';
        html += '<input type="checkbox" id="ocr-item-' + i + '" checked>';
        html += '<span class="ocr-item-name">' + escapeHtml(ocrResults[i].name) + '</span>';
        html += '<span class="ocr-item-price">$' + ocrResults[i].price.toFixed(2) + '</span>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// Add the checked OCR items to the main items list
function addSelectedOcrItems() {
    var addedCount = 0;
    for (var i = 0; i < ocrResults.length; i++) {
        var checkbox = document.getElementById("ocr-item-" + i);
        if (checkbox && checkbox.checked) {
            items.push({
                id: Date.now() + i, // offset to ensure unique IDs
                name: ocrResults[i].name,
                price: ocrResults[i].price
            });
            addedCount++;
        }
    }

    if (addedCount === 0) {
        alert("No items selected. Check at least one item to add.");
        return;
    }

    // Refresh the items table and assignments
    renderItems();
    renderAssignments();

    // Hide OCR results and show a success message
    document.getElementById("ocr-results").style.display = "none";
    var statusEl = document.getElementById("ocr-status");
    var statusText = document.getElementById("ocr-status-text");
    statusEl.style.display = "flex";
    statusEl.style.backgroundColor = "#E8F5E9";
    statusEl.style.color = "#2E7D32";
    document.querySelector(".ocr-spinner").style.display = "none";
    statusText.textContent = addedCount + " item" + (addedCount > 1 ? "s" : "") + " added to your bill!";

    // Scroll down to the items section
    document.getElementById("items-table").scrollIntoView({ behavior: "smooth", block: "center" });
}

// ============================================================
// SECTION 1: ADDING AND REMOVING RECEIPT ITEMS
// ============================================================

// This function runs when the user clicks "Add Item"
function addItem() {
    // Grab what the user typed into the input boxes
    const nameInput = document.getElementById("item-name");
    const priceInput = document.getElementById("item-price");

    const name = nameInput.value.trim();       // .trim() removes extra spaces
    const price = parseFloat(priceInput.value); // parseFloat turns text into a number

    // If the name is empty or price is not a valid number, stop here
    if (!name) {
        alert("Please enter an item name.");
        return;
    }
    if (isNaN(price) || price < 0) {
        alert("Please enter a valid price.");
        return;
    }

    // Add this item to our list, with a unique ID so we can find it later
    items.push({
        id: Date.now(),  // uses the current time as a unique ID
        name: name,
        price: price
    });

    // Clear the input boxes so the user can type the next item
    nameInput.value = "";
    priceInput.value = "";
    nameInput.focus(); // puts the cursor back in the name box

    // Refresh what's shown on the page
    renderItems();
    renderAssignments();
}

// This function removes an item when the user clicks its "Remove" button
function removeItem(id) {
    items = items.filter(function (item) {
        return item.id !== id; // keep every item EXCEPT the one being removed
    });
    renderItems();
    renderAssignments();
}

// This function redraws the items table on the page
function renderItems() {
    const tbody = document.getElementById("items-body");
    const subtotalSpan = document.getElementById("subtotal");

    // If there are no items, show a message
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-message">No items added yet.</td></tr>';
        subtotalSpan.textContent = "0.00";
        return;
    }

    // Build the table rows, one for each item
    let html = "";
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        subtotal += item.price;
        html += '<tr>';
        html += '<td>' + escapeHtml(item.name) + '</td>';
        html += '<td class="price">$' + item.price.toFixed(2) + '</td>';
        html += '<td><button class="remove-btn" onclick="removeItem(' + item.id + ')">Remove</button></td>';
        html += '</tr>';
    }

    tbody.innerHTML = html;
    subtotalSpan.textContent = subtotal.toFixed(2);

    // Animate the last (newest) row
    const rows = tbody.querySelectorAll("tr");
    if (rows.length > 0) {
        rows[rows.length - 1].classList.add("animate-in");
    }
}

// ============================================================
// SECTION 2: ADDING AND REMOVING PEOPLE
// ============================================================

// This function runs when the user clicks "Add Person"
function addPerson() {
    const nameInput = document.getElementById("person-name");
    const name = nameInput.value.trim();

    if (!name) {
        alert("Please enter a person's name.");
        return;
    }

    // Check if this name is already in the list
    if (people.includes(name)) {
        alert(name + " is already in the list.");
        return;
    }

    people.push(name);

    nameInput.value = "";
    nameInput.focus();

    renderPeople();
    renderAssignments();
}

// This function removes a person when the user clicks the X next to their name
function removePerson(name) {
    people = people.filter(function (p) {
        return p !== name;
    });
    renderPeople();
    renderAssignments();
}

// This function redraws the people tags on the page
// The newest person gets a pop-in animation with a waving hand
function renderPeople() {
    const container = document.getElementById("people-list");

    if (people.length === 0) {
        container.innerHTML = '<p class="empty-message">No people added yet.</p>';
        return;
    }

    let html = "";
    for (let i = 0; i < people.length; i++) {
        const isNewest = (i === people.length - 1);
        html += '<span class="person-tag' + (isNewest ? ' animate-in' : '') + '">';
        if (isNewest) {
            html += '<span class="wave-emoji">&#x1F44B;</span> ';
        }
        html += escapeHtml(people[i]);
        html += '<button class="remove-person" onclick="removePerson(\'' + escapeJs(people[i]) + '\')">&times;</button>';
        html += '</span>';
    }
    container.innerHTML = html;
}

// ============================================================
// SECTION 3: ASSIGNING ITEMS TO PEOPLE
// ============================================================

// This function builds the assignment area: for each item, it shows
// a checkbox for each person. Checking a box means that person had
// (or shared) that item.
function renderAssignments() {
    const container = document.getElementById("assignments");

    if (items.length === 0 || people.length === 0) {
        container.innerHTML = '<p class="empty-message">Add items and people first to assign them.</p>';
        return;
    }

    let html = "";
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        html += '<div class="assignment-card">';
        html += '<div class="item-header">' + escapeHtml(item.name) + ' <span>($' + item.price.toFixed(2) + ')</span></div>';
        html += '<div class="checkbox-group">';

        for (let j = 0; j < people.length; j++) {
            const person = people[j];
            // Each checkbox has a unique ID so we can read its value later
            const checkboxId = "assign-" + item.id + "-" + j;
            html += '<label>';
            html += '<input type="checkbox" id="' + checkboxId + '" data-item-id="' + item.id + '" data-person="' + escapeHtml(person) + '">';
            html += ' ' + escapeHtml(person);
            html += '</label>';
        }

        html += '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
    attachSparkleListeners();
}

// ============================================================
// SPARKLE EFFECT: stars burst out when a checkbox is checked
// ============================================================

function attachSparkleListeners() {
    const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener("change", function () {
            if (this.checked) {
                spawnSparkles(this);
                // Add a brief glow to the parent card
                const card = this.closest(".assignment-card");
                if (card) {
                    card.classList.remove("glow");
                    void card.offsetWidth; // force reflow to restart animation
                    card.classList.add("glow");
                }
            }
        });
    }
}

function spawnSparkles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 + window.scrollX;
    const centerY = rect.top + rect.height / 2 + window.scrollY;
    const stars = ["\u2B50", "\u2728", "\u26A1", "\u2605"];

    for (let i = 0; i < 6; i++) {
        const star = document.createElement("span");
        star.className = "sparkle-star";
        star.textContent = stars[Math.floor(Math.random() * stars.length)];

        // Random direction for each star
        const angle = (Math.PI * 2 * i) / 6;
        const distance = 18 + Math.random() * 16;
        star.style.setProperty("--sx", Math.cos(angle) * distance + "px");
        star.style.setProperty("--sy", Math.sin(angle) * distance + "px");
        star.style.left = centerX + "px";
        star.style.top = centerY + "px";
        star.style.position = "absolute";

        document.body.appendChild(star);

        // Clean up after animation
        setTimeout(function () {
            star.remove();
        }, 650);
    }
}

// ============================================================
// SECTION 4 & 5: CALCULATE THE FINAL SPLIT
// ============================================================

// This is the main calculation. It figures out what each person owes.
function calculate() {
    // Make sure we have data to work with
    if (items.length === 0) {
        alert("Please add at least one item.");
        return;
    }
    if (people.length === 0) {
        alert("Please add at least one person.");
        return;
    }

    // Get tax and tip amounts
    const tax = parseFloat(document.getElementById("tax-amount").value) || 0;
    const tip = parseFloat(document.getElementById("tip-amount").value) || 0;

    // Start each person's food total at $0
    // We use an object (like a dictionary) to track each person's subtotal
    const personSubtotals = {};
    const personItemsList = {};
    for (let i = 0; i < people.length; i++) {
        personSubtotals[people[i]] = 0;
        personItemsList[people[i]] = [];
    }

    // Calculate the overall food subtotal (before tax/tip)
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
        subtotal += items[i].price;
    }

    // Go through each item and divide its cost among the checked people
    let atLeastOneAssignment = false;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Find all checkboxes for this item that are checked
        const checkedPeople = [];
        const checkboxes = document.querySelectorAll('input[data-item-id="' + item.id + '"]');
        for (let j = 0; j < checkboxes.length; j++) {
            if (checkboxes[j].checked) {
                checkedPeople.push(checkboxes[j].getAttribute("data-person"));
            }
        }

        // If nobody is checked for this item, skip it
        if (checkedPeople.length === 0) {
            continue;
        }

        atLeastOneAssignment = true;

        // Split the item price evenly among the checked people
        const splitPrice = item.price / checkedPeople.length;
        for (let k = 0; k < checkedPeople.length; k++) {
            const person = checkedPeople[k];
            personSubtotals[person] += splitPrice;

            // Track which items each person is paying for (for the summary)
            if (checkedPeople.length > 1) {
                personItemsList[person].push(
                    item.name + " (split " + checkedPeople.length + " ways: $" + splitPrice.toFixed(2) + ")"
                );
            } else {
                personItemsList[person].push(
                    item.name + " ($" + item.price.toFixed(2) + ")"
                );
            }
        }
    }

    if (!atLeastOneAssignment) {
        alert("Please assign at least one item to a person using the checkboxes in Section 3.");
        return;
    }

    // Now divide tax and tip PROPORTIONALLY.
    // If Alice's food cost 60% of the subtotal, she pays 60% of the tax and tip.
    const assignedSubtotal = Object.values(personSubtotals).reduce(function (sum, val) {
        return sum + val;
    }, 0);

    const summaryContainer = document.getElementById("summary");
    let grandTotal = 0;
    let html = "";

    for (let i = 0; i < people.length; i++) {
        const person = people[i];
        const foodCost = personSubtotals[person];

        // This person's share as a fraction of the total assigned food
        const proportion = assignedSubtotal > 0 ? foodCost / assignedSubtotal : 0;

        const personTax = tax * proportion;
        const personTip = tip * proportion;
        const personTotal = foodCost + personTax + personTip;

        grandTotal += personTotal;

        html += '<div class="person-summary">';
        html += '<div class="person-name">' + escapeHtml(person) + '</div>';
        html += '<div class="person-items">' + escapeHtml(personItemsList[person].join(", ") || "No items assigned") + '</div>';
        html += '<div class="person-items">';
        html += 'Food: $' + foodCost.toFixed(2);
        html += ' + Tax: $' + personTax.toFixed(2);
        html += ' + Tip: $' + personTip.toFixed(2);
        html += '</div>';
        html += '<div class="person-total">Owes: $' + personTotal.toFixed(2) + '</div>';
        html += '</div>';
    }

    summaryContainer.innerHTML = html;
    document.getElementById("grand-total").textContent = grandTotal.toFixed(2);

    // Stagger the slide-in animation for each person's summary card
    const summaryCards = summaryContainer.querySelectorAll(".person-summary");
    for (let i = 0; i < summaryCards.length; i++) {
        summaryCards[i].classList.add("animate-in");
        summaryCards[i].style.animationDelay = (i * 0.12) + "s";
    }

    // Launch confetti celebration!
    launchConfetti(summaryContainer);
}

// ============================================================
// CONFETTI CELEBRATION
// ============================================================

function launchConfetti(container) {
    const rect = container.getBoundingClientRect();
    const colors = ["#E8461E", "#FF8C42", "#FFD166", "#06D6A0", "#118AB2", "#EF476F"];

    for (let i = 0; i < 40; i++) {
        const particle = document.createElement("div");
        particle.className = "confetti-particle";

        // Random position across the top of the summary area
        const startX = rect.left + Math.random() * rect.width + window.scrollX;
        const startY = rect.top + window.scrollY - 10;
        particle.style.left = startX + "px";
        particle.style.top = startY + "px";
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
        particle.style.setProperty("--duration", (0.6 + Math.random() * 0.8) + "s");

        // Slight horizontal drift
        particle.style.marginLeft = (Math.random() * 40 - 20) + "px";

        document.body.appendChild(particle);

        setTimeout(function () {
            particle.remove();
        }, 1500);
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// This prevents users from injecting HTML code through item names
// (a basic security measure)
function escapeHtml(text) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// This escapes single quotes in strings so they work inside onclick handlers
function escapeJs(text) {
    return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// ============================================================
// ALLOW PRESSING "ENTER" TO ADD ITEMS AND PEOPLE
// ============================================================

// When the user presses Enter in the item price box, add the item
document.getElementById("item-price").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addItem();
    }
});

// When the user presses Enter in the item name box, move to price box
document.getElementById("item-name").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        document.getElementById("item-price").focus();
    }
});

// When the user presses Enter in the person name box, add the person
document.getElementById("person-name").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addPerson();
    }
});

// ============================================================
// INITIALIZE: Show empty states when the page first loads
// ============================================================
renderItems();
renderPeople();
renderAssignments();
