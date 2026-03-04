document.addEventListener('DOMContentLoaded', function () {
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
    const categoryPills = document.querySelectorAll('.category-pill');
    const searchInput = document.getElementById('search-input');
    const productGrid = document.getElementById('product-grid');
    const phoneInput = document.getElementById('phone');
    const toastContainer = document.getElementById('toast-container');
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

    const FB_URL = "https://aftercurfew-722d4-default-rtdb.asia-southeast1.firebasedatabase.app";

    // --- SITE CONFIGURATION ---
    let siteConfig = {
        ownerPhone: "919265807630",
        deliveryHours: "12 AM - 3 AM",
        deliveryFee: 10,
        pickupLocation: "Room 730"
    };

    // --- PRODUCT DATA ---
    let products = [];

    // --- FIREBASE SYNC ---
    async function loadFirebaseData() {
        try {
            const res = await fetch(FB_URL + '/.json');
            const data = await res.json();
            if (data) {
                if (data.siteConfig) siteConfig = data.siteConfig;
                if (data.products) products = data.products;
                renderProducts();
                checkStoreStatus();
            }
        } catch (e) {
            console.error("Failed to load Firebase data:", e);
        }
    }

    // Check if store is open/closed
    function checkStoreStatus() {
        const existing = document.getElementById('store-closed-overlay');
        if (existing) existing.remove();

        if (siteConfig.storeOpen === false) {
            const overlay = document.createElement('div');
            overlay.id = 'store-closed-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;';
            overlay.innerHTML = `
                <div style="text-align:center;max-width:360px;">
                    <div style="font-size:64px;margin-bottom:16px;">🌙</div>
                    <h2 style="font-size:24px;font-weight:800;color:#f0f0f0;margin-bottom:8px;">We're Closed</h2>
                    <p style="color:#999;font-size:15px;line-height:1.5;margin-bottom:16px;">AfterCurfew is currently not taking orders. Come back during delivery hours!</p>
                    <div style="background:#1a1a1a;border-radius:12px;padding:16px;border:1px solid #333;">
                        <div style="font-size:13px;color:#888;margin-bottom:4px;">⏰ Delivery Hours</div>
                        <div style="font-size:18px;font-weight:700;color:#6ee7b7;">${siteConfig.deliveryHours || '10 PM - 3 AM'}</div>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
        }
    }

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

    // Show toast notification
    function showToast(message, type) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'success');
        toast.textContent = message;
        toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Helper to get stock display info
    function getStockInfo(product) {
        const stock = typeof product.stock === 'number' ? product.stock : (product.inStock ? 10 : 0);
        const isAvailable = stock > 0;
        const isLow = stock > 0 && stock <= 3;
        let label = '';
        let cssClass = '';
        if (stock === 0) {
            label = 'Sold Out';
            cssClass = 'out-of-stock';
        } else if (isLow) {
            label = 'Only ' + stock + ' left!';
            cssClass = 'low-stock';
        } else {
            label = stock + ' available';
            cssClass = 'in-stock';
        }
        return { stock, isAvailable, isLow, label, cssClass };
    }

    // Render products dynamically
    function renderProducts() {
        if (!productGrid) return;
        productGrid.innerHTML = '';
        let visibleIndex = 0;

        // Sort: in-stock first (by quantity desc), then out-of-stock
        const sortedProducts = [...products].sort((a, b) => {
            const stockA = typeof a.stock === 'number' ? a.stock : (a.inStock ? 10 : 0);
            const stockB = typeof b.stock === 'number' ? b.stock : (b.inStock ? 10 : 0);
            if (stockA === 0 && stockB === 0) return 0;
            if (stockA === 0) return 1;
            if (stockB === 0) return -1;
            return stockB - stockA;
        });

        sortedProducts.forEach(product => {
            const matchesCat = currentCategory === 'all' || product.category === currentCategory;
            const matchesSearch = product.name.toLowerCase().includes(currentSearch);
            if (!matchesCat || !matchesSearch) return;

            const info = getStockInfo(product);
            const isFav = favorites.some(f => f.id === product.id);
            const card = document.createElement('article');
            card.className = 'product-card' + (!info.isAvailable ? ' sold-out-card' : '');
            card.setAttribute('data-category', product.category);
            card.setAttribute('data-id', product.id);
            card.setAttribute('data-stock', String(info.stock));
            card.setAttribute('role', 'article');
            card.setAttribute('aria-label', product.name + ' ' + formatCurrency(product.price) + ' \u2014 ' + info.label);
            card.style.setProperty('--index', visibleIndex++);

            var soldOutOverlay = !info.isAvailable ? '<div class="sold-out-overlay"><span>SOLD OUT</span></div>' : '';
            var stockBadge = '';
            if (info.isAvailable) {
                stockBadge = '<div class="stock-badge' + (info.isLow ? ' stock-badge-low' : ' stock-badge-ok') + '">' + info.label + '</div>';
            }

            card.innerHTML = '<div class="product-image-container">' +
                '<img src="' + product.image + '" alt="' + product.name + '" class="product-image" loading="lazy" />' +
                soldOutOverlay +
                stockBadge +
                '<button class="favorite-button' + (isFav ? ' active' : '') + '" data-product-id="' + product.id + '" aria-label="' + (isFav ? 'Remove from' : 'Add to') + ' favorites">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' +
                '</svg></button></div>' +
                '<div class="product-info">' +
                '<h3 class="product-name">' + product.name + '</h3>' +
                '<p class="product-description">' + product.description + '</p>' +
                '<div class="product-footer">' +
                '<div class="stock-status ' + info.cssClass + '">' +
                '<span class="stock-indicator ' + (info.isAvailable ? (info.isLow ? 'stock-low' : 'stock-in') : 'stock-out') + '"></span>' +
                '<span class="stock-label">' + info.label + '</span></div>' +
                '<span class="product-price">' + formatCurrency(product.price) + '</span>' +
                '<button class="add-button" data-name="' + product.name + '" data-price="' + product.price + '"' +
                (!info.isAvailable ? ' disabled' : '') +
                ' aria-label="Add ' + product.name + ' to cart">' +
                (info.isAvailable ? 'Add to Cart' : 'Sold Out') + '</button>' +
                '</div></div>';

            productGrid.appendChild(card);
        });
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

    // Call load on script init
    loadFirebaseData();

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
        // Checkout total is handled by updateCheckoutTotal() which accounts for delivery fee
        if (typeof updateCheckoutTotal === 'function') updateCheckoutTotal();

        // Toggle cart bar
        if (cart.length > 0) {
            cartBar.classList.remove('hidden');
            void cartBar.offsetWidth; // Trigger reflow
            cartBar.classList.add('show');
        } else {
            cartBar.classList.remove('show');
            setTimeout(() => {
                if (!cartBar.classList.contains('show')) cartBar.classList.add('hidden');
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
                btn.addEventListener('click', function () {
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
            btn.addEventListener('click', function () {
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
        // Re-render is the simplest way to keep favorites in sync with dynamic cards
        renderProducts();
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

    // --- DELIVERY OPTION TOGGLE ---
    const deliveryRadios = document.querySelectorAll('input[name="delivery-type"]');
    const deliveryDetails = document.getElementById('delivery-details');

    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            deliveryDetails.style.display = this.value === 'delivery' ? 'block' : 'none';
            updateCheckoutTotal();
        });
    });

    function getDeliveryType() {
        const checked = document.querySelector('input[name="delivery-type"]:checked');
        return checked ? checked.value : 'pickup';
    }

    function updateCheckoutTotal() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = getDeliveryType() === 'delivery' ? (siteConfig.deliveryFee || 10) : 0;
        const total = subtotal + deliveryFee;
        checkoutTotal.textContent = formatCurrency(total);

        // Update order summary breakdown
        const summary = document.getElementById('order-summary');
        if (summary && cart.length > 0) {
            let html = '<div class="summary-line"><span>Subtotal</span><span>' + formatCurrency(subtotal) + '</span></div>';
            if (deliveryFee > 0) {
                html += '<div class="summary-line delivery-fee"><span>🚪 Room Delivery</span><span>+' + formatCurrency(deliveryFee) + '</span></div>';
            } else {
                html += '<div class="summary-line pickup-free"><span>🏃 Pickup</span><span>Free</span></div>';
            }
            summary.innerHTML = html;
        }

        // Render upsell suggestions
        renderUpsell();
    }

    // --- UPSELL AT CHECKOUT ---
    function renderUpsell() {
        const section = document.getElementById('upsell-section');
        if (!section || cart.length === 0) { if (section) section.innerHTML = ''; return; }

        const cartNames = cart.map(i => i.name);
        const available = products.filter(p => {
            const stock = typeof p.stock === 'number' ? p.stock : (p.inStock ? 10 : 0);
            return stock > 0 && !cartNames.includes(p.name);
        });

        if (available.length === 0) { section.innerHTML = ''; return; }

        // Pick up to 3 random products
        const shuffled = available.sort(() => 0.5 - Math.random());
        const suggestions = shuffled.slice(0, 3);

        let html = '<div style="border-top:1px solid var(--dark-surface);padding-top:14px;margin-top:4px;">';
        html += '<div style="font-size:12px;color:var(--gray-400);margin-bottom:10px;font-weight:600;">⚡ Quick add something extra?</div>';
        html += '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">';

        suggestions.forEach(p => {
            html += `<div class="upsell-item" data-name="${p.name}" data-price="${p.price}" style="
                flex:0 0 auto;display:flex;align-items:center;gap:8px;
                background:var(--dark-surface);border:1px solid transparent;
                border-radius:10px;padding:8px 12px;cursor:pointer;
                transition:border-color 0.2s,transform 0.15s;
                min-width:0;max-width:180px;
            ">
                <img src="${p.image}" alt="" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">
                <div style="min-width:0;flex:1;">
                    <div style="font-size:12px;font-weight:600;color:var(--soft-white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
                    <div style="font-size:11px;color:var(--accent);font-weight:700;">${formatCurrency(p.price)}</div>
                </div>
                <div style="font-size:18px;color:var(--accent);font-weight:700;flex-shrink:0;">+</div>
            </div>`;
        });

        html += '</div></div>';
        section.innerHTML = html;

        // Add click listeners
        section.querySelectorAll('.upsell-item').forEach(item => {
            item.addEventListener('click', function () {
                const name = this.dataset.name;
                const price = this.dataset.price;
                addToCart(name, price);
                this.style.borderColor = 'var(--accent)';
                this.style.transform = 'scale(0.95)';
                const plus = this.querySelector('div:last-child');
                if (plus) plus.textContent = '✓';
                setTimeout(() => {
                    this.style.opacity = '0.5';
                    this.style.pointerEvents = 'none';
                }, 300);
                updateCheckoutTotal();
            });
        });
    }

    // --- WHATSAPP CHECKOUT ---
    checkoutForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const deliveryType = getDeliveryType();
        const floor = document.getElementById('floor').value.trim();
        const room = document.getElementById('room').value.trim();
        const instructions = document.getElementById('instructions').value.trim();

        // Validation
        if (!name || !phone) {
            showToast('Please fill in your name and phone number', 'error');
            return;
        }
        if (deliveryType === 'delivery' && (!floor || !room)) {
            showToast('Please enter your floor and room number for delivery', 'error');
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = deliveryType === 'delivery' ? (siteConfig.deliveryFee || 10) : 0;
        const total = subtotal + deliveryFee;

        // Construct WhatsApp Message
        let message = `*New Order - AfterCurfew* 🌙\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${name}\n`;
        message += `Phone: ${phone}\n`;
        if (deliveryType === 'pickup') {
            message += `📍 *Pickup from ${siteConfig.pickupLocation || 'Room 730'}*\n`;
        } else {
            message += `🚪 *Deliver to Floor ${floor}, Room ${room}*\n`;
        }
        if (instructions) message += `Note: ${instructions}\n`;

        message += `\n*Order Items:*\n`;
        cart.forEach(item => {
            message += `- ${item.name} x ${item.quantity} (${formatCurrency(item.price * item.quantity)})\n`;
        });

        message += `\n*Subtotal: ${formatCurrency(subtotal)}*`;
        if (deliveryFee > 0) {
            message += `\n*Delivery Fee: ${formatCurrency(deliveryFee)}*`;
        }
        message += `\n*Total: ${formatCurrency(total)}*`;

        // Open WhatsApp
        const ownerPhone = siteConfig.ownerPhone || "919265807630";
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${ownerPhone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');

        // Save to local history
        const orderId = 'AC' + Date.now().toString().slice(-5);
        orderIdDisplay.textContent = orderId;

        const orderData = {
            orderId: orderId,
            customerName: name,
            phone: phone,
            deliveryType: deliveryType,
            floor: floor || '-',
            room: room || '-',
            items: [...cart],
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            total: total,
            instructions: instructions || '-'
        };

        saveOrderToHistory({
            id: orderId,
            date: new Date().toISOString(),
            items: [...cart],
            total: total,
            deliveryType: deliveryType,
            deliveryFee: deliveryFee,
            status: 'sent_via_whatsapp'
        });

        // Log to Google Sheet (fire-and-forget)
        logOrderToSheet(orderData);

        // Deduct stock instantly in Firebase for everyone globally
        cart.forEach(item => {
            const productIndex = products.findIndex(p => p.name === item.name);
            if (productIndex !== -1) {
                const product = products[productIndex];
                const currentStock = typeof product.stock === 'number' ? product.stock : (product.inStock ? 10 : 0);
                const newStock = Math.max(0, currentStock - item.quantity);
                product.stock = newStock;
                product.inStock = newStock > 0;

                // Fire off REST update to push new stock to server
                fetch(`${FB_URL}/products/${productIndex}.json`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stock: newStock, inStock: newStock > 0 })
                }).catch(e => console.warn('Silent stock push failed', e));
            }
        });

        // Re-render products to show updated stock
        renderProducts();

        // Clear cart and close
        const lastOrderItems = [...cart];
        const lastOrderTotal = total;
        const lastOrderId = orderId;
        cart = [];
        saveCart();
        updateCartUI();
        hideModal(checkoutModal);

        // Generate share card content
        generateShareCard(lastOrderItems, lastOrderTotal, lastOrderId);
        showModal(confirmationModal);
    });

    // --- LOG ORDER TO GOOGLE SHEET ---
    function logOrderToSheet(orderData) {
        if (!siteConfig.sheetUrl) return;
        try {
            fetch(siteConfig.sheetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            }).catch(err => console.warn('Sheet logging failed:', err));
        } catch (e) {
            console.warn('Sheet logging error:', e);
        }
    }

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

    // --- SHAREABLE ORDER CARD ---
    function generateShareCard(items, total, orderId) {
        const content = document.getElementById('share-card-content');
        if (!content) return;

        const itemList = items.map(i => `${i.name} × ${i.quantity}`).join(', ');
        const emojis = ['🍜', '🔥', '😋', '🌙', '✨', '🎉'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        const shareText = `${randomEmoji} Just ordered from AfterCurfew! 🌙\n\n🛒 ${itemList}\n💰 Total: ${formatCurrency(total)}\n\nLate-night cravings sorted! Order yours at aftercurfew.in`;

        content.textContent = shareText;
        content.dataset.shareText = shareText;
    }

    // Share on WhatsApp
    const shareWhatsappBtn = document.getElementById('share-whatsapp');
    if (shareWhatsappBtn) {
        shareWhatsappBtn.addEventListener('click', function () {
            const content = document.getElementById('share-card-content');
            const text = content?.dataset.shareText || '';
            if (text) {
                window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
            }
        });
    }

    // Copy to clipboard
    const shareCopyBtn = document.getElementById('share-copy');
    if (shareCopyBtn) {
        shareCopyBtn.addEventListener('click', function () {
            const content = document.getElementById('share-card-content');
            const text = content?.dataset.shareText || '';
            if (text && navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    this.textContent = '✅ Copied!';
                    setTimeout(() => this.textContent = '📋 Copy to Clipboard', 2000);
                });
            }
        });
    }

    // Nav
    navToggle.addEventListener('click', () => {
        if (sideNav.classList.contains('active')) { hideSideNav(); } else { showSideNav(); }
    });
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
        opt.addEventListener('change', function () {
            if (this.checked) {
                applyTheme(this.value);
                saveSettings(this.value);
            }
        });
    });

    // Filtering
    categoryPills.forEach(pill => {
        pill.addEventListener('click', function () {
            currentCategory = this.getAttribute('data-category');
            categoryPills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            filterProducts();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            currentSearch = this.value.toLowerCase();
            filterProducts();
        });
    }

    function filterProducts() {
        renderProducts();
    }

    // Global click delegation for dynamic product cards
    document.addEventListener('click', function (e) {
        // Add to cart
        if (e.target.classList.contains('add-button') && !e.target.disabled) {
            addToCart(e.target.getAttribute('data-name'), e.target.getAttribute('data-price'));
            const original = e.target.textContent;
            e.target.textContent = '✓ Added';
            setTimeout(() => e.target.textContent = original, 1000);
        }

        // Favorite toggle
        const favBtn = e.target.closest('.favorite-button');
        if (favBtn && favBtn.hasAttribute('data-product-id')) {
            e.stopPropagation();
            const productId = favBtn.getAttribute('data-product-id');
            const product = products.find(p => p.id === productId);
            if (product) {
                toggleFavorite(product.id, product.name, product.price, product.image);
            }
        }
    });

    // Favorites Modal
    closeFavoritesButton.addEventListener('click', () => hideModal(favoritesModal));
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
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
    renderProducts();
    if (phoneInput) phoneInput.placeholder = "+91 98765 43210";
});
