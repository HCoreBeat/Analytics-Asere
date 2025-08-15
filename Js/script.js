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
        this.setupTokenModal();
        this.tokenValid = false;

        // Add to constructor
        this.products = [];
        this.filteredProducts = [];
        this.productChanges = {
            modified: [],
            new: [],
            deleted: []
        };
        this.currentProduct = null;
        this.mainImageFile = null;
        this.additionalImageFiles = [];
        this.connectionStatus = 'checking';
        this.repoStatus = 'idle';

        this.selectedImages = [];
        this.imagesToDelete = [];
        this.repoStatus = 'idle';
        this.connectionStatus = 'checking';
        
        // Inicializar eventos
        this.setupImageManagerEvents();
        this.startStatusMonitoring();
        
        // Verificar conexión inicial
        this.checkConnection(); 

        this.todayOrders = []; // Inicializa el array
        window.salesDashboard = this;
        
    }

    

    async initialize() {
        await this.loadData();
        await this.loadAffiliates();
        await this.loadProducts();
        this.setupEventListeners();
        this.initFilters();
        this.initCharts();

        // Establecer el filtro de periodo a "Este Mes" por defecto
        document.getElementById('filter-period').value = 'month';

        this.applyFilters();
        this.renderAllAffiliates();
        this.setupView();
        this.setupProductsView();
        this.startStatusMonitoring();
    }

    getMonthName(monthIndex) {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[monthIndex];
    }

    // En la clase SalesDashboard, añade este método:
    getCurrencySymbol(country) {
        const europeanCountries = ['Spain', 'France', 'Germany', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 
            'Austria', 'Switzerland', 'Andorra', 'Luxembourg', 'Monaco', 'Ireland', 'Finland', 
            'Sweden', 'Denmark', 'Norway', 'Poland', 'Greece', 'Hungary', 'Romania', 
            'Bulgaria', 'Croatia', 'Slovakia', 'Slovenia', 'Czech Republic', 'Estonia', 
            'Latvia', 'Lithuania', 'Cyprus', 'Malta'];

        
        // Normalizar el nombre del país para comparación
        if (!country) return '$';
        const normalizedCountry = country.toLowerCase().trim();
        const isEuropean = europeanCountries.some(c => c.toLowerCase() === normalizedCountry);
        
        return isEuropean ? '€' : '$';
    }

    getMonthlyComparison(data) {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        
        // Inicializar todos los meses del año actual
        for (let month = 0; month < 12; month++) {
            const key = `${currentYear}-${month}`;
            monthlyData[key] = {
                month: this.getMonthName(month),
                orders: 0,
                sales: 0,
                products: 0,
                hasData: false
            };
        }
        
        // Procesar los datos reales
        data.forEach(order => {
            const orderDate = order.date;
            const year = orderDate.getFullYear();
            const month = orderDate.getMonth();
            
            if (year === currentYear) {
                const key = `${year}-${month}`;
                monthlyData[key].orders++;
                monthlyData[key].sales += order.total || 0;
                monthlyData[key].products += order.productsCount || 0;
                monthlyData[key].hasData = true;
            }
        });
        
        return Object.values(monthlyData).sort((a, b) => {
            const monthA = this.getMonthIndex(a.month);
            const monthB = this.getMonthIndex(b.month);
            return monthA - monthB;
        });
    }
    
    getMonthIndex(monthName) {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months.indexOf(monthName);
    }
    
    renderMonthlyComparison(data) {
        const container = document.getElementById('general-summary');
        if (!container) return;
    
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const period = document.getElementById('filter-period')?.value || 'month';
    
        // Obtener todos los datos mensuales
        const monthlyData = this.getMonthlyComparison(this.orders); // Usamos this.orders para tener todos los datos
        
        // Determinar el mes de referencia según el periodo seleccionado
        let referenceMonth = currentMonth;
        if (period === 'last-month') {
            referenceMonth = (currentMonth - 1 + 12) % 12;
        } else if (period === 'year') {
            referenceMonth = null; // Mostrará el año completo
        }
    
        // Datos del mes de referencia
        const referenceData = referenceMonth !== null ? 
            monthlyData.find(m => this.getMonthIndex(m.month) === referenceMonth) || 
            { month: this.getMonthName(referenceMonth), orders: 0, sales: 0, products: 0 }
            : null;
    
        // Datos del mes anterior con datos (para comparativa)
        let lastMonthWithData = null;
        if (referenceMonth !== null) {
            for (let i = 1; i <= 11; i++) { // Buscamos hasta 11 meses atrás
                const checkMonth = (referenceMonth - i + 12) % 12;
                const monthData = monthlyData.find(m => 
                    this.getMonthIndex(m.month) === checkMonth && 
                    (m.orders > 0 || m.sales > 0)
                );
                
                if (monthData) {
                    lastMonthWithData = monthData;
                    break;
                }
            }
        }
    
        // Calcular cambios porcentuales solo si hay datos del mes anterior
        let salesChangeHtml = '';
        let ordersChangeHtml = '';
        
        if (lastMonthWithData && referenceData) {
            const salesChange = lastMonthWithData.sales > 0 ? 
                ((referenceData.sales - lastMonthWithData.sales) / lastMonthWithData.sales * 100).toFixed(1) : 0;
            const ordersChange = lastMonthWithData.orders > 0 ? 
                ((referenceData.orders - lastMonthWithData.orders) / lastMonthWithData.orders * 100).toFixed(1) : 0;
            
            salesChangeHtml = `
                <div class="stat-change ${salesChange >= 0 ? 'positive' : 'negative'}">
                    ${salesChange >= 0 ? '↑' : '↓'} ${Math.abs(salesChange)}% 
                    vs ${lastMonthWithData.month}
                </div>
            `;
            
            ordersChangeHtml = `
                <div class="stat-change ${ordersChange >= 0 ? 'positive' : 'negative'}">
                    ${ordersChange >= 0 ? '↑' : '↓'} ${Math.abs(ordersChange)}%
                </div>
            `;
        }
    
        // Datos del año (siempre mostramos el total anual completo)
        const yearlyData = {
            sales: monthlyData.reduce((sum, month) => sum + month.sales, 0),
            orders: monthlyData.reduce((sum, month) => sum + month.orders, 0),
            products: monthlyData.reduce((sum, month) => sum + month.products, 0)
        };
    
        // Determinar el título según el periodo
        let title = `Resumen ${currentYear}`;
        if (period === 'month') title = `Resumen ${this.getMonthName(currentMonth)}`;
        if (period === 'last-month') title = `Resumen ${this.getMonthName((currentMonth - 1 + 12) % 12)}`;
    
        container.innerHTML = `
            <div class="summary-card">
                <div class="summary-header">
                    <h3><i class="fas fa-chart-line"></i> ${title}</h3>
                    ${referenceMonth !== null ? 
                        `<span class="period-badge">${this.getMonthName(referenceMonth)}</span>` : 
                        `<span class="period-badge">Anual</span>`}
                </div>
                
                <div class="summary-grid">
                    <div class="summary-item highlight">
                        <div class="stat-value">$${referenceData ? 
                            referenceData.sales.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 
                            yearlyData.sales.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                        <div class="stat-label">${referenceMonth !== null ? 'Ventas del mes' : 'Ventas anuales'}</div>
                        ${salesChangeHtml}
                    </div>
                    
                    <div class="summary-item">
                        <div class="stat-value">${referenceData ? 
                            referenceData.orders.toLocaleString() : 
                            yearlyData.orders.toLocaleString()}
                        </div>
                        <div class="stat-label">${referenceMonth !== null ? 'Pedidos' : 'Pedidos anuales'}</div>
                        ${ordersChangeHtml}
                    </div>
                    
                    <div class="summary-item">
                        <div class="stat-value">${referenceData ? 
                            referenceData.products.toLocaleString() : 
                            yearlyData.products.toLocaleString()}
                        </div>
                        <div class="stat-label">Productos</div>
                    </div>
                    
                    <div class="summary-item yearly">
                        <div class="stat-value">$${yearlyData.sales.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div class="stat-label">Ventas anuales totales</div>
                        <div class="stat-sub">${yearlyData.orders.toLocaleString()} pedidos, ${yearlyData.products.toLocaleString()} productos</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Métodos para monitorear estado
    startStatusMonitoring() {
        // Verificación inicial
        this.checkConnection();
        
        // Verificar cada 2 minutos (reducir frecuencia)
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 120000); // 120000 ms = 2 minutos
        
        // Verificar productos/afiliados cada 5 minutos
        this.dataRefreshInterval = setInterval(async () => {
            if (this.connectionStatus === 'online') {
                await this.loadAffiliates();
                await this.loadProducts();
            }
        }, 300000); // 300000 ms = 5 minutos
    }

    async checkConnection() {
        try {
            // Verificar conexión general a internet primero
            const online = await this.checkInternetConnection();
            if (!online) {
                this.connectionStatus = 'offline';
                this.updateStatusUI();
                return;
            }
    
            // Verificar GitHub API con autenticación si existe
            const GITHUB_TOKEN = localStorage.getItem('github_token');
            const headers = GITHUB_TOKEN ? {
                'Authorization': `token ${GITHUB_TOKEN}`
            } : {};
            
            const response = await fetch('https://api.github.com/rate_limit', {
                method: 'GET',
                headers: headers
            });
            
            if (response.status === 403) {
                // Límite de tasa excedido
                const rateLimitReset = response.headers.get('x-ratelimit-reset');
                const resetTime = rateLimitReset ? new Date(rateLimitReset * 1000) : null;
                
                console.warn('Límite de tasa de GitHub alcanzado', {
                    limit: response.headers.get('x-ratelimit-limit'),
                    remaining: response.headers.get('x-ratelimit-remaining'),
                    reset: resetTime?.toLocaleTimeString()
                });
                
                this.connectionStatus = 'rate-limited';
            } else if (response.ok) {
                this.connectionStatus = 'online';
            } else {
                this.connectionStatus = 'offline';
            }
        } catch (error) {
            console.error('Error checking connection:', error);
            this.connectionStatus = 'offline';
        }
        
        this.updateStatusUI();
    }
    
    async checkInternetConnection() {
        try {
            // Usar un endpoint más ligero para verificar conexión general
            const response = await fetch('https://httpbin.org/get', {
                method: 'HEAD',
                cache: 'no-store',
                mode: 'no-cors'
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    updateStatusUI() {
        const statusTexts = {
            'online': 'En línea',
            'offline': 'Sin conexión',
            'rate-limited': 'Límite de API alcanzado',
            'checking': 'Verificando...'
        };
        
        document.getElementById('connection-status-text').textContent = 
            statusTexts[this.connectionStatus] || 'Desconocido';
        
        // Actualizar icono según estado
        const icon = document.querySelector('.connection-status i');
        icon.className = {
            'online': 'fas fa-circle',
            'offline': 'fas fa-circle',
            'rate-limited': 'fas fa-exclamation-circle',
            'checking': 'fas fa-circle-notch fa-spin'
        }[this.connectionStatus] || 'fas fa-circle';
        
        icon.style.color = {
            'online': '#00ff9d',
            'offline': '#ff6b6b',
            'rate-limited': '#feca57',
            'checking': '#00b4ff'
        }[this.connectionStatus] || '#f8f9fa';
    }

    setRepoIdle() {
        this.repoStatus = 'idle';
        this.updateStatusUI();
    }

    async loadData() {
        try {
            const response = await fetch('Json/estadistica.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.orders = await response.json();
            
            // Verificar si los datos son válidos
            if (!Array.isArray(this.orders)) {
                throw new Error('Datos inválidos: no es un array');
            }
            
            this.normalizeData();
            this.filteredOrders = [...this.orders];
        } catch (error) {
            console.error('Error loading data:', error);
            this.showAlert('Error al cargar los datos. Intente recargar la página.', 'error');
            
            // Usar datos de respaldo si existen
            if (localStorage.getItem('cached_orders')) {
                this.orders = JSON.parse(localStorage.getItem('cached_orders'));
                this.normalizeData();
                this.filteredOrders = [...this.orders];
                this.showAlert('Usando datos almacenados localmente', 'warning');
            }
        }
    }

    async loadAffiliates() {
    try {
        // Modificación para evitar caché
        const response = await fetch(`https://raw.githubusercontent.com/HCoreBeat/Asere/main/Json/afiliados.json?t=${Date.now()}`);
        this.affiliates = await response.json();
        this.normalizeAffiliatesData();
        this.applyAffiliatesSorting();
        } catch (error) {
        console.error('Error loading affiliates:', error);
        }
    }

    normalizeData() {
        this.orders.forEach(order => {
            // Asegurar que la fecha se parsea correctamente
            const dateStr = order.fecha_hora_entrada.replace(/\(.*?\)/, '').trim();
            order.date = new Date(dateStr);
            
            // Validar que la fecha sea válida
            if (isNaN(order.date.getTime())) {
                console.error('Fecha inválida:', order.fecha_hora_entrada);
                order.date = new Date(); // Usar fecha actual como fallback
            }
            
            order.dateStr = order.date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            order.total = parseFloat(order.precio_compra_total) || 0;
            order.productsCount = order.compras.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
            order.userType = order.tipo_usuario || 'No especificado';
            order.affiliate = order.afiliado || 'Sin afiliado';
            order.country = order.pais || 'No especificado';
            order.searchText = `${order.nombre_comprador} ${order.country} ${order.userType} ${order.affiliate} ${order.telefono_comprador} ${order.correo_comprador}`.toLowerCase();
            
            // Verificar si es pedido de hoy
            const today = new Date();
            if (order.date.getDate() === today.getDate() && 
                order.date.getMonth() === today.getMonth() && 
                order.date.getFullYear() === today.getFullYear()) {
                this.todayOrders.push(order);
            }
        });
    }


    updatePendingChangesLists() {
        const renderList = (items, containerId, emptyMessage) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = items.length > 0 
                ? items.map(item => `<li>${item.nombre} (${item.categoria})</li>`).join('')
                : `<li class="empty-message">${emptyMessage}</li>`;
        };
    
        renderList(this.productChanges.new, 'new-products-list', 'No hay productos nuevos');
        renderList(this.productChanges.modified, 'modified-products-list', 'No hay productos modificados');
        renderList(this.productChanges.deleted, 'deleted-products-list', 'No hay productos eliminados');
    }

    normalizeAffiliatesData() {
        this.affiliates.forEach(affiliate => {
            // Convertir fecha a objeto Date válido
            affiliate.fecha = this.parseFecha(affiliate.fecha);
            affiliate.telefono = affiliate.telefono || 'No especificado';
            affiliate.numero = affiliate.numero || 'Permanente';
            affiliate.link = `https://www.asereshops.com/?ref=${affiliate.id}`;
            affiliate.searchText = `${affiliate.nombre} ${affiliate.id} ${affiliate.numero} ${affiliate.telefono}`.toLowerCase();
            affiliate.numeroInt = affiliate.numero === 'Permanente' ? 0 : parseInt(affiliate.numero) || 0;
            
            // Asegurarse que la fecha es un objeto Date válido
            if (!(affiliate.fecha instanceof Date) || isNaN(affiliate.fecha.getTime())) {
                affiliate.fecha = new Date(); // Fecha actual como fallback
            }
        });
        
        this.filteredAffiliates = [...this.affiliates.filter(a => a.numero !== 'Permanente')];
        this.filteredTemporaryAffiliates = [...this.affiliates.filter(a => a.numero === 'Permanente')];
    }
    
    
    parseFecha(fechaString) {
        if (!fechaString) return new Date(); // Si no hay fecha, devolver fecha actual
        
        // Intentar parsear como ISO
        const isoDate = new Date(fechaString);
        if (!isNaN(isoDate.getTime())) return isoDate;
        
        // Intentar parsear formato dd/mm/yyyy
        if (fechaString.includes('/')) {
            const [day, month, year] = fechaString.split('/');
            const parsedDate = new Date(year, month - 1, day);
            if (!isNaN(parsedDate.getTime())) return parsedDate;
        }
        
        console.warn('Fecha inválida:', fechaString);
        return new Date(); // Fecha actual como fallback
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

    // En el método initCharts(), actualiza las configuraciones:
    initCharts() {
        // Configuración común mejorada
        const gridColor = 'rgba(255, 255, 255, 0.1)';
        const textColor = '#f8f9fa';
        const tooltipBg = 'rgba(0, 0, 0, 0.9)';
        
        // Gráfica de países (doughnut) - Mejorada
        const countryCtx = document.getElementById('country-chart')?.getContext('2d');
        if (countryCtx) {
            this.charts.country = new Chart(countryCtx, {
                type: 'doughnut',
                data: { labels: [], datasets: [{
                    data: [],
                    backgroundColor: [
                        '#00ff9d', '#00b4ff', '#ff6b6b', '#feca57', '#5f27cd',
                        '#1dd1a1', '#ff9ff3', '#f368e0', '#ff9f43', '#ee5253'
                    ],
                    borderWidth: 0,
                    hoverBorderWidth: 2,
                    hoverBorderColor: 'rgba(255, 255, 255, 0.8)'
                }]},
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: textColor,
                                font: { size: 12 },
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                                }
                            },
                            backgroundColor: tooltipBg,
                            titleColor: textColor,
                            bodyColor: textColor,
                            borderColor: '#00ff9d',
                            borderWidth: 1
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    }
                }
            });
        }

        // Gráfica de productos (bar) - Mejorada
        const productsCtx = document.getElementById('products-chart')?.getContext('2d');
        if (productsCtx) {
            this.charts.products = new Chart(productsCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Unidades Vendidas',
                        data: [],
                        backgroundColor: '#00ff9d',
                        borderRadius: 6,
                        borderWidth: 0,
                        hoverBackgroundColor: '#00e68a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.raw} unidades vendidas`
                            },
                            backgroundColor: tooltipBg,
                            titleColor: textColor,
                            bodyColor: textColor
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: gridColor },
                            ticks: { color: textColor }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor }
                        }
                    }
                }
            });
        }

        // Gráfica de tendencia (line) - Mejorada
        const trendCtx = document.getElementById('sales-trend-chart')?.getContext('2d');
        if (trendCtx) {
            this.charts.salesTrend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Ventas ($)',
                        data: [],
                        borderColor: '#00ff9d',
                        backgroundColor: 'rgba(0, 255, 157, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#00ff9d',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 8,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `$${context.raw.toFixed(2)}`
                            },
                            backgroundColor: tooltipBg,
                            titleColor: textColor,
                            bodyColor: textColor
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: gridColor },
                            ticks: { 
                                color: textColor,
                                callback: (value) => `$${value}`
                            }
                        },
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: textColor }
                        }
                    }
                }
            });
        }
    }

    // Actualizar tooltips cuando se actualizan los datos
    updateCharts(data) {
        // Gráfica de países
        if (this.charts.country) {
            const countries = this.getCountryDistribution(data);
            this.charts.country.data.labels = countries.map(c => c.country || 'Sin país');
            this.charts.country.data.datasets[0].data = countries.map(c => c.total || 0);
            
            this.charts.country.options.plugins.tooltip.callbacks.label = (context) => {
                const value = context.raw || 0;
                return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            };
            this.charts.country.update();
        }

        // Gráfica de productos
        if (this.charts.products) {
            const products = this.getTopProducts(data, 5);
            this.charts.products.data.labels = products.map(p => p.product || 'Sin nombre');
            this.charts.products.data.datasets[0].data = products.map(p => p.quantity || 0);
            
            this.charts.products.options.plugins.tooltip.callbacks.label = (context) => {
                const value = context.raw || 0;
                return `${value} unidades`;
            };
            this.charts.products.update();
        }

        // Actualizar gráfica de tendencia
        if (this.charts.salesTrend) {
            const trendData = this.getSalesTrend(data);
            this.charts.salesTrend.data.labels = trendData.map(d => d.date);
            this.charts.salesTrend.data.datasets[0].data = trendData.map(d => d.total);
            
            // Actualizar tooltip con nuevos datos
            this.charts.salesTrend.options.plugins.tooltip.callbacks.afterBody = (context) => {
                const date = context[0].label;
                const dailyOrders = data.filter(o => {
                    const orderDate = o.date.toISOString().split('T')[0];
                    return orderDate === date;
                }).length;
                return [`Pedidos: ${dailyOrders}`];
            };
            
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

        // actualizar la lista de pedidos
        document.getElementById('refresh-data')?.addEventListener('click', async () => {
        const refreshBtn = document.getElementById('refresh-data');
        const originalText = refreshBtn.innerHTML;
        
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        refreshBtn.disabled = true;
        
        try {
            await this.loadData();
            this.applyFilters();
            this.showAlert('✅ Datos actualizados correctamente', 'success');
        } catch (error) {
            console.error('Error al actualizar datos:', error);
            this.showAlert(`❌ Error al actualizar: ${error.message}`, 'error');
        } finally {
            setTimeout(() => {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            }, 1000);
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
            
            if (!localStorage.getItem('github_token')) {
                this.showTokenModal(true);
                return;
            }
            
            const name = document.getElementById('affiliate-name').value.trim();
            const phone = document.getElementById('affiliate-phone').value.trim();
            
            if (!name) {
                this.showAlert('El nombre es requerido', 'error');
                return;
            }
            
            const loadingAlert = this.showAlert('Guardando nuevo afiliado...', 'loading');
            
            try {
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
                    loadingAlert.remove();
                    this.showAlert(`✅ Afiliado #${nextNumber} (${name}) guardado exitosamente! Los cambios pueden tardar hasta 5 minutos en aplicarse`, 'success');
                    document.getElementById('add-affiliate-form').reset();
                    document.getElementById('add-affiliate-panel').style.display = 'none';
                    this.applyAffiliatesSorting();
                    this.renderAffiliatesList('affiliates-list', this.filteredAffiliates);
                }
            } catch (error) {
                loadingAlert.remove();
                this.showAlert(`❌ Error al guardar afiliado: ${error.message}`, 'error');
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
                    this.showAlert('Afiliado eliminado correctamente');
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
            const loadingAlert = this.showAlert('Actualizando lista de afiliados...', 'loading');
            try {
                await this.loadAffiliates();
                this.renderAllAffiliates();
                loadingAlert.remove();
                this.showAlert('✅ Lista de afiliados actualizada. Nota: Los cambios pueden tardar hasta 5 minutos en verse reflejados', 'success');
            } catch (error) {
                loadingAlert.remove();
                this.showAlert(`❌ Error al actualizar: ${error.message}`, 'error');
            }
        });
        
        document.getElementById('refresh-temporary-affiliates')?.addEventListener('click', async () => {
            const loadingAlert = this.showAlert('Actualizando lista de afiliados temporales...', 'loading');
            try {
                await this.loadAffiliates();
                this.renderAllAffiliates();
                loadingAlert.remove();
                this.showAlert('✅ Lista de afiliados temporales actualizada. Nota: Los cambios pueden tardar hasta 5 minutos en verse reflejados', 'success');
            } catch (error) {
                loadingAlert.remove();
                this.showAlert(`❌ Error al actualizar: ${error.message}`, 'error');
            }
        });

         // Configuración
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            document.getElementById('settings-modal').classList.remove('hidden');
            const savedToken = localStorage.getItem('github_token') || '';
            document.getElementById('current-token').value = savedToken;
        });

        document.getElementById('close-settings')?.addEventListener('click', () => {
            document.getElementById('settings-modal').classList.add('hidden');
        });

        document.getElementById('show-token')?.addEventListener('click', (e) => {
            const input = document.getElementById('current-token');
            if (input.type === 'password') {
                input.type = 'text';
                e.target.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar';
            } else {
                input.type = 'password';
                e.target.innerHTML = '<i class="fas fa-eye"></i> Mostrar';
            }
        });

        document.getElementById('update-token-btn')?.addEventListener('click', () => {
            document.getElementById('settings-modal').classList.add('hidden');
            this.showTokenModal(true);
        });

        document.getElementById('test-token-btn')?.addEventListener('click', async () => {
            const token = document.getElementById('current-token').value.trim();
            if (!token) {
                this.showAlert('No hay ningún token para verificar', 'error');
                return;
            }
            
            const isValid = await this.verifyGitHubToken(token);
            if (isValid) {
                this.showAlert('El token es válido y funciona correctamente', 'success');
            } else {
                this.showAlert('El token no es válido o no tiene los permisos necesarios', 'error');
            }
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

        document.getElementById('open-image-manager')?.addEventListener('click', () => {
            document.getElementById('image-manager-modal').classList.remove('hidden');
            this.loadRepositoryImages();
        });
        
        document.getElementById('close-image-manager')?.addEventListener('click', () => {
            document.getElementById('image-manager-modal').classList.add('hidden');
            this.resetImageManagerUI();
        });
        
        document.getElementById('close-image-manager-btn')?.addEventListener('click', () => {
            document.getElementById('image-manager-modal').classList.add('hidden');
            this.resetImageManagerUI();
        });
        
        document.getElementById('refresh-images')?.addEventListener('click', () => {
            this.loadRepositoryImages();
        });
        
        document.getElementById('delete-selected-images')?.addEventListener('click', () => {
            this.deleteSelectedImages();
        });
        
        document.getElementById('confirm-image-deletion')?.addEventListener('click', () => {
            this.confirmImageDeletion();
        });
        
        document.getElementById('cancel-image-deletion')?.addEventListener('click', () => {
            this.imagesToDelete = [];
            this.resetImageManagerUI();
        });
    }

    showTokenModal(show = true) {
        const modal = document.getElementById('token-modal');
        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
        }
    }
    
    setupTokenModal() {
        const modal = document.getElementById('token-modal');
        const tokenInput = document.getElementById('github-token-input');
        const cancelBtn = document.getElementById('cancel-token-btn');
        const submitBtn = document.getElementById('submit-token-btn');
        
        // Precargar token existente
        tokenInput.value = localStorage.getItem('github_token') || '';
        
        if (!modal || !tokenInput || !cancelBtn || !submitBtn) return;
        
        // Verificar token al cargar
        this.checkTokenValidity().then(isValid => {
            this.tokenValid = isValid;
            if (!isValid) {
                this.showTokenModal(true);
            }
        });
        
        // Manejar cancelar
        cancelBtn.addEventListener('click', () => {
            this.showTokenModal(false);
        });
        
        // Manejar enviar
        submitBtn.addEventListener('click', async () => {
            const token = tokenInput.value.trim();
            if (!token) {
                this.showAlert('Por favor ingresa un token válido', 'error');
                return;
            }
            
            const isValid = await this.verifyGitHubToken(token);
            if (!isValid) {
                this.showAlert('Token inválido o sin permisos', 'error');
                return;
            }
            
            localStorage.setItem('github_token', token);
            this.tokenValid = true;
            this.showTokenModal(false);
            this.showAlert('Token guardado exitosamente', 'success');
        });
    }

    // Nuevo método para verificar token
    async verifyGitHubToken(token) {
        try {
            const { REPO_OWNER, REPO_NAME } = CONFIG.GITHUB_API;
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Error verifying token:', error);
            return false;
        }
    }

    // Nuevo método para verificar validez del token almacenado
    async checkTokenValidity() {
        const savedToken = localStorage.getItem('github_token');
        if (!savedToken) return false;
        return await this.verifyGitHubToken(savedToken);
    }

    // Método para mostrar notificaciones
    showAlert(message, type = 'success') {
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.innerHTML = `
            ${type === 'loading' ? 
                '<i class="fas fa-spinner fa-spin"></i>' : 
                type === 'success' ? 
                '<i class="fas fa-check-circle"></i>' : 
                '<i class="fas fa-exclamation-circle"></i>'}
            <span>${message}</span>
            ${type !== 'loading' ? '<button class="close-alert"><i class="fas fa-times"></i></button>' : ''}
        `;
        
        document.body.appendChild(alert);
        
        if (type !== 'loading') {
            setTimeout(() => {
                alert.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 300);
            }, 7000);
        } else {
            alert.classList.add('show');
        }
        
        alert.querySelector('.close-alert')?.addEventListener('click', () => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        });
        
        return alert;
    }

    async updateAffiliatesFile(newAffiliates) {
        try {
             // Modificación clave: Obtener token de localStorage
            const GITHUB_TOKEN = localStorage.getItem('github_token');
            if (!GITHUB_TOKEN) {
                this.showTokenModal(true);
                throw new Error("Por favor autentícate primero");
            }
 
            const { REPO_OWNER, REPO_NAME, AFFILIATES_FILE_PATH } = CONFIG.GITHUB_API;
 
            
            // Primero obtenemos el SHA del archivo actual
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
            const content = JSON.stringify(newAffiliates, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            // Actualizamos el archivo
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
            this.showAlert(`Error: ${error.message}`, 'error');
            throw error;
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
        
        // Reset product editor if open when switching views
        if (this.currentView !== 'products') {
            this.closeProductEditor();
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

        container.innerHTML = affiliates.map(affiliate => {
            
            // Asegurarse que la fecha es válida antes de formatear
        const fechaValida = affiliate.fecha instanceof Date && !isNaN(affiliate.fecha.getTime());
        const fechaFormateada = fechaValida ? 
            affiliate.fecha.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            }) : 'Fecha inválida';

            return`
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
                            <span>Registro: ${fechaFormateada}</span>
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
        `;
        }).join('');
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

        const startDate = document.getElementById('filter-date-start')?.value;
        const endDate = document.getElementById('filter-date-end')?.value;
        const country = document.getElementById('filter-country')?.value;
        const affiliate = document.getElementById('filter-affiliate')?.value;
        const userType = document.getElementById('filter-user-type')?.value;
        const period = document.getElementById('filter-period')?.value || 'month';

        const now = new Date();
        let periodStart, periodEnd;
        
        switch (period) {
            case 'month':
                // Cambio clave: Asegurarse de incluir todo el mes
                periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'last-month':
                periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
                periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case 'year':
                periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
                periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            default: // 'all'
                periodStart = null;
                periodEnd = null;
        }

        this.filteredOrders = this.orders.filter(order => {
            const orderDate = order.date;
            
            // Cambio clave: Comparar objetos Date directamente en lugar de strings
            const dateInRange = 
                (!startDate || orderDate >= new Date(startDate + 'T00:00:00')) && 
                (!endDate || orderDate <= new Date(endDate + 'T23:59:59'));
                
            const periodInRange = 
                !periodStart || 
                (orderDate >= periodStart && orderDate <= periodEnd);
                
            return (
                dateInRange &&
                periodInRange &&
                (!country || order.country === country) &&
                (!affiliate || order.affiliate === affiliate) &&
                (!userType || order.userType === userType)
            );
        });

        this.updateStats(this.filteredOrders);
        this.renderMonthlyComparison(this.filteredOrders);
        this.renderWeeklySummary();
        this.renderOrders(this.filteredOrders);
        this.updateCharts(this.filteredOrders);
    }
    
    renderWeeklySummary() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Fecha de hoy sin horas/minutos
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1); // Fecha de ayer
    
        // Filtrar pedidos de hoy y ayer
        const todayOrders = this.orders.filter(order => {
            const orderDate = new Date(order.date.getFullYear(), order.date.getMonth(), order.date.getDate());
            return orderDate.getTime() === today.getTime();
        });
    
        const yesterdayOrders = this.orders.filter(order => {
            const orderDate = new Date(order.date.getFullYear(), order.date.getMonth(), order.date.getDate());
            return orderDate.getTime() === yesterday.getTime();
        });
    
        // Calcular totales
        const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
        const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + order.total, 0);
    
        // Calcular porcentaje de cambio (evitar división por cero)
        let salesChange = "N/A";
        if (yesterdaySales > 0) {
            salesChange = ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1);
        }
    
        // Actualizar HTML
        const container = document.getElementById('weekly-summary');
        container.innerHTML = `
            <div class="summary-item">
                <h4><i class="fas fa-sun"></i> Hoy</h4>
                <div class="stat-value">$${todaySales.toFixed(2)}</div>
                <div class="stat-label">${todayOrders.length} pedidos</div>
            </div>
            <div class="summary-item">
                <h4><i class="fas fa-moon"></i> Ayer</h4>
                <div class="stat-value">$${yesterdaySales.toFixed(2)}</div>
                <div class="stat-change ${salesChange >= 0 ? 'positive' : 'negative'}">
                    ${salesChange !== "N/A" ? `${salesChange}%` : 'Sin datos previos'}
                </div>
            </div>
        `;
    }

    updateStats(data) {
        if (!data || !Array.isArray(data)) return;
        
        // Calcular totales en sus monedas originales
        let totalSalesUSD = 0;
        let totalSalesEUR = 0;
        
        data.forEach(order => {
            const country = order.country || '';
            if (this.getCurrencySymbol(country) === '€') {
                totalSalesEUR += order.total || 0;
            } else {
                totalSalesUSD += order.total || 0;
            }
        });
        
        // Actualizar elementos del DOM
        document.getElementById('total-sales-usd').textContent = 
            `$${totalSalesUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        document.getElementById('total-sales-eur').textContent = 
            `€${totalSalesEUR.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Resto de las estadísticas
        const totalProducts = data.reduce((acc, order) => acc + (order.productsCount || 0), 0);
        const uniqueCustomers = new Set(data.map(order => order.correo_comprador).filter(Boolean)).size;
        
        document.getElementById('total-products').textContent = totalProducts.toLocaleString();
        document.getElementById('total-orders').textContent = data.length.toLocaleString();
        document.getElementById('unique-customers').textContent = uniqueCustomers.toLocaleString();
    
        // Para mostrar el total combinado (opcional)
        const totalCombined = totalSalesUSD + totalSalesEUR;
        document.getElementById('total-sales').textContent = 
        `$${totalCombined.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
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
                                <i class="fas fa-calendar"></i>
                                ${order.dateStr}
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-globe"></i>
                                ${order.country}
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-user-tag"></i>
                                ${order.userType}
                            </span>
                        </div>
                        ${order.afiliado && order.afiliado !== 'Ninguno' ? `
                        <div class="affiliate-info">
                            <i class="fas fa-handshake"></i>
                            <span>Afiliado: ${order.afiliado}</span>
                        </div>
                        ` : ''}
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

    // Product Management
    async loadProducts() {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/${CONFIG.GITHUB_API.REPO_OWNER}/${CONFIG.GITHUB_API.REPO_NAME}/main/${CONFIG.GITHUB_API.PRODUCTS_FILE_PATH}?t=${Date.now()}`);
            this.products = await response.json();
            this.filteredProducts = [...this.products];
            this.updateProductCount();
            this.renderProductsList();
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Error loading products:', error);
            this.showAlert('Error al cargar los productos', 'error');
        }
    }

    updateProductCount() {
        const totalProducts = this.products.length;
        const filteredProducts = this.filteredProducts.length;
        
        document.querySelectorAll('#total-products').forEach(el => {
            el.textContent = `${filteredProducts} de ${totalProducts}`;
        });
    }

    populateCategoryFilter() {
        const categorySelect = document.getElementById('filter-category');
        if (!categorySelect) return;
        
        // Get all unique categories from products
        const categories = [...new Set(this.products.map(p => p.categoria))].sort();
        
        categorySelect.innerHTML = '<option value="">Todas las categorías</option>' + 
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    renderProductsList() {
        const container = document.getElementById('products-list');
        if (!container) return;

        container.innerHTML = this.filteredProducts.map(product => {
            // Calcular precios
            const finalPrice = product.precio * 1.05;
            const hasDiscount = product.oferta && product.descuento > 0;
            const discountedPrice = hasDiscount ? 
                finalPrice * (1 - product.descuento/100) : 
                finalPrice;
            
            // Get image URL from GitHub repository (no timestamp to avoid redundant fetches)
            const imageUrl = product.imagen ?
                `https://raw.githubusercontent.com/${CONFIG.GITHUB_API.REPO_OWNER}/${CONFIG.GITHUB_API.REPO_NAME}/main/${product.imagen}` :
                'img/no-image.png';
            
            return `
            <div class="product-card" data-id="${this.sanitizeId(product.nombre)}">
                <div class="product-image-container">
                    <img class="product-image" src="${imageUrl}" alt="${product.nombre}" loading="lazy" onerror="(function(i){i.onerror=null;i.src='img/no-image.png';})(this)" onload="this.classList.add('loaded')">
                    <div class="product-badges">
                        ${product.oferta ? '<span class="product-badge oferta">OFERTA</span>' : ''}
                        ${product.mas_vendido ? '<span class="product-badge mas-vendido">TOP</span>' : ''}
                        ${product.nuevo ? '<span class="product-badge nuevo">NUEVO</span>' : ''}
                        ${!product.disponible ? '<span class="product-badge no-disponible">AGOTADO</span>' : ''}
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-name" title="${product.nombre}">${product.nombre}</div>
                    <span class="product-category">${product.categoria}</span>
                    <div class="product-price-container">
                        ${hasDiscount ? `
                            <span class="product-price original">$${finalPrice.toFixed(2)}</span>
                            <span class="product-price discounted">$${discountedPrice.toFixed(2)}</span>
                        ` : `
                            <span class="product-price">$${finalPrice.toFixed(2)}</span>
                        `}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-secondary edit-product" data-id="${this.sanitizeId(product.nombre)}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn cancel-btn delete-product" data-id="${this.sanitizeId(product.nombre)}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Add event listeners
        this.setupProductCardEvents();
    }

    setupProductCardEvents() {
        document.querySelectorAll('.edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.dataset.id;
                const product = this.products.find(p => this.sanitizeId(p.nombre) === productId);
                if (product) {
                    this.editProduct(product);
                }
            });
        });
    
        document.querySelectorAll('.delete-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.dataset.id;
                const originalName = this.getOriginalNameFromId(productId);
                this.deleteProduct(originalName);
            });
        });
    }

    getOriginalNameFromId(id) {
        const product = this.products.find(p => this.sanitizeId(p.nombre) === id);
        return product ? product.nombre : id.replace(/_/g, ' ');
    }
    
    sanitizeId(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    setupProductsView() {
        // Search functionality
        document.getElementById('search-products')?.addEventListener('input', (e) => {
            this.applyProductFilters();
        });
    
        // Filter functionality
        document.getElementById('filter-category')?.addEventListener('change', () => {
            this.applyProductFilters();
        });
    
        document.getElementById('filter-availability')?.addEventListener('change', () => {
            this.applyProductFilters();
        });
    
        document.getElementById('filter-featured')?.addEventListener('change', () => {
            this.applyProductFilters();
        });
    
        // Add product button
        document.getElementById('add-product-btn')?.addEventListener('click', () => {
            this.openProductEditor();
        });
    
        // Refresh products
        document.getElementById('refresh-products')?.addEventListener('click', async () => {
            const loadingAlert = this.showAlert('Actualizando lista de productos...', 'loading');
            try {
                await this.loadProducts();
                loadingAlert.remove();
                this.showAlert('✅ Lista de productos actualizada', 'success');
            } catch (error) {
                loadingAlert.remove();
                this.showAlert(`❌ Error al actualizar: ${error.message}`, 'error');
            }
        });
    
        // Product form
        document.getElementById('product-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });
    
        // Cancel edit
        document.getElementById('cancel-product-edit')?.addEventListener('click', () => {
            this.closeProductEditor();
        });
        document.getElementById('close-product-editor')?.addEventListener('click', () => {
            this.closeProductEditor();
        });
    
        // Image upload handlers
        document.getElementById('select-main-image')?.addEventListener('click', () => {
            document.getElementById('main-image-upload').click();
        });
    
        document.getElementById('main-image-upload')?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleMainImageUpload(e.target.files[0]);
            }
        });
    
        document.getElementById('remove-main-image')?.addEventListener('click', () => {
            this.removeMainImage();
        });
    
        document.getElementById('add-additional-images')?.addEventListener('click', () => {
            document.getElementById('additional-images-upload').click();
        });
    
        document.getElementById('additional-images-upload')?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleAdditionalImagesUpload(Array.from(e.target.files));
            }
        });
    
        // Price calculation
        document.getElementById('product-price')?.addEventListener('input', () => {
            this.updatePriceHint();
        });
        
        // Nuevo event listener para el campo de descuento
        document.getElementById('product-discount')?.addEventListener('input', () => {
            this.updatePriceHint();
        });
    
        // Form field changes to update JSON preview
        const formFields = ['product-name', 'product-category', 'product-price', 
                           'product-discount', 'product-description'];
        
        formFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('change', () => this.updateJsonPreview());
                element.addEventListener('input', () => this.updateJsonPreview());
            }
        });
    
        // Checkbox changes
        ['product-oferta', 'product-mas-vendido', 'product-disponible','product-nuevo'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.updateJsonPreview());
        });
        
        document.getElementById('save-changes')?.addEventListener('click', async () => {
            this.repoStatus = 'loading';
            this.updateStatusUI();
            
            try {
                await this.saveProductChanges();
                document.getElementById('pending-changes-modal').classList.add('hidden');
            } finally {
                this.repoStatus = 'idle';
                this.updateStatusUI();
            }
        });
        
        document.getElementById('cancel-changes')?.addEventListener('click', () => {
            this.productChanges = { modified: [], new: [], deleted: [] };
            document.getElementById('pending-changes-modal').classList.add('hidden');
        });
        
        document.getElementById('close-pending-changes')?.addEventListener('click', () => {
            document.getElementById('pending-changes-modal').classList.add('hidden');
        });

        document.getElementById('toggle-json-preview')?.addEventListener('click', (e) => {
            // Prevent any default action or bubbling that could trigger a form submit
            e.preventDefault();
            e.stopPropagation();

            const container = document.getElementById('json-preview-container');
            if (!container) return;
            container.classList.toggle('hidden');
            const isHidden = container.classList.contains('hidden');

            // Safely reference the button that received the event
            const btn = e.currentTarget || e.target;
            if (btn && btn instanceof Element) {
                btn.innerHTML = isHidden ? '<i class="fas fa-eye"></i> Mostrar Vista Previa' : '<i class="fas fa-eye-slash"></i> Ocultar Vista Previa';
            }
        });
    }

    updatePriceHint() {
        const priceInput = document.getElementById('product-price');
        const price = parseFloat(priceInput.value) || 0;
        const discountInput = document.getElementById('product-discount');
        const discountPrice = parseFloat(discountInput.value) || 0;
        
        // Calcular el porcentaje de descuento basado en el precio final deseado
        let discountPercentage = 0;
        if (discountPrice > 0 && discountPrice < price) {
            discountPercentage = ((price - discountPrice) / price * 100).toFixed(1);
        }
        
        // Actualizar la etiqueta de ayuda
        document.getElementById('final-price-hint').textContent = 
            `Precio final: $${discountPrice.toFixed(2)} (${discountPercentage}% descuento)`;
        this.updateJsonPreview();
    }

    applyProductFilters() {
        const searchTerm = document.getElementById('search-products').value.toLowerCase();
        const categoryFilter = document.getElementById('filter-category').value;
        const availabilityFilter = document.getElementById('filter-availability').value;
        const featuredFilter = document.getElementById('filter-featured').value;
    
        this.filteredProducts = this.products.filter(product => {
            // Search term filter
            const matchesSearch = product.nombre.toLowerCase().includes(searchTerm) ||
                                 (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm));
            
            // Category filter
            const matchesCategory = !categoryFilter || product.categoria === categoryFilter;
            
            // Availability filter
            let matchesAvailability = true;
            if (availabilityFilter === 'available') {
                matchesAvailability = product.disponible !== false;
            } else if (availabilityFilter === 'unavailable') {
                matchesAvailability = product.disponible === false;
            }
            
            // Featured filter
            let matchesFeatured = true;
            if (featuredFilter === 'featured') {
                matchesFeatured = product.mas_vendido === true;
            } else if (featuredFilter === 'offer') {
                matchesFeatured = product.oferta === true;
            }
            
            return matchesSearch && matchesCategory && matchesAvailability && matchesFeatured;
        });
    
        this.updateProductCount();
        this.renderProductsList();
    }
    
    openProductEditor(product = null) {
        this.currentProduct = product;
        this.mainImageFile = null;
        this.additionalImageFiles = [];
        
        const modal = document.getElementById('product-editor-modal');
        const title = document.getElementById('editor-title');
        
        if (product) {
            title.textContent = `Editar ${product.nombre}`;
            this.populateProductForm(product);
        } else {
            title.textContent = 'Nuevo Producto';
            this.resetProductForm();
        }
        
        modal.classList.remove('hidden');
        // Apply fullscreen panel styling
        modal.classList.add('large-fullscreen');
        const modalContent = modal.querySelector('.modal-content.large-modal');
        if (modalContent) modalContent.classList.add('fullscreen');

        // Prevent background from scrolling when modal is open.
        // Save current scroll position and lock body without losing place.
        try {
            const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
            document.body.dataset.scrollY = String(scrollY);
            document.body.classList.add('modal-open');
            // Use fixed positioning to freeze background; set top to preserve scroll
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
        } catch (err) { /* non-browser env */ }
        this.updateJsonPreview();
    }
    
    closeProductEditor() {
        const modal = document.getElementById('product-editor-modal');
        modal.classList.add('hidden');
        modal.classList.remove('large-fullscreen');
        const modalContent = modal.querySelector('.modal-content.large-modal');
        if (modalContent) modalContent.classList.remove('fullscreen');
        // Re-enable background scrolling and restore previous scroll position
        try {
            document.body.classList.remove('modal-open');
            // remove fixed positioning and restore scroll
            const prev = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            // restore scroll
            window.scrollTo(0, prev);
            delete document.body.dataset.scrollY;
        } catch (err) { /* non-browser env */ }
        this.currentProduct = null;
        this.mainImageFile = null;
        this.additionalImageFiles = [];
    }
    
    populateProductForm(product) {
        document.getElementById('product-name').value = product.nombre;
        document.getElementById('product-category').value = product.categoria;
        document.getElementById('product-price').value = (product.precio * 1.05).toFixed(2);
        
        // Calcular y mostrar el precio con descuento en lugar del porcentaje
        const discountedPrice = product.oferta ? 
            (product.precio * 1.05 * (1 - (product.descuento || 0)/100)).toFixed(2) : 
            (product.precio * 1.05).toFixed(2);
        document.getElementById('product-discount').value = discountedPrice;
        
        document.getElementById('product-oferta').checked = product.oferta || false;
        document.getElementById('product-mas-vendido').checked = product.mas_vendido || false;
        document.getElementById('product-disponible').checked = product.disponible !== false;
        document.getElementById('product-nuevo').checked = product.nuevo || false;
        document.getElementById('product-description').value = product.descripcion || '';
        this.updatePriceHint();
        
        // Resto del código permanece igual...
        const categorySelect = document.getElementById('product-category');
        categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>' + 
            CONFIG.PRODUCT_CATEGORIES.map(cat => 
                `<option value="${cat}" ${cat === product.categoria ? 'selected' : ''}>${cat}</option>`
            ).join('');
        
        const mainImageContainer = document.getElementById('main-image-container');
        if (product.imagen) {
            const imageUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_API.REPO_OWNER}/${CONFIG.GITHUB_API.REPO_NAME}/main/${product.imagen}`;
            mainImageContainer.innerHTML = `<img src="${imageUrl}" alt="${product.nombre}" onerror="this.parentElement.innerHTML='<span>Error al cargar imagen</span>'">`;
            document.getElementById('remove-main-image').style.display = 'block';
        } else {
            mainImageContainer.innerHTML = '<span>No hay imagen seleccionada</span>';
            document.getElementById('remove-main-image').style.display = 'none';
        }
        
        const additionalContainer = document.getElementById('additional-images-container');
        if (product.imagenesAdicionales && product.imagenesAdicionales.length > 0) {
            additionalContainer.innerHTML = product.imagenesAdicionales.map(img => {
                const imageUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_API.REPO_OWNER}/${CONFIG.GITHUB_API.REPO_NAME}/main/${img}`;
                return `
                    <div class="additional-image">
                        <img src="${imageUrl}" alt="Imagen adicional" onerror="this.parentElement.remove()">
                        <button class="remove-additional-image" data-src="${img}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }).join('');
            
            document.querySelectorAll('.remove-additional-image').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const src = btn.dataset.src;
                    this.removeAdditionalImage(src);
                });
            });
        } else {
            additionalContainer.innerHTML = '<div class="no-images-message">No hay imágenes adicionales</div>';
        }
    }
    
    resetProductForm() {
        document.getElementById('product-form').reset();
        document.getElementById('product-disponible').checked = true;
        document.getElementById('product-nuevo').checked = true;
        
        // Inicializar el campo de descuento con el mismo valor que el precio
        const price = document.getElementById('product-price').value || 0;
        document.getElementById('product-discount').value = price;
        
        // Resto del código permanece igual...
        const categorySelect = document.getElementById('product-category');
        categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>' + 
            CONFIG.PRODUCT_CATEGORIES.map(cat => 
                `<option value="${cat}">${cat}</option>`
            ).join('');
        
        document.getElementById('main-image-container').innerHTML = '<span>No hay imagen seleccionada</span>';
        document.getElementById('remove-main-image').style.display = 'none';
        document.getElementById('additional-images-container').innerHTML = '<div class="no-images-message">No hay imágenes adicionales</div>';
    }
    
    removeMainImage() {
        this.mainImageFile = null;
        document.getElementById('main-image-container').innerHTML = '<span>No hay imagen seleccionada</span>';
        document.getElementById('remove-main-image').style.display = 'none';
        document.getElementById('main-image-upload').value = '';
        this.updateJsonPreview();
    }
    
    removeAdditionalImage(identifier, isFile = false) {
        if (isFile) {
            // Remove by file name (for newly uploaded files)
            this.additionalImageFiles = this.additionalImageFiles.filter(f => f.name !== identifier);
        } else {
            // Remove by image src (for existing images)
            if (this.currentProduct && this.currentProduct.imagenesAdicionales) {
                this.currentProduct.imagenesAdicionales = this.currentProduct.imagenesAdicionales.filter(img => img !== identifier);
            }
        }
        
        // Re-render additional images
        const container = document.getElementById('additional-images-container');
        if ((this.currentProduct?.imagenesAdicionales?.length || 0) + this.additionalImageFiles.length === 0) {
            container.innerHTML = '<div class="no-images-message">No hay imágenes adicionales</div>';
        } else {
            container.innerHTML = '';
            
            // Add existing images
            if (this.currentProduct?.imagenesAdicionales) {
                this.currentProduct.imagenesAdicionales.forEach(img => {
                    if (img !== identifier) { // Skip the removed image
                        container.innerHTML += `
                            <div class="additional-image">
                                <img src="${img}" alt="Imagen adicional">
                                <button class="remove-additional-image" data-src="${img}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `;
                    }
                });
            }
            
            // Add new images
            this.additionalImageFiles.forEach(file => {
                if (file.name !== identifier) { // Skip the removed file
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        container.innerHTML += `
                            <div class="additional-image">
                                <img src="${e.target.result}" alt="Preview">
                                <button class="remove-additional-image" data-file="${file.name}">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `;
                        
                        // Add event listener for the new remove button
                        container.lastElementChild.querySelector('.remove-additional-image').addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.removeAdditionalImage(file.name, true);
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        this.updateJsonPreview();
    }
    
    updateJsonPreview() {
        const productData = this.getCurrentProductData();
        document.getElementById('product-json-preview').textContent = JSON.stringify(productData, null, 2);
    }
    
    getCurrentProductData() {
        const name = document.getElementById('product-name').value.trim();
        const category = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value) || 0;
        const discountPrice = parseFloat(document.getElementById('product-discount').value) || 0;
        const oferta = document.getElementById('product-oferta').checked;
        const mas_vendido = document.getElementById('product-mas-vendido').checked;
        const disponible = document.getElementById('product-disponible').checked;
        const descripcion = document.getElementById('product-description').value.trim();
        const nuevo = document.getElementById('product-nuevo').checked;
        
        // Calcular el porcentaje de descuento basado en el precio final deseado
        let discountPercentage = 0;
        if (oferta && discountPrice > 0 && discountPrice < price) {
            discountPercentage = ((price - discountPrice) / price * 100).toFixed(1);
        }
        
        // Calculate final price (price / 1.05)
        const finalPrice = price / 1.05;
        
        // Determine image paths
        let imagen = '';
        if (this.mainImageFile) {
            imagen = `img/products/${this.mainImageFile.name}`;
        } else if (this.currentProduct?.imagen) {
            imagen = this.currentProduct.imagen;
        }
        
        // Determine additional images
        let imagenesAdicionales = [];
        if (this.currentProduct?.imagenesAdicionales) {
            imagenesAdicionales = [...this.currentProduct.imagenesAdicionales];
        }
        
        // Add new additional images
        this.additionalImageFiles.forEach(file => {
            imagenesAdicionales.push(`img/products/${file.name}`);
        });
        
        return {
            nombre: name,
            categoria: category,
            precio: parseFloat(finalPrice.toFixed(3)),
            descuento: oferta ? parseFloat(discountPercentage) : 0,
            oferta: oferta,
            mas_vendido: mas_vendido,
            disponible: disponible,
            imagen: imagen,
            descripcion: descripcion || undefined,
            imagenesAdicionales: imagenesAdicionales.length > 0 ? imagenesAdicionales : undefined,
            nuevo: nuevo
        };
    }
    
    async deleteProduct(productName) {
        if (!confirm(`¿Estás seguro de eliminar el producto "${productName}"? Esta acción también eliminará sus imágenes asociadas.`)) {
            return;
        }
    
        const loadingAlert = this.showAlert('Eliminando producto...', 'loading');
        this.repoStatus = 'loading';
        this.updateStatusUI();
    
        try {
            const product = this.products.find(p => p.nombre === productName);
            if (!product) {
                throw new Error('Producto no encontrado');
            }
    
            // 1. Eliminar imágenes del producto
            await this.deleteProductImages(product);
    
            // 2. Eliminar el producto del array
            this.products = this.products.filter(p => p.nombre !== productName);
            this.filteredProducts = this.filteredProducts.filter(p => p.nombre !== productName);
    
            // 3. Actualizar el archivo JSON
            await this.updateProductsFile(this.products);
    
            loadingAlert.remove();
            this.showAlert('✅ Producto eliminado correctamente', 'success');
            this.renderProductsList();
    
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            loadingAlert.remove();
            this.showAlert(`❌ Error al eliminar: ${error.message}`, 'error');
        } finally {
            this.repoStatus = 'idle';
            this.updateStatusUI();
        }
    }

    async deleteProductImages(product) {
        const GITHUB_TOKEN = localStorage.getItem('github_token');
        if (!GITHUB_TOKEN) {
            throw new Error("No hay token de GitHub configurado");
        }
    
        const { REPO_OWNER, REPO_NAME } = CONFIG.GITHUB_API;
        const imagesToDelete = [];
    
        // Agregar imagen principal
        if (product.imagen) {
            imagesToDelete.push(product.imagen);
        }
    
        // Agregar imágenes adicionales
        if (product.imagenesAdicionales && product.imagenesAdicionales.length > 0) {
            imagesToDelete.push(...product.imagenesAdicionales);
        }
    
        // Eliminar cada imagen
        for (const imagePath of imagesToDelete) {
            try {
                // Obtener SHA de la imagen
                const getResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${imagePath}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
    
                if (!getResponse.ok) {
                    throw new Error(`Error al obtener archivo: ${getResponse.status}`);
                }
    
                const fileData = await getResponse.json();
    
                // Eliminar el archivo
                const deleteResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${imagePath}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Eliminar imagen de producto: ${product.nombre}`,
                        sha: fileData.sha,
                        branch: 'main'
                    })
                });
    
                if (!deleteResponse.ok) {
                    const errorData = await deleteResponse.json().catch(() => ({}));
                    throw new Error(errorData.message || `Error HTTP: ${deleteResponse.status}`);
                }
            } catch (error) {
                console.error(`Error al eliminar ${imagePath}:`, error);
            }
        }
    }

    sanitizeFileName(name, index = null, isMain = false) {
        // Reemplazar espacios y caracteres especiales
        let cleanName = name.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_\-.]/g, '')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
        
        // Agregar índice si es necesario
        if (index !== null) {
            cleanName = `${cleanName}_${index}`;
        }
        
        // Mantener la extensión si ya tenía
        const extensionMatch = isMain ? 
            this.mainImageFile?.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) :
            this.additionalImageFiles[index]?.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        
        const extension = extensionMatch ? extensionMatch[0] : '.jpg';
        
        return `${cleanName}${extension}`;
    }
    async handleMainImageUpload(file) {
        this.mainImageFile = file;
        const newName = this.sanitizeFileName(
            document.getElementById('product-name').value || 'producto',
            null,
            true
        );
        
        // Renombrar el archivo
        this.mainImageFile = new File([file], newName, { type: file.type });
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = document.getElementById('main-image-container');
            container.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            document.getElementById('remove-main-image').style.display = 'block';
        };
        reader.readAsDataURL(this.mainImageFile);
        
        this.updateJsonPreview();
    }
    
    async handleAdditionalImagesUpload(files) {
        const productName = document.getElementById('product-name').value || 'producto';
        
        for (let i = 0; i < files.length; i++) {
            const newName = this.sanitizeFileName(productName, this.additionalImageFiles.length + i + 1);
            const renamedFile = new File([files[i]], newName, { type: files[i].type });
            this.additionalImageFiles.push(renamedFile);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const container = document.getElementById('additional-images-container');
                
                if (container.querySelector('.no-images-message')) {
                    container.innerHTML = '';
                }
                
                container.innerHTML += `
                    <div class="additional-image">
                        <img src="${e.target.result}" alt="Preview">
                        <button class="remove-additional-image" data-file="${renamedFile.name}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                container.lastElementChild.querySelector('.remove-additional-image').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeAdditionalImage(renamedFile.name, true);
                });
            };
            reader.readAsDataURL(renamedFile);
        }
        
        this.updateJsonPreview();
    }
    
    async saveProduct() {
        const productData = this.getCurrentProductData();
        
        if (!productData.nombre || !productData.categoria || !productData.precio) {
            this.showAlert('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        if (!productData.imagen) {
            this.showAlert('Debe seleccionar una imagen principal', 'error');
            return;
        }
        
        const loadingAlert = this.showAlert('Guardando producto...', 'loading');
        this.repoStatus = 'loading';
        this.updateStatusUI();
        
        try {
            // 1. Subir imágenes primero
            await this.uploadProductImages();
            
            // 2. Actualizar la lista de productos
            const isNew = !this.currentProduct;
            
            if (isNew) {
                // Verificar si el producto ya existe
                const exists = this.products.some(p => p.nombre === productData.nombre);
                if (exists) {
                    throw new Error('Ya existe un producto con este nombre');
                }
                this.products.push(productData);
            } else {
                // Actualizar producto existente
                const index = this.products.findIndex(p => p.nombre === this.currentProduct.nombre);
                if (index >= 0) {
                    this.products[index] = productData;
                }
            }
            
            // 3. Actualizar el archivo JSON en el repositorio
            await this.updateProductsFile(this.products);
            
            loadingAlert.remove();
            this.showAlert('✅ Producto guardado exitosamente', 'success');
            this.closeProductEditor();
            await this.loadProducts(); // Recargar los productos
            
        } catch (error) {
            console.error('Error al guardar producto:', error);
            loadingAlert.remove();
            this.showAlert(`❌ Error al guardar: ${error.message}`, 'error');
        } finally {
            this.repoStatus = 'idle';
            this.updateStatusUI();
        }
    }
    
    async uploadProductImages() {
        const GITHUB_TOKEN = localStorage.getItem('github_token');
        if (!GITHUB_TOKEN) {
            throw new Error("No hay token de GitHub configurado");
        }
        
        // Subir imagen principal si hay una nueva
        if (this.mainImageFile) {
            await this.uploadImageToRepo(this.mainImageFile);
        }
        
        // Subir imágenes adicionales
        for (const file of this.additionalImageFiles) {
            await this.uploadImageToRepo(file);
        }
    }
    
    async uploadImageToRepo(file) {
        const GITHUB_TOKEN = localStorage.getItem('github_token');
        const { REPO_OWNER, REPO_NAME } = CONFIG.GITHUB_API;
        const path = `img/products/${file.name}`;
        
        // Verificar si la imagen ya existe para obtener su SHA
        let sha = null;
        try {
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
            }
        } catch (error) {
            console.log('La imagen no existe, se creará nueva');
        }
        
        const reader = new FileReader();
        const fileContent = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Subir imagen de producto: ${file.name}`,
                content: fileContent,
                sha: sha,
                branch: 'main'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error al subir imagen: ${response.status}`);
        }
    }
    
    async updateProductsFile(productsData) {
        const GITHUB_TOKEN = localStorage.getItem('github_token');
        if (!GITHUB_TOKEN) {
            this.showTokenModal(true);
            throw new Error("Por favor autentícate primero");
        }
        
        const { REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH } = CONFIG.GITHUB_API;
        
        try {
            // 1. Obtener el SHA del archivo actual
            const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PRODUCTS_FILE_PATH}`;
            const getResponse = await fetch(getUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!getResponse.ok && getResponse.status !== 404) {
                throw new Error(`Error al obtener archivo: ${getResponse.status}`);
            }
            
            let sha = null;
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }
            
            // 2. Preparar contenido nuevo
            const content = JSON.stringify(productsData, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            // 3. Actualizar el archivo
            const updateResponse = await fetch(getUrl, {
                method: sha ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Actualización de productos: ${new Date().toLocaleString()}`,
                    content: encodedContent,
                    sha: sha,
                    branch: 'main'
                })
            });
            
            if (!updateResponse.ok) {
                const errorData = await updateResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `Error HTTP: ${updateResponse.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error al actualizar productos:', error);
            throw error;
        }
    }
    
    editProduct(product) {
        if (!product) return;
        
        this.currentProduct = product;
        this.mainImageFile = null;
        this.additionalImageFiles = [];
        
        const modal = document.getElementById('product-editor-modal');
        const title = document.getElementById('editor-title');
        
        title.textContent = `Editar ${product.nombre}`;
        this.populateProductForm(product);
        
        modal.classList.remove('hidden');
        this.updateJsonPreview();
    }

    async loadRepositoryImages() {
        const loadingAlert = this.showAlert('Cargando imágenes del repositorio...', 'loading');
        this.repoStatus = 'loading';
        this.updateStatusUI();
        
        try {
            this.repoStatus = 'loading';
            this.updateStatusUI();

            const GITHUB_TOKEN = localStorage.getItem('github_token');
            if (!GITHUB_TOKEN) {
                throw new Error("No hay token de GitHub configurado");
            }
            
            const { REPO_OWNER, REPO_NAME } = CONFIG.GITHUB_API;
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/img/products`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al cargar imágenes: ${response.status}`);
            }
            
            const data = await response.json();
            this.renderRepositoryImages(data);
            loadingAlert.remove();
            
        } catch (error) {
            this.repoStatus = 'error';
            console.error('Error al cargar imágenes:', error);
            loadingAlert.remove();
            this.showAlert(`❌ Error al cargar imágenes: ${error.message}`, 'error');
        } finally {
            setTimeout(() => this.setRepoIdle(), 1000); // Pequeño delay para feedback visual
            this.repoStatus = 'idle';
            this.updateStatusUI();
        }
    }
    
    async renderRepositoryImages(images) {
        const container = document.getElementById('repository-images-grid');
        if (!container) return;
        
        // Obtener imágenes en uso
        const usedImages = await this.getUsedImages();
        
        container.innerHTML = images
            .filter(img => img.type === 'file' && /\.(jpg|jpeg|png|gif|webp)$/i.test(img.name))
            .map(img => {
                const isUsed = usedImages.has(img.name);
                return `
                    <div class="image-item" data-name="${img.name}" data-path="${img.path}">
                        <input type="checkbox" class="image-checkbox" id="img-${img.name}">
                        <img src="${img.download_url}" alt="${img.name}" class="image-preview">
                        <div class="image-name">${img.name}</div>
                        <div class="image-badge ${isUsed ? 'badge-used' : 'badge-unused'}">
                            ${isUsed ? 'En uso' : 'No usada'}
                        </div>
                    </div>
                `;
            }).join('');
        
        // Agregar event listeners para selección
        this.setupImageSelection();
    }

    async getUsedImages() {
        const usedImages = new Set();
        
        this.products.forEach(product => {
            if (product.imagen) {
                const imgName = product.imagen.split('/').pop();
                usedImages.add(imgName);
            }
            
            if (product.imagenesAdicionales) {
                product.imagenesAdicionales.forEach(img => {
                    const imgName = img.split('/').pop();
                    usedImages.add(imgName);
                });
            }
        });
        
        return usedImages;
    }

    setupImageSelection() {
        const updateSelectionCount = () => {
            const count = this.selectedImages.length;
            document.getElementById('selected-count').textContent = count;
            document.getElementById('delete-selected-images').disabled = count === 0;
        };
    
        document.querySelectorAll('.image-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const imageItem = e.target.closest('.image-item');
                const imageName = imageItem.dataset.name;
                const imagePath = imageItem.dataset.path;
                
                if (e.target.checked) {
                    imageItem.classList.add('selected');
                    this.selectedImages.push({ name: imageName, path: imagePath });
                } else {
                    imageItem.classList.remove('selected');
                    this.selectedImages = this.selectedImages.filter(img => img.name !== imageName);
                }
                
                updateSelectionCount();
            });
        });
    
        // Actualizar contador inicial
        updateSelectionCount();
    }

    setupImageManagerEvents() {
        document.getElementById('delete-selected-images').addEventListener('click', () => {
            if (this.selectedImages.length === 0) return;
            
            document.getElementById('delete-count').textContent = this.selectedImages.length;
            document.getElementById('confirm-image-deletion').classList.remove('hidden');
            document.getElementById('cancel-image-deletion').classList.remove('hidden');
            document.getElementById('close-image-manager-btn').classList.add('hidden');
            
            // Deshabilitar todos los checkboxes temporalmente
            document.querySelectorAll('.image-checkbox').forEach(checkbox => {
                checkbox.disabled = true;
            });
        });
        
        document.getElementById('confirm-image-deletion').addEventListener('click', async () => {
            await this.confirmImageDeletion();
        });
        
        document.getElementById('cancel-image-deletion')?.addEventListener('click', () => {
            this.cancelImageDeletion();
        });
        
        document.getElementById('filter-image-type').addEventListener('change', (e) => {
            this.filterImagesByType(e.target.value);
        });
    }
    filterImagesByType(filterType) {
        const imageItems = document.querySelectorAll('.image-item');
        const usedImages = this.getUsedImages();
        
        imageItems.forEach(item => {
            const imageName = item.dataset.name;
            const isUsed = usedImages.has(imageName);
            
            let shouldShow = true;
            
            switch (filterType) {
                case 'used':
                    shouldShow = isUsed;
                    break;
                case 'unused':
                    shouldShow = !isUsed;
                    break;
                // 'all' no necesita filtro
            }
            
            item.style.display = shouldShow ? 'block' : 'none';
        });
    }
    
    async deleteSelectedImages() {
        if (this.selectedImages.length === 0) return;
        
        // Mostrar confirmación
        document.getElementById('confirm-image-deletion').classList.remove('hidden');
        document.getElementById('cancel-image-deletion').classList.remove('hidden');
        document.getElementById('close-image-manager-btn').classList.add('hidden');
        
        // Guardar imágenes para eliminar
        this.imagesToDelete = [...this.selectedImages];
        this.selectedImages = [];
        
        // Deshabilitar checkboxes
        document.querySelectorAll('.image-checkbox').forEach(checkbox => {
            checkbox.disabled = true;
        });
    }
    
    async confirmImageDeletion() {
        if (this.imagesToDelete.length === 0) return;
        
        const loadingAlert = this.showAlert('Eliminando imágenes...', 'loading');
        this.repoStatus = 'loading';
        this.updateStatusUI();
        
        try {
            const GITHUB_TOKEN = localStorage.getItem('github_token');
            if (!GITHUB_TOKEN) {
                throw new Error("No hay token de GitHub configurado");
            }
            
            const { REPO_OWNER, REPO_NAME } = CONFIG.GITHUB_API;
            
            // Eliminar cada imagen
            for (const img of this.imagesToDelete) {
                // Primero obtener el SHA de la imagen
                const getResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${img.path}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!getResponse.ok) {
                    throw new Error(`Error al obtener archivo: ${getResponse.status}`);
                }
                
                const fileData = await getResponse.json();
    
                // Eliminar el archivo
                const deleteResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${img.path}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Eliminar imagen: ${img.name}`,
                        sha: fileData.sha,
                        branch: 'main'
                    })
                });
                
                if (!deleteResponse.ok) {
                    const errorData = await deleteResponse.json().catch(() => ({}));
                    throw new Error(errorData.message || `Error HTTP: ${deleteResponse.status}`);
                }
            }
            
            // Recargar imágenes
            await this.loadRepositoryImages();
            loadingAlert.remove();
            this.showAlert('✅ Imágenes eliminadas correctamente', 'success');
            
        } catch (error) {
            console.error('Error al eliminar imágenes:', error);
            loadingAlert.remove();
            this.showAlert(`❌ Error al eliminar imágenes: ${error.message}`, 'error');
        } finally {
            this.imagesToDelete = [];
            this.repoStatus = 'idle';
            this.updateStatusUI();
            this.resetImageManagerUI();
        }
    }
    
    resetImageManagerUI() {
        document.getElementById('confirm-image-deletion').classList.add('hidden');
        document.getElementById('cancel-image-deletion').classList.add('hidden');
        document.getElementById('close-image-manager-btn').classList.remove('hidden');
        document.getElementById('delete-selected-images').disabled = true;
        
        document.querySelectorAll('.image-checkbox').forEach(checkbox => {
            checkbox.disabled = false;
            checkbox.checked = false;
        });
        
        document.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => new SalesDashboard());
