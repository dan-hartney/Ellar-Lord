// ============================================================
// DATA: These two lists store everything the user enters.
// "items" holds each receipt item (name + price).
// "people" holds each person's name.
// ============================================================
let items = [];
let people = [];
let ocrResults = []; // holds parsed items from receipt scan
let assignments = {}; // itemId -> [person1, person2, ...] for drag-and-drop
let selectedItemId = null; // currently tapped item for tap-to-assign
let dragItemId = null; // item being dragged

// ============================================================
// RECEIPT UPLOAD & OCR
// ============================================================

// Make the upload area also work via click, but avoid double-triggering
// on mobile where the invisible file input already catches the tap.
document.getElementById("upload-area").addEventListener("click", function (e) {
    if (e.target.closest("#receipt-input")) return; // already handled natively
    document.getElementById("receipt-input").click();
});

// Listen for file selection on the receipt input
document.getElementById("receipt-input").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    // Show loading immediately so the user knows something is happening
    var statusEl = document.getElementById("ocr-status");
    var statusText = document.getElementById("ocr-status-text");
    var spinner = document.querySelector(".ocr-spinner");
    statusEl.style.display = "flex";
    statusEl.style.backgroundColor = "";
    statusEl.style.color = "";
    spinner.style.display = "";
    statusText.textContent = "Loading image...";

    // Show the image preview
    var preview = document.getElementById("receipt-preview");
    var img = document.getElementById("receipt-image");
    var uploadArea = document.getElementById("upload-area");

    var reader = new FileReader();
    reader.onload = function (e) {
        img.src = e.target.result;
        preview.style.display = "block";
        uploadArea.style.display = "none";

        // Check that Tesseract loaded
        if (typeof Tesseract === "undefined") {
            statusText.textContent = "OCR library failed to load. Check your internet connection and reload.";
            spinner.style.display = "none";
            return;
        }

        // Start OCR
        runOCR(e.target.result);
    };
    reader.onerror = function () {
        statusText.textContent = "Could not read the image file. Try another photo.";
        spinner.style.display = "none";
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
    document.querySelector(".ocr-spinner").style.display = "";
    ocrResults = [];
}

