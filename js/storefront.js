import { fetchFirebaseData, updateProduct, fetchPromoCodes, incrementPromoUse } from './firebase.js'
import {
  getCart, addItem, removeItem, updateQuantity, clearCart,
  getItemCount, getSubtotal, onChange as onCartChange,
} from './cart.js'

// --- State ---
let products = []
let siteConfig = {}
let promoCodes = {}
let appliedPromo = null
let favorites = []
let currentCategory = 'all'
let currentSearch = ''
let currentTab = 'home'

// --- DOM refs ---
const $ = (id) => document.getElementById(id)
const productGrid = $('product-grid')
const searchInput = $('search-input')
const searchContainer = $('search-container')
const searchToggle = $('search-toggle')
const searchClose = $('search-close')
const categoryContainer = $('category-container')
const cartFab = $('cart-fab')
const cartCount = $('cart-count')
const detailSheet = $('detail-sheet')
const detailOverlay = $('detail-overlay')
const detailContent = $('detail-content')
const cartSheet = $('cart-sheet')
const cartOverlay = $('cart-overlay')
const cartList = $('cart-list')
const cartSubtotal = $('cart-subtotal')
const checkoutBtn = $('checkout-btn')
const checkoutModal = $('checkout-modal')
const checkoutOverlay = $('checkout-overlay')
const checkoutForm = $('checkout-form')
const confirmationModal = $('confirmation-modal')
const confirmOverlay = $('confirm-overlay')
const favList = $('fav-list')
const ordersList = $('orders-list')
const toastContainer = $('toast-container')
const closedOverlay = $('closed-overlay')
const tabs = document.querySelectorAll('.tab-item')
const tabContents = document.querySelectorAll('.tab-content')
const heroSection = document.querySelector('.hero')

// --- Utility ---
function formatPrice(n) {
  return '₹' + parseFloat(n || 0).toFixed(0)
}

function showToast(msg, type = 'success') {
  if (!toastContainer) return
  const t = document.createElement('div')
  t.className = `toast toast-${type}`
  t.textContent = msg
  toastContainer.appendChild(t)
  requestAnimationFrame(() => t.classList.add('show'))
  setTimeout(() => {
    t.classList.remove('show')
    setTimeout(() => t.remove(), 300)
  }, 2500)
}

function bodyLock(on) {
  document.body.classList.toggle('modal-open', on)
}

// --- Favorites ---
function loadFavorites() {
  try {
    const saved = localStorage.getItem('aftercurfew-favorites')
    if (saved) favorites = JSON.parse(saved)
  } catch (e) {}
}

function saveFavorites() {
  localStorage.setItem('aftercurfew-favorites', JSON.stringify(favorites))
}

function isFav(id) {
  return favorites.some(f => f.id === id)
}

function toggleFav(id, name, price, image) {
  const idx = favorites.findIndex(f => f.id === id)
  if (idx > -1) {
    favorites.splice(idx, 1)
  } else {
    favorites.push({ id, name, price, image })
  }
  saveFavorites()
  renderProducts()
  updateFavButtons()
  if (currentTab === 'favorites') renderFavorites()
}

function updateFavButtons() {
  document.querySelectorAll('.card-fav').forEach(btn => {
    const id = btn.dataset.id
    btn.classList.toggle('active', isFav(id))
    btn.querySelector('svg').setAttribute('fill', isFav(id) ? 'currentColor' : 'none')
    btn.setAttribute('aria-label', isFav(id) ? 'Remove from favorites' : 'Add to favorites')
  })
}

// --- Stock helpers ---
function getStockInfo(product) {
  const stock = typeof product.stock === 'number' ? product.stock : (product.inStock ? 10 : 0)
  return {
    stock,
    available: stock > 0,
    low: stock > 0 && stock <= 3,
    sold: stock === 0,
    label: stock === 0 ? 'Sold Out' : stock <= 3 ? `Only ${stock} left` : `${stock} available`,
  }
}

function getRemainingStock(product) {
  const info = getStockInfo(product)
  if (!info.available) return 0
  const inCart = getCart()
    .filter(i => i.name === product.name)
    .reduce((sum, i) => sum + i.quantity, 0)
  return Math.max(0, info.stock - inCart)
}

function tryAddToCart(name, price, qty = 1) {
  const product = products.find(p => p.name === name)
  if (!product) return false
  const remaining = getRemainingStock(product)
  if (remaining < qty) {
    const left = getStockInfo(product).stock
    showToast(left > 0 ? `Only ${left} left in stock` : `${name} is sold out`, 'error')
    return false
  }
  addItem(name, price, qty)
  return true
}

