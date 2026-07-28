import { fetchFirebaseData, saveAllData, saveSiteConfig } from './firebase.js'

let products = []
let siteConfig = {}
let orders = []
let currentSection = 'dashboard'
let currentProductIndex = -1
let uploadedImageUrl = ''
const savedStockMap = new Map()

const $ = (id) => document.getElementById(id)

function loadAuth() {
  try {
    const saved = localStorage.getItem('aftercurfew-admin-auth')
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return null
}

function saveAuth(auth) {
  localStorage.setItem('aftercurfew-admin-auth', JSON.stringify(auth))
}

function clearAuth() {
  localStorage.removeItem('aftercurfew-admin-auth')
}

const auth = loadAuth()
if (!auth) {
  $('login-page').style.display = 'flex'
} else {
  $('login-page').style.display = 'none'
  $('admin-app').style.display = 'flex'
  initAdmin()
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const username = $('github-username').value.trim()
  const repo = $('github-repo').value.trim()
  const token = $('github-token').value.trim()
  if (!username || !repo || !token) return

  const btn = e.target.querySelector('button[type="submit"]')
  btn.disabled = true
  btn.textContent = 'Verifying...'

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Invalid token')
    saveAuth({ username, repo, token })
    $('login-page').style.display = 'none'
    $('admin-app').style.display = 'flex'
    initAdmin()
  } catch (err) {
    showToast('Invalid credentials. Check your token.', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Sign in'
  }
})

$('logout-btn').addEventListener('click', () => {
  clearAuth()
  $('admin-app').style.display = 'none'
  $('login-page').style.display = 'flex'
})

async function initAdmin() {
  try {
    const data = await fetchFirebaseData()
    if (data) {
      if (data.siteConfig) siteConfig = data.siteConfig
      if (data.products) products = data.products
    }
  } catch (e) {
    showToast('Failed to load data from Firebase', 'error')
  }

  renderDashboard()
  renderProducts()
  renderSettings()
  switchSection('dashboard')

  if (siteConfig.sheetUrl) {
    loadOrders(true).then(() => renderDashboard())
  }

  document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
    item.addEventListener('click', () => switchSection(item.dataset.section))
  })

  $('sidebar-toggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('open')
  })

  $('dash-store-toggle').addEventListener('change', async () => {
    siteConfig.storeOpen = $('dash-store-toggle').checked
    await saveSiteConfig({ ...siteConfig, storeOpen: siteConfig.storeOpen })
    renderDashboard()
    showToast(siteConfig.storeOpen ? 'Store opened' : 'Store closed')
  })

  $('dash-toggle-store-btn').addEventListener('click', async () => {
    siteConfig.storeOpen = !(siteConfig.storeOpen !== false)
    await saveAllData({ products, siteConfig })
    renderDashboard()
    showToast(siteConfig.storeOpen ? 'Store opened' : 'Store closed')
  })
}

function switchSection(section) {
  currentSection = section
  document.querySelectorAll('.sidebar-item[data-section]').forEach(i =>
    i.classList.toggle('active', i.dataset.section === section)
  )
  document.querySelectorAll('.page').forEach(p =>
    p.classList.toggle('active', p.id === `section-${section}`)
  )

  const names = { dashboard: 'Dashboard', products: 'Products', orders: 'Orders', settings: 'Settings' }
  $('page-breadcrumb').textContent = names[section] || section
  $('sidebar').classList.remove('open')
}

function showToast(msg, type = 'success') {
  const container = $('toast-container')
  if (!container) return
  const t = document.createElement('div')
  t.className = `toast toast-${type}`
  t.textContent = msg
  container.appendChild(t)
  requestAnimationFrame(() => t.classList.add('show'))
  setTimeout(() => {
    t.classList.remove('show')
    setTimeout(() => t.remove(), 300)
  }, 2500)
}

function getStock(p) {
  return typeof p.stock === 'number' ? p.stock : (p.inStock ? 10 : 0)
}