// Run Tesseract.js OCR on the image
function runOCR(imageData) {
    var statusEl = document.getElementById("ocr-status");
    var statusText = document.getElementById("ocr-status-text");
    var resultsEl = document.getElementById("ocr-results");
    var spinner = document.querySelector(".ocr-spinner");

    statusEl.style.display = "flex";
    statusEl.style.backgroundColor = "";
    statusEl.style.color = "";
    spinner.style.display = "";
    resultsEl.style.display = "none";
    statusText.textContent = "Downloading OCR model (first time only)...";

    Tesseract.recognize(imageData, "eng", {
        logger: function (info) {
            // Show different messages for each phase
            if (info.status === "loading tesseract core") {
                statusText.textContent = "Loading OCR engine...";
            } else if (info.status === "initializing tesseract") {
                statusText.textContent = "Initializing OCR...";
            } else if (info.status === "loading language traineddata") {
                var pct = Math.round(info.progress * 100);
                statusText.textContent = "Downloading language data... " + pct + "%";
            } else if (info.status === "initializing api") {
                statusText.textContent = "Preparing to read...";
            } else if (info.status === "recognizing text") {
                var pct2 = Math.round(info.progress * 100);
                statusText.textContent = "Reading receipt... " + pct2 + "%";
            }
        }
    }).then(function (result) {
        statusEl.style.display = "none";
        var parsedItems = parseReceiptText(result.data.text);

        if (parsedItems.length === 0) {
            statusEl.style.display = "flex";
            statusText.textContent = "No items found. Try a clearer photo or enter items manually.";
            spinner.style.display = "none";
            return;
        }

        ocrResults = parsedItems;
        renderOcrResults();
    }).catch(function (err) {
        statusEl.style.display = "flex";
        statusText.textContent = "Error: " + (err.message || "Could not read receipt. Please try again.");
        spinner.style.display = "none";
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
    statusEl.style.backgroundColor = "rgba(52, 199, 89, 0.1)";
    statusEl.style.color = "#34C759";
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
// SECTION 3: DRAG-AND-DROP ITEM ASSIGNMENT
// ============================================================

// Renders the drag-and-drop assignment UI:
//   - An "item pool" of draggable/tappable item chips
//   - A grid of "person plates" that act as drop targets
function renderAssignments() {
    const container = document.getElementById("assignments");

    if (items.length === 0 || people.length === 0) {
        container.innerHTML = '<p class="empty-message">Add items and people first to assign them.</p>';
        selectedItemId = null;
        return;
    }

    // Clean up stale assignments (removed items/people)
    for (let id in assignments) {
        if (!items.find(function (it) { return it.id == id; })) {
            delete assignments[id];
        } else {
            assignments[id] = assignments[id].filter(function (p) {
                return people.includes(p);
            });
        }
    }
    // Initialize assignments for new items
    for (let i = 0; i < items.length; i++) {
        if (!assignments[items[i].id]) {
            assignments[items[i].id] = [];
        }
    }

    let html = "";

    // ---- Item pool ----
    html += '<div class="item-pool">';
    html += '<div class="pool-label">Tap an item, then tap a plate to assign — or drag directly</div>';
    html += '<div class="item-chips">';
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const assigned = assignments[item.id] || [];
        const isSelected = selectedItemId === item.id;
        let cls = "item-chip";
        if (isSelected) cls += " selected";
        if (assigned.length > 0) cls += " assigned";

        html += '<div class="' + cls + '" data-item-id="' + item.id + '" draggable="true">';
        html += '<span class="chip-name">' + escapeHtml(item.name) + '</span>';
        html += '<span class="chip-price">$' + item.price.toFixed(2) + '</span>';
        if (assigned.length > 1) {
            html += '<span class="split-badge">&divide;' + assigned.length + '</span>';
        } else if (assigned.length === 1) {
            html += '<span class="assigned-badge">&check;</span>';
        }
        html += '</div>';
    }
    html += '</div></div>';

    // ---- Person plates ----
    html += '<div class="person-plates">';
    for (let j = 0; j < people.length; j++) {
        const person = people[j];
        const personItems = [];
        let personTotal = 0;

        for (let i = 0; i < items.length; i++) {
            const a = assignments[items[i].id] || [];
            if (a.includes(person)) {
                const splitCount = a.length;
                const splitPrice = items[i].price / splitCount;
                personItems.push({ item: items[i], splitCount: splitCount, splitPrice: splitPrice });
                personTotal += splitPrice;
            }
        }

        html += '<div class="person-plate" data-person="' + escapeHtml(person) + '">';
        html += '<div class="plate-header">';
        html += '<span class="plate-name">' + escapeHtml(person) + '</span>';
        html += '<span class="plate-total">' + (personTotal > 0 ? '$' + personTotal.toFixed(2) : '') + '</span>';
        html += '</div>';
        html += '<div class="plate-items">';

        if (personItems.length === 0) {
            html += '<div class="plate-empty">Drop items here</div>';
        } else {
            for (let k = 0; k < personItems.length; k++) {
                const pi = personItems[k];
                html += '<div class="plate-item animate-plate-item">';
                html += '<span class="plate-item-name">' + escapeHtml(pi.item.name) + '</span>';
                if (pi.splitCount > 1) {
                    html += '<span class="plate-item-split">&divide;' + pi.splitCount + '</span>';
                }
                html += '<span class="plate-item-price">$' + pi.splitPrice.toFixed(2) + '</span>';
                html += '<button class="plate-item-remove" data-item-id="' + pi.item.id + '" data-person="' + escapeHtml(person) + '">&times;</button>';
                html += '</div>';
            }
        }

        html += '</div></div>';
    }
    html += '</div>';

    container.innerHTML = html;
    attachDndListeners();
}

// ============================================================
// DRAG-AND-DROP + TAP-TO-ASSIGN LISTENERS
// ============================================================

function attachDndListeners() {
    const chips = document.querySelectorAll(".item-chip");
    const plates = document.querySelectorAll(".person-plate");

    // ---- Chip click: tap-to-select ----
    for (let i = 0; i < chips.length; i++) {
        chips[i].addEventListener("click", function (e) {
            // Ignore if this was the end of a touch-drag
            if (this._wasDragged) { this._wasDragged = false; return; }
            const id = Number(this.getAttribute("data-item-id"));
            selectedItemId = (selectedItemId === id) ? null : id;
            renderAssignments();
        });
    }

    // ---- Plate click: assign selected item ----
    for (let i = 0; i < plates.length; i++) {
        plates[i].addEventListener("click", function (e) {
            // Don't trigger if clicking a remove button
            if (e.target.closest(".plate-item-remove")) return;
            if (selectedItemId === null) return;
            const person = this.getAttribute("data-person");
            toggleAssignment(selectedItemId, person);
        });
    }

    // ---- HTML5 Drag and Drop (desktop) ----
    for (let i = 0; i < chips.length; i++) {
        chips[i].addEventListener("dragstart", function (e) {
            dragItemId = Number(this.getAttribute("data-item-id"));
            this.classList.add("dragging");
            e.dataTransfer.effectAllowed = "copy";
            e.dataTransfer.setData("text/plain", "");
        });
        chips[i].addEventListener("dragend", function () {
            this.classList.remove("dragging");
            dragItemId = null;
            for (let p = 0; p < plates.length; p++) plates[p].classList.remove("drag-over");
        });
    }
    for (let i = 0; i < plates.length; i++) {
        plates[i].addEventListener("dragover", function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            this.classList.add("drag-over");
        });
        plates[i].addEventListener("dragleave", function () {
            this.classList.remove("drag-over");
        });
        plates[i].addEventListener("drop", function (e) {
            e.preventDefault();
            this.classList.remove("drag-over");
            if (dragItemId !== null) {
                toggleAssignment(dragItemId, this.getAttribute("data-person"));
                dragItemId = null;
            }
        });
    }

    // ---- Remove buttons on plate items ----
    const removeBtns = document.querySelectorAll(".plate-item-remove");
    for (let i = 0; i < removeBtns.length; i++) {
        removeBtns[i].addEventListener("click", function (e) {
            e.stopPropagation();
            const itemId = Number(this.getAttribute("data-item-id"));
            const person = this.getAttribute("data-person");
            unassignItem(itemId, person);
        });
    }

    // ---- Touch drag (mobile) ----
    attachTouchDrag(chips, plates);
}

// Touch-based drag for mobile devices (pointer events don't support
// elementFromPoint during drag on all mobile browsers)
function attachTouchDrag(chips, plates) {
    for (let i = 0; i < chips.length; i++) {
        (function (chip) {
            var touchStartX, touchStartY, isDragging, ghost;

            chip.addEventListener("touchstart", function (e) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isDragging = false;
                ghost = null;
                dragItemId = Number(chip.getAttribute("data-item-id"));
            }, { passive: true });

            chip.addEventListener("touchmove", function (e) {
                var dx = e.touches[0].clientX - touchStartX;
                var dy = e.touches[0].clientY - touchStartY;

                if (!isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                    isDragging = true;
                    ghost = chip.cloneNode(true);
                    ghost.classList.add("drag-ghost");
                    ghost.style.width = chip.offsetWidth + "px";
                    document.body.appendChild(ghost);
                    chip.classList.add("dragging");
                }
                if (isDragging && ghost) {
                    e.preventDefault();
                    ghost.style.left = (e.touches[0].clientX - ghost.offsetWidth / 2) + "px";
                    ghost.style.top = (e.touches[0].clientY - ghost.offsetHeight / 2) + "px";

                    // Highlight the plate under the finger
                    var el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
                    for (var p = 0; p < plates.length; p++) plates[p].classList.remove("drag-over");
                    var plate = el ? el.closest(".person-plate") : null;
                    if (plate) plate.classList.add("drag-over");
                }
            }, { passive: false });

            chip.addEventListener("touchend", function (e) {
                if (isDragging) {
                    chip._wasDragged = true; // prevent click from firing
                    var touch = e.changedTouches[0];
                    var el = document.elementFromPoint(touch.clientX, touch.clientY);
                    var plate = el ? el.closest(".person-plate") : null;
                    if (plate && dragItemId !== null) {
                        toggleAssignment(dragItemId, plate.getAttribute("data-person"));
                    }
                    if (ghost) ghost.remove();
                    chip.classList.remove("dragging");
                }
                isDragging = false;
                dragItemId = null;
                for (var p = 0; p < plates.length; p++) plates[p].classList.remove("drag-over");
            });
        })(chips[i]);
    }
}