// --- Render products ---
function renderProducts() {
  if (!productGrid) return
  productGrid.innerHTML = ''
  let visibleIndex = 0

  const sorted = [...products].sort((a, b) => {
    const sA = typeof a.stock === 'number' ? a.stock : (a.inStock ? 10 : 0)
    const sB = typeof b.stock === 'number' ? b.stock : (b.inStock ? 10 : 0)
    if (sA === 0 && sB === 0) return 0
    if (sA === 0) return 1
    if (sB === 0) return -1
    return sB - sA
  })

  sorted.forEach(product => {
    const matchesCat = currentCategory === 'all' || product.category === currentCategory
    const matchesSearch = product.name.toLowerCase().includes(currentSearch)
    if (!matchesCat || !matchesSearch) return

    const info = getStockInfo(product)
    const fav = isFav(product.id)

    const card = document.createElement('article')
    card.className = `product-card${info.sold ? ' sold-out' : ''}`
    card.style.setProperty('--index', visibleIndex++)
    card.dataset.id = product.id

    const badgeHtml = info.sold
      ? '<span class="card-stock-badge sold">Sold Out</span>'
      : info.low
        ? '<span class="card-stock-badge low">Only ' + info.stock + ' left</span>'
        : ''

    const promoBadgeHtml = getProductPromoBadge(product)

    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <button class="card-fav${fav ? ' active' : ''}" data-id="${product.id}" aria-label="${fav ? 'Remove from' : 'Add to'} favorites">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        ${badgeHtml}
        ${promoBadgeHtml}
        ${!info.sold ? '<button class="card-add" data-name="' + product.name + '" data-price="' + product.price + '" aria-label="Quick add ' + product.name + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>' : ''}
      </div>
      <div class="card-body">
        <h3 class="card-name">${product.name}</h3>
        <span class="card-price">${formatPrice(product.price)}</span>
      </div>
    `

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-fav') || e.target.closest('.card-add')) return
      openDetail(product)
    })

    productGrid.appendChild(card)
  })
}

// --- Product Detail Sheet ---
let detailProduct = null
let detailQty = 1

function openDetail(product) {
  detailProduct = product
  detailQty = 1
  const info = getStockInfo(product)
  detailContent.innerHTML = `
    <img src="${product.image}" alt="${product.name}" class="detail-image" />
    <div class="detail-body">
      <div class="detail-header">
        <h2 class="detail-name">${product.name}</h2>
        <span class="detail-price">${formatPrice(product.price)}</span>
      </div>
      <p class="detail-desc">${product.description || ''}</p>
      <div class="detail-stock ${info.sold ? 'out-of-stock' : info.low ? 'low-stock' : 'in-stock'}">
        <span class="dot"></span>
        <span>${info.label}</span>
      </div>
      ${!info.sold ? `
        <div class="qty-selector">
          <button class="qty-btn" id="qty-minus" aria-label="Decrease quantity">−</button>
          <span class="qty-value" id="qty-value">1</span>
          <button class="qty-btn" id="qty-plus" aria-label="Increase quantity">+</button>
        </div>
        <button class="add-to-cart-btn" id="detail-add-btn">
          Add to Cart — ${formatPrice(product.price)}
        </button>
      ` : ''}
    </div>
  `
  detailSheet.classList.add('open')
  bodyLock(true)

  // Qty controls
  const qtyMinus = $('qty-minus')
  const qtyPlus = $('qty-plus')
  const qtyValue = $('qty-value')
  const addBtn = $('detail-add-btn')

  if (qtyMinus && qtyPlus && qtyValue && addBtn) {
    const maxQty = getRemainingStock(detailProduct)
    function updateQtyUI() {
      qtyValue.textContent = detailQty
      qtyMinus.disabled = detailQty <= 1
      qtyPlus.disabled = detailQty >= maxQty
      addBtn.textContent = `Add to Cart — ${formatPrice(product.price * detailQty)}`
    }
    qtyMinus.addEventListener('click', () => { if (detailQty > 1) { detailQty--; updateQtyUI() } })
    qtyPlus.addEventListener('click', () => { if (detailQty < maxQty) { detailQty++; updateQtyUI() } })
    addBtn.addEventListener('click', () => {
      if (!tryAddToCart(product.name, product.price, detailQty)) return
      showToast(`${product.name} added to cart!`)
      closeDetail()
    })
  }
}

function closeDetail() {
  detailSheet.classList.remove('open')
  bodyLock(false)
}

// --- Cart Sheet ---
function renderCartSheet() {
  const items = getCart()
  const total = getSubtotal()

  if (items.length === 0) {
    cartList.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p>Your cart is empty</p>
      </div>
    `
    cartSubtotal.textContent = formatPrice(0)
    checkoutBtn.disabled = true
    renderCartPromoBanner()
    return
  }

  checkoutBtn.disabled = false
  cartList.innerHTML = items.map((item, i) => {
    const product = products.find(p => p.name === item.name) || {}
    return `
      <div class="cart-item">
        <img src="${product.image || 'https://placehold.co/48/16161e/a1a1aa?text=?'}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatPrice(item.price)} each</div>
        </div>
        <div class="cart-item-actions">
          <button class="qty-btn-sm" data-index="${i}" data-dir="-1" aria-label="Decrease">−</button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button class="qty-btn-sm" data-index="${i}" data-dir="1" aria-label="Increase">+</button>
          <span class="cart-item-total">${formatPrice(item.price * item.quantity)}</span>
          <button class="cart-item-remove" data-index="${i}" aria-label="Remove">×</button>
        </div>
      </div>
    `
  }).join('')

  cartSubtotal.textContent = formatPrice(total)

  // Event listeners for cart items
  cartList.querySelectorAll('.qty-btn-sm').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index)
      const dir = parseInt(btn.dataset.dir)
      const item = getCart()[idx]
      if (!item) return
      if (dir > 0) {
        const product = products.find(p => p.name === item.name)
        if (product && getRemainingStock(product) <= 0) {
          const left = getStockInfo(product).stock
          showToast(left > 0 ? `Only ${left} left in stock` : `${item.name} is sold out`, 'error')
          return
        }
      }
      const newQty = item.quantity + dir
      if (newQty <= 0) {
        removeItem(idx)
        showToast('Item removed from cart')
      } else {
        updateQuantity(idx, newQty)
      }
      renderCartSheet()
      updateCartFab()
    })
  })

  cartList.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeItem(parseInt(btn.dataset.index))
      showToast('Item removed from cart')
      renderCartSheet()
      updateCartFab()
    })
  })
  renderCartPromoBanner()
}

