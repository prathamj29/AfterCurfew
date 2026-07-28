import { fetchFirebaseData, updateProduct } from './firebase.js'
import {
  getCart, addItem, removeItem, updateQuantity, clearCart,
  getItemCount, getSubtotal, onChange as onCartChange,
} from './cart.js'

// --- State ---
let products = []
let siteConfig = {}
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

    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <button class="card-fav${fav ? ' active' : ''}" data-id="${product.id}" aria-label="${fav ? 'Remove from' : 'Add to'} favorites">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        ${badgeHtml}
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
    function updateQtyUI() {
      qtyValue.textContent = detailQty
      qtyMinus.disabled = detailQty <= 1
      addBtn.textContent = `Add to Cart — ${formatPrice(product.price * detailQty)}`
    }
    qtyMinus.addEventListener('click', () => { if (detailQty > 1) { detailQty--; updateQtyUI() } })
    qtyPlus.addEventListener('click', () => { detailQty++; updateQtyUI() })
    addBtn.addEventListener('click', () => {
      addItem(product.name, product.price, detailQty)
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
        <span class="order-status sent">${o.status || 'Sent'}</span>
      </div>
    </div>
  `).join('')
}

// --- Checkout ---
function openCheckout() {
  closeCartSheet()
  checkoutModal.classList.add('open')
  bodyLock(true)
  renderCheckoutSummary()
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
  const fee = deliveryType === 'delivery' ? (siteConfig.deliveryFee || 10) : 0
  const total = subtotal + fee

  let html = `<div class="summary-line"><span>Subtotal (${getItemCount()} items)</span><span>${formatPrice(subtotal)}</span></div>`
  if (fee > 0) {
    html += `<div class="summary-line"><span>Delivery fee</span><span>${formatPrice(fee)}</span></div>`
  } else {
    html += `<div class="summary-line"><span>Pickup</span><span>Free</span></div>`
  }
  html += `<div class="summary-line total"><span>Total</span><span>${formatPrice(total)}</span></div>`
  summary.innerHTML = html
  if (totalEl) totalEl.textContent = formatPrice(total)

  // Upsell
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
      addItem(el.dataset.name, el.dataset.price)
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
  const fee = deliveryType === 'delivery' ? (siteConfig.deliveryFee || 10) : 0
  const total = subtotal + fee
  const cartItems = getCart()

  let msg = `*New Order - AfterCurfew* 🌙\n\n`
  msg += `*Customer:*\nName: ${name}\nPhone: ${phone}\n`
  if (deliveryType === 'pickup') {
    msg += `📍 Pickup from ${siteConfig.pickupLocation || 'Room 730'}\n`
  } else {
    msg += `🚪 Deliver to Floor ${floor}, Room ${room}\n`
  }
  if (instructions) msg += `Note: ${instructions}\n`
  msg += `\n*Items:*\n`
  cartItems.forEach(item => {
    msg += `- ${item.name} x ${item.quantity} (${formatPrice(item.price * item.quantity)})\n`
  })
  msg += `\n*Total: ${formatPrice(total)}*`

  const ownerPhone = siteConfig.ownerPhone || '919265807630'
  window.open(`https://wa.me/${ownerPhone}?text=${encodeURIComponent(msg)}`, '_blank')

  // Save to history
  const orderId = 'AC' + Date.now().toString().slice(-5)
  const order = {
    id: orderId,
    date: new Date().toISOString(),
    items: [...cartItems],
    total,
    status: 'sent_via_whatsapp',
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
          items: cartItems, subtotal, deliveryFee: fee, total,
          instructions: instructions || '-',
        }),
      })
    } catch (e) {}
  }

  // Deduct stock
  cartItems.forEach(item => {
    const idx = products.findIndex(p => p.name === item.name)
    if (idx !== -1) {
      const current = typeof products[idx].stock === 'number' ? products[idx].stock : (products[idx].inStock ? 10 : 0)
      const newStock = Math.max(0, current - item.quantity)
      products[idx].stock = newStock
      products[idx].inStock = newStock > 0
      updateProduct(idx, { stock: newStock, inStock: newStock > 0 })
    }
  })

  clearCart()
  updateCartFab()
  renderProducts()
  closeCheckout()

  // Show confirmation
  const shareText = `Just ordered from AfterCurfew! 🌙\n\n🛒 ${cartItems.map(i => `${i.name} × ${i.quantity}`).join(', ')}\n💰 Total: ${formatPrice(total)}\n\nLate-night cravings sorted!`
  $('confirm-order-id').textContent = orderId
  $('confirm-share-text').textContent = shareText
  $('confirm-share-text').dataset.shareText = shareText
  confirmationModal.classList.add('open')
  bodyLock(true)
})

// --- Confirmation ---
$('share-wa')?.addEventListener('click', () => {
  const text = $('confirm-share-text')?.dataset.shareText
  if (text) window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
})
$('share-copy')?.addEventListener('click', function () {
  const text = $('confirm-share-text')?.dataset.shareText
  if (text && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      this.textContent = '✅ Copied!'
      setTimeout(() => this.textContent = '📋 Copy to Clipboard', 2000)
    })
  }
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

// --- Load data from Firebase ---
async function loadData() {
  try {
    const data = await fetchFirebaseData()
    if (data) {
      if (data.siteConfig) siteConfig = data.siteConfig
      if (data.products) products = data.products
      renderProducts()
      renderCategories()
      checkStoreStatus()
    }
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
  checkoutBtn?.addEventListener('click', openCheckout)

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

  // Quick add via product grid
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.card-add')
    if (addBtn) {
      e.stopPropagation()
      addItem(addBtn.dataset.name, addBtn.dataset.price)
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
