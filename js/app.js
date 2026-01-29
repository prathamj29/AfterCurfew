document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const cartBar = document.getElementById('cart-bar');
    const viewCartButton = document.getElementById('view-cart');
    const closeCartButton = document.getElementById('close-cart');
    const cartModal = document.getElementById('cart-modal');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const modalTotal = document.getElementById('modal-total');
    const checkoutButton = document.getElementById('checkout-button');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutButton = document.getElementById('close-checkout');
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutTotal = document.getElementById('checkout-total');
    const confirmationModal = document.getElementById('confirmation-modal');
    const orderIdDisplay = document.getElementById('order-id-display');
    const continueShoppingButton = document.getElementById('continue-shopping');
    const addButtons = document.querySelectorAll('.add-button');
    const categoryPills = document.querySelectorAll('.category-pill');
    const searchInput = document.getElementById('search-input');
    const productCards = document.querySelectorAll('.product-card');
    const phoneInput = document.getElementById('phone');
    const favoriteButtons = document.querySelectorAll('.favorite-button');
    const favoritesModal = document.getElementById('favorites-modal');
    const closeFavoritesButton = document.getElementById('close-favorites');
    const favoritesItems = document.getElementById('favorites-items');
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const sideNav = document.getElementById('side-nav');
    const navOverlay = document.getElementById('nav-overlay');
    const navLinks = document.querySelectorAll('.nav-link');
    const body = document.body;
    const themeOptions = document.querySelectorAll('input[name="nav-theme"]');
    const ordersModal = document.getElementById('orders-modal');
    const closeOrdersButton = document.getElementById('close-orders');
    const ordersList = document.getElementById('orders-list');

    // Form error elements
    const nameError = document.getElementById('name-error');
    const phoneError = document.getElementById('phone-error');
    const floorError = document.getElementById('floor-error');
    const roomError = document.getElementById('room-error');

    // --- CONFIGURATION ---
    // PLEASE UPDATE THIS PHONE NUMBER TO RECEIVE ORDERS
    const OWNER_PHONE_NUMBER = "919265807630"; 

    // --- PRODUCT DATA ---
    const products = [
  {
    "id": "675c7715-1e96-486f-8bc9-77715a935a09",
    "name": "Maggi Instant Noodles",
    "description": "Classic Maggi, 2-minute preparation",
    "category": "snacks",
    "price": 20,
    "image": "images/maggi20.png",
    "inStock": true
  },
  {
    "id": "958a101b-3893-4748-b67a-4c013cd19bc1",
    "name": "Maggi Cup Cheesy",
    "description": "Hot, cheesy noodles ready in a cup",
    "category": "snacks",
    "price": 80,
    "image": "images/maggi_cup_cheesy_80.png",
    "inStock": true
  },
  {
    "id": "bc98cf1b-4e66-4a75-9b04-ba33dd8742c2",
    "name": "Maggi Cup Chilli",
    "description": "Spicy, tangy chilli flavor in convenient cup",
    "category": "snacks",
    "price": 60,
    "image": "images/maggi_cup_chilli_60.png",
    "inStock": true
  },
  {
    "id": "d64a1421-b87a-4da9-83b3-f9febf5f7a5f",
    "name": "Diet Coke 300ml",
    "description": "Zero sugar, full flavor, caffeine boost - 300ml can",
    "category": "drinks",
    "price": 50,
    "image": "images/dietcoke_300ml_45.png",
    "inStock": true
  },
  {
    "id": "438137a9-0e2b-4455-8161-ecf04b658cc8",
    "name": "Nissin Cup Noodles Cheesy",
    "description": "Creamy cheesy flavor in convenient cup",
    "category": "snacks",
    "price": 60,
    "image": "images/nissin_cheesy_60.png",
    "inStock": true
  },
  {
    "id": "7981c4cc-15b4-4aa3-b267-b8522a598c54",
    "name": "Nissin Cup Noodles Kimchi",
    "description": "Spicy Korean kimchi flavor sensation",
    "category": "snacks",
    "price": 60,
    "image": "images/nissin_kimchi_60.png",
    "inStock": true
  },
  {
    "id": "e12480d7-267c-4017-82fb-6305a3685798",
    "name": "Monster Energy Drink",
    "description": "Energy drink for that extra boost",
    "category": "drinks",
    "price": 100,
    "image": "images/monster_100.png",
    "inStock": true
  },
  {
    "id": "73b4b6c6-8d6a-4da9-ab0d-83173d5a1858",
    "name": "Maggi Cup Manchurian",
    "description": "Tangy manchurian flavor in convenient cup",
    "category": "snacks",
    "price": 80,
    "image": "images/maggi_cup_manchurian_80.png",
    "inStock": true
  },
  {
    "id": "2d03860e-49f3-4e8e-a39a-90edcdfc6acf",
    "name": "Cup Noodles",
    "description": "Hot and ready in 3 minutes, no bowl needed",
    "category": "snacks",
    "price": 60,
    "image": "images/nissin_veg_60.png",
    "inStock": true
  },
  {
    "id": "5208ee42-cf72-42aa-b067-bb26729cb322",
    "name": "KitKat",
    "description": "Crispy wafer with smooth milk chocolate",
    "category": "chocolates",
    "price": 60,
    "image": "images/wickedgood_manchow_60.png",
    "inStock": false
  }
];

    // State
    let cart = [];
    let favorites = [];
    let currentCategory = 'all';
    let currentSearch = '';
    let currentTheme = 'dark';

    // Format currency
    function formatCurrency(amount) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return '₹0';
        return '₹' + numAmount.toFixed(0);
    }

    // Load data from localStorage
    function loadData() {
        // Load cart
        try {
            const savedCart = localStorage.getItem('aftercurfew-cart');
            if (savedCart) cart = JSON.parse(savedCart);
        } catch (e) { console.error("Error loading cart:", e); }

        // Load favorites
        try {
            const savedFavs = localStorage.getItem('aftercurfew-favorites');
            if (savedFavs) favorites = JSON.parse(savedFavs);
        } catch (e) { console.error("Error loading favorites:", e); }

        // Load settings
        try {
            const savedSettings = JSON.parse(localStorage.getItem('aftercurfew-settings'));
            if (savedSettings?.theme) currentTheme = savedSettings.theme;
        } catch (e) { console.error("Error loading settings:", e); }

        applyTheme(currentTheme);
        const checkedOption = document.getElementById(`nav-theme-${currentTheme}`);
        if (checkedOption) checkedOption.checked = true;

        updateCartUI();
        updateFavoritesUI();
        updateFavoriteButtons();
    }

    // Save cart
    function saveCart() {
        localStorage.setItem('aftercurfew-cart', JSON.stringify(cart));
    }

    // Save favorites
    function saveFavorites() {
        localStorage.setItem('aftercurfew-favorites', JSON.stringify(favorites));
    }

    // Save settings
    function saveSettings(theme) {
        localStorage.setItem('aftercurfew-settings', JSON.stringify({ theme }));
    }

    // Apply theme
    function applyTheme(themeName) {
        body.classList.remove('theme-colorful', 'theme-avengers', 'theme-barbie');
        if (themeName !== 'dark') body.classList.add(`theme-${themeName}`);
        currentTheme = themeName;
    }

    // Update Cart UI
    function updateCartUI() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        cartTotal.textContent = formatCurrency(total);
        modalTotal.textContent = formatCurrency(total);
        checkoutTotal.textContent = formatCurrency(total);

        // Toggle cart bar
        if (cart.length > 0) {
            cartBar.classList.remove('hidden');
            void cartBar.offsetWidth; // Trigger reflow
            cartBar.classList.add('show');
        } else {
            cartBar.classList.remove('show');
            setTimeout(() => {
                if(!cartBar.classList.contains('show')) cartBar.classList.add('hidden');
            }, 400);
        }

        // Populate modal
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        } else {
            cartItems.innerHTML = '';
            cart.forEach((item, index) => {
                const product = products.find(p => p.name === item.name) || { image: 'images/placeholder.png' };
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <img src="${product.image}" alt="${item.name}" class="item-image" />
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-details">${formatCurrency(item.price)} × ${item.quantity}</div>
                    </div>
                    <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
                    <button class="remove-button" data-index="${index}">×</button>
                `;
                cartItems.appendChild(cartItem);
            });

            // Add remove listeners
            document.querySelectorAll('.remove-button').forEach(btn => {
                btn.addEventListener('click', function() {
                    const idx = parseInt(this.getAttribute('data-index'));
                    removeFromCart(idx);
                });
            });
        }
    }

    // Add to Cart
    function addToCart(name, price) {
        const existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name: name, price: parseFloat(price), quantity: 1 });
        }
        saveCart();
        updateCartUI();
        showToast(`${name} added to cart!`, 'success');
    }

    // Remove from Cart
    function removeFromCart(index) {
        if (index >= 0 && index < cart.length) {
            cart.splice(index, 1);
            saveCart();
            updateCartUI();
        }
    }

    // Favorites Logic
    function updateFavoritesUI() {
        if (favorites.length === 0) {
            favoritesItems.innerHTML = '<p class="empty-favorites">No favorites yet</p>';
            return;
        }
        favoritesItems.innerHTML = '';
        favorites.forEach(fav => {
            const favItem = document.createElement('div');
            favItem.className = 'favorite-item';
            favItem.innerHTML = `
                <img src="${fav.image}" alt="${fav.name}" class="favorite-item-image" />
                <div class="favorite-item-info">
                    <div class="favorite-item-name">${fav.name}</div>
                    <div class="favorite-item-price">${formatCurrency(fav.price)}</div>
                </div>
                <div class="favorite-item-actions">
                    <button class="add-to-cart-small" onclick="addToCart('${fav.name}', '${fav.price}')">+</button>
                    <button class="remove-favorite" data-id="${fav.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            favoritesItems.appendChild(favItem);
        });

        document.querySelectorAll('.remove-favorite').forEach(btn => {
            btn.addEventListener('click', function() {
                toggleFavorite(this.getAttribute('data-id'));
            });
        });
        
        // Expose helper for onclick
        window.addToCart = addToCart;
    }

    function toggleFavorite(id, name, price, image) {
        const index = favorites.findIndex(f => f.id === id);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push({ id, name, price, image });
        }
        saveFavorites();
        updateFavoritesUI();
        updateFavoriteButtons();
    }

    function updateFavoriteButtons() {
        document.querySelectorAll('.favorite-button').forEach(btn => {
            const card = btn.closest('.product-card');
            const id = card.getAttribute('data-id');
            if (favorites.some(f => f.id === id)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // --- MODALS ---
    function showModal(modal) {
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.add('show');
        body.classList.add('modal-open');
    }
    function hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (!modal.classList.contains('show')) modal.classList.add('hidden');
        }, 300);
        body.classList.remove('modal-open');
    }

    // --- WHATSAPP CHECKOUT ---
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Simple Validation
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const floor = document.getElementById('floor').value;
        const room = document.getElementById('room').value;
        const instructions = document.getElementById('instructions').value;

        if (!name || !phone || !floor || !room) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        // Construct Message
        let message = `*New Order - AfterCurfew* 🌙\n\n`;
        message += `*Customer Details:*
`;
        message += `Name: ${name}\n`;
        message += `Phone: ${phone}\n`;
        message += `Location: Floor ${floor}, Room ${room}\n`;
        if (instructions) message += `Note: ${instructions}\n`;
        
        message += `\n*Order Items:*
`;
        cart.forEach(item => {
            message += `- ${item.name} x ${item.quantity} (${formatCurrency(item.price * item.quantity)})\n`;
        });
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        message += `\n*Total Amount: ${formatCurrency(total)}*`;

        // Encode and Open WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${OWNER_PHONE_NUMBER}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        
        // Save to local history just in case
        saveOrderToHistory({
            id: 'AC' + Date.now().toString().slice(-5),
            date: new Date().toISOString(),
            items: cart,
            total: total,
            status: 'sent_via_whatsapp'
        });

        // Clear cart and close
        cart = [];
        saveCart();
        updateCartUI();
        hideCheckoutModal();
        showConfirmationModal('Sent via WhatsApp');
    });

    function saveOrderToHistory(order) {
        let orders = JSON.parse(localStorage.getItem('aftercurfew-orders') || '[]');
        orders.unshift(order);
        localStorage.setItem('aftercurfew-orders', JSON.stringify(orders));
    }

    // --- EVENT LISTENERS ---
    viewCartButton.addEventListener('click', () => showModal(cartModal));
    closeCartButton.addEventListener('click', () => hideModal(cartModal));
    checkoutButton.addEventListener('click', () => { hideModal(cartModal); showModal(checkoutModal); });
    closeCheckoutButton.addEventListener('click', () => hideModal(checkoutModal));
    continueShoppingButton.addEventListener('click', () => hideModal(confirmationModal));
    
    // Nav
    navToggle.addEventListener('click', () => sideNav.classList.toggle('active') ? showSideNav() : hideSideNav());
    navClose.addEventListener('click', hideSideNav);
    navOverlay.addEventListener('click', hideSideNav);
    
    function showSideNav() {
        sideNav.classList.add('active');
        navOverlay.classList.add('active');
        body.classList.add('modal-open');
    }
    function hideSideNav() {
        sideNav.classList.remove('active');
        navOverlay.classList.remove('active');
        body.classList.remove('modal-open');
    }

    // Overlays
    document.querySelectorAll('.modal-overlay').forEach(el => {
        el.addEventListener('click', () => {
            hideModal(cartModal);
            hideModal(checkoutModal);
            hideModal(confirmationModal);
            hideModal(favoritesModal);
            hideModal(ordersModal);
            hideSideNav();
        });
    });

    // Theme
    themeOptions.forEach(opt => {
        opt.addEventListener('change', function() {
            if (this.checked) {
                applyTheme(this.value);
                saveSettings(this.value);
            }
        });
    });

    // Filtering
    categoryPills.forEach(pill => {
        pill.addEventListener('click', function() {
            currentCategory = this.getAttribute('data-category');
            categoryPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            filterProducts();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearch = this.value.toLowerCase();
            filterProducts();
        });
    }

    function filterProducts() {
        let visibleIndex = 0;
        productCards.forEach(card => {
            const cat = card.getAttribute('data-category');
            const name = card.querySelector('.product-name').textContent.toLowerCase();
            if ((currentCategory === 'all' || cat === currentCategory) && 
                (name.includes(currentSearch))) {
                card.classList.remove('hidden');
                card.style.setProperty('--index', visibleIndex++);
            } else {
                card.classList.add('hidden');
            }
        });
    }

    // Favorite Buttons
    favoriteButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            toggleFavorite(
                card.getAttribute('data-id'),
                card.querySelector('.product-name').textContent,
                card.querySelector('.product-price').textContent.replace('₹', ''),
                card.querySelector('.product-image').src
            );
        });
    });

    // Add Buttons (Global delegation)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('add-button')) {
            addToCart(e.target.getAttribute('data-name'), e.target.getAttribute('data-price'));
            
            // Animation
            const original = e.target.textContent;
            e.target.textContent = '✓';
            setTimeout(() => e.target.textContent = original, 1000);
        }
    });

    // Favorites Modal
    closeFavoritesButton.addEventListener('click', () => hideModal(favoritesModal));
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page === 'favorites') showModal(favoritesModal);
            if (page === 'orders') updateOrdersList() && showModal(ordersModal);
            hideSideNav();
        });
    });
    
    // Orders Modal
    closeOrdersButton.addEventListener('click', () => hideModal(ordersModal));
    function updateOrdersList() {
        const orders = JSON.parse(localStorage.getItem('aftercurfew-orders') || '[]');
        if (orders.length === 0) {
            ordersList.innerHTML = '<p class="empty-orders">No orders yet.</p>';
            return true;
        }
        ordersList.innerHTML = orders.map(o => `
            <div class="order-item">
                <div class="order-header">
                    <div>#${o.id}</div>
                    <div>${new Date(o.date).toLocaleDateString()}</div>
                </div>
                <div class="order-total">Total: ${formatCurrency(o.total)}</div>
                <div class="order-status">${o.status}</div>
            </div>
        `).join('');
        return true;
    }

    // Initialize
    loadData();
    phoneInput.placeholder = "+91 98765 43210";
});