function openCartSheet() {
  renderCartSheet()
  cartSheet.classList.add('open')
  bodyLock(true)
}

function closeCartSheet() {
  cartSheet.classList.remove('open')
  bodyLock(false)
}

// --- Cart FAB ---
function updateCartFab() {
  const count = getItemCount()
  if (count > 0) {
    cartFab.classList.remove('hidden')
    cartCount.textContent = count
  } else {
    cartFab.classList.add('hidden')
  }
}

onCartChange(() => {
  updateCartFab()
})

// --- Categories ---
function renderCategories() {
  categoryContainer.innerHTML = `
    <button class="category-tab${currentCategory === 'all' ? ' active' : ''}" data-category="all">All Items</button>
    <button class="category-tab${currentCategory === 'cup-noodles' ? ' active' : ''}" data-category="cup-noodles">Cup Noodles</button>
    <button class="category-tab${currentCategory === 'instant-noodles' ? ' active' : ''}" data-category="instant-noodles">Instant Noodles</button>
    <button class="category-tab${currentCategory === 'beverages' ? ' active' : ''}" data-category="beverages">Beverages</button>
    <button class="category-tab${currentCategory === 'chocolates' ? ' active' : ''}" data-category="chocolates">Chocolates</button>
    <button class="category-tab${currentCategory === 'snacks' ? ' active' : ''}" data-category="snacks">Snacks</button>
  `

  categoryContainer.querySelectorAll('.category-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category
      categoryContainer.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      renderProducts()
    })
  })
}

// --- Tabs ---
function switchTab(tab) {
  currentTab = tab
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab))
  tabContents.forEach(c => c.classList.toggle('hidden', c.id !== `${tab}-content`))

  // Show/hide hero on non-home tabs
  if (heroSection) {
    heroSection.classList.toggle('hidden', tab !== 'home')
  }
  categoryContainer?.classList.toggle('hidden', tab !== 'home')

  if (tab === 'favorites') renderFavorites()
  if (tab === 'orders') renderOrders()
}

// --- Favorites Tab ---
function renderFavorites() {
  if (!favList) return
  if (favorites.length === 0) {
    favList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <p>No favorites yet</p>
      </div>
    `
    return
  }

  favList.innerHTML = `<div class="fav-grid">` + favorites.map(f => `
    <article class="product-card" style="--index:0">
      <div class="card-image-wrap">
        <img src="${f.image}" alt="${f.name}" loading="lazy" />
        <button class="card-fav active" data-id="${f.id}" aria-label="Remove from favorites">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button class="card-add" data-name="${f.name}" data-price="${f.price}" aria-label="Quick add ${f.name}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <div class="card-body">
        <h3 class="card-name">${f.name}</h3>
        <span class="card-price">${formatPrice(f.price)}</span>
      </div>
    </article>
  `).join('') + `</div>`

}

// --- Orders Tab ---
function renderOrders() {
  if (!ordersList) return
  const orders = JSON.parse(localStorage.getItem('aftercurfew-orders') || '[]')
  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>No orders yet</p>
      </div>
    `
    return
  }

  ordersList.innerHTML = orders.map(o => `
    <div class="order-item">
      <div class="order-header">
        <span class="order-id">#${o.id}</span>
        <span class="order-date">${new Date(o.date).toLocaleDateString()}</span>
      </div>
      <div class="order-items">${o.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}</div>
      <div class="order-footer">
        <span class="order-total">${formatPrice(o.total)}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="order-status sent">${(o.status || 'Sent').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
          <button class="reorder-btn" onclick="window.reorderItems('${encodeURIComponent(JSON.stringify(o.items))}')">↻ Reorder</button>
        </div>
      </div>
    </div>
  `).join('')
}

function reorderItems(itemsStr) {
  try {
    const items = JSON.parse(decodeURIComponent(itemsStr))
    if (!items.length) return
    clearCart()
    let clamped = false
    items.forEach(item => {
      const product = products.find(p => p.name === item.name)
      const qty = product ? Math.min(item.quantity, getRemainingStock(product)) : 0
      if (qty < item.quantity) clamped = true
      if (qty > 0) addItem(item.name, item.price, qty)
    })
    updateCartFab()
    showToast(clamped ? 'Some items limited by stock' : 'Items added to cart!')
  } catch (e) {
    showToast('Failed to reorder', 'error')
  }
}

// --- Checkout ---
function openCheckout(prefillCode) {
  if (!prefillCode) appliedPromo = null
  const statusEl = $('promo-status')
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'promo-status' }
  const inputEl = $('promo-code')
  if (inputEl) inputEl.value = prefillCode || ''
  closeCartSheet()
  checkoutModal.classList.add('open')
  bodyLock(true)
  if (prefillCode) {
    applyPromoCode()
  } else {
    renderCheckoutSummary()
  }
}

function closeCheckout() {
  checkoutModal.classList.remove('open')
  bodyLock(false)
}