function renderDashboard() {
  const total = products.length
  const lowStock = products.filter(p => { const s = getStock(p); return s > 0 && s <= 3 }).length
  const inStock = products.filter(p => getStock(p) > 3).length
  const outOfStock = products.filter(p => getStock(p) === 0).length
  const categories = new Set(products.map(p => p.category))

  $('stat-products').textContent = total
  $('stat-in-stock').textContent = inStock
  $('stat-out-of-stock').textContent = outOfStock
  $('stat-low-stock').textContent = lowStock
  $('stat-categories').textContent = categories.size

  const storeOpen = siteConfig.storeOpen !== false
  $('dash-store-toggle').checked = storeOpen
  $('dash-toggle-btn-label').textContent = storeOpen ? 'Close Store' : 'Open Store'

  const statusEl = $('topbar-status')
  if (storeOpen) {
    statusEl.className = 'topbar-status open'
    statusEl.textContent = 'Open'
  } else {
    statusEl.className = 'topbar-status closed'
    statusEl.textContent = 'Closed'
  }

  // Stock health bar
  const pIn = total > 0 ? (inStock / total) * 100 : 0
  const pLow = total > 0 ? (lowStock / total) * 100 : 0
  const pOut = total > 0 ? (outOfStock / total) * 100 : 0
  $('stock-bar-in').style.width = pIn + '%'
  $('stock-bar-low').style.width = pLow + '%'
  $('stock-bar-out').style.width = pOut + '%'
  $('stock-legend-in').textContent = inStock
  $('stock-legend-low').textContent = lowStock
  $('stock-legend-out').textContent = outOfStock

  // Category breakdown
  const catCounts = {}
  products.forEach(p => {
    const c = p.category || 'uncategorized'
    catCounts[c] = (catCounts[c] || 0) + 1
  })
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1])
  const catList = $('cat-list')
  const catEmpty = $('cat-empty')
  if (catEntries.length === 0) {
    catList.innerHTML = ''
    catEmpty.style.display = 'block'
  } else {
    catEmpty.style.display = 'none'
    catList.innerHTML = catEntries.map(([name, count]) =>
      `<div class="cat-item">
        <span class="cat-item-name" style="text-transform:capitalize">${name}</span>
        <span class="cat-item-count">${count}</span>
      </div>`
    ).join('')
  }

  // Store info
  $('info-status').textContent = storeOpen ? 'Open' : 'Closed'
  $('info-status').style.color = storeOpen ? 'var(--success)' : 'var(--error)'
  const ot = siteConfig.openTime || ''
  const ct = siteConfig.closeTime || ''
  $('info-hours').textContent = siteConfig.deliveryHours || (ot && ct ? `${ot} - ${ct}` : '—')
  $('info-min-order').textContent = siteConfig.minOrder ? '₹' + siteConfig.minOrder : 'None'
  $('info-delivery-fee').textContent = siteConfig.deliveryFee ? '₹' + siteConfig.deliveryFee : 'Free'
  $('info-product-count').textContent = total

  // Recent orders (from cached orders)
  renderRecentOrders()
}

function renderRecentOrders() {
  const tbody = $('dash-orders-body')
  const empty = $('dash-orders-empty')
  if (!tbody) return

  const recent = orders.slice(0, 5)
  if (recent.length === 0) {
    tbody.innerHTML = ''
    empty.style.display = 'block'
    return
  }
  empty.style.display = 'none'
  tbody.innerHTML = recent.map(r => {
    const cols = Array.isArray(r) ? r : Object.values(r)
    return `<tr>
      <td class="text-nowrap">${cols[0] || '-'}</td>
      <td>${cols[2] || '-'}</td>
      <td>${cols[7] || '-'}</td>
      <td>₹${parseFloat(cols[10]) || 0}</td>
    </tr>`
  }).join('')
}

