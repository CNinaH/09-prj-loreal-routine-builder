/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter"); // Dropdown for selecting product category
const productsContainer = document.getElementById("productsContainer"); // Where product cards will be shown
const chatForm = document.getElementById("chatForm"); // The chat form for user questions
const chatWindow = document.getElementById("chatWindow"); // Where chat responses are displayed

/* Track selected products by their unique name */
// Load selected products from localStorage, or start with empty array
let selectedProducts = []; // Array to keep track of selected products
const SELECTED_PRODUCTS_KEY = "selectedProducts"; // Key for localStorage

// Helper: Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem(SELECTED_PRODUCTS_KEY, JSON.stringify(selectedProducts)); // Save array as JSON string
}

// Helper: Load selected products from localStorage
function loadSelectedProductsFromStorage() {
  const data = localStorage.getItem(SELECTED_PRODUCTS_KEY); // Get data from localStorage
  if (data) {
    try {
      selectedProducts = JSON.parse(data); // Parse JSON string to array
    } catch {
      selectedProducts = []; // If error, start with empty array
    }
  } else {
    selectedProducts = []; // If nothing saved, start with empty array
  }
}

/* Reference to the selected products section */
const selectedProductsList = document.getElementById("selectedProductsList"); // Where selected products are shown

const workerUrl = "https://loreal-worker.ninawark.workers.dev/"; // URL for the Cloudflare Worker

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`; // Show message until a category is picked

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json"); // Fetch the products.json file
  const data = await response.json(); // Parse the JSON data
  return data.products; // Return the array of products
}

/* Helper: update the Selected Products section */
function updateSelectedProducts() {
  saveSelectedProducts(); // Save to localStorage whenever updated

  if (!selectedProducts.length) {
    // If no products selected
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`; // Show placeholder
    // Remove Clear All button if present
    const clearBtn = document.getElementById("clearAllBtn"); // Find the Clear All button
    if (clearBtn) clearBtn.remove(); // Remove it if it exists
    return; // Stop here
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="product-card selected">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
        </div>
        <button class="remove-btn" data-name="${product.name}" title="Remove">&times;</button>
      </div>
    `
    )
    .join(""); // Show each selected product as a card

  // Add Clear All button if not present
  if (!document.getElementById("clearAllBtn")) {
    // If Clear All button is not there
    const clearBtn = document.createElement("button"); // Create a new button
    clearBtn.id = "clearAllBtn"; // Set its id
    clearBtn.className = "clear-btn"; // Set its class
    clearBtn.textContent = "Clear All"; // Set its text
    clearBtn.title = "Remove all selected products"; // Set its tooltip
    clearBtn.style.margin = "10px 0"; // Add some margin
    clearBtn.addEventListener("click", () => {
      // When clicked
      selectedProducts = []; // Remove all selected products
      saveSelectedProducts(); // Save the empty list
      updateSelectedProducts(); // Update the UI
      highlightSelectedCards(); // Update highlights in the grid
    });
    selectedProductsList.parentNode.insertBefore(
      clearBtn,
      selectedProductsList.nextSibling
    ); // Add the button after the selected products list
  }

  // Add event listeners for remove buttons
  const removeBtns = selectedProductsList.querySelectorAll(".remove-btn"); // Find all remove buttons
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // When a remove button is clicked
      const name = btn.getAttribute("data-name"); // Get the product name
      selectedProducts = selectedProducts.filter((p) => p.name !== name); // Remove from array
      updateSelectedProducts(); // Update the UI
      highlightSelectedCards(); // Update highlights in the grid
    });
  });
}

/* Helper: highlight selected cards in the grid */
function highlightSelectedCards() {
  const cards = productsContainer.querySelectorAll(".product-card"); // Get all product cards
  cards.forEach((card) => {
    const name = card.querySelector("h3").textContent; // Get the product name from the card
    if (selectedProducts.some((p) => p.name === name)) {
      // If this product is selected
      card.classList.add("selected"); // Add the selected class
    } else {
      card.classList.remove("selected"); // Remove the selected class
    }
  });
}

/* Create HTML for displaying product cards, with selection logic */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProducts.some((p) => p.name === product.name) ? " selected" : ""
    }" data-name="${product.name}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-desc-overlay" aria-label="Product description" tabindex="0">
        ${product.description}
      </div>
    </div>
  `
    )
    .join(""); // Show each product as a card

  // Add click event to each product card for selection
  const cards = productsContainer.querySelectorAll(".product-card"); // Get all product cards
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      // When a card is clicked
      const name = card.getAttribute("data-name"); // Get the product name
      // Find product by name
      loadProducts().then((allProducts) => {
        // Load all products from JSON
        const product = allProducts.find((p) => p.name === name); // Find the clicked product
        if (!product) return; // If not found, do nothing
        const alreadySelected = selectedProducts.some((p) => p.name === name); // Check if already selected
        if (alreadySelected) {
          // Unselect
          selectedProducts = selectedProducts.filter((p) => p.name !== name); // Remove from selected
        } else {
          // Select
          selectedProducts.push(product); // Add to selected
        }
        updateSelectedProducts(); // Update the selected products section
        highlightSelectedCards(); // Update highlights in the grid
      });
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  // When the category dropdown changes
  const products = await loadProducts(); // Load all products
  const selectedCategory = e.target.value; // Get the selected category

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  ); // Filter products by category

  displayProducts(filteredProducts); // Show filtered products
  highlightSelectedCards(); // Highlight any selected ones
});