function renderCheckoutSummary() {
  const summary = $('checkout-summary')
  const totalEl = $('checkout-total')
  if (!summary) return
  const subtotal = getSubtotal()
  const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value || 'pickup'
  let discount = 0
  let freeItemLine = ''
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discount = Math.round(subtotal * appliedPromo.value / 100)
    } else if (appliedPromo.type === 'flat') {
      discount = Math.min(appliedPromo.value, subtotal)
    } else if (appliedPromo.type === 'free_item') {
      freeItemLine = `<div class="summary-line promo-free-item"><span>🎁 Free ${appliedPromo.itemName}</span><span>₹0</span></div>`
    }
  }
  const fee = deliveryType === 'delivery' ? (siteConfig.deliveryFee || 30) : 0
  const total = Math.max(0, subtotal + fee - discount)

  let html = `<div class="summary-line"><span>Subtotal (${getItemCount()} items)</span><span>${formatPrice(subtotal)}</span></div>`
  if (appliedPromo) {
    html += `<div class="summary-line promo-discount" style="cursor:pointer;" onclick="window.removePromo()" title="Remove promo"><span>Promo ${appliedPromo.code} <span style="font-size:11px;color:var(--error);">(remove)</span></span><span>${discount > 0 ? '-' + formatPrice(discount) : '🎁'}</span></div>`
  }
  if (freeItemLine) html += freeItemLine
  if (fee > 0) {
    html += `<div class="summary-line"><span>Delivery fee</span><span>${formatPrice(fee)}</span></div>`
  } else {
    html += `<div class="summary-line"><span>Pickup</span><span>Free</span></div>`
  }
  html += `<div class="summary-line total"><span>Total</span><span>${formatPrice(total)}</span></div>`
  summary.innerHTML = html
  if (totalEl) totalEl.textContent = formatPrice(total)

  // Promo suggestions + Upsell
  renderPromoSuggestions()
  renderUpsell()
}

function renderUpsell() {
  const section = $('upsell-section')
  if (!section) return
  const cartNames = getCart().map(i => i.name)
  const available = products.filter(p => {
    const s = typeof p.stock === 'number' ? p.stock : (p.inStock ? 10 : 0)
    return s > 0 && !cartNames.includes(p.name)
  })
  if (available.length === 0) { section.innerHTML = ''; return }

  const shuffled = available.sort(() => 0.5 - Math.random())
  const suggestions = shuffled.slice(0, 3)

  section.innerHTML = `
    <div class="upsell-section">
      <div class="upsell-label">Quick add something extra?</div>
      <div class="upsell-scroll">
        ${suggestions.map(p => `
          <div class="upsell-item" data-name="${p.name}" data-price="${p.price}">
            <img src="${p.image}" alt="" onerror="this.style.display='none'" />
            <div class="upsell-item-info">
              <div class="upsell-item-name">${p.name}</div>
              <div class="upsell-item-price">${formatPrice(p.price)}</div>
            </div>
            <div class="upsell-item-plus">+</div>
          </div>
        `).join('')}
      </div>
    </div>
  `

  section.querySelectorAll('.upsell-item').forEach(el => {
    el.addEventListener('click', () => {
      if (!tryAddToCart(el.dataset.name, el.dataset.price)) return
      showToast(`${el.dataset.name} added!`)
      el.style.opacity = '0.4'
      el.style.pointerEvents = 'none'
      renderCheckoutSummary()
    })
  })
}

