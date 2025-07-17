/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Track selected products by their unique name */
let selectedProducts = [];

/* Reference to the selected products section */
const selectedProductsList = document.getElementById("selectedProductsList");

const workerUrl = "https://loreal-worker.ninawark.workers.dev/";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Helper: update the Selected Products section */
function updateSelectedProducts() {
  if (!selectedProducts.length) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    return;
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
    .join("");

  // Add event listeners for remove buttons
  const removeBtns = selectedProductsList.querySelectorAll(".remove-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const name = btn.getAttribute("data-name");
      selectedProducts = selectedProducts.filter((p) => p.name !== name);
      updateSelectedProducts();
      // Also update product grid highlights
      highlightSelectedCards();
    });
  });
}

/* Helper: highlight selected cards in the grid */
function highlightSelectedCards() {
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    const name = card.querySelector("h3").textContent;
    if (selectedProducts.some((p) => p.name === name)) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
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
    .join("");

  // Add click event to each product card for selection
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const name = card.getAttribute("data-name");
      // Find product by name
      loadProducts().then((allProducts) => {
        const product = allProducts.find((p) => p.name === name);
        if (!product) return;
        const alreadySelected = selectedProducts.some((p) => p.name === name);
        if (alreadySelected) {
          // Unselect
          selectedProducts = selectedProducts.filter((p) => p.name !== name);
        } else {
          // Select
          selectedProducts.push(product);
        }
        updateSelectedProducts();
        highlightSelectedCards();
      });
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
  highlightSelectedCards();
});

/* Initial render of selected products */
updateSelectedProducts();

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});

/* --- BEGIN: Generate Routine with OpenAI API --- */

// Get reference to the Generate Routine button
const generateBtn = document.querySelector(".generate-btn");

// Helper: Show a message in the chat window
function showChatMessage(message) {
  chatWindow.innerHTML = `<div>${message}</div>`;
}

// Helper: Collect selected products with required fields
function getSelectedProductsForRoutine() {
  // Only include name, brand, category, and description for each product
  return selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));
}

// Async function to call OpenAI API and get a routine
async function generateRoutineWithOpenAI(products) {
  // Show loading message
  showChatMessage("Generating your personalized routine...");

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
  ];

  try {
    // Call the OpenAI API using fetch
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Replace YOUR_OPENAI_API_KEY with your actual OpenAI API key
        Authorization: "Bearer YOUR_OPENAI_API_KEY",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 400,
      }),
    });

    const data = await response.json();

    // Check if the response contains the AI's message
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      showChatMessage(data.choices[0].message.content);
    } else {
      showChatMessage("Sorry, something went wrong. Please try again.");
    }
  } catch (error) {
    showChatMessage("Error: Could not generate routine.");
  }
}

// Add click event to the Generate Routine button
if (generateBtn) {
  generateBtn.addEventListener("click", async () => {
    const products = getSelectedProductsForRoutine();
    if (products.length === 0) {
      showChatMessage(
        "Please select at least one product to generate a routine."
      );
      return;
    }
    await generateRoutineWithOpenAI(products);
  });
}

/* --- END: Generate Routine with OpenAI API --- */
