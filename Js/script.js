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
        
    }

    async initialize() {
        await this.loadData();
        await this.loadAffiliates();
        await this.loadProducts();
        this.setupEventListeners();
        this.initFilters();
        this.initCharts();
        this.applyFilters();
        this.renderAllAffiliates();
        this.setupView();
        this.setupProductsView();
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
        document.getElementById('total-products').textContent = this.filteredProducts.length;
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
            // Calculate final price (price * 1.05)
            const finalPrice = product.precio * 1.05;
            const hasDiscount = product.oferta && product.descuento > 0;
            const originalPrice = finalPrice / (1 - product.descuento/100);
            
            // Get image URL from GitHub repository
            const imageUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_API.REPO_OWNER}/${CONFIG.GITHUB_API.REPO_NAME}/main/${product.imagen}?t=${Date.now()}`;
            
            return `
            <div class="product-card" data-id="${this.sanitizeId(product.nombre)}">
                <div class="product-image-container">
                    <img class="product-image" src="${imageUrl}" alt="${product.nombre}" onerror="this.src='img/no-image.png'">
                    <div class="product-badges">
                        ${product.oferta ? '<span class="product-badge oferta">OFERTA</span>' : ''}
                        ${product.mas_vendido ? '<span class="product-badge mas-vendido">TOP</span>' : ''}
                        ${!product.disponible ? '<span class="product-badge no-disponible">AGOTADO</span>' : ''}
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-name" title="${product.nombre}">${product.nombre}</div>
                    <span class="product-category">${product.categoria}</span>
                    <div class="product-price-container">
                        ${hasDiscount ? `
                            <span class="product-price original">$${originalPrice.toFixed(2)}</span>
                            <span class="product-price discounted">$${finalPrice.toFixed(2)}</span>
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
                const originalName = this.getOriginalNameFromId(productId);
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
        ['product-oferta', 'product-mas-vendido', 'product-disponible'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.updateJsonPreview());
        });
    }

    updatePriceHint() {
        const priceInput = document.getElementById('product-price');
        const price = parseFloat(priceInput.value) || 0;
        const finalPrice = price / 1.05;
        document.getElementById('final-price-hint').textContent = `$${finalPrice.toFixed(3)}`;
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
        this.updateJsonPreview();
    }
    
    closeProductEditor() {
        document.getElementById('product-editor-modal').classList.add('hidden');
        this.currentProduct = null;
        this.mainImageFile = null;
        this.additionalImageFiles = [];
    }
    
    populateProductForm(product) {
        document.getElementById('product-name').value = product.nombre;
        document.getElementById('product-category').value = product.categoria;
        document.getElementById('product-price').value = (product.precio * 1.05).toFixed(2);
        document.getElementById('product-discount').value = product.descuento || 0;
        document.getElementById('product-oferta').checked = product.oferta || false;
        document.getElementById('product-mas-vendido').checked = product.mas_vendido || false;
        document.getElementById('product-disponible').checked = product.disponible !== false;
        document.getElementById('product-description').value = product.descripcion || '';
        this.updatePriceHint();
        
        // Populate categories dropdown
        const categorySelect = document.getElementById('product-category');
        categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>' + 
            CONFIG.PRODUCT_CATEGORIES.map(cat => 
                `<option value="${cat}" ${cat === product.categoria ? 'selected' : ''}>${cat}</option>`
            ).join('');
        
        // Show main image
        const mainImageContainer = document.getElementById('main-image-container');
        if (product.imagen) {
            const imageUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_API.REPO_OWNER}/${CONFIG.GITHUB_API.REPO_NAME}/main/${product.imagen}`;
            mainImageContainer.innerHTML = `<img src="${imageUrl}" alt="${product.nombre}" onerror="this.parentElement.innerHTML='<span>Error al cargar imagen</span>'">`;
            document.getElementById('remove-main-image').style.display = 'block';
        } else {
            mainImageContainer.innerHTML = '<span>No hay imagen seleccionada</span>';
            document.getElementById('remove-main-image').style.display = 'none';
        }
        
        // Show additional images
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
            
            // Add event listeners for remove buttons
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
        
        // Reset categories dropdown
        const categorySelect = document.getElementById('product-category');
        categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>' + 
            CONFIG.PRODUCT_CATEGORIES.map(cat => 
                `<option value="${cat}">${cat}</option>`
            ).join('');
        
        // Reset images
        document.getElementById('main-image-container').innerHTML = '<span>No hay imagen seleccionada</span>';
        document.getElementById('remove-main-image').style.display = 'none';
        document.getElementById('additional-images-container').innerHTML = '<div class="no-images-message">No hay imágenes adicionales</div>';
    }
    
    handleMainImageUpload(file) {
        this.mainImageFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = document.getElementById('main-image-container');
            container.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            document.getElementById('remove-main-image').style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        this.updateJsonPreview();
    }
    
    removeMainImage() {
        this.mainImageFile = null;
        document.getElementById('main-image-container').innerHTML = '<span>No hay imagen seleccionada</span>';
        document.getElementById('remove-main-image').style.display = 'none';
        document.getElementById('main-image-upload').value = '';
        this.updateJsonPreview();
    }
    
    handleAdditionalImagesUpload(files) {
        files.forEach(file => {
            this.additionalImageFiles.push(file);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const container = document.getElementById('additional-images-container');
                
                // Remove "no images" message if it's the first image
                if (container.querySelector('.no-images-message')) {
                    container.innerHTML = '';
                }
                
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
        });
        
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
        const discount = parseInt(document.getElementById('product-discount').value) || 0;
        const oferta = document.getElementById('product-oferta').checked;
        const mas_vendido = document.getElementById('product-mas-vendido').checked;
        const disponible = document.getElementById('product-disponible').checked;
        const descripcion = document.getElementById('product-description').value.trim();
        
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
            descuento: discount,
            oferta: oferta,
            mas_vendido: mas_vendido,
            disponible: disponible,
            imagen: imagen,
            descripcion: descripcion || undefined,
            imagenesAdicionales: imagenesAdicionales.length > 0 ? imagenesAdicionales : undefined
        };
    }
    
    saveProduct() {
        const productData = this.getCurrentProductData();
        
        // Validate required fields
        if (!productData.nombre || !productData.categoria || !productData.precio) {
            this.showAlert('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        if (!productData.imagen) {
            this.showAlert('Debe seleccionar una imagen principal', 'error');
            return;
        }
        
        // Check if this is a new product or an edit
        const isNew = !this.currentProduct;
        const existingIndex = this.products.findIndex(p => p.nombre === productData.nombre);
        
        if (isNew) {
            if (existingIndex >= 0) {
                this.showAlert('Ya existe un producto con este nombre', 'error');
                return;
            }
            
            // Add to new products list
            this.productChanges.new.push(productData);
            this.products.push(productData);
        } else {
            // Check if name was changed and new name already exists
            if (productData.nombre !== this.currentProduct.nombre && existingIndex >= 0) {
                this.showAlert('Ya existe un producto con este nombre', 'error');
                return;
            }
            
            // Add to modified products list if not already there
            const existingModifiedIndex = this.productChanges.modified.findIndex(p => p.nombre === this.currentProduct.nombre);
            if (existingModifiedIndex < 0) {
                this.productChanges.modified.push(productData);
            } else {
                this.productChanges.modified[existingModifiedIndex] = productData;
            }
            
            // Update in products array
            const productIndex = this.products.findIndex(p => p.nombre === this.currentProduct.nombre);
            if (productIndex >= 0) {
                this.products[productIndex] = productData;
            }
        }
        
        // Update filtered products if needed
        this.filteredProducts = [...this.products];
        
        this.showAlert(`Producto ${isNew ? 'agregado' : 'actualizado'} correctamente`, 'success');
        this.renderProductsList();
        this.closeProductEditor();
        
        // Show confirmation modal if there are changes
        if (this.productChanges.modified.length > 0 || this.productChanges.new.length > 0 || this.productChanges.deleted.length > 0) {
            this.showChangesConfirmation();
        }
    }
    
    deleteProduct(productName) {
        if (!confirm(`¿Estás seguro de eliminar el producto "${productName}"?`)) {
            return;
        }
        
        const productIndex = this.products.findIndex(p => p.nombre === productName);
        if (productIndex >= 0) {
            const deletedProduct = this.products[productIndex];
            this.products.splice(productIndex, 1);
            this.filteredProducts = [...this.products];
            
            // Add to deleted products list if not a new product
            const isNew = this.productChanges.new.some(p => p.nombre === productName);
            if (!isNew) {
                this.productChanges.deleted.push(deletedProduct);
            } else {
                // Remove from new products list if it was there
                this.productChanges.new = this.productChanges.new.filter(p => p.nombre !== productName);
            }
            
            // Remove from modified products list if it was there
            this.productChanges.modified = this.productChanges.modified.filter(p => p.nombre !== productName);
            
            this.showAlert('Producto eliminado correctamente', 'success');
            this.renderProductsList();
            
            // Show confirmation modal if there are changes
            if (this.productChanges.modified.length > 0 || this.productChanges.new.length > 0 || this.productChanges.deleted.length > 0) {
                this.showChangesConfirmation();
            }
        }
    }
    
    showChangesConfirmation() {
        const modal = document.getElementById('changes-confirmation-modal');
        const modifiedList = document.getElementById('modified-products-list');
        const newList = document.getElementById('new-products-list');
        const deletedList = document.getElementById('deleted-products-list');
        
        modifiedList.innerHTML = this.productChanges.modified.map(p => 
            `<li>${p.nombre} (${p.categoria})</li>`
        ).join('') || '<li>No hay productos modificados</li>';
        
        newList.innerHTML = this.productChanges.new.map(p => 
            `<li>${p.nombre} (${p.categoria})</li>`
        ).join('') || '<li>No hay productos nuevos</li>';
        
        deletedList.innerHTML = this.productChanges.deleted.map(p => 
            `<li>${p.nombre} (${p.categoria})</li>`
        ).join('') || '<li>No hay productos eliminados</li>';
        
        modal.classList.remove('hidden');
    }
    
    async saveProductChanges() {
        if (!this.tokenValid) {
            this.showTokenModal(true);
            return;
        }
        
        const loadingAlert = this.showAlert('Guardando cambios en el repositorio...', 'loading');
        
        try {
            // First, upload any new images
            await this.uploadProductImages();
            
            // Then update the products.json file
            const success = await this.updateProductsFile(this.products);
            
            if (success) {
                // Reset changes tracking
                this.productChanges = {
                    modified: [],
                    new: [],
                    deleted: []
                };
                
                loadingAlert.remove();
                this.showAlert('✅ Cambios guardados exitosamente en el repositorio', 'success');
                document.getElementById('changes-confirmation-modal').classList.add('hidden');
                
                // Reload products to get any updates from GitHub
                await this.loadProducts();
            }
        } catch (error) {
            loadingAlert.remove();
            this.showAlert(`❌ Error al guardar cambios: ${error.message}`, 'error');
        }
    }
    
    async uploadProductImages() {
        const GITHUB_TOKEN = localStorage.getItem('github_token');
        if (!GITHUB_TOKEN) {
            throw new Error("No hay token de GitHub configurado");
        }
        
        const { REPO_OWNER, REPO_NAME } = CONFIG.GITHUB_API;
        
        // Upload main image if there's a new one
        if (this.mainImageFile) {
            await this.uploadImageToRepo(this.mainImageFile);
        }
        
        // Upload additional images
        for (const file of this.additionalImageFiles) {
            await this.uploadImageToRepo(file);
        }
    }
    
    async uploadImageToRepo(file) {
        const GITHUB_TOKEN = localStorage.getItem('github_token');
        const { REPO_OWNER, REPO_NAME } = CONFIG.GITHUB_API;
        const path = `img/products/${file.name}`;
        
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
                branch: 'main'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error al subir imagen: ${response.status}`);
        }
    }
    
    async updateProductsFile(newProducts) {
        try {
            const GITHUB_TOKEN = localStorage.getItem('github_token');
            if (!GITHUB_TOKEN) {
                this.showTokenModal(true);
                throw new Error("Por favor autentícate primero");
            }
            
            const { REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH } = CONFIG.GITHUB_API;
            
            // First get the SHA of the current file
            const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PRODUCTS_FILE_PATH}`;
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
            const content = JSON.stringify(newProducts, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(content)));
            
            // Update the file
            const updateResponse = await fetch(getUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Actualización de productos desde Analytics Asere',
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
    
    editProduct(productName) {
        const product = this.products.find(p => p.nombre === productName);
        if (product) {
            this.openProductEditor(product);
        }
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => new SalesDashboard());
