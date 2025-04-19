class SalesDashboard {
    constructor() {
        this.orders = [];
        this.affiliates = [];
        this.currentView = 'dashboard';
        this.initialize();
    }

    async initialize() {
        await this.loadData();
        await this.loadAffiliates();
        this.setupEventListeners();
        this.initFilters();
        this.applyFilters();
        this.renderAllAffiliates();
        this.setupView();
    }

    async loadData() {
        try {
            const response = await fetch('Json/estadistica.json');
            this.orders = await response.json();
            this.normalizeData();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadAffiliates() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/HCoreBeat/Asere/main/Json/afiliados.json');
            this.affiliates = await response.json();
            // Normalizar datos de afiliados
            this.affiliates.forEach(affiliate => {
                affiliate.fecha = new Date(affiliate.fecha);
                affiliate.telefono = affiliate.telefono || 'No especificado';
                affiliate.numero = affiliate.numero || 'Temporal';
                affiliate.link = `https://www.asereshops.com/?ref=${affiliate.id}`;
            });
        } catch (error) {
            console.error('Error loading affiliates:', error);
        }
    }

    normalizeData() {
        this.orders.forEach(order => {
            order.date = new Date(order.fecha_hora_entrada.replace(/\(.*?\)/, ''));
            order.total = parseFloat(order.precio_compra_total) || 0;
            order.productsCount = order.compras.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
            order.userType = order.tipo_usuario || 'No especificado';
            order.affiliate = order.afiliado || 'Sin afiliado';
            order.country = order.pais || 'No especificado';
        });
    }

    setupEventListeners() {
        // Menú toggle - Funciona en todas las vistas
        document.addEventListener('click', (e) => {
            if (e.target.closest('.menu-toggle')) {
                document.querySelector('.sidebar').classList.add('active');
                document.body.classList.add('menu-open');
            }
            
            if (e.target.closest('.close-menu')) {
                document.querySelector('.sidebar').classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });

        // Filtros
        document.querySelectorAll('.filter-group select, .filter-group input').forEach(el => 
            el.addEventListener('change', () => this.applyFilters()));

        // Toggle detalles de orden
        document.addEventListener('click', (e) => {
            if (e.target.closest('.order-header')) {
                const details = e.target.closest('.order-card').querySelector('.order-details');
                details.classList.toggle('active');
            }
        });

        // Cambio de vista
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                this.currentView = item.dataset.view;
                this.setupView();
                if (this.currentView.includes('affiliates')) {
                    this.renderAllAffiliates();
                }
            });
        });

        // Actualizar afiliados
        document.getElementById('refresh-affiliates')?.addEventListener('click', async () => {
            await this.loadAffiliates();
            this.renderAllAffiliates();
        });

        document.getElementById('refresh-temporary-affiliates')?.addEventListener('click', async () => {
            await this.loadAffiliates();
            this.renderAllAffiliates();
        });

        // Copiar enlace de afiliado
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-link') || e.target.closest('.copy-link')) {
                const button = e.target.classList.contains('copy-link') ? e.target : e.target.closest('.copy-link');
                const link = button.dataset.link;
                navigator.clipboard.writeText(link).then(() => {
                    const originalHTML = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                    }, 2000);
                });
            }
        });
    }

    setupView() {
        // Actualizar menú activo
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === this.currentView);
        });

        // Mostrar vista activa
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.toggle('hidden', view.id !== `${this.currentView}-view`);
        });

        // Ocultar filtros en vistas de afiliados
        const filters = document.querySelector('.filters');
        if (filters) {
            filters.style.display = this.currentView === 'dashboard' ? 'flex' : 'none';
        }
    }

    renderAllAffiliates() {
        // Separar afiliados permanentes y temporales
        const permanentAffiliates = this.affiliates.filter(a => a.numero !== 'Temporal');
        const temporaryAffiliates = this.affiliates.filter(a => a.numero === 'Temporal');

        // Ordenar permanentes por número (de menor a mayor) y luego por fecha (más reciente primero)
        permanentAffiliates.sort((a, b) => {
            const numA = parseInt(a.numero);
            const numB = parseInt(b.numero);
            if (numA === numB) {
                return b.fecha - a.fecha; // Más reciente primero
            }
            return numA - numB; // Número menor primero
        });

        // Ordenar temporales por fecha (más reciente primero)
        temporaryAffiliates.sort((a, b) => b.fecha - a.fecha);

        this.renderAffiliatesList('affiliates-list', permanentAffiliates);
        this.renderAffiliatesList('temporary-affiliates-list', temporaryAffiliates);
    }

    renderAffiliatesList(containerId, affiliates) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = affiliates.map(affiliate => `
            <div class="affiliate-card">
                <div class="affiliate-header">
                    <div class="affiliate-name">${affiliate.nombre}</div>
                    <div class="affiliate-id">${affiliate.numero !== 'Temporal' ? '#' + affiliate.numero : 'Sin número'}</div>
                </div>
                <div class="affiliate-meta">
                    <div class="affiliate-meta-item">
                        <i class="fas fa-id-card"></i>
                        <span>ID: ${affiliate.id}</span>
                    </div>
                    <div class="affiliate-meta-item">
                        <i class="fas fa-calendar-day"></i>
                        <span>Registro: ${affiliate.fecha.toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                        })}</span>
                    </div>
                    <div class="affiliate-meta-item">
                        <i class="fas fa-phone"></i>
                        <span>${affiliate.telefono}</span>
                    </div>
                    <div class="affiliate-link">
                        <span class="affiliate-link-text">${affiliate.link}</span>
                        <button class="copy-link" data-link="${affiliate.link}">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    initFilters() {
        const populateSelect = (selector, key) => {
            const select = document.querySelector(selector);
            const values = [...new Set(this.orders.map(item => item[key]))].filter(Boolean);
            select.innerHTML = '<option value="">Todos</option>' + 
                values.map(value => `<option value="${value}">${value}</option>`).join('');
        };

        populateSelect('#filter-country', 'country');
        populateSelect('#filter-affiliate', 'affiliate');
        populateSelect('#filter-user-type', 'userType');
    }

    applyFilters() {
        if (this.currentView !== 'dashboard') return;

        const filters = {
            date: document.getElementById('filter-date').value,
            country: document.getElementById('filter-country').value,
            affiliate: document.getElementById('filter-affiliate').value,
            userType: document.getElementById('filter-user-type').value
        };

        const filtered = this.orders.filter(order => {
            const orderDateStr = order.date.toISOString().split('T')[0];
            return (
                (!filters.date || orderDateStr === filters.date) &&
                (!filters.country || order.country === filters.country) &&
                (!filters.affiliate || order.affiliate === filters.affiliate) &&
                (!filters.userType || order.userType === filters.userType)
            );
        });

        this.updateStats(filtered);
        this.renderGeneralSummary(filtered);
        this.renderCountryDistribution(filtered);
        this.renderTopProducts(filtered);
        this.renderOrders(filtered);
    }

    updateStats(data) {
        document.getElementById('total-sales').textContent = 
            `$${data.reduce((acc, order) => acc + order.total, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        
        document.getElementById('total-products').textContent = 
            data.reduce((acc, order) => acc + order.productsCount, 0).toLocaleString();

        document.getElementById('total-orders').textContent = data.length;
    }

    renderGeneralSummary(data) {
        const summaryData = {
            'Países Únicos': new Set(data.map(order => order.country)).size,
            'Afiliados Activos': new Set(data.map(order => order.affiliate)).size,
            'Tipos de Usuario': new Set(data.map(order => order.userType)).size,
            'Sesiones Promedio': `${(data.reduce((acc, order) => acc + order.duracion_sesion_segundos, 0) / (data.length || 1)).toFixed(1)}s`
        };

        const container = document.getElementById('general-summary');
        container.innerHTML = Object.entries(summaryData).map(([title, value]) => `
            <div class="summary-item">
                <h4>${title}</h4>
                <div class="stat-value">${value}</div>
            </div>
        `).join('');
    }

    renderCountryDistribution(data) {
        const countries = data.reduce((acc, order) => {
            acc[order.country] = (acc[order.country] || 0) + order.total;
            return acc;
        }, {});

        const container = document.getElementById('country-distribution');
        container.innerHTML = Object.entries(countries)
            .sort((a, b) => b[1] - a[1])
            .map(([country, total]) => `
                <div class="ranking-item">
                    <span>${country}</span>
                    <span>$${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                </div>
            `).join('');
    }

    renderTopProducts(data) {
        const products = data.reduce((acc, order) => {
            order.compras.forEach(product => {
                acc[product.producto] = (acc[product.producto] || 0) + product.cantidad;
            });
            return acc;
        }, {});

        const container = document.getElementById('top-products');
        container.innerHTML = Object.entries(products)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([product, quantity]) => `
                <div class="ranking-item">
                    <span>${product}</span>
                    <span>${quantity} unidades</span>
                </div>
            `).join('');
    }

    renderOrders(data) {
        const container = document.getElementById('orders-list');
        if (!container) return;

        container.innerHTML = data
            .sort((a, b) => b.date - a.date)
            .map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-main-info">
                            <h4>${order.nombre_comprador}</h4>
                            <div class="order-meta">
                                <span class="meta-item">
                                    <i class="fas fa-globe"></i>
                                    ${order.country}
                                </span>
                                <span class="meta-item">
                                    <i class="fas fa-user-tag"></i>
                                    ${order.userType}
                                </span>
                                <span class="meta-item">
                                    <i class="fas fa-clock"></i>
                                    ${order.duracion_sesion_segundos}s
                                </span>
                            </div>
                        </div>
                        <div class="order-stats">
                            <div class="stat-value">$${order.total.toFixed(2)}</div>
                            <div class="stat-label">${order.productsCount} productos</div>
                        </div>
                    </div>
                    <div class="order-details">
                        <div class="products-list">
                            ${order.compras.map(product => `
                                <div class="product-item">
                                    <span>${product.producto}</span>
                                    <span>${product.cantidad} × $${product.precio_unitario}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-footer">
                            <div class="meta-item">
                                <i class="fas fa-desktop"></i>
                                ${order.navegador} / ${order.sistema_operativo}
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-phone"></i>
                                ${order.telefono_comprador}
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-envelope"></i>
                                ${order.correo_comprador}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => new SalesDashboard());