// --- Submit Order ---
checkoutForm?.addEventListener('submit', (e) => {
  e.preventDefault()
  const name = $('name')?.value.trim()
  const phone = $('phone')?.value.trim()
  const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value || 'pickup'
  const floor = $('floor')?.value.trim()
  const room = $('room')?.value.trim()
  const instructions = $('instructions')?.value.trim()

  if (!name || !phone) {
    showToast('Please enter your name and phone number', 'error')
    return
  }
  if (deliveryType === 'delivery' && (!floor || !room)) {
    showToast('Please enter floor and room number', 'error')
    return
  }

  const subtotal = getSubtotal()
  let discount = 0
  let freeItem = null
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discount = Math.round(subtotal * appliedPromo.value / 100)
    } else if (appliedPromo.type === 'flat') {
      discount = Math.min(appliedPromo.value, subtotal)
    } else if (appliedPromo.type === 'free_item') {
      freeItem = products.find(p => p.name.toLowerCase() === appliedPromo.itemName.toLowerCase())
    }
  }
  const fee = deliveryType === 'delivery' ? (siteConfig.deliveryFee || 30) : 0
  const total = Math.max(0, subtotal + fee - discount)
  let cartItems = getCart()
  if (freeItem) {
    cartItems = [...cartItems, { name: freeItem.name, price: 0, quantity: 1 }]
  }

  const shortfall = []
  for (const item of cartItems) {
    const product = products.find(p => p.name === item.name)
    if (!product) continue
    const left = getStockInfo(product).stock
    if (item.quantity > left) shortfall.push(`${item.name} (only ${left} left)`)
  }
  if (shortfall.length > 0) {
    showToast('Stock changed: ' + shortfall[0], 'error')
    return
  }

  const orderId = 'AC' + Date.now().toString().slice(-5)
  let msg = `*AFTERCURFEW INVOICE*
*Order:* ${orderId}
━━━━━━━━━━━━━━━━━━`
  msg += `\n*Customer:* ${name}`
  msg += `\n*Phone:* ${phone}`
  if (deliveryType === 'pickup') {
    msg += `\n*Pickup:* ${siteConfig.pickupLocation || 'Room 509'}`
  } else {
    msg += `\n*Deliver:* Floor ${floor}, Room ${room}`
  }
  if (instructions) msg += `\n*Note:* ${instructions}`
  msg += `\n━━━━━━━━━━━━━━━━━━`
  msg += `\n*ITEMS*`
  cartItems.forEach(item => {
    const lineTotal = formatPrice(item.price * item.quantity)
    msg += `\n${item.name} x${item.quantity} — ${lineTotal}`
  })
  msg += `\n━━━━━━━━━━━━━━━━━━`
  msg += `\nSubtotal: ${formatPrice(subtotal)}`
  if (appliedPromo) msg += `\nPromo (${appliedPromo.code}): -${formatPrice(discount || 0)}`
  if (fee > 0) msg += `\nDelivery: ${formatPrice(fee)}`
  msg += `\n*Total: ${formatPrice(total)}*`
  msg += `\n━━━━━━━━━━━━━━━━━━`
  msg += `\nThank you for ordering!`

  const ownerPhone = siteConfig.ownerPhone || '919265807630'
  window.open(`https://wa.me/${ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank')

  // Save to history
  const order = {
    id: orderId,
    date: new Date().toISOString(),
    items: [...getCart()],
    subtotal,
    discount,
    deliveryFee: fee,
    total,
    status: 'sent_via_whatsapp',
    promo: appliedPromo ? appliedPromo.code : undefined,
    deliveryType,
    floor: floor || '-',
    room: room || '-',
    name,
    phone,
  }
  const history = JSON.parse(localStorage.getItem('aftercurfew-orders') || '[]')
  history.unshift(order)
  localStorage.setItem('aftercurfew-orders', JSON.stringify(history))

  // Log to Google Sheet
  if (siteConfig.sheetUrl) {
    try {
      fetch(siteConfig.sheetUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId, customerName: name, phone: phone,
          deliveryType, floor: floor || '-', room: room || '-',
          items: getCart(), subtotal, deliveryFee: fee, total,
          instructions: instructions || '-',
          promo: appliedPromo ? appliedPromo.code : '',
          discount,
        }),
      })
    } catch (e) {}
  }

  // Deduct stock (including free item)
  const itemsToDeduct = getCart()
  if (freeItem) {
    itemsToDeduct.push({ name: freeItem.name, quantity: 1 })
  }
  itemsToDeduct.forEach(item => {
    const idx = products.findIndex(p => p.name === item.name)
    if (idx !== -1) {
      const current = typeof products[idx].stock === 'number' ? products[idx].stock : (products[idx].inStock ? 10 : 0)
      const newStock = Math.max(0, current - item.quantity)
      products[idx].stock = newStock
      products[idx].inStock = newStock > 0
      updateProduct(idx, { stock: newStock, inStock: newStock > 0 })
    }
  })

  if (appliedPromo) {
    incrementPromoUse(appliedPromo.code).catch(() => {})
    appliedPromo = null
  }

  clearCart()
  updateCartFab()
  renderProducts()
  closeCheckout()

  // Show confirmation
  renderInvoiceCard({ orderId, cartItems, subtotal, discount, fee, total, name, phone, deliveryType, floor, room, promo: appliedPromo })
  confirmationModal.classList.add('open')
  bodyLock(true)
})

// --- Confirmation ---
function renderInvoiceCard(data) {
  $('invoice-order-id').textContent = data.orderId
  const customerEl = $('invoice-customer')
  const deliveryStr = data.deliveryType === 'pickup'
    ? `Pickup from ${siteConfig.pickupLocation || 'Room 509'}`
    : `Deliver to Floor ${data.floor}, Room ${data.room}`
  customerEl.textContent = `${data.name} · ${data.phone} · ${deliveryStr}`

  const itemsEl = $('invoice-items')
  itemsEl.innerHTML = data.cartItems.map(item => `
    <div class="invoice-row">
      <span class="invoice-item-name">${item.name}</span>
      <span class="invoice-item-qty">×${item.quantity}</span>
      <span class="invoice-item-price">${formatPrice(item.price)}</span>
      <span class="invoice-item-total">${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('')

  const summaryEl = $('invoice-summary')
  let summaryHtml = `<div class="invoice-row subtotal"><span>Subtotal</span><span></span><span></span><span>${formatPrice(data.subtotal)}</span></div>`
  if (data.discount > 0) {
    summaryHtml += `<div class="invoice-row promo"><span>Promo (${data.promo?.code || ''})</span><span></span><span></span><span>-${formatPrice(data.discount)}</span></div>`
  }
  if (data.fee > 0) {
    summaryHtml += `<div class="invoice-row fee"><span>Delivery</span><span></span><span></span><span>${formatPrice(data.fee)}</span></div>`
  }
  summaryHtml += `<div class="invoice-row grand-total"><span>Total</span><span></span><span></span><span>${formatPrice(data.total)}</span></div>`
  summaryEl.innerHTML = summaryHtml
}

function getInvoiceText() {
  const orderId = $('invoice-order-id')?.textContent || ''
  const customerEl = $('invoice-customer')
  const customer = customerEl ? customerEl.textContent : ''
  const rows = document.querySelectorAll('#invoice-items .invoice-row')
  const items = []
  rows.forEach(r => {
    const name = r.querySelector('.invoice-item-name')?.textContent || ''
    const qty = r.querySelector('.invoice-item-qty')?.textContent || ''
    const price = r.querySelector('.invoice-item-price')?.textContent || ''
    const total = r.querySelector('.invoice-item-total')?.textContent || ''
    if (name) items.push({ name, qty, price, total })
  })
  const summary = document.querySelectorAll('#invoice-summary .invoice-row')
  const sums = []
  summary.forEach(r => {
    const label = r.querySelector('span:first-child')?.textContent || ''
    const val = r.querySelector('span:last-child')?.textContent || ''
    if (label && val) sums.push({ label, val })
  })
  const itemLines = items.map(i => `${i.name.padEnd(20)} ${i.qty.padStart(3)}  ${i.total.padStart(7)}`).join('\n')
  const sumLines = sums.map(s => `${s.label.padEnd(20)} ${s.val.padStart(10)}`).join('\n')
  return [
    'AFTERCURFEW',
    `Order #${orderId}`,
    customer,
    '─'.repeat(32),
    itemLines,
    '─'.repeat(32),
    sumLines,
    '─'.repeat(32),
    'Thank you for ordering!'
  ].join('\n')
}

$('share-copy')?.addEventListener('click', function () {
  const text = getInvoiceText()
  if (!text || !navigator.clipboard) return
  navigator.clipboard.writeText(text).then(() => {
    const orig = this.innerHTML
    this.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!'
    setTimeout(() => this.innerHTML = orig, 2000)
  })
})
$('print-invoice-btn')?.addEventListener('click', () => {
  const el = document.getElementById('invoice-card')
  if (!el) return
  const clone = el.cloneNode(true)
  clone.querySelectorAll('.invoice-item-price').forEach(s => s.remove())
  const win = window.open('', '_blank', 'width=420,height=640')
  win.document.write(`<!DOCTYPE html><html><head><title>Invoice</title>
    <style>
      @page { margin: 0; }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
        padding: 32px 28px;
        color: #1a1a2e;
        background: #f8f9fa;
        max-width: 380px;
        margin: 0 auto;
        min-height: 100vh;
      }
      .invoice-card {
        background: #fff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }
      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #1a1a2e;
      }
      .invoice-brand {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.3px;
      }
      .invoice-order-id {
        font-size: 13px;
        color: #888;
        font-weight: 600;
        background: #f0f0f5;
        padding: 4px 10px;
        border-radius: 20px;
      }
      .invoice-customer {
        font-size: 12px;
        color: #666;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
        line-height: 1.5;
      }
      .invoice-items { margin-bottom: 4px; }
      .invoice-row {
        display: flex;
        padding: 6px 0;
        font-size: 13px;
        gap: 8px;
        align-items: center;
      }
      .invoice-row span:first-child { flex: 1; min-width: 0; }
      .invoice-row span:nth-child(2) { width: 32px; text-align: center; color: #888; }
      .invoice-row span:last-child { width: 64px; text-align: right; font-weight: 600; }
      .invoice-summary { border-top: 1px solid #eee; padding-top: 6px; margin-top: 4px; }
      .invoice-row.subtotal span:last-child { font-weight: 400; color: #888; }
      .invoice-row.promo span:last-child { color: #e53e3e; }
      .invoice-row.fee span:last-child { color: #888; }
      .invoice-row.grand-total {
        border-top: 2px solid #1a1a2e;
        margin-top: 6px;
        padding-top: 10px;
        font-size: 15px;
      }
      .invoice-row.grand-total span:last-child { font-size: 18px; font-weight: 800; }
      .print-footer {
        text-align: center;
        font-size: 11px;
        color: #aaa;
        margin-top: 20px;
      }
    </style></head><body><div class="invoice-card">${clone.innerHTML}</div><div class="print-footer">AfterCurfew — Late Night Delivery</div></body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 400)
})
$('continue-btn')?.addEventListener('click', () => {
  confirmationModal.classList.remove('open')
  bodyLock(false)
})

// --- Search ---
searchToggle?.addEventListener('click', () => {
  searchContainer.classList.toggle('open')
  if (searchContainer.classList.contains('open')) searchInput?.focus()
})
searchClose?.addEventListener('click', () => {
  searchContainer.classList.remove('open')
  currentSearch = ''
  if (searchInput) searchInput.value = ''
  renderProducts()
})
searchInput?.addEventListener('input', () => {
  currentSearch = searchInput.value.toLowerCase()
  renderProducts()
})

// --- Delivery toggle ---
document.querySelectorAll('input[name="delivery-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    $('delivery-details').style.display = radio.value === 'delivery' ? 'block' : 'none'
    renderCheckoutSummary()
  })
})

// --- Promo Code ---
function applyPromoCode() {
  const inputEl = $('promo-code')
  const statusEl = $('promo-status')
  const code = (inputEl?.value || '').trim().toUpperCase()
  if (!code) {
    if (statusEl) { statusEl.textContent = 'Please enter a promo code'; statusEl.className = 'promo-status error' }
    return
  }

  // Look up code
  const promo = promoCodes[code]
  if (!promo || promo.active === false) {
    if (statusEl) { statusEl.textContent = 'Invalid or expired promo code'; statusEl.className = 'promo-status error' }
    return
  }

  const subtotal = getSubtotal()
  if (subtotal < (promo.minOrder || 0)) {
    if (statusEl) { statusEl.textContent = `Minimum order of ₹${promo.minOrder} required`; statusEl.className = 'promo-status error' }
    return
  }

  // Check product eligibility
  const cartItems = getCart()
  if (!promo.type || promo.type === 'percent' || promo.type === 'flat') {
    const eligible = cartItems.some(item => {
      const product = products.find(p => p.name === item.name)
      return product && product.promos && product.promos.includes(code)
    })
    if (!eligible) {
      if (statusEl) { statusEl.textContent = 'No eligible items in your cart for this promo'; statusEl.className = 'promo-status error' }
      return
    }
    // Margin guard: ensure promo doesn't cause loss on any eligible item
    if (promo.type === 'percent') {
      for (const item of cartItems) {
        const product = products.find(p => p.name === item.name)
        if (!product || !product.costPrice) continue
        if (!product.promos || !product.promos.includes(code)) continue
        const discountedPrice = product.price * (1 - promo.value / 100)
        if (discountedPrice <= product.costPrice) {
          if (statusEl) { statusEl.textContent = 'Promo not applicable on current cart'; statusEl.className = 'promo-status error' }
          return
        }
      }
    } else if (promo.type === 'flat') {
      let totalPrice = 0, totalCost = 0
      for (const item of cartItems) {
        const product = products.find(p => p.name === item.name)
        if (!product || !product.costPrice) continue
        if (!product.promos || !product.promos.includes(code)) continue
        totalPrice += product.price * item.quantity
        totalCost += product.costPrice * item.quantity
      }
      if (totalPrice > 0 && (totalPrice - promo.value) <= totalCost) {
        if (statusEl) { statusEl.textContent = 'Promo not applicable on current cart'; statusEl.className = 'promo-status error' }
        return
      }
    }
  } else if (promo.type === 'free_item') {
    const freeProduct = products.find(p => p.name.toLowerCase() === (promo.itemName || '').toLowerCase())
    if (!freeProduct) {
      if (statusEl) { statusEl.textContent = 'Free item not available right now'; statusEl.className = 'promo-status error' }
      return
    }
    const stock = typeof freeProduct.stock === 'number' ? freeProduct.stock : (freeProduct.inStock ? 10 : 0)
    if (stock <= 0) {
      if (statusEl) { statusEl.textContent = 'Sorry, the free item is out of stock'; statusEl.className = 'promo-status error' }
      return
    }
    // Margin guard: ensure basket margin covers the free item's cost
    if (freeProduct.costPrice) {
      let totalPrice = 0, totalCost = 0
      for (const item of cartItems) {
        const product = products.find(p => p.name === item.name)
        if (!product || !product.costPrice) continue
        totalPrice += product.price * item.quantity
        totalCost += product.costPrice * item.quantity
      }
      if (totalPrice > 0 && (totalPrice - totalCost) < freeProduct.costPrice) {
        if (statusEl) { statusEl.textContent = 'Add more items to cover the cost of your free item'; statusEl.className = 'promo-status error' }
        return
      }
    }
  }

  appliedPromo = { code, ...promo }
  if (statusEl) { statusEl.textContent = `✅ ${promo.description || 'Promo applied!'}`; statusEl.className = 'promo-status success' }
  if (inputEl) inputEl.value = code
  const suggestionsEl = $('promo-suggestions')
  if (suggestionsEl) suggestionsEl.innerHTML = ''
  renderCheckoutSummary()
  showToast(`Promo ${code} applied!`)
}

function removePromo() {
  appliedPromo = null
  const statusEl = $('promo-status')
  const inputEl = $('promo-code')
  if (statusEl) { statusEl.textContent = 'Promo removed'; statusEl.className = 'promo-status info' }
  if (inputEl) inputEl.value = ''
  renderCheckoutSummary()
  renderPromoSuggestions()
}

function renderPromoSuggestions() {
  const container = $('promo-suggestions')
  if (!container) return
  if (appliedPromo) { container.innerHTML = ''; return }
  const subtotal = getSubtotal()
  const cartItems = getCart()
  if (cartItems.length === 0) { container.innerHTML = ''; return }

  const chips = []
  for (const [code, promo] of Object.entries(promoCodes)) {
    if (promo.active === false) continue
    if (subtotal < (promo.minOrder || 0)) continue

    // Product eligibility check
    let isEligible = false
    if (promo.type === 'free_item') {
      const freeProduct = products.find(p => p.name.toLowerCase() === (promo.itemName || '').toLowerCase())
      if (!freeProduct) continue
      const stock = typeof freeProduct.stock === 'number' ? freeProduct.stock : (freeProduct.inStock ? 10 : 0)
      if (stock <= 0) continue
      isEligible = true
    } else {
      isEligible = cartItems.some(item => {
        const product = products.find(p => p.name === item.name)
        return product && product.promos && product.promos.includes(code)
      })
    }
    if (!isEligible) continue

    const label = promo.type === 'percent' ? `${promo.value}% off` :
      promo.type === 'flat' ? `₹${promo.value} off` :
      `Free ${promo.itemName || 'item'}`
    chips.push({ code, label })
  }

  if (chips.length === 0) { container.innerHTML = ''; return }

  container.innerHTML = `
    <div class="promo-suggestions-label">Available promos</div>
    <div class="promo-chips">
      ${chips.map(c => `<button class="promo-chip" onclick="applyPromoCodeBySuggestion('${c.code}')">🏷️ ${c.code} — ${c.label}</button>`).join('')}
    </div>
  `
}



// --- Promo Publicity ---
function getProductPromoBadge(product) {
  if (!product.promos || product.promos.length === 0) return ''
  for (const code of product.promos) {
    const promo = promoCodes[code]
    if (!promo || promo.active === false) continue
    const label = promo.type === 'percent' ? `${promo.value}% OFF` :
      promo.type === 'flat' ? `₹${promo.value} OFF` :
      `FREE ${(promo.itemName || '').toUpperCase().slice(0, 6)}`
    return `<span class="card-promo-badge">${label}</span>`
  }
  return ''
}

function renderPromoPublicity() {
  const stripInner = $('promo-strip-inner')
  const promoStrip = $('promo-strip')
  if (!stripInner) return

  const activeCodes = Object.entries(promoCodes).filter(([, p]) => p.active !== false)
  promoStrip.classList.toggle('hidden', activeCodes.length === 0)

  if (activeCodes.length === 0) {
    stripInner.innerHTML = ''
    return
  }

  const cardsHtml = activeCodes.map(([code, promo]) => {
    const label = promo.type === 'percent' ? `${promo.value}% Off` :
      promo.type === 'flat' ? `₹${promo.value} Off` :
      `Free ${promo.itemName || 'Item'}`
    const desc = promo.description || label
    const minStr = promo.minOrder ? `Min. order ₹${promo.minOrder}` : 'No minimum'
    return `<div class="promo-card" onclick="autoApplyPromo('${code}')">
      <div class="promo-card-code">${code}</div>
      <div class="promo-card-desc">${desc}</div>
      <div class="promo-card-min">${minStr}</div>
    </div>`
  }).join('')

  stripInner.innerHTML = cardsHtml + cardsHtml
}

function renderCartPromoBanner() {
  const banner = $('cart-promo-banner')
  if (!banner) return
  const items = getCart()
  if (items.length === 0 || appliedPromo) { banner.classList.add('hidden'); return }

  const subtotal = getSubtotal()
  for (const [code, promo] of Object.entries(promoCodes)) {
    if (promo.active === false) continue
    if (subtotal < (promo.minOrder || 0)) continue
    let eligible = false
    if (promo.type === 'free_item') {
      const freeProduct = products.find(p => p.name.toLowerCase() === (promo.itemName || '').toLowerCase())
      if (freeProduct) {
        const stock = typeof freeProduct.stock === 'number' ? freeProduct.stock : (freeProduct.inStock ? 10 : 0)
        if (stock > 0) eligible = true
      }
    } else {
      eligible = items.some(item => {
        const product = products.find(p => p.name === item.name)
        return product && product.promos && product.promos.includes(code)
      })
    }
    if (!eligible) continue

    const label = promo.type === 'percent' ? `${promo.value}% off` :
      promo.type === 'flat' ? `₹${promo.value} off` :
      `Free ${promo.itemName || 'item'}`
    banner.innerHTML = `
      <span class="cart-promo-text">Save more! Use <strong>${code}</strong> and get ${label}</span>
      <button class="cart-promo-btn" onclick="autoApplyPromo('${code}')">Apply</button>`
    banner.classList.remove('hidden')
    return
  }
  banner.classList.add('hidden')
}

window.autoApplyPromo = (code) => {
  openCheckout(code)
}

window.applyPromoCode = applyPromoCode
window.removePromo = removePromo
window.applyPromoCodeBySuggestion = (code) => {
  const inputEl = $('promo-code')
  if (inputEl) inputEl.value = code
  applyPromoCode()
}
window.reorderItems = reorderItems

// --- Load data from Firebase ---
async function loadData() {
  try {
    const [data, codes] = await Promise.all([
      fetchFirebaseData(),
      fetchPromoCodes(),
    ])
    promoCodes = codes || {}
    if (data) {
      if (data.siteConfig) siteConfig = data.siteConfig
      if (data.products) products = data.products
      renderProducts()
      renderCategories()
      checkStoreStatus()
    }
    renderPromoPublicity()
  } catch (e) {
    console.error('Failed to load Firebase data:', e)
  }
}

function checkStoreStatus() {
  if (siteConfig.storeOpen === false && closedOverlay) {
    closedOverlay.classList.remove('hidden')
  }
}

// --- Init ---
function init() {
  loadFavorites()
  loadData()
  updateCartFab()

  // Cart FAB
  cartFab?.addEventListener('click', openCartSheet)

  // Sheet overlays
  detailOverlay?.addEventListener('click', closeDetail)
  cartOverlay?.addEventListener('click', closeCartSheet)
  checkoutOverlay?.addEventListener('click', closeCheckout)
  confirmOverlay?.addEventListener('click', () => {
    confirmationModal.classList.remove('open')
    bodyLock(false)
  })

  // Tab navigation
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab))
  })

  // Cart sheet checkout
  checkoutBtn?.addEventListener('click', () => openCheckout())

  // Clear cart
  $('cart-clear')?.addEventListener('click', () => {
    const items = getCart()
    if (items.length === 0) return
    clearCart()
    renderCartSheet()
    updateCartFab()
    showToast('Cart cleared')
  })

  // Close checkout
  $('close-checkout')?.addEventListener('click', closeCheckout)

  // Promo code
  $('promo-apply-btn')?.addEventListener('click', applyPromoCode)
  $('promo-code')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyPromoCode() }
  })

  // Quick add via product grid
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.card-add')
    if (addBtn) {
      e.stopPropagation()
      if (!tryAddToCart(addBtn.dataset.name, addBtn.dataset.price)) return
      showToast(`${addBtn.dataset.name} added to cart!`)
      updateCartFab()
    }

    const favBtn = e.target.closest('.card-fav')
    if (favBtn) {
      e.stopPropagation()
      const id = favBtn.dataset.id
      const product = products.find(p => p.id === id)
      if (product) toggleFav(product.id, product.name, product.price, product.image)
    }
  })

  // Global overlay clicks for modals
  document.querySelectorAll('.modal > .modal-overlay, .bottom-sheet > .sheet-overlay').forEach(el => {
    el.addEventListener('click', () => {
      closeDetail()
      closeCartSheet()
      closeCheckout()
      confirmationModal.classList.remove('open')
      bodyLock(false)
    })
  })
}

init()