// Toggle an item's assignment to a person (assign or unassign)
function toggleAssignment(itemId, person) {
    if (!assignments[itemId]) assignments[itemId] = [];
    var idx = assignments[itemId].indexOf(person);
    if (idx === -1) {
        assignments[itemId].push(person);
    } else {
        assignments[itemId].splice(idx, 1);
    }
    renderAssignments();
}

// Remove a specific person from an item's assignment
function unassignItem(itemId, person) {
    if (!assignments[itemId]) return;
    var idx = assignments[itemId].indexOf(person);
    if (idx !== -1) {
        assignments[itemId].splice(idx, 1);
    }
    renderAssignments();
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

    // Go through each item and divide its cost among the assigned people
    let atLeastOneAssignment = false;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const assignedPeople = assignments[item.id] || [];

        if (assignedPeople.length === 0) continue;

        atLeastOneAssignment = true;

        // Split the item price evenly among the assigned people
        const splitPrice = item.price / assignedPeople.length;
        for (let k = 0; k < assignedPeople.length; k++) {
            const person = assignedPeople[k];
            personSubtotals[person] += splitPrice;

            if (assignedPeople.length > 1) {
                personItemsList[person].push(
                    item.name + " (split " + assignedPeople.length + " ways: $" + splitPrice.toFixed(2) + ")"
                );
            } else {
                personItemsList[person].push(
                    item.name + " ($" + item.price.toFixed(2) + ")"
                );
            }
        }
    }

    if (!atLeastOneAssignment) {
        alert("Please assign at least one item to a person by dragging or tapping in Step 3.");
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
    const colors = ["#007AFF", "#5856D6", "#34C759", "#FF9500", "#FF2D55", "#5AC8FA"];

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
