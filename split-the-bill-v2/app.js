// ============================================================
// DATA
// ============================================================
let items = [];
let people = [];
let ocrResults = [];
let assignments = {}; // itemId -> [person1, person2, ...]
let selectedItemIds = new Set(); // currently tapped items for tap-to-assign
let currentStep = 1;

// Person color palette — each person gets a unique color
var personColors = [
    { hex: "#34C759", rgb: "52,199,89" },     // green
    { hex: "#AF52DE", rgb: "175,82,222" },     // purple
    { hex: "#FF9500", rgb: "255,149,0" },      // orange
    { hex: "#FF2D55", rgb: "255,45,85" },      // pink
    { hex: "#5AC8FA", rgb: "90,200,250" },     // teal
    { hex: "#5856D6", rgb: "88,86,214" },      // indigo
    { hex: "#FF6961", rgb: "255,105,97" },     // coral
    { hex: "#00C7BE", rgb: "0,199,190" }       // mint
];

function getPersonColor(person) {
    var idx = people.indexOf(person);
    if (idx === -1) idx = 0;
    return personColors[idx % personColors.length];
}

function getItemStyle(itemId, isSelected) {
    if (isSelected) return ""; // CSS .selected class handles the blue border
    var assigned = assignments[itemId] || [];
    if (assigned.length === 0) return "";

    if (assigned.length === 1) {
        var c = getPersonColor(assigned[0]);
        return "border-color:" + c.hex + ";background-color:rgba(" + c.rgb + ",0.06)";
    }

    // Multi-person: gradient border using background-clip trick
    var stops = [];
    for (var i = 0; i < assigned.length; i++) {
        stops.push(getPersonColor(assigned[i]).hex);
    }
    return "border:2px solid transparent;background:rgba(120,120,128,0.04) padding-box,linear-gradient(135deg," + stops.join(",") + ") border-box";
}

// ============================================================
// STEP NAVIGATION
// ============================================================

function goToStep(step) {
    if (step < 1 || step > 4) return;

    // Hide current step
    var current = document.querySelector(".step.active");
    if (current) current.classList.remove("active");

    // Show target step
    var target = document.getElementById("step-" + step);
    if (target) target.classList.add("active");

    currentStep = step;
    updateProgressBar();

    // Refresh the assignment UI when entering Step 3
    if (step === 3) renderAssignments();

    // Scroll to top of the step
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgressBar() {
    var steps = document.querySelectorAll(".progress-step");
    var connectors = document.querySelectorAll(".progress-connector");

    for (var i = 0; i < steps.length; i++) {
        var stepNum = Number(steps[i].getAttribute("data-step"));
        steps[i].classList.remove("active", "visited");

        if (stepNum === currentStep) {
            steps[i].classList.add("active");
        } else if (stepNum < currentStep) {
            steps[i].classList.add("visited");
        }
    }

    // Fill connectors up to the current step
    for (var j = 0; j < connectors.length; j++) {
        if (j < currentStep - 1) {
            connectors[j].classList.add("filled");
        } else {
            connectors[j].classList.remove("filled");
        }
    }
}

// ============================================================
// RECEIPT UPLOAD & OCR
// ============================================================

document.getElementById("upload-area").addEventListener("click", function (e) {
    if (e.target.closest("#receipt-input")) return;
    document.getElementById("receipt-input").click();
});

document.getElementById("receipt-input").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var statusEl = document.getElementById("ocr-status");
    var statusText = document.getElementById("ocr-status-text");
    var spinner = document.querySelector(".ocr-spinner");
    statusEl.style.display = "flex";
    statusEl.style.backgroundColor = "";
    statusEl.style.color = "";
    spinner.style.display = "";
    statusText.textContent = "Loading image...";

    var preview = document.getElementById("receipt-preview");
    var img = document.getElementById("receipt-image");
    var uploadArea = document.getElementById("upload-area");

    var blobUrl = URL.createObjectURL(file);
    img.src = blobUrl;
    preview.style.display = "block";
    uploadArea.style.display = "none";

    var tempImg = new Image();
    tempImg.onload = function () {
        var maxDim = 2000;
        var w = tempImg.naturalWidth;
        var h = tempImg.naturalHeight;
        if (w > maxDim || h > maxDim) {
            var scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(tempImg, 0, 0, w, h);
        URL.revokeObjectURL(blobUrl);

        if (typeof Tesseract === "undefined") {
            statusText.textContent = "OCR library failed to load. Check your internet connection and reload.";
            spinner.style.display = "none";
            return;
        }

        runOCR(canvas);
    };
    tempImg.onerror = function () {
        statusText.textContent = "Could not load the image. Try another photo.";
        spinner.style.display = "none";
        URL.revokeObjectURL(blobUrl);
    };
    tempImg.src = blobUrl;
});

