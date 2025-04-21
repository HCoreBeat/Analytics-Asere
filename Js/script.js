class SalesDashboard {
    constructor() {
        this.orders = [];
        this.affiliates = [];
        this.currentView = 'dashboard';
        this.filteredOrders = [];
        this.filteredAffiliates = [];
        this.filteredTemporaryAffiliates = [];
        this.sortAffiliatesBy = 'number-desc';
        this.sortTemporaryAffiliatesBy = 'date-desc';
        this.charts = {
            country: null,
            products: null,
            salesTrend: null
        };
        this.initialize();
    }

    async initialize() {
        await this.loadData();
        await this.loadAffiliates();
        this.setupEventListeners();
        this.initFilters();
        this.initCharts();
        this.applyFilters();
        this.renderAllAffiliates();
        this.setupView();
    }

    async loadData() {
        try {
            const response = await fetch('Json/estadistica.json');
            this.orders = await response.json();
            this.normalizeData();
            this.filteredOrders = [...this.orders];
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadAffiliates() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/HCoreBeat/Asere/main/Json/afiliados.json');
            this.affiliates = await response.json();
            this.normalizeAffiliatesData();
            this.applyAffiliatesSorting();
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
            order.searchText = `${order.nombre_comprador} ${order.country} ${order.userType} ${order.affiliate} ${order.telefono_comprador} ${order.correo_comprador}`.toLowerCase();
        });
    }

    normalizeAffiliatesData() {
        this.affiliates.forEach(affiliate => {
            affiliate.fecha = new Date(affiliate.fecha);
            affiliate.telefono = affiliate.telefono || 'No especificado';
            affiliate.numero = affiliate.numero || 'Permanente';
            affiliate.link = `https://www.asereshops.com/?ref=${affiliate.id}`;
            affiliate.searchText = `${affiliate.nombre} ${affiliate.id} ${affiliate.numero} ${affiliate.telefono}`.toLowerCase();
            affiliate.numeroInt = affiliate.numero === 'Permanente' ? 0 : parseInt(affiliate.numero) || 0;
        });

        this.filteredAffiliates = [...this.affiliates.filter(a => a.numero !== 'Permanente')];
        this.filteredTemporaryAffiliates = [...this.affiliates.filter(a => a.numero === 'Permanente')];
    }

    exportData() {
        try {
            // Crear libro de Excel
            const wb = XLSX.utils.book_new();
            
            // Hoja de resumen
            const summaryData = [
                ["Métrica", "Valor"],
                ["Total de pedidos", this.filteredOrders.length],
                ["Ventas totales", `$${this.filteredOrders.reduce((acc, order) => acc + order.total, 0).toFixed(2)}`],
                ["Productos vendidos", this.filteredOrders.reduce((acc, order) => acc + order.productsCount, 0)],
                ["Clientes únicos", new Set(this.filteredOrders.map(order => order.correo_comprador)).size],
                ["Países únicos", new Set(this.filteredOrders.map(order => order.country)).size],
                ["Afiliados activos", new Set(this.filteredOrders.map(order => order.affiliate)).size]
            ];
            
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
            
            // Hoja de pedidos
            const ordersData = this.filteredOrders.map(order => ({
                "Fecha": order.date.toLocaleString(),
                "Cliente": order.nombre_comprador,
                "Email": order.correo_comprador,
                "Teléfono": order.telefono_comprador,
                "País": order.country,
                "Afiliado": order.affiliate,
                "Tipo Usuario": order.userType,
                "Total": order.total,
                "Productos": order.productsCount,
                "Duración Sesión (s)": order.duracion_sesion_segundos,
                "Navegador": order.navegador,
                "Sistema Operativo": order.sistema_operativo,
                "Origen": order.origen
            }));
            
            const wsOrders = XLSX.utils.json_to_sheet(ordersData);
            XLSX.utils.book_append_sheet(wb, wsOrders, "Pedidos");
            
            // Hoja de productos
            const productsData = Object.entries(
                this.filteredOrders.reduce((acc, order) => {
                    order.compras.forEach(product => {
                        const key = product.producto;
                        acc[key] = acc[key] || { producto: key, cantidad: 0, total: 0 };
                        acc[key].cantidad += product.cantidad;
                        acc[key].total += product.precio_total;
                    });
                    return acc;
                }, {})
            ).map(([_, product]) => product);
            
            const wsProducts = XLSX.utils.json_to_sheet(productsData);
            XLSX.utils.book_append_sheet(wb, wsProducts, "Productos");
            
            // Generar archivo
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Estadisticas_Asere_${dateStr}.xlsx`);
            
        } catch (error) {
            console.error("Error al exportar:", error);
            alert("Ocurrió un error al generar el archivo de exportación");
        }
    }

    initCharts() {
        // Gráfica de países
        const countryCtx = document.getElementById('country-chart')?.getContext('2d');
        if (countryCtx) {
            this.charts.country = this.createChart(countryCtx, 'doughnut', {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#00ff9d', '#00b4ff', '#ff6b6b', '#feca57', '#5f27cd',
                        '#1dd1a1', '#ff9ff3', '#f368e0', '#ff9f43', '#ee5253'
                    ],
                    borderWidth: 0
                }]
            });
        }

        // Gráfica de productos
        const productsCtx = document.getElementById('products-chart')?.getContext('2d');
        if (productsCtx) {
            this.charts.products = this.createChart(productsCtx, 'bar', {
                labels: [],
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: [],
                    backgroundColor: '#00ff9d',
                    borderWidth: 0
                }]
            });
        }

        // Gráfica de tendencia de ventas
        const trendCtx = document.getElementById('sales-trend-chart')?.getContext('2d');
        if (trendCtx) {
            this.charts.salesTrend = this.createChart(trendCtx, 'line', {
                labels: [],
                datasets: [{
                    label: 'Ventas ($)',
                    data: [],
                    borderColor: '#00ff9d',
                    backgroundColor: 'rgba(0, 255, 157, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            });
        }
    }

    createChart(ctx, type, data) {
        return new Chart(ctx, {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: type === 'doughnut',
                        position: 'bottom',
                        labels: {
                            color: '#f8f9fa',
                            boxWidth: 12,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(139, 142, 148, 0.1)'
                        },
                        ticks: {
                            color: '#f8f9fa'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#f8f9fa'
                        }
                    }
                }
            }
        });
    }

    updateCharts(data) {
        // Actualizar gráfica de países
        if (this.charts.country) {
            const countries = this.getCountryDistribution(data);
            this.charts.country.data.labels = countries.map(c => c.country);
            this.charts.country.data.datasets[0].data = countries.map(c => c.total);
            this.charts.country.update();
        }

        // Actualizar gráfica de productos
        if (this.charts.products) {
            const products = this.getTopProducts(data, 5);
            this.charts.products.data.labels = products.map(p => p.product);
            this.charts.products.data.datasets[0].data = products.map(p => p.quantity);
            this.charts.products.update();
        }

        // Actualizar gráfica de tendencia
        if (this.charts.salesTrend) {
            const trendData = this.getSalesTrend(data);
            this.charts.salesTrend.data.labels = trendData.map(d => d.date);
            this.charts.salesTrend.data.datasets[0].data = trendData.map(d => d.total);
            this.charts.salesTrend.update();
        }
    }

    getCountryDistribution(data) {
        const countries = data.reduce((acc, order) => {
            acc[order.country] = (acc[order.country] || 0) + order.total;
            return acc;
        }, {});

        return Object.entries(countries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([country, total]) => ({ country, total }));
    }

    getTopProducts(data, limit = 10) {
        const products = data.reduce((acc, order) => {
            order.compras.forEach(product => {
                acc[product.producto] = (acc[product.producto] || 0) + product.cantidad;
            });
            return acc;
        }, {});

        return Object.entries(products)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([product, quantity]) => ({ product, quantity }));
    }

    getSalesTrend(data) {
        const dailySales = data.reduce((acc, order) => {
            const dateStr = order.date.toISOString().split('T')[0];
            acc[dateStr] = (acc[dateStr] || 0) + order.total;
            return acc;
        }, {});

        return Object.entries(dailySales)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    getNextAffiliateNumber() {
        const permanentAffiliates = this.affiliates.filter(a => a.numero !== 'Permanente');
        if (permanentAffiliates.length === 0) return 1;
        
        const maxNumber = Math.max(...permanentAffiliates.map(a => a.numeroInt));
        return maxNumber + 1;
    }

    applyAffiliatesSorting() {
        this.filteredAffiliates.sort((a, b) => {
            switch (this.sortAffiliatesBy) {
                case 'number-desc': return b.numeroInt - a.numeroInt;
                case 'number-asc': return a.numeroInt - b.numeroInt;
                case 'date-desc': return b.fecha - a.fecha;
                case 'date-asc': return a.fecha - b.fecha;
                case 'name-asc': return a.nombre.localeCompare(b.nombre);
                case 'name-desc': return b.nombre.localeCompare(a.nombre);
                default: return b.numeroInt - a.numeroInt;
            }
        });

        this.filteredTemporaryAffiliates.sort((a, b) => {
            switch (this.sortTemporaryAffiliatesBy) {
                case 'date-desc': return b.fecha - a.fecha;
                case 'date-asc': return a.fecha - b.fecha;
                case 'name-asc': return a.nombre.localeCompare(b.nombre);
                case 'name-desc': return b.nombre.localeCompare(a.nombre);
                default: return b.fecha - a.fecha;
            }
        });
    }

    setupEventListeners() {

        // Exportar datos
        document.querySelector('.btn-export')?.addEventListener('click', () => {
            this.exportData();
        });

        // Menú toggle
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

        // Mostrar formulario de afiliado
        document.getElementById('show-add-affiliate-form')?.addEventListener('click', () => {
            const panel = document.getElementById('add-affiliate-panel');
            panel.style.display = 'block';
            
            document.getElementById('generated-id').textContent = this.generateUniqueId(this.affiliates);
            document.getElementById('generated-link').textContent = 
                `https://www.asereshops.com/?ref=${document.getElementById('generated-id').textContent}`;
        });

        // Ocultar formulario de afiliado
        document.getElementById('cancel-add-affiliate')?.addEventListener('click', () => {
            document.getElementById('add-affiliate-panel').style.display = 'none';
            document.getElementById('add-affiliate-form').reset();
        });

        // Formulario para agregar afiliados permanentes
        document.getElementById('add-affiliate-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('affiliate-name').value.trim();
            const phone = document.getElementById('affiliate-phone').value.trim();
            
            if (!name) {
                alert('El nombre es requerido');
                return;
            }
            
            const nextNumber = this.getNextAffiliateNumber();
            
            const newAffiliate = {
                id: document.getElementById('generated-id').textContent,
                nombre: name,
                fecha: new Date().toISOString(),
                numero: nextNumber.toString(),
                telefono: phone || undefined
            };
            
            this.affiliates.push(newAffiliate);
            this.filteredAffiliates.push(newAffiliate);
            
            const success = await this.updateAffiliatesFile(this.affiliates);
            
            if (success) {
                document.getElementById('add-affiliate-form').reset();
                document.getElementById('add-affiliate-panel').style.display = 'none';
                
                this.applyAffiliatesSorting();
                this.renderAffiliatesList('affiliates-list', this.filteredAffiliates);
                alert(`Afiliado agregado correctamente con el número #${nextNumber}`);
            }
        });

        // Eliminar afiliado
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-affiliate') || e.target.closest('.delete-affiliate')) {
                if (!confirm('¿Estás seguro de que quieres eliminar este afiliado?')) return;
                
                const button = e.target.classList.contains('delete-affiliate') ? e.target : e.target.closest('.delete-affiliate');
                const id = button.dataset.id;
                
                this.affiliates = this.affiliates.filter(aff => aff.id !== id);
                this.filteredAffiliates = this.filteredAffiliates.filter(aff => aff.id !== id);
                this.filteredTemporaryAffiliates = this.filteredTemporaryAffiliates.filter(aff => aff.id !== id);
                
                const success = await this.updateAffiliatesFile(this.affiliates);
                
                if (success) {
                    this.renderAffiliatesList('affiliates-list', this.filteredAffiliates);
                    this.renderAffiliatesList('temporary-affiliates-list', this.filteredTemporaryAffiliates);
                    alert('Afiliado eliminado correctamente');
                }
            }
        });

        // Búsqueda en pedidos
        const searchOrdersInput = document.getElementById('search-orders');
        if (searchOrdersInput) {
            searchOrdersInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                this.filteredOrders = this.orders.filter(order => 
                    order.searchText.includes(searchTerm)
                );
                this.renderOrders(this.filteredOrders);
            });
        }

        // Búsqueda en afiliados permanentes
        const searchAffiliatesInput = document.getElementById('search-affiliates');
        if (searchAffiliatesInput) {
            searchAffiliatesInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                this.filteredAffiliates = this.affiliates
                    .filter(a => a.numero !== 'Temporal')
                    .filter(affiliate => 
                        affiliate.searchText.includes(searchTerm)
                    );
                this.applyAffiliatesSorting();
                this.renderAffiliatesList('affiliates-list', this.filteredAffiliates);
            });
        }

        // Búsqueda en afiliados temporales
        const searchTempAffiliatesInput = document.getElementById('search-temporary-affiliates');
        if (searchTempAffiliatesInput) {
            searchTempAffiliatesInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                this.filteredTemporaryAffiliates = this.affiliates
                    .filter(a => a.numero === 'Temporal')
                    .filter(affiliate => 
                        affiliate.searchText.includes(searchTerm)
                    );
                this.applyAffiliatesSorting();
                this.renderAffiliatesList('temporary-affiliates-list', this.filteredTemporaryAffiliates);
            });
        }

        // Ordenación de afiliados
        document.getElementById('sort-affiliates')?.addEventListener('change', (e) => {
            this.sortAffiliatesBy = e.target.value;
            this.applyAffiliatesSorting();
            this.renderAffiliatesList('affiliates-list', this.filteredAffiliates);
        });

        document.getElementById('sort-temporary-affiliates')?.addEventListener('change', (e) => {
            this.sortTemporaryAffiliatesBy = e.target.value;
            this.applyAffiliatesSorting();
            this.renderAffiliatesList('temporary-affiliates-list', this.filteredTemporaryAffiliates);
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

        // Cambio de pestañas en transacciones
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const tab = btn.dataset.tab;
                let filtered = this.filteredOrders;
                
                if (tab === 'affiliated') {
                    filtered = filtered.filter(order => order.afiliado && order.afiliado !== 'Ninguno');
                } else if (tab === 'direct') {
                    filtered = filtered.filter(order => !order.afiliado || order.afiliado === 'Ninguno');
                }
                
                this.renderOrders(filtered);
            });
        });
    }

    async updateAffiliatesFile(newAffiliates) {
        try {
            // Obtener el token de las variables de entorno
            const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
            console.log("github token: "+GITHUB_TOKEN);
            
            if (!GITHUB_TOKEN) {
                throw new Error("No se configuró el token de GitHub");
            }
    
            const REPO_OWNER = 'HCoreBeat';
            const REPO_NAME = 'Asere';
            const AFFILIATES_FILE_PATH = 'Json/afiliados.json';
    
            // 1. Obtener el SHA del archivo actual
            const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${AFFILIATES_FILE_PATH}`;
            const getResponse = await fetch(getUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!getResponse.ok) {
                throw new Error(`Error al obtener archivo: ${getResponse.status}`);
            }
            
            const fileData = await getResponse.json();
            const sha = fileData.sha;
            
            // 2. Preparar contenido nuevo
            const content = JSON.stringify(newAffiliates, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            // 3. Actualizar el archivo
            const updateResponse = await fetch(getUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Actualización de afiliados desde Analytics Asere',
                    content: encodedContent,
                    sha: sha
                })
            });
            
            if (!updateResponse.ok) {
                const errorData = await updateResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `Error HTTP: ${updateResponse.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error updating affiliates file:', error);
            
            // Mensajes de error más descriptivos
            let errorMessage;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Error de conexión. Verifica tu acceso a internet.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Error de autenticación. El token de GitHub no es válido.';
            } else if (error.message.includes('403')) {
                errorMessage = 'Límite de API excedido. Intenta nuevamente más tarde.';
            } else {
                errorMessage = `Error: ${error.message}`;
            }
            
            alert(errorMessage);
            return false;
        }
    }

    generateUniqueId(existingAffiliates) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id;
        
        do {
            id = '';
            for (let i = 0; i < 6; i++) {
                id += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (existingAffiliates.some(aff => aff.id === id));
        
        return id;
    }

    setupView() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === this.currentView);
        });

        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.toggle('hidden', view.id !== `${this.currentView}-view`);
        });

        const filters = document.querySelector('.filters');
        if (filters) {
            filters.style.display = this.currentView === 'dashboard' ? 'flex' : 'none';
        }

        const addPanel = document.getElementById('add-affiliate-panel');
        if (addPanel) {
            addPanel.style.display = 'none';
        }
    }

    renderAllAffiliates() {
        this.applyAffiliatesSorting();
        this.renderAffiliatesList('affiliates-list', this.filteredAffiliates);
        this.renderAffiliatesList('temporary-affiliates-list', this.filteredTemporaryAffiliates);
    }

    renderAffiliatesList(containerId, affiliates) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = affiliates.map(affiliate => `
            <div class="affiliate-card">
                <div class="affiliate-header">
                    <div class="affiliate-name">${affiliate.nombre}</div>
                    <div class="affiliate-id">${affiliate.numero !== 'Temporal' ? '#' + affiliate.numero : 'Temporal'}</div>
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
                    ${affiliate.telefono && affiliate.telefono !== 'No especificado' ? `
                    <div class="affiliate-meta-item">
                        <i class="fas fa-phone"></i>
                        <span>${affiliate.telefono}</span>
                    </div>
                    ` : ''}
                    <div class="affiliate-link">
                        <span class="affiliate-link-text">${affiliate.link}</span>
                        <button class="copy-link" data-link="${affiliate.link}">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="delete-affiliate" data-id="${affiliate.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
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

        this.filteredOrders = this.orders.filter(order => {
            const orderDateStr = order.date.toISOString().split('T')[0];
            return (
                (!filters.date || orderDateStr === filters.date) &&
                (!filters.country || order.country === filters.country) &&
                (!filters.affiliate || order.affiliate === filters.affiliate) &&
                (!filters.userType || order.userType === filters.userType)
            );
        });

        this.updateStats(this.filteredOrders);
        this.renderGeneralSummary(this.filteredOrders);
        this.renderCountryDistribution(this.filteredOrders);
        this.renderTopProducts(this.filteredOrders);
        this.renderOrders(this.filteredOrders);
        this.updateCharts(this.filteredOrders);
    }

    updateStats(data) {
        document.getElementById('total-sales').textContent = 
            `$${data.reduce((acc, order) => acc + order.total, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        
        document.getElementById('total-products').textContent = 
            data.reduce((acc, order) => acc + order.productsCount, 0).toLocaleString();

        document.getElementById('total-orders').textContent = data.length;

        const uniqueCustomers = new Set(data.map(order => order.correo_comprador)).size;
        document.getElementById('unique-customers').textContent = uniqueCustomers;
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
        if (container) {
            container.innerHTML = Object.entries(countries)
                .sort((a, b) => b[1] - a[1])
                .map(([country, total]) => `
                    <div class="ranking-item">
                        <span>${country}</span>
                        <span>$${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                    </div>
                `).join('');
        }
    }

    renderTopProducts(data) {
        const products = data.reduce((acc, order) => {
            order.compras.forEach(product => {
                acc[product.producto] = (acc[product.producto] || 0) + product.cantidad;
            });
            return acc;
        }, {});

        const container = document.getElementById('top-products');
        if (container) {
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
                            ${order.afiliado && order.afiliado !== 'Ninguno' ? `
                            <div class="affiliate-info">
                                <i class="fas fa-handshake"></i>
                                <span>Afiliado: ${order.afiliado}</span>
                            </div>
                            ` : ''}
                            <div class="traffic-source">
                                <i class="fas fa-${order.origen.includes('asereshops.com') ? 'link' : 'direct'}"></i>
                                <span>${order.origen.includes('asereshops.com') ? 'Enlace de afiliado' : 'Acceso directo'}</span>
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