/* Initial render of selected products */
// Load from localStorage before first render
loadSelectedProductsFromStorage(); // Load selected products from localStorage
updateSelectedProducts(); // Show selected products in the UI

/* Chat form submission handler - now sends user question to OpenAI and displays the response as chat bubbles */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Stop the page from reloading

  const userInput = chatForm.querySelector("input, textarea").value; // Get the user's question from the form
  if (!userInput.trim()) {
    chatWindow.innerHTML = `<div class="chat-message assistant">Please enter a question.</div>`;
    return;
  }

  // Append user message bubble
  appendChatMessage(userInput, "user");

  // Show assistant "thinking" bubble
  const thinkingBubble = appendChatMessage("Thinking...", "assistant");

  // Prepare messages for OpenAI API
  const messages = [
    {
      role: "system",
      content:
        "You are a skincare expert. Answer the user's question in a simple, friendly, beginner way.",
    },
    {
      role: "user",
      content: userInput,
    },
  ];

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();

    // Get the assistant's reply from the response
    const reply =
      data.choices && data.choices[0]?.message?.content
        ? data.choices[0].message.content
        : "No response generated. Please try again.";

    // Replace "Thinking..." with the real assistant reply
    thinkingBubble.innerHTML = reply;
    thinkingBubble.classList.remove("pending");
  } catch (error) {
    thinkingBubble.innerHTML =
      "Error getting response. Please try again later.";
    thinkingBubble.classList.remove("pending");
  }

  // Clear the input field after sending
  chatForm.querySelector("input, textarea").value = "";
});

/* Helper: Show a message in the chat window as a routine message bubble */
function showRoutineMessage(message) {
  // Remove any previous content and show as a routine chat bubble
  chatWindow.innerHTML = "";
  appendChatMessage(message, "routine");
}

// Helper: append a chat message bubble to the chat window */
function appendChatMessage(message, sender) {
  const bubble = document.createElement("div");
  bubble.className = `chat-message ${sender}`;
  bubble.innerHTML = message;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
  return bubble;
}

/* --- BEGIN: Generate Routine with OpenAI API --- */

// Get reference to the Generate Routine button
const generateBtn = document.querySelector(".generate-btn"); // Find the Generate Routine button

// Helper: Collect selected products with required fields
function getSelectedProductsForRoutine() {
  // Only include name, brand, category, and description for each product
  return selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  })); // Return a new array with only needed fields
}

// Async function to call OpenAI API and get a routine
async function generateRoutineWithOpenAI(products) {
  // Show loading message as routine bubble
  showRoutineMessage("Generating your personalized routine...");

  // Prepare the messages for the OpenAI API
  const messages = [
    {
      role: "system",
      content:
        "You are a skincare expert. Create a simple, step-by-step skincare routine using only the provided products. Explain the order and purpose of each product in a friendly, beginner way.",
    },
    {
      role: "user",
      content: `Here are the selected products:\n${JSON.stringify(
        products,
        null,
        2
      )}`,
    },
  ]; // Instructions for the AI

  try {
    // Call the Cloudflare Worker that connects to OpenAI API
    const response = await fetch(workerUrl, {
      method: "POST", // Use POST request
      headers: {
        "Content-Type": "application/json", // Send JSON data
      },
      body: JSON.stringify({ messages }), // Send the messages array
    });

    // Parse the JSON response
    const data = await response.json(); // Get the response as JSON

    // Check if the response contains the routine content
    console.log("Recieved from worker:", data); // Log the response for debugging

    const reply =
      data.choices[0]?.message?.content ||
      "No routine generated. Please try again."; // Get the AI's reply or show error

    // Show the reply in the chat window as a routine bubble
    showRoutineMessage(reply);
  } catch (error) {
    // Show error message in the chat window as a routine bubble
    showRoutineMessage("Error generating routine. Please try again later.");
  }
}

// Add click event to the Generate Routine button
if (generateBtn) {
  // If the button exists
  generateBtn.addEventListener("click", async () => {
    // When clicked
    const products = getSelectedProductsForRoutine(); // Get selected products
    if (products.length === 0) {
      // If none selected
      showRoutineMessage(
        "Please select at least one product to generate a routine."
      ); // Ask user to select products
      return; // Stop here
    }
    await generateRoutineWithOpenAI(products); // Call the function to generate the routine
  });
}

/* --- END: Generate Routine with OpenAI API --- */
