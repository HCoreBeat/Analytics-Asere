class FloatingBot {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.messages = [];
        this.currentMessageIndex = 0;
        this.isVisible = true;
        this.userNames = ['Eddy', 'Papus', 'Jefe'];
        this.currentUserName = this.userNames[Math.floor(Math.random() * this.userNames.length)];
        this.botPhrases = [
            `¡Hola ${this.currentUserName}! Tengo algo interesante para ti.`,
            `Atención, ${this.currentUserName}! Aquí hay datos clave.`,
            `Revisa esto, ${this.currentUserName}. Podría ser útil.`,
            `${this.currentUserName}, análisis actualizado. Te interesa.`,
            `Te tengo algo nuevo, ${this.currentUserName}.`,
            `Oye, ${this.currentUserName}, esto podría ayudarte.`,
            `Novedades frescas para ti, ${this.currentUserName}.`,
            `Aquí tienes un dato que puede marcar la diferencia, ${this.currentUserName}.`,
            `Información estratégica lista para ti, ${this.currentUserName}.`,
            `${this.currentUserName}, te traigo un nuevo reporte.`,
            `Descubre esto, ${this.currentUserName}. Puede ser clave.`,
            `Alerta de datos importantes, ${this.currentUserName}.`,
            `Análisis en marcha, ${this.currentUserName}. No te lo pierdas.`,
            `${this.currentUserName}, tu asistente tiene información valiosa para ti.`,
            `¡Aquí estamos de nuevo, ${this.currentUserName}! Un nuevo reporte espera.`,
            `Te comparto un insight relevante, ${this.currentUserName}.`,
            `Nueva recomendación estratégica disponible, ${this.currentUserName}.`,
            `¡${this.currentUserName}, aquí hay algo que podría mejorar tu negocio!`,
            `Datos frescos listos para revisión, ${this.currentUserName}.`,
            `¡Actualización en curso, ${this.currentUserName}! No querrás perderte esto.`,
        ];
        this.welcomeMessages = [
            `¡Hola, ${this.currentUserName}! Listo para transformar datos en conocimiento papus.`,
            `¡Bienvenido, ${this.currentUserName}! Vamos a darle sentido a la información de asere papus.`,
            `¡${this.currentUserName}, tu tablero de análisis te espera!`,
            `Saludos, ${this.currentUserName}. Los datos no se interpretarán solos papus. Hay que trabajar.`,
            `¡Ey, ${this.currentUserName}! Hora de descubrir tendencias y patrones papus.`,
            `¡Qué bueno verte de nuevo, ${this.currentUserName}! Vamos al grano.`,
            `¡${this.currentUserName}, bienvenido al mundo de los insights papus!`,
            `¡Aquí estamos, ${this.currentUserName}! ¿Listo para desentrañar los números?`,
            `¡A darle, ${this.currentUserName}! Tus reportes están listos.`,
            `¡${this.currentUserName}, vamos a convertir números en estrategia!`,
            `¡Hola de nuevo, ${this.currentUserName}! ¿Exploramos el poder de los datos?`,
            `¡Es un placer verte, ${this.currentUserName}! A por un nuevo análisis.`,
            `¡Hey, ${this.currentUserName}! Aquí tienes tu centro de conocimiento.`,
            `¡Hola, ${this.currentUserName}! Listo para sacar conclusiones reveladoras.`,
            `¡Saludos, ${this.currentUserName}! Tu panel está cargado con nuevos hallazgos.`,
            `¡Vamos con todo, ${this.currentUserName}! Los datos te están esperando.`,
            `¡${this.currentUserName}, preparado para descifrar patrones ocultos?`,
            `¡Bienvenido, ${this.currentUserName}! Tus métricas aguardan tu análisis.`,
            `¡${this.currentUserName}, vuelve a tomar el control de tus datos!`,
            `¡Aquí estamos otra vez, ${this.currentUserName}! ¿Listo para nuevos insights?`
        ];

        this.currentVersion = "1.2.1";
        this.lastSeenVersion = localStorage.getItem('botVersion');
        this.versionHistory = {
            "1.2.1": [
                "Nuevo sistema de verificación de versión",
                "Mejorado el panel de introducción",
                "Optimización de rendimiento",
                "Corrección de errores menores"
            ],
            "1.2.0": [
                "Integración con sistema de afiliados",
                "Nuevos gráficos de tendencias",
                "Mejoras en la interfaz"
            ]
        };

        this.hasBeenIntroduced = localStorage.getItem('botIntroduced') === 'true';
        this.init();
    }

    init() {
        this.createBotElements();
        this.generateMessages();
        this.showNextMessage();
        this.setupEvents();
        this.setupScrollBehavior();
        this.startAutoRotation();
        
        if (!this.hasBeenIntroduced) {
            this.showIntroduction();
        } else {
            this.checkVersion();
            this.showWelcomeMessage();
        }
    }

    createBotElements() {
        this.botContainer = document.createElement('div');
        this.botContainer.className = 'floating-bot-container';
        this.botContainer.innerHTML = `
            <div class="floating-bot-button">
                <div class="bot-pulse"></div>
                <div class="bot-icon">
                    <i class="fas fa-robot"></i>
                </div>
            </div>
            <div class="floating-bot-panel hidden">
                <div class="bot-panel-header">
                    <div class="bot-header-content">
                        <div class="bot-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="bot-title">
                            <h3>Asere Analytics IA</h3>
                            <div class="bot-status">
                                <span class="status-dot"></span>
                                <span>En línea</span>
                            </div>
                        </div>
                    </div>
                    <button class="close-bot-panel"><i class="fas fa-times"></i></button>
                </div>

                <div class="bot-panel-content"></div>
                <div class="bot-panel-footer">
                    <button class="bot-nav-btn prev-btn" title="Anterior"><i class="fas fa-chevron-left"></i></button>
                    <div class="bot-controls">
                        <button class="bot-action-btn refresh-btn" title="Actualizar"><i class="fas fa-sync-alt"></i></button>
                        <span class="bot-message-counter">1/${this.messages.length}</span>
                        <button class="bot-action-btn auto-rotate-btn active" title="Rotación automática"><i class="fas fa-pause"></i></button>
                    </div>
                    <button class="bot-nav-btn next-btn" title="Siguiente"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(this.botContainer);
        
        // Referencias a elementos
        this.botButton = this.botContainer.querySelector('.floating-bot-button');
        this.botPanel = this.botContainer.querySelector('.floating-bot-panel');
        this.botPanelContent = this.botContainer.querySelector('.bot-panel-content');
        this.panelContent = this.botContainer.querySelector('.bot-panel-content');
        this.prevBtn = this.botContainer.querySelector('.prev-btn');
        this.nextBtn = this.botContainer.querySelector('.next-btn');
        this.counter = this.botContainer.querySelector('.bot-message-counter');
        this.closeBtn = this.botContainer.querySelector('.close-bot-panel');
        this.refreshBtn = this.botContainer.querySelector('.refresh-btn');
        this.autoRotateBtn = this.botContainer.querySelector('.auto-rotate-btn');
        this.autoRotateInterval = null;
    }

    checkVersion() {
        if (!this.lastSeenVersion || this.lastSeenVersion !== this.currentVersion) {
            this.showWhatsNew();
            localStorage.setItem('botVersion', this.currentVersion);
        }
    }

    showWhatsNew() {
        // No mostrar si es la primera vez (ya se muestra la intro)
        if (!this.hasBeenIntroduced) return;

        const whatsNewPanel = document.createElement('div');
        whatsNewPanel.className = 'bot-whatsnew-overlay';
        
        const versionChanges = this.versionHistory[this.currentVersion] || [];
        const previousVersion = this.lastSeenVersion || '1.2.1';
        
        whatsNewPanel.innerHTML = `
            <div class="bot-whatsnew-container">
                <div class="bot-whatsnew-header">
                    <div class="bot-whatsnew-avatar">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <h3>¡Novedades en Asere Analytics IA!</h3>
                    <p class="version-info">Actualizado a v${this.currentVersion} desde v${previousVersion}</p>
                </div>
                
                <div class="whatsnew-content">
                    <h4>¿Qué hay de nuevo?</h4>
                    <ul class="changes-list">
                        ${versionChanges.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                    
                    ${this.lastSeenVersion ? '' : `
                    <div class="first-time-message">
                        <i class="fas fa-star"></i> ¡Bienvenido a la nueva versión del asistente!
                    </div>
                    `}
                </div>
                
                <div class="whatsnew-footer">
                    <button class="btn-whatsnew-close">
                        <i class="fas fa-check"></i> ¡Genial, entendido!
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(whatsNewPanel);
        
        // Mostrar con animación
        setTimeout(() => {
            whatsNewPanel.style.opacity = '1';
            whatsNewPanel.querySelector('.bot-whatsnew-container').style.transform = 'translateY(0)';
        }, 100);
        
        // Configurar evento para cerrar
        const closeBtn = whatsNewPanel.querySelector('.btn-whatsnew-close');
        closeBtn.addEventListener('click', () => {
            whatsNewPanel.style.opacity = '0';
            whatsNewPanel.querySelector('.bot-whatsnew-container').style.transform = 'translateY(20px)';
            setTimeout(() => {
                whatsNewPanel.remove();
            }, 300);
        });
    }


    showIntroduction() {
        // Crear overlay de introducción
        this.introOverlay = document.createElement('div');
        this.introOverlay.className = 'bot-intro-overlay';
        this.introOverlay.innerHTML = `
            <div class="bot-intro-container">
                <div class="bot-intro-content">
                    <div class="bot-intro-header">
                        <div class="bot-intro-avatar pulse">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="bot-intro-badge">NUEVO</div>
                    </div>
                    
                    <h3>¡Hola ${this.currentUserName}! Soy Asere Analytics IA</h3>
                    <p class="intro-description">Tu asistente personalizado desarrollado por <strong>Huguito</strong> para analizar tus datos de ventas y afiliados.</p>
                    
                    <div class="intro-features">
                        <div class="feature-item">
                            <i class="fas fa-chart-line feature-icon"></i>
                            <span>Análisis en tiempo real</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-bolt feature-icon"></i>
                            <span>Insights automáticos</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-user-tie feature-icon"></i>
                            <span>Seguimiento de afiliados</span>
                        </div>
                    </div>
                    
                    <p class="intro-tip"><i class="fas fa-lightbulb"></i> Puedes encontrarme en la esquina inferior derecha cuando necesites perspectivas rápidamente.</p>
                    
                    <div class="intro-footer">
                        <div class="version-info">
                            <span class="version-label">Versión</span>
                            <span class="version-number">1.2.1</span>
                        </div>
                        <button class="btn-intro-close">
                            <i class="fas fa-thumbs-up"></i> Entendido papus
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.introOverlay);
        
        // Configurar evento para cerrar
        const closeBtn = this.introOverlay.querySelector('.btn-intro-close');
        closeBtn.addEventListener('click', () => {
            this.introOverlay.style.opacity = '0';
            setTimeout(() => {
                this.introOverlay.remove();
            }, 300);
            localStorage.setItem('botIntroduced', 'true');
            localStorage.setItem('botVersion', this.currentVersion);
            this.hasBeenIntroduced = true;
            
            // Mostrar mensaje de bienvenida después de cerrar la intro
            setTimeout(() => this.showWelcomeMessage(), 500);
        });
        
        // Mostrar con animación
        setTimeout(() => {
            this.introOverlay.style.opacity = '1';
        }, 100);
    }

    showWelcomeMessage() {
        // Solo mostrar si el bot ya se ha presentado antes
        if (!this.hasBeenIntroduced) return;
        
        // Crear panel de bienvenida
        this.welcomePanel = document.createElement('div');
        this.welcomePanel.className = 'bot-welcome-panel';
        this.welcomePanel.innerHTML = `
            <div class="bot-welcome-content">
                <div class="bot-welcome-header">
                    <div class="bot-welcome-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="bot-welcome-text">
                        <h4>Asere Analytics IA</h4>
                        <p>${this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)]}</p>
                    </div>
                </div>
                <div class="bot-welcome-footer">
                    <small>Este mensaje se cerrará automáticamente</small>
                </div>
            </div>
        `;
        document.body.appendChild(this.welcomePanel);
        
        // Mostrar con animación
        setTimeout(() => {
            this.welcomePanel.style.opacity = '1';
            this.welcomePanel.style.transform = 'translateY(0)';
        }, 1000);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            this.welcomePanel.style.opacity = '0';
            this.welcomePanel.style.transform = 'translateY(20px)';
            setTimeout(() => {
                this.welcomePanel.remove();
            }, 300);
        }, 10000);
    }

    generateMessages() {
        this.messages = [];
        
        if (!this.dashboard.orders || this.dashboard.orders.length === 0) {
            this.messages.push({
                title: 'Sin datos',
                content: 'No hay datos de pedidos disponibles para mostrar análisis.'
            });
            return;
        }

        // 1. Últimos pedidos con análisis
        const lastOrders = this.dashboard.orders
            .sort((a, b) => b.date - a.date)
            .slice(0, 3);
        
        const lastOrderTime = lastOrders[0] ? 
            this.formatTimeAgo(lastOrders[0].date) : 'recientemente';
        
        this.messages.push({
            title: '📌 Últimos Pedidos',
            content: `
                <div class="bot-message-intro">${this.getRandomPhrase()} Aquí tienes los últimos movimientos (${lastOrderTime}):</div>
                ${lastOrders.map(order => this.createOrderCard(order)).join('')}
                <div class="bot-analysis">${this.getOrderTrendAnalysis(lastOrders)}</div>
            `
        });

        // 2. Pedidos más grandes con comparativa
        const biggestOrders = this.dashboard.orders
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);
        
        this.messages.push({
            title: '💰 Pedidos Destacados',
            content: `
                <div class="bot-message-intro">${this.getRandomPhrase()} Estos son los pedidos más importantes:</div>
                ${biggestOrders.map(order => this.createOrderCard(order, true)).join('')}
                <div class="bot-analysis">${this.getBigOrdersAnalysis(biggestOrders)}</div>
            `
        });

        // 3. Resumen de ventas con insights
        const totalSales = this.dashboard.orders.reduce((sum, order) => sum + order.total, 0);
        const avgOrder = totalSales / this.dashboard.orders.length;
        const today = new Date();
        const todaySales = this.dashboard.orders
            .filter(order => order.date.getDate() === today.getDate() && 
                            order.date.getMonth() === today.getMonth() && 
                            order.date.getFullYear() === today.getFullYear())
            .reduce((sum, order) => sum + order.total, 0);
        
        const yesterdaySales = this.dashboard.orders
            .filter(order => {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return order.date.getDate() === yesterday.getDate() && 
                    order.date.getMonth() === yesterday.getMonth() && 
                    order.date.getFullYear() === yesterday.getFullYear();
            })
            .reduce((sum, order) => sum + order.total, 0);
        
        const salesChange = yesterdaySales > 0 ? 
            ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1) : 100;

        this.messages.push({
            title: '📊 Resumen de Ventas',
            content: `
                <div class="bot-message-intro">${this.getRandomPhrase()} Aquí tienes el panorama general:</div>
                <div class="bot-stats-grid">
                    ${this.createStatCard('Ventas Totales', `$${totalSales.toFixed(2)}`, 'fas fa-chart-line')}
                    ${this.createStatCard('Pedidos Totales', this.dashboard.orders.length, 'fas fa-shopping-cart')}
                    ${this.createStatCard('Ventas Hoy', `$${todaySales.toFixed(2)}`, 'fas fa-sun', salesChange)}
                    ${this.createStatCard('Promedio por Pedido', `$${avgOrder.toFixed(2)}`, 'fas fa-calculator')}
                </div>
                <div class="bot-analysis">${this.getSalesAnalysis(todaySales, yesterdaySales)}</div>
            `
        });

        // 4. Productos más vendidos con recomendaciones
        const topProducts = this.dashboard.getTopProducts(this.dashboard.orders, 3);
        this.messages.push({
            title: '🏆 Productos Estrella',
            content: `
                <div class="bot-message-intro">${this.getRandomPhrase()} Estos productos están dominando:</div>
                ${topProducts.map(product => this.createProductCard(product)).join('')}
                <div class="bot-analysis">${this.getProductRecommendations(topProducts)}</div>
            `
        });

        // 5. Análisis de afiliados (si hay datos)
        if (this.dashboard.affiliates && this.dashboard.affiliates.length > 0) {
            const topAffiliates = [...this.dashboard.affiliates]
                .sort((a, b) => b.numeroInt - a.numeroInt)
                .slice(0, 3);
            
            this.messages.push({
                title: '🤝 Top Afiliados',
                content: `
                    <div class="bot-message-intro">${this.getRandomPhrase()} Reconociendo a los mejores:</div>
                    ${topAffiliates.map(affiliate => this.createAffiliateCard(affiliate)).join('')}
                    <div class="bot-analysis">${this.getAffiliatePerformance(topAffiliates)}</div>
                `
            });
        }

        // 6. Análisis de tendencia horaria (nuevo)
        if (this.dashboard.orders.length > 10) {
            const hourlyTrends = this.getHourlyTrends();
            this.messages.push({
                title: '⏰ Tendencias por Hora',
                content: `
                    <div class="bot-message-intro">${this.getRandomPhrase()} Mejores momentos para vender:</div>
                    <div class="hourly-trends-chart">
                        ${this.createHourlyTrendsChart(hourlyTrends)}
                    </div>
                    <div class="bot-analysis">${this.getHourlyTrendsAnalysis(hourlyTrends)}</div>
                `
            });
        }

        // 7. Clientes recurrentes (nuevo)
        const repeatCustomers = this.getRepeatCustomers();
        if (repeatCustomers.length > 0) {
            this.messages.push({
                title: '🔄 Clientes Recurrentes',
                content: `
                    <div class="bot-message-intro">${this.getRandomPhrase()} Estos clientes vuelven por más:</div>
                    ${repeatCustomers.map(customer => this.createCustomerCard(customer)).join('')}
                    <div class="bot-analysis">${this.getRepeatCustomerAnalysis(repeatCustomers)}</div>
                `
            });
        }

        // Actualizar contador
        if (this.counter) {
            this.counter.textContent = `1/${this.messages.length}`;
        }
    }

    getHourlyTrends() {
        const hourlyData = Array(24).fill(0).map(() => ({ count: 0, total: 0 }));
        
        this.dashboard.orders.forEach(order => {
            const hour = order.date.getHours();
            hourlyData[hour].count++;
            hourlyData[hour].total += order.total;
        });
        
        return hourlyData.map((data, hour) => ({
            hour,
            hourLabel: `${hour}:00 - ${hour+1}:00`,
            count: data.count,
            total: data.total,
            avg: data.count > 0 ? data.total / data.count : 0
        }));
    }

    createHourlyTrendsChart(trends) {
        const topHours = [...trends].sort((a, b) => b.total - a.total).slice(0, 3);
        
        return `
            <div class="trends-grid">
                ${topHours.map(hour => `
                    <div class="trend-hour">
                        <div class="trend-hour-label">${hour.hour}:00</div>
                        <div class="trend-bar-container">
                            <div class="trend-bar" style="width: ${(hour.total / trends.reduce((sum, h) => sum + h.total, 0)) * 100}%"></div>
                        </div>
                        <div class="trend-hour-stats">
                            <span>${hour.count} pedidos</span>
                            <span>$${hour.total.toFixed(2)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getHourlyTrendsAnalysis(trends) {
        const bestHour = trends.reduce((best, current) => 
            current.total > best.total ? current : best, trends[0]);
        
        const suggestions = [
            `La mejor hora para promociones es <strong>${bestHour.hour}:00</strong> con ${bestHour.count} pedidos ($${bestHour.total.toFixed(2)}).`,
            `Considera aumentar tu disponibilidad o promociones alrededor de las <strong>${bestHour.hour}:00</strong>.`,
            `La hora pico de ventas es <strong>${bestHour.hour}:00</strong>. Aprovecha este momento.`,
            `Entre las <strong>${bestHour.hour}:00 y ${bestHour.hour+1}:00</strong> se generan más ventas.`
        ];
        
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    getRepeatCustomers() {
        const customerMap = {};
        
        this.dashboard.orders.forEach(order => {
            if (!customerMap[order.nombre_comprador]) {
                customerMap[order.nombre_comprador] = {
                    name: order.nombre_comprador,
                    orders: 0,
                    total: 0,
                    lastOrder: order.date,
                    country: order.country
                };
            }
            customerMap[order.nombre_comprador].orders++;
            customerMap[order.nombre_comprador].total += order.total;
            if (order.date > customerMap[order.nombre_comprador].lastOrder) {
                customerMap[order.nombre_comprador].lastOrder = order.date;
            }
        });
        
        return Object.values(customerMap)
            .filter(customer => customer.orders > 1)
            .sort((a, b) => b.orders - a.orders || b.total - a.total)
            .slice(0, 3);
    }

    createCustomerCard(customer) {
        return `
            <div class="bot-customer-item">
                <div class="bot-customer-info">
                    <span class="bot-customer-name">${customer.name}</span>
                    <span class="bot-customer-meta">${customer.orders} compras • ${this.formatTimeAgo(customer.lastOrder)}</span>
                </div>
                <div class="bot-customer-stats">
                    <span class="bot-customer-total">$${customer.total.toFixed(2)}</span>
                    <span class="bot-customer-country">${customer.country}</span>
                </div>
            </div>
        `;
    }

    getRepeatCustomerAnalysis(customers) {
        const topCustomer = customers[0];
        const totalFromRepeat = customers.reduce((sum, c) => sum + c.total, 0);
        const percentage = (totalFromRepeat / this.dashboard.orders.reduce((sum, o) => sum + o.total, 0) * 100).toFixed(1);
        
        return `
            <strong>${topCustomer.name}</strong> es tu cliente más fiel con ${topCustomer.orders} compras. 
            Los clientes recurrentes generan el <strong>${percentage}%</strong> de tus ventas. 
            Considera un programa de fidelización.
        `;
    }

    // Métodos auxiliares para crear componentes
    createOrderCard(order, highlight = false) {
        const currencySymbol = this.dashboard.getCurrencySymbol(order.country);
        return `
            <div class="bot-order-item ${highlight ? 'highlight' : ''}">
                <div class="bot-order-header">
                    <span class="bot-order-date">${order.dateStr}</span>
                    <span class="bot-order-amount">${currencySymbol}${order.total.toFixed(2)}</span>
                </div>
                <div class="bot-order-details">
                    <span class="bot-order-client">${order.nombre_comprador}</span>
                    <span class="bot-order-location">${order.country}</span>
                    ${order.affiliate ? `<span class="bot-order-affiliate">Afiliado: ${order.affiliate}</span>` : ''}
                </div>
                ${order.compras.length > 0 ? `
                    <div class="bot-order-products">
                        ${order.compras.slice(0, 2).map(product => `
                            <span class="bot-product-tag">${product.producto} (${product.cantidad})</span>
                        `).join('')}
                        ${order.compras.length > 2 ? `<span class="bot-product-more">+${order.compras.length - 2} más</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    createProductCard(product) {
        return `
            <div class="bot-product-item">
                <div class="bot-product-info">
                    <span class="bot-product-name">${product.product}</span>
                    <span class="bot-product-meta">${this.getRandomEmoji()} ${product.quantity} unidades vendidas</span>
                </div>
                <span class="bot-product-badge">TOP</span>
            </div>
        `;
    }

    createAffiliateCard(affiliate) {
        return `
            <div class="bot-affiliate-item">
                <div class="bot-affiliate-avatar">${affiliate.nombre.charAt(0)}</div>
                <div class="bot-affiliate-info">
                    <span class="bot-affiliate-name">${affiliate.nombre}</span>
                    <span class="bot-affiliate-meta">#${affiliate.numero}</span>
                </div>
                <div class="bot-affiliate-stats">
                    <span class="bot-affiliate-sales">${Math.floor(Math.random() * 20) + 5} ventas</span>
                </div>
            </div>
        `;
    }

    createStatCard(label, value, icon, change = null) {
        return `
            <div class="bot-stat-item">
                <div class="bot-stat-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="bot-stat-content">
                    <span class="bot-stat-label">${label}</span>
                    <span class="bot-stat-value">${value}</span>
                    ${change ? `
                        <span class="bot-stat-change ${change >= 0 ? 'positive' : 'negative'}">
                            <i class="fas fa-arrow-${change >= 0 ? 'up' : 'down'}"></i>
                            ${Math.abs(change)}%
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Métodos de análisis generativos
    getOrderTrendAnalysis(orders) {
        if (orders.length < 2) return "Necesitamos más datos para identificar tendencias.";
        
        const recentTotal = orders.reduce((sum, order) => sum + order.total, 0);
        const avgRecent = recentTotal / orders.length;
        const allAvg = this.dashboard.orders.reduce((sum, order) => sum + order.total, 0) / this.dashboard.orders.length;
        
        if (avgRecent > allAvg * 1.2) {
            return "📈 <strong>Tendencia positiva:</strong> Los pedidos recientes están por encima del promedio. ¡Buen trabajo!";
        } else if (avgRecent < allAvg * 0.8) {
            return "📉 <strong>Tendencia a revisar:</strong> Los pedidos recientes están por debajo del promedio. ¿Necesitas ayuda con algo?";
        } else {
            return "➡️ <strong>Tendencia estable:</strong> Los pedidos recientes están en línea con el promedio histórico.";
        }
    }

    getBigOrdersAnalysis(orders) {
        const bigTotal = orders.reduce((sum, order) => sum + order.total, 0);
        const percentage = (bigTotal / this.dashboard.orders.reduce((sum, order) => sum + order.total, 0) * 100).toFixed(1);
        
        return `Estos pedidos representan el <strong>${percentage}%</strong> de tus ventas totales. ¡Enfócate en estos clientes!`;
    }

    getSalesAnalysis(todaySales, yesterdaySales) {
        if (yesterdaySales === 0) return "Es tu primer día de ventas. ¡Sigue así!";
        
        const change = ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1);
        
        if (change > 20) {
            return `🚀 <strong>¡Crecimiento explosivo!</strong> Las ventas de hoy superan en un ${Math.abs(change)}% a las de ayer.`;
        } else if (change > 0) {
            return `👍 <strong>Buen progreso:</strong> Las ventas han aumentado un ${Math.abs(change)}% respecto a ayer.`;
        } else if (change < -10) {
            return `⚠️ <strong>Atención:</strong> Las ventas han disminuido un ${Math.abs(change)}% respecto a ayer. ¿Qué ha cambiado?`;
        } else {
            return "🔄 Las ventas se mantienen estables en comparación con ayer.";
        }
    }

    getProductRecommendations(products) {
        const topProduct = products[0];
        const suggestions = [
            `Destaca <strong>${topProduct.product}</strong> en tu página principal.`,
            `Considera hacer un paquete promocional con <strong>${topProduct.product}</strong>.`,
            `Los clientes aman <strong>${topProduct.product}</strong>. ¿Has pensado en ampliar su inventario?`,
            `Crea contenido sobre cómo usar <strong>${topProduct.product}</strong> para impulsar más ventas.`
        ];
        
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    getAffiliatePerformance(affiliates) {
        const topAffiliate = affiliates[0];
        return `Recompensa a <strong>${topAffiliate.nombre}</strong> por ser tu afiliado más activo. ¡Motívalo a seguir generando ventas!`;
    }

    // Métodos auxiliares
    getRandomPhrase() {
        return this.botPhrases[Math.floor(Math.random() * this.botPhrases.length)];
    }

    getRandomEmoji() {
        const emojis = ['✨', '🔥', '⭐', '🚀', '💎', '🏆', '👍', '👑'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'hace unos segundos';
        if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
        
        const days = Math.floor(hours / 24);
        return `hace ${days} día${days > 1 ? 's' : ''}`;
    }

    // Control de mensajes
    showNextMessage() {
        if (this.messages.length === 0) return;
        
        this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
        this.displayCurrentMessage();
    }

    showPrevMessage() {
        if (this.messages.length === 0) return;
        
        this.currentMessageIndex = (this.currentMessageIndex - 1 + this.messages.length) % this.messages.length;
        this.displayCurrentMessage();
    }

    displayCurrentMessage() {
        if (this.messages.length === 0 || !this.panelContent) return;
        
        const message = this.messages[this.currentMessageIndex];
        this.panelContent.innerHTML = `
            <div class="bot-message">
                <div class="bot-message-title">${message.title}</div>
                ${message.content}
            </div>
        `;
        
        if (this.counter) {
            this.counter.textContent = `${this.currentMessageIndex + 1}/${this.messages.length}`;
        }
    }

    refreshMessages() {
        this.messages = [];
        this.generateMessages();
        this.currentMessageIndex = 0;
        this.displayCurrentMessage();
    }

    // Control de rotación automática
    startAutoRotation() {
        this.stopAutoRotation();
        this.autoRotateInterval = setInterval(() => {
            if (!this.botPanel.classList.contains('hidden')) {
                this.showNextMessage();
            }
        }, 20000); // Rotación cada 10 segundos
    }

    stopAutoRotation() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
    }

    toggleAutoRotation() {
        if (this.autoRotateInterval) {
            this.stopAutoRotation();
            this.autoRotateBtn.classList.remove('active');
            this.autoRotateBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            this.startAutoRotation();
            this.autoRotateBtn.classList.add('active');
            this.autoRotateBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    // Configuración de eventos
    setupEvents() {
        // Botón flotante
        this.botButton.addEventListener('click', () => {
            if (!this.hasBeenIntroduced) return;
            this.botPanel.classList.toggle('hidden');
            if (!this.botPanel.classList.contains('hidden')) {
                this.botPanel.classList.add('show');
                this.displayCurrentMessage();
            } else {
                this.botPanel.classList.remove('show');
            }
        });

        // Botones de navegación
        this.nextBtn.addEventListener('click', () => this.showNextMessage());
        this.prevBtn.addEventListener('click', () => this.showPrevMessage());

        // Cerrar panel
        this.closeBtn.addEventListener('click', () => {
            this.botPanel.classList.add('hidden');
        });

        // Actualizar datos
        this.refreshBtn.addEventListener('click', () => {
            this.refreshMessages();
            this.botButton.classList.add('refreshing');
            setTimeout(() => {
                this.botButton.classList.remove('refreshing');
            }, 1000);
        });

        // Rotación automática
        this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotation());

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (!this.botPanel.classList.contains('hidden')) {
                if (e.key === 'ArrowRight') this.showNextMessage();
                if (e.key === 'ArrowLeft') this.showPrevMessage();
                if (e.key === 'Escape') this.botPanel.classList.add('hidden');
            }
        });
    }

        setupScrollBehavior() {
        // Evitar que el scroll en el panel afecte a la página
        this.botPanelContent.addEventListener('wheel', (e) => {
            // Verificar si el scroll está en el tope o fondo del contenido
            const atTop = this.botPanelContent.scrollTop === 0;
            const atBottom = this.botPanelContent.scrollTop + this.botPanelContent.clientHeight >= 
                            this.botPanelContent.scrollHeight - 1;
            
            // Si estamos en el tope y haciendo scroll hacia arriba, o en el fondo y hacia abajo
            // Permitir que el scroll continúe en la página
            if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
                return true; // Permitir el comportamiento por defecto
            }
            
            // De lo contrario, prevenir que el scroll afecte a la página
            e.stopPropagation();
        }, { passive: false });

        // Cerrar el panel cuando se haga scroll en la página
        let scrollTimeout;
        const handlePageScroll = () => {
            if (!this.botPanel.classList.contains('hidden')) {
                this.botPanel.classList.add('hidden');
                this.stopAutoRotation();
            }
            
            // Limpiar timeout anterior y establecer uno nuevo
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                document.removeEventListener('scroll', handlePageScroll);
            }, 1000);
        };

        // Activar el listener de scroll cuando se abre el panel
        this.botButton.addEventListener('click', () => {
            if (this.botPanel.classList.contains('hidden')) {
                // Cuando se abre el panel, agregar el listener
                document.addEventListener('scroll', handlePageScroll);
            } else {
                // Cuando se cierra el panel, remover el listener
                document.removeEventListener('scroll', handlePageScroll);
                clearTimeout(scrollTimeout);
            }
        });
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const checkDashboard = setInterval(() => {
        if (window.salesDashboard) {
            clearInterval(checkDashboard);
            new FloatingBot(window.salesDashboard);
        }
    }, 500);
});