function clearReceipt() {
    document.getElementById("receipt-preview").style.display = "none";
    document.getElementById("upload-area").style.display = "";
    document.getElementById("ocr-status").style.display = "none";
    document.getElementById("ocr-results").style.display = "none";
    document.getElementById("receipt-input").value = "";
    document.querySelector(".ocr-spinner").style.display = "";
    ocrResults = [];
}

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
        var parsed = parseReceiptText(result.data.text);

        // Auto-fill tax and tip fields if detected
        if (parsed.tax > 0) {
            document.getElementById("tax-amount").value = parsed.tax.toFixed(2);
        }
        if (parsed.tip > 0) {
            document.getElementById("tip-amount").value = parsed.tip.toFixed(2);
        }

        if (parsed.items.length === 0) {
            statusEl.style.display = "flex";
            statusText.textContent = "No items found. Try a clearer photo or enter items manually.";
            spinner.style.display = "none";
            return;
        }

        ocrResults = parsed.items;
        renderOcrResults(parsed.tax, parsed.tip);
    }).catch(function (err) {
        statusEl.style.display = "flex";
        statusText.textContent = "Error: " + (err.message || "Could not read receipt. Please try again.");
        spinner.style.display = "none";
    });
}

function parseReceiptText(text) {
    var foundItems = [];
    var detectedTax = 0;
    var detectedTip = 0;
    var lines = text.split("\n");

    var taxWords = ["tax", "hst", "gst", "pst", "vat"];
    var tipWords = ["tip", "gratuity"];
    var skipWords = [
        "subtotal", "sub total", "total", "balance", "change", "cash",
        "credit", "debit", "visa", "mastercard", "amex", "payment",
        "amount due", "thank you", "welcome", "guest", "server",
        "table", "order", "check", "date", "receipt"
    ];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        var priceMatch = line.match(/\$?\s*(\d{1,6}\.\d{2})\s*$/);
        if (!priceMatch) continue;

        var price = parseFloat(priceMatch[1]);
        if (price <= 0 || price > 9999) continue;

        var name = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();
        name = name.replace(/^[\d]+[\s.)\-x]+/, "");
        name = name.replace(/[^a-zA-Z0-9\s&'/\-().]+/g, "");
        name = name.trim();

        if (!name || name.length < 2) continue;

        var lowerName = name.toLowerCase();

        var isTax = false;
        for (var t = 0; t < taxWords.length; t++) {
            if (lowerName.indexOf(taxWords[t]) !== -1) { isTax = true; break; }
        }
        if (isTax && lowerName.indexOf("total") === -1 && lowerName.indexOf("subtotal") === -1) {
            detectedTax = price;
            continue;
        }

        var isTip = false;
        for (var tp = 0; tp < tipWords.length; tp++) {
            if (lowerName.indexOf(tipWords[tp]) !== -1) { isTip = true; break; }
        }
        if (isTip) {
            detectedTip = price;
            continue;
        }

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

    return { items: foundItems, tax: detectedTax, tip: detectedTip };
}

function renderOcrResults(tax, tip) {
    var container = document.getElementById("ocr-items-list");
    var resultsEl = document.getElementById("ocr-results");
    resultsEl.style.display = "block";

    var html = "";

    if (tax > 0 || tip > 0) {
        var parts = [];
        if (tax > 0) parts.push("Tax: $" + tax.toFixed(2));
        if (tip > 0) parts.push("Tip: $" + tip.toFixed(2));
        html += '<div class="ocr-tax-tip-note">' + parts.join(" &bull; ") + ' — auto-filled in Step 4</div>';
    }

    for (var i = 0; i < ocrResults.length; i++) {
        html += '<div class="ocr-item-row">';
        html += '<input type="checkbox" id="ocr-item-' + i + '" checked>';
        html += '<span class="ocr-item-name">' + escapeHtml(ocrResults[i].name) + '</span>';
        html += '<span class="ocr-item-price">$' + ocrResults[i].price.toFixed(2) + '</span>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function addSelectedOcrItems() {
    var addedCount = 0;
    for (var i = 0; i < ocrResults.length; i++) {
        var checkbox = document.getElementById("ocr-item-" + i);
        if (checkbox && checkbox.checked) {
            items.push({
                id: Date.now() + i,
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

    renderItems();

    document.getElementById("ocr-results").style.display = "none";
    var statusEl = document.getElementById("ocr-status");
    var statusText = document.getElementById("ocr-status-text");
    statusEl.style.display = "flex";
    statusEl.style.backgroundColor = "rgba(52, 199, 89, 0.1)";
    statusEl.style.color = "#34C759";
    document.querySelector(".ocr-spinner").style.display = "none";
    statusText.textContent = addedCount + " item" + (addedCount > 1 ? "s" : "") + " added to your bill!";

    document.getElementById("items-table").scrollIntoView({ behavior: "smooth", block: "center" });
}

// ============================================================
// STEP 1: ITEMS
// ============================================================

function addItem() {
    var nameInput = document.getElementById("item-name");
    var priceInput = document.getElementById("item-price");

    var name = nameInput.value.trim();
    var price = parseFloat(priceInput.value);

    if (!name) {
        alert("Please enter an item name.");
        return;
    }
    if (isNaN(price) || price < 0) {
        alert("Please enter a valid price.");
        return;
    }

    items.push({
        id: Date.now(),
        name: name,
        price: price
    });

    nameInput.value = "";
    priceInput.value = "";
    nameInput.focus();

    renderItems();
}

function removeItem(id) {
    items = items.filter(function (item) {
        return item.id !== id;
    });
    renderItems();
}

function renderItems() {
    var tbody = document.getElementById("items-body");
    var subtotalSpan = document.getElementById("subtotal");

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-message">No items added yet.</td></tr>';
        subtotalSpan.textContent = "0.00";
        return;
    }

    var html = "";
    var subtotal = 0;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        subtotal += item.price;
        html += '<tr>';
        html += '<td>' + escapeHtml(item.name) + '</td>';
        html += '<td class="price">$' + item.price.toFixed(2) + '</td>';
        html += '<td><button class="remove-btn" onclick="removeItem(' + item.id + ')">Remove</button></td>';
        html += '</tr>';
    }

    tbody.innerHTML = html;
    subtotalSpan.textContent = subtotal.toFixed(2);

    var rows = tbody.querySelectorAll("tr");
    if (rows.length > 0) {
        rows[rows.length - 1].classList.add("animate-in");
    }
}

// ============================================================
// STEP 2: PEOPLE
// ============================================================

function addPerson() {
    var nameInput = document.getElementById("person-name");
    var name = nameInput.value.trim();

    if (!name) {
        alert("Please enter a person's name.");
        return;
    }

    if (people.includes(name)) {
        alert(name + " is already in the list.");
        return;
    }

    people.push(name);

    nameInput.value = "";
    nameInput.focus();

    renderPeople();
}

function removePerson(name) {
    people = people.filter(function (p) {
        return p !== name;
    });
    renderPeople();
}

function renderPeople() {
    var container = document.getElementById("people-list");

    if (people.length === 0) {
        container.innerHTML = '<p class="empty-message">No people added yet.</p>';
        return;
    }

    var html = "";
    for (var i = 0; i < people.length; i++) {
        var isNewest = (i === people.length - 1);
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
// STEP 3: TAP-TO-ASSIGN (no drag-and-drop)
// ============================================================

function renderAssignments() {
    var container = document.getElementById("assignments");

    if (items.length === 0 || people.length === 0) {
        container.innerHTML = '<p class="empty-message">Add items and people first to assign them.</p>';
        selectedItemIds.clear();
        return;
    }

    // Clean up stale assignments
    for (var id in assignments) {
        if (!items.find(function (it) { return it.id == id; })) {
            delete assignments[id];
        } else {
            assignments[id] = assignments[id].filter(function (p) {
                return people.includes(p);
            });
        }
    }
    // Initialize assignments for new items
    for (var i = 0; i < items.length; i++) {
        if (!assignments[items[i].id]) {
            assignments[items[i].id] = [];
        }
    }

    var html = "";
    var hasSelection = selectedItemIds.size > 0;
    var useGrid = items.length <= 12;

    // ---- Status label ----
    html += '<div class="item-pool">';
    if (hasSelection) {
        var selCount = selectedItemIds.size;
        html += '<div class="pool-header"><div class="pool-label pool-label-active">' + selCount + ' item' + (selCount !== 1 ? 's' : '') + ' selected — tap a name below</div>';
        html += '<button class="pool-action" id="clear-selection">Clear</button></div>';
    } else {
        html += '<div class="pool-label">Tap items to select, then tap a name to assign</div>';
    }

    if (useGrid) {
        // ---- VARIATION B: Two-column grid cards (≤12 items) ----
        html += '<div class="item-grid">';
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var assigned = assignments[item.id] || [];
            var isSelected = selectedItemIds.has(item.id);
            var cls = "item-grid-card";
            if (isSelected) cls += " selected";
            if (assigned.length > 0) cls += " assigned";

            var inlineStyle = getItemStyle(item.id, isSelected);
            html += '<div class="' + cls + '" data-item-id="' + item.id + '"' + (inlineStyle ? ' style="' + inlineStyle + '"' : '') + '>';
            html += '<span class="grid-card-emoji">' + getItemEmoji(item.name) + '</span>';
            html += '<span class="grid-card-name">' + escapeHtml(item.name) + '</span>';
            html += '<span class="grid-card-price">$' + item.price.toFixed(2) + '</span>';
            if (assigned.length > 1) {
                // Show colored dots for each person
                var dotsHtml = '<span class="grid-card-badge">';
                for (var d = 0; d < assigned.length; d++) {
                    var dc = getPersonColor(assigned[d]);
                    dotsHtml += '<span class="person-dot" style="background-color:' + dc.hex + '"></span>';
                }
                dotsHtml += '</span>';
                html += dotsHtml;
            } else if (assigned.length === 1) {
                var ac = getPersonColor(assigned[0]);
                html += '<span class="grid-card-badge assigned-badge" style="background-color:rgba(' + ac.rgb + ',0.12);color:' + ac.hex + '">&check;</span>';
            }
            html += '</div>';
        }
        html += '</div>';
    } else {
        // ---- VARIATION A: Compact list rows (>12 items) ----
        html += '<div class="item-list">';
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var assigned = assignments[item.id] || [];
            var isSelected = selectedItemIds.has(item.id);
            var cls = "item-list-row";
            if (isSelected) cls += " selected";
            if (assigned.length > 0) cls += " assigned";

            var inlineStyle = getItemStyle(item.id, isSelected);
            html += '<div class="' + cls + '" data-item-id="' + item.id + '"' + (inlineStyle ? ' style="' + inlineStyle + '"' : '') + '>';
            html += '<span class="list-row-emoji">' + getItemEmoji(item.name) + '</span>';
            html += '<span class="list-row-name">' + escapeHtml(item.name) + '</span>';
            if (assigned.length > 1) {
                var dotsHtml = '<span class="person-dots">';
                for (var d = 0; d < assigned.length; d++) {
                    var dc = getPersonColor(assigned[d]);
                    dotsHtml += '<span class="person-dot" style="background-color:' + dc.hex + '"></span>';
                }
                dotsHtml += '</span>';
                html += dotsHtml;
            } else if (assigned.length === 1) {
                var ac = getPersonColor(assigned[0]);
                html += '<span class="assigned-badge" style="background-color:rgba(' + ac.rgb + ',0.12);color:' + ac.hex + '">&check;</span>';
            }
            html += '<span class="list-row-price">$' + item.price.toFixed(2) + '</span>';
            html += '</div>';
        }
        html += '</div>';
    }

    html += '</div>'; // close .item-pool

    // ---- Sticky person bar ----
    html += '<div class="person-bar" id="person-bar">';
    html += '<div class="assign-to-label' + (hasSelection ? ' ready' : '') + '">' + (hasSelection ? 'Assign to:' : 'Select items above first') + '</div>';
    html += '<div class="person-btns">';
    for (var j = 0; j < people.length; j++) {
        var person = people[j];
        var pColor = getPersonColor(person);
        var personHasItems = false;
        for (var k = 0; k < items.length; k++) {
            var a = assignments[items[k].id] || [];
            if (a.includes(person)) { personHasItems = true; break; }
        }
        var btnCls = "person-assign-btn";
        var btnStyle = "";
        if (hasSelection) {
            btnCls += " ready";
            btnStyle = "border-color:" + pColor.hex + ";color:" + pColor.hex + ";background-color:rgba(" + pColor.rgb + ",0.08)";
        } else if (personHasItems) {
            btnCls += " has-items";
            btnStyle = "border-color:rgba(" + pColor.rgb + ",0.3)";
        }
        html += '<button class="' + btnCls + '"' + (btnStyle ? ' style="' + btnStyle + '"' : '') + ' data-person="' + escapeHtml(person) + '">';
        html += '<span class="person-color-dot" style="background-color:' + pColor.hex + '"></span>';
        html += escapeHtml(person);
        html += '</button>';
    }
    html += '</div></div>';

    // ---- Assignment summary cards ----
    var anyAssignments = false;
    for (var id in assignments) {
        if (assignments[id].length > 0) { anyAssignments = true; break; }
    }

    if (anyAssignments) {
        html += '<div class="assign-summary">';
        html += '<div class="assign-summary-label">Assignments</div>';

        for (var j = 0; j < people.length; j++) {
            var person = people[j];
            var personItems = [];
            var personTotal = 0;

            for (var k = 0; k < items.length; k++) {
                var a = assignments[items[k].id] || [];
                if (a.includes(person)) {
                    var splitCount = a.length;
                    var splitPrice = items[k].price / splitCount;
                    personItems.push({ item: items[k], splitCount: splitCount, splitPrice: splitPrice });
                    personTotal += splitPrice;
                }
            }

            if (personItems.length === 0) continue;

            var sc = getPersonColor(person);
            html += '<div class="summary-card" style="border-left:3px solid ' + sc.hex + '">';
            html += '<div class="summary-card-header">';
            html += '<span class="summary-card-name"><span class="person-color-dot" style="background-color:' + sc.hex + '"></span>' + escapeHtml(person) + '</span>';
            html += '<span class="summary-card-total" style="color:' + sc.hex + '">$' + personTotal.toFixed(2) + '</span>';
            html += '</div>';
            html += '<div class="summary-card-items">';

            for (var m = 0; m < personItems.length; m++) {
                var pi = personItems[m];
                html += '<span class="summary-item">';
                html += '<span class="summary-item-emoji">' + getItemEmoji(pi.item.name) + '</span>';
                html += escapeHtml(pi.item.name);
                if (pi.splitCount > 1) {
                    html += ' <span class="summary-item-split">&divide;' + pi.splitCount + '</span>';
                }
                html += ' <span class="summary-item-price">$' + pi.splitPrice.toFixed(2) + '</span>';
                html += '<button class="summary-item-remove" data-item-id="' + pi.item.id + '" data-person="' + escapeHtml(person) + '">&times;</button>';
                html += '</span>';
            }

            html += '</div></div>';
        }

        html += '</div>';
    }

    container.innerHTML = html;
    attachTapListeners();
}

// ============================================================
// TAP-TO-ASSIGN LISTENERS (no drag-and-drop)
// ============================================================

function attachTapListeners() {
    var chips = document.querySelectorAll(".item-grid-card, .item-list-row");
    var personBtns = document.querySelectorAll(".person-assign-btn");

    // Chip tap: toggle selection
    for (var i = 0; i < chips.length; i++) {
        chips[i].addEventListener("click", function () {
            var id = Number(this.getAttribute("data-item-id"));
            if (selectedItemIds.has(id)) {
                selectedItemIds.delete(id);
            } else {
                selectedItemIds.add(id);
            }
            renderAssignments();
        });
    }

    // Person button tap: assign all selected items
    for (var i = 0; i < personBtns.length; i++) {
        personBtns[i].addEventListener("click", function () {
            if (selectedItemIds.size === 0) return;
            var person = this.getAttribute("data-person");
            selectedItemIds.forEach(function (itemId) {
                if (!assignments[itemId]) assignments[itemId] = [];
                if (assignments[itemId].indexOf(person) === -1) {
                    assignments[itemId].push(person);
                }
            });
            selectedItemIds.clear();
            renderAssignments();
        });
    }

    // Clear selection button
    var clearBtn = document.getElementById("clear-selection");
    if (clearBtn) {
        clearBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            selectedItemIds.clear();
            renderAssignments();
        });
    }

    // Remove buttons on summary items
    var removeBtns = document.querySelectorAll(".summary-item-remove");
    for (var i = 0; i < removeBtns.length; i++) {
        removeBtns[i].addEventListener("click", function (e) {
            e.stopPropagation();
            var itemId = Number(this.getAttribute("data-item-id"));
            var person = this.getAttribute("data-person");
            unassignItem(itemId, person);
        });
    }
}

function unassignItem(itemId, person) {
    if (!assignments[itemId]) return;
    var idx = assignments[itemId].indexOf(person);
    if (idx !== -1) {
        assignments[itemId].splice(idx, 1);
    }
    renderAssignments();
}

// ============================================================
// STEP 4: CALCULATE THE FINAL SPLIT
// ============================================================

function calculate() {
    if (items.length === 0) {
        alert("Please add at least one item.");
        return;
    }
    if (people.length === 0) {
        alert("Please add at least one person.");
        return;
    }

    var tax = parseFloat(document.getElementById("tax-amount").value) || 0;
    var tip = parseFloat(document.getElementById("tip-amount").value) || 0;

    var personSubtotals = {};
    var personItemsList = {};
    for (var i = 0; i < people.length; i++) {
        personSubtotals[people[i]] = 0;
        personItemsList[people[i]] = [];
    }

    var subtotal = 0;
    for (var i = 0; i < items.length; i++) {
        subtotal += items[i].price;
    }

    var atLeastOneAssignment = false;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var assignedPeople = assignments[item.id] || [];

        if (assignedPeople.length === 0) continue;

        atLeastOneAssignment = true;

        var splitPrice = item.price / assignedPeople.length;
        for (var k = 0; k < assignedPeople.length; k++) {
            var person = assignedPeople[k];
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
        alert("Please assign at least one item to a person in Step 3.");
        return;
    }

    var assignedSubtotal = 0;
    for (var i = 0; i < people.length; i++) {
        assignedSubtotal += personSubtotals[people[i]];
    }

    var summaryContainer = document.getElementById("summary");
    var grandTotal = 0;
    var html = "";

    for (var i = 0; i < people.length; i++) {
        var person = people[i];
        var foodCost = personSubtotals[person];

        var proportion = assignedSubtotal > 0 ? foodCost / assignedSubtotal : 0;

        var personTax = tax * proportion;
        var personTip = tip * proportion;
        var personTotal = foodCost + personTax + personTip;

        grandTotal += personTotal;

        var pc = getPersonColor(person);
        html += '<div class="person-summary" style="border-left-color:' + pc.hex + '">';
        html += '<div class="person-name"><span class="person-color-dot" style="background-color:' + pc.hex + '"></span>' + escapeHtml(person) + '</div>';
        html += '<div class="person-items">' + escapeHtml(personItemsList[person].join(", ") || "No items assigned") + '</div>';
        html += '<div class="person-items">';
        html += 'Food: $' + foodCost.toFixed(2);
        html += ' + Tax: $' + personTax.toFixed(2);
        html += ' + Tip: $' + personTip.toFixed(2);
        html += '</div>';
        html += '<div class="person-total" style="color:' + pc.hex + '">Owes: $' + personTotal.toFixed(2) + '</div>';
        html += '</div>';
    }

    summaryContainer.innerHTML = html;
    document.getElementById("grand-total").textContent = grandTotal.toFixed(2);

    var summaryCards = summaryContainer.querySelectorAll(".person-summary");
    for (var i = 0; i < summaryCards.length; i++) {
        summaryCards[i].classList.add("animate-in");
        summaryCards[i].style.animationDelay = (i * 0.12) + "s";
    }

    launchConfetti(summaryContainer);
}

// ============================================================
// CONFETTI CELEBRATION
// ============================================================

function launchConfetti(container) {
    var rect = container.getBoundingClientRect();
    var colors = ["#007AFF", "#5856D6", "#34C759", "#FF9500", "#FF2D55", "#5AC8FA"];

    for (var i = 0; i < 40; i++) {
        var particle = document.createElement("div");
        particle.className = "confetti-particle";

        var startX = rect.left + Math.random() * rect.width + window.scrollX;
        var startY = rect.top + window.scrollY - 10;
        particle.style.left = startX + "px";
        particle.style.top = startY + "px";
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
        particle.style.setProperty("--duration", (0.6 + Math.random() * 0.8) + "s");

        particle.style.marginLeft = (Math.random() * 40 - 20) + "px";

        document.body.appendChild(particle);

        setTimeout(function () {
            particle.remove();
        }, 1500);
    }
}

// ============================================================
// EMOJI AUTO-DETECTION
// ============================================================

var emojiMap = [
    { keywords: ["burger", "hamburger", "cheeseburger"], emoji: "\u{1F354}" },
    { keywords: ["pizza", "margherita", "pepperoni"], emoji: "\u{1F355}" },
    { keywords: ["beer", "ale", "ipa", "lager", "draft", "draught", "pilsner", "stout"], emoji: "\u{1F37A}" },
    { keywords: ["wine", "merlot", "cabernet", "pinot", "chardonnay", "ros\u00e9", "rose"], emoji: "\u{1F377}" },
    { keywords: ["cocktail", "margarita", "mojito", "martini", "daiquiri", "negroni", "spritz"], emoji: "\u{1F378}" },
    { keywords: ["coffee", "latte", "espresso", "cappuccino", "americano", "mocha", "macchiato"], emoji: "\u2615" },
    { keywords: ["tea", "chai", "matcha"], emoji: "\u{1F375}" },
    { keywords: ["salad", "caesar", "greens", "arugula", "kale"], emoji: "\u{1F957}" },
    { keywords: ["steak", "ribeye", "filet", "sirloin", "prime rib", "t-bone"], emoji: "\u{1F969}" },
    { keywords: ["chicken", "wings", "drumstick", "tender"], emoji: "\u{1F357}" },
    { keywords: ["fish", "salmon", "tuna", "cod", "halibut", "trout", "sea bass", "mahi"], emoji: "\u{1F41F}" },
    { keywords: ["shrimp", "prawn", "scampi", "crab", "lobster", "crawfish"], emoji: "\u{1F990}" },
    { keywords: ["pasta", "spaghetti", "penne", "fettuccine", "linguine", "rigatoni", "carbonara", "bolognese"], emoji: "\u{1F35D}" },
    { keywords: ["soup", "chowder", "bisque", "ramen", "pho", "broth"], emoji: "\u{1F35C}" },
    { keywords: ["fries", "french fries", "frite", "chips"], emoji: "\u{1F35F}" },
    { keywords: ["taco", "burrito", "quesadilla", "enchilada", "nacho"], emoji: "\u{1F32E}" },
    { keywords: ["sushi", "sashimi", "roll", "nigiri", "maki"], emoji: "\u{1F363}" },
    { keywords: ["cake", "brownie", "cheesecake", "tiramisu", "mousse", "creme brulee"], emoji: "\u{1F370}" },
    { keywords: ["ice cream", "gelato", "sundae", "sorbet"], emoji: "\u{1F368}" },
    { keywords: ["dessert", "pudding", "pie", "tart", "cobbler"], emoji: "\u{1F36E}" },
    { keywords: ["water", "sparkling", "pellegrino", "perrier", "aqua"], emoji: "\u{1F4A7}" },
    { keywords: ["soda", "coke", "pepsi", "sprite", "lemonade", "ginger ale"], emoji: "\u{1F964}" },
    { keywords: ["juice", "orange juice", "oj", "smoothie"], emoji: "\u{1F9C3}" },
    { keywords: ["sandwich", "sub", "wrap", "panini", "club", "blt", "reuben"], emoji: "\u{1F96A}" },
    { keywords: ["egg", "eggs", "omelet", "omelette", "frittata", "benedict"], emoji: "\u{1F95A}" },
    { keywords: ["bread", "toast", "baguette", "roll", "garlic bread"], emoji: "\u{1F35E}" },
    { keywords: ["rice", "fried rice", "pilaf", "risotto"], emoji: "\u{1F35A}" },
    { keywords: ["curry", "tikka", "masala", "korma", "vindaloo"], emoji: "\u{1F35B}" },
    { keywords: ["hot dog", "hotdog", "bratwurst", "sausage"], emoji: "\u{1F32D}" },
    { keywords: ["waffle", "pancake", "crepe", "french toast"], emoji: "\u{1F9C7}" },
    { keywords: ["bacon", "ham", "pork", "ribs", "pulled pork"], emoji: "\u{1F953}" },
    { keywords: ["appetizer", "app", "starter", "bruschetta", "calamari"], emoji: "\u{1F958}" },
    { keywords: ["dip", "guac", "guacamole", "hummus", "salsa", "queso"], emoji: "\u{1F96B}" }
];

function getItemEmoji(name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < emojiMap.length; i++) {
        var entry = emojiMap[i];
        for (var k = 0; k < entry.keywords.length; k++) {
            if (lower.indexOf(entry.keywords[k]) !== -1) {
                return entry.emoji;
            }
        }
    }
    return "\u{1F37D}\u{FE0F}"; // plate with cutlery fallback
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function escapeJs(text) {
    return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// ============================================================
// KEYBOARD SHORTCUTS (Enter to add)
// ============================================================

document.getElementById("item-price").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addItem();
    }
});

document.getElementById("item-name").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        document.getElementById("item-price").focus();
    }
});

document.getElementById("person-name").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        addPerson();
    }
});

// ============================================================
// INITIALIZE
// ============================================================
renderItems();
renderPeople();
updateProgressBar();