function renderProducts() {
  const tbody = $('products-body')
  const empty = $('products-empty')
  if (!tbody) return

  if (products.length === 0) {
    tbody.innerHTML = ''
    empty.style.display = 'block'
    return
  }
  empty.style.display = 'none'

  tbody.innerHTML = products.map((p, i) => {
    const stock = getStock(p)
    return `<tr>
      <td><img src="${p.image || ''}" alt="" class="product-cell-img" onerror="this.style.display='none'"/></td>
      <td><strong>${p.name}</strong></td>
      <td class="text-muted-cell">${p.category || '-'}</td>
      <td>₹${p.price}</td>
      <td>
        <input type="number" class="stock-input" value="${stock}" min="0" data-index="${i}" />
      </td>
      <td>
        <label class="toggle">
          <input type="checkbox" class="avail-toggle" data-index="${i}" ${stock > 0 ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </label>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-outline edit-btn" data-index="${i}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-index="${i}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`
  }).join('')

  tbody.querySelectorAll('.stock-input').forEach(input => {
    input.addEventListener('change', async () => {
      const idx = parseInt(input.dataset.index)
      const newStock = Math.max(0, parseInt(input.value) || 0)
      products[idx].stock = newStock
      products[idx].inStock = newStock > 0
      await saveAllData({ products, siteConfig })
      renderProducts()
      renderDashboard()
      showToast('Stock updated')
    })
  })

  tbody.querySelectorAll('.avail-toggle').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const idx = parseInt(toggle.dataset.index)
      if (toggle.checked) {
        const restored = savedStockMap.has(idx) ? savedStockMap.get(idx) : 10
        products[idx].stock = restored
        products[idx].inStock = true
      } else {
        savedStockMap.set(idx, products[idx].stock)
        products[idx].stock = 0
        products[idx].inStock = false
      }
      await saveAllData({ products, siteConfig })
      renderProducts()
      renderDashboard()
      showToast(toggle.checked ? 'Product in stock' : 'Product out of stock')
    })
  })

  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openProductModal(parseInt(btn.dataset.index)))
  })

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index)
      if (!confirm(`Delete "${products[idx].name}"?`)) return
      products.splice(idx, 1)
      await saveAllData({ products, siteConfig })
      renderProducts()
      renderDashboard()
      showToast('Product deleted')
    })
  })
}

$('set-all-in-stock').addEventListener('click', async () => {
  products.forEach(p => { p.stock = 10; p.inStock = true })
  await saveAllData({ products, siteConfig })
  renderProducts()
  renderDashboard()
  showToast('All products set to in stock')
})

$('set-all-out-stock').addEventListener('click', async () => {
  products.forEach(p => { p.stock = 0; p.inStock = false })
  await saveAllData({ products, siteConfig })
  renderProducts()
  renderDashboard()
  showToast('All products set to out of stock')
})

function openProductModal(index) {
  currentProductIndex = index
  const product = index >= 0 ? products[index] : {}
  const modal = $('product-modal')

  $('modal-title').textContent = index >= 0 ? 'Edit Product' : 'Add Product'
  $('prod-name').value = product.name || ''
  $('prod-price').value = product.price || ''
  $('prod-cost').value = product.costPrice || ''
  $('prod-category').value = product.category || 'food'
  $('prod-stock').value = typeof product.stock === 'number' ? product.stock : 10
  $('prod-unit').value = product.unit || ''
  $('prod-desc').value = product.description || ''
  $('prod-image').value = ''

  uploadedImageUrl = product.image || ''
  const preview = $('image-preview')
  if (uploadedImageUrl) {
    preview.src = uploadedImageUrl
    preview.style.display = 'block'
  } else {
    preview.style.display = 'none'
  }

  $('prod-image-url').value = product.image || ''
  $('prod-image-url').oninput = () => {
    const url = $('prod-image-url').value.trim()
    if (url) {
      uploadedImageUrl = url
      preview.src = url
      preview.style.display = 'block'
    } else {
      uploadedImageUrl = ''
      preview.style.display = 'none'
    }
  }

  modal.classList.add('open')

  const form = $('product-form')
  form.onsubmit = async (e) => {
    e.preventDefault()
    const data = {
      id: product.id || 'p' + Date.now(),
      name: $('prod-name').value.trim(),
      price: parseFloat($('prod-price').value) || 0,
      costPrice: parseFloat($('prod-cost').value) || 0,
      category: $('prod-category').value,
      stock: parseInt($('prod-stock').value) || 0,
      unit: $('prod-unit').value.trim(),
      inStock: (parseInt($('prod-stock').value) || 0) > 0,
      description: $('prod-desc').value.trim(),
      image: uploadedImageUrl || 'https://placehold.co/400/16161e/a1a1aa?text=No+Image',
    }

    if (currentProductIndex >= 0) {
      products[currentProductIndex] = data
    } else {
      products.push(data)
    }

    await saveAllData({ products, siteConfig })
    modal.classList.remove('open')
    showToast(currentProductIndex >= 0 ? 'Product updated' : 'Product added')
    renderProducts()
    renderDashboard()
  }
}

$('add-product-btn').addEventListener('click', () => openProductModal(-1))
$('modal-close-btn').addEventListener('click', () => $('product-modal').classList.remove('open'))
$('product-modal').addEventListener('click', (e) => {
  if (e.target === $('product-modal')) $('product-modal').classList.remove('open')
})
$('modal-cancel-btn').addEventListener('click', () => $('product-modal').classList.remove('open'))

