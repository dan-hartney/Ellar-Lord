// ============================================================
// DATA: These two lists store everything the user enters.
// "items" holds each receipt item (name + price).
// "people" holds each person's name.
// ============================================================
let items = [];
let people = [];

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
function renderPeople() {
    const container = document.getElementById("people-list");

    if (people.length === 0) {
        container.innerHTML = '<p class="empty-message">No people added yet.</p>';
        return;
    }

    let html = "";
    for (let i = 0; i < people.length; i++) {
        html += '<span class="person-tag">';
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