$('upload-img-btn').addEventListener('click', async () => {
  const file = $('prod-image').files[0]
  if (!file) return showToast('Select an image file first', 'error')

  const authData = loadAuth()
  if (!authData?.token) return showToast('Not authenticated', 'error')

  const btn = $('upload-img-btn')
  btn.disabled = true
  btn.textContent = 'Uploading...'

  try {
    const base64 = await fileToBase64(file)
    const content = base64.split(',')[1]
    const path = `images/${Date.now()}_${file.name}`

    const res = await fetch(`https://api.github.com/repos/${authData.username}/${authData.repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Upload ${file.name}`, content })
    })

    if (!res.ok) throw new Error('Upload failed')
    const result = await res.json()
    uploadedImageUrl = result.content.download_url
    const preview = $('image-preview')
    preview.src = uploadedImageUrl
    preview.style.display = 'block'
    $('prod-image-url').value = uploadedImageUrl
    showToast('Image uploaded!')
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Upload'
  }
})

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function loadOrders(silent) {
  const sheetUrl = siteConfig.sheetUrl
  if (!sheetUrl) return

  try {
    const res = await fetch(sheetUrl)
    const raw = await res.json()
    let rows = raw.orders || (Array.isArray(raw) ? raw : (raw.values || []))
    orders = rows.map(r => Array.isArray(r) ? r : Object.values(r))
  } catch (e) {
    if (!silent) showToast('Failed to load orders: ' + e.message, 'error')
  }
}

$('load-orders-btn').addEventListener('click', async () => {
  const sheetUrl = siteConfig.sheetUrl
  if (!sheetUrl) {
    showToast('No Google Sheet URL configured in Settings', 'error')
    return
  }

  const btn = $('load-orders-btn')
  btn.disabled = true
  btn.textContent = 'Loading...'
  const tbody = $('orders-body')
  const empty = $('orders-empty')

  try {
    await loadOrders(false)
    if (orders.length === 0) {
      tbody.innerHTML = ''
      empty.style.display = 'block'
    } else {
      empty.style.display = 'none'
      tbody.innerHTML = orders.map(r => `<tr>
        <td class="text-nowrap">${r[0] || '-'}</td>
        <td><strong>${r[1] || '-'}</strong></td>
        <td>${r[2] || '-'}</td>
        <td>${r[3] || '-'}</td>
        <td>${r[4] || '-'}</td>
        <td>${r[7] || '-'}</td>
        <td>₹${parseFloat(r[10]) || 0}</td>
      </tr>`).join('')
    }
    renderDashboard()
  } catch (e) {
    showToast('Failed to load orders: ' + e.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = 'Refresh Orders'
  }
})

function renderSettings() {
  $('setting-open').checked = siteConfig.storeOpen !== false
  $('setting-open-time').value = siteConfig.openTime || '23:00'
  $('setting-close-time').value = siteConfig.closeTime || '04:00'
  $('setting-hours').value = siteConfig.deliveryHours || '12 AM - 3 AM'
  $('setting-name').value = siteConfig.storeName || 'AfterCurfew'
  $('setting-phone').value = siteConfig.ownerPhone || ''
  $('setting-fee').value = siteConfig.deliveryFee ?? 10
  $('setting-min-order').value = siteConfig.minOrder ?? 0
  $('setting-description').value = siteConfig.description || ''
  $('setting-banner').value = siteConfig.announcement || ''
  $('setting-sheet').value = siteConfig.sheetUrl || ''
}

$('save-settings-btn').addEventListener('click', async () => {
  siteConfig = {
    ...siteConfig,
    storeOpen: $('setting-open').checked,
    openTime: $('setting-open-time').value,
    closeTime: $('setting-close-time').value,
    deliveryHours: $('setting-hours').value.trim(),
    storeName: $('setting-name').value.trim(),
    ownerPhone: $('setting-phone').value.trim(),
    deliveryFee: Math.max(0, parseFloat($('setting-fee').value) || 0),
    minOrder: Math.max(0, parseFloat($('setting-min-order').value) || 0),
    description: $('setting-description').value.trim(),
    announcement: $('setting-banner').value.trim(),
    sheetUrl: $('setting-sheet').value.trim(),
  }
  await saveAllData({ products, siteConfig })
  renderDashboard()
  showToast('Settings saved')
})
