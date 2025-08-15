class FloatingBot {
    // Mostrar panel de logros basados en datos
    showAchievementsPanel() {
        // Si ya existe, no crear otro
        if (document.querySelector('.bot-achievements-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'bot-achievements-overlay';
        
        // Obtener datos y análisis
        const achievementsData = this.getDataAchievements();
        if (!achievementsData) return; // Si no hay datos, no mostrar nada
        
        // Extraer logros y análisis
        const logros = achievementsData.logros || [];
        const analisis = achievementsData.analisis;
        
        const totalLogros = this.getTotalPossibleAchievements();
        const porcentajeCompletado = Math.min(100, Math.round((logros.length / totalLogros) * 100));
        
        // Guardar análisis para usar en renderAchievementCategory
        this.currentAnalisis = analisis;
        
        overlay.innerHTML = `
            <div class="bot-achievements-container">
                <div class="bot-achievements-header">
                    <span class="bot-achievements-title">🏆 Panel de Logros</span>
                    <button class="bot-achievements-close" title="Cerrar">&times;</button>
                </div>

                <div class="achievements-overview">
                    <div class="achievements-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${porcentajeCompletado}%"></div>
                        </div>
                        <div class="progress-stats">
                            <span class="stats-number">${logros.length}/${totalLogros}</span>
                            <span class="stats-percent">${porcentajeCompletado.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                <div class="achievements-categories">
                    <div class="achievement-category">
                        <h3>📊 Análisis Básico</h3>
                        <div class="category-achievements">
                            ${this.renderAchievementCategory('basico', logros)}
                        </div>
                    </div>

                    <div class="achievement-category">
                        <h3>💹 Análisis Financiero</h3>
                        <div class="category-achievements">
                            ${this.renderAchievementCategory('financiero', logros)}
                        </div>
                    </div>

                    <div class="achievement-category">
                        <h3>📈 Análisis de Volumen</h3>
                        <div class="category-achievements">
                            ${this.renderAchievementCategory('volumen', logros)}
                        </div>
                    </div>

                    <div class="achievement-category">
                        <h3>⏰ Análisis Temporal</h3>
                        <div class="category-achievements">
                            ${this.renderAchievementCategory('temporal', logros)}
                        </div>
                    </div>

                    <div class="achievement-category">
                        <h3>📅 Análisis de Continuidad</h3>
                        <div class="category-achievements">
                            ${this.renderAchievementCategory('continuidad', logros)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const achievementsPanel = overlay.querySelector('.bot-achievements-container');
        const closeBtn = overlay.querySelector('.bot-achievements-close');

        // Mostrar el panel con una animación
        setTimeout(() => {
            overlay.style.opacity = '1';
            achievementsPanel.style.transform = 'translateX(-100%)';
            document.body.classList.add('bot-achievements-open'); // Prevent background scrolling
        }, 50);

        // Cerrar el panel
        closeBtn.onclick = () => {
            achievementsPanel.style.transform = 'translateX(0)';
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    document.body.classList.remove('bot-achievements-open'); // Restore scrolling
                }, 300);
            }, 200);
        };
    }
    // Función auxiliar para calcular días consecutivos
    calcularDiasConsecutivos(fechas) {
        if (!fechas.length) return 0;
        
        // Ordenar fechas
        fechas.sort();
        let maxConsecutivos = 1;
        let consecutivosActuales = 1;
        
        for (let i = 1; i < fechas.length; i++) {
            const fechaActual = new Date(fechas[i]);
            const fechaAnterior = new Date(fechas[i-1]);
            const diferenciaDias = (fechaActual - fechaAnterior) / (1000 * 60 * 60 * 24);
            
            if (diferenciaDias === 1) {
                consecutivosActuales++;
                maxConsecutivos = Math.max(maxConsecutivos, consecutivosActuales);
            } else {
                consecutivosActuales = 1;
            }
        }
        
        return maxConsecutivos;
    }

    // Panel de historial de mejoras
    getChangelogHistory() {
        // Usa el versionHistory del bot
        const history = [];
        for (const [version, changes] of Object.entries(this.versionHistory)) {
            history.push({ version, changes });
        }
        return history;
    }

    // Panel de actividad reciente (simulado, deberías conectar con backend real si lo tienes)
    getRecentActivity() {
        // Simulación: puedes reemplazar por datos reales si tienes
        return [
            { icon: '📝', text: 'Producto "Café Cubano" editado', date: '2025-08-12 14:32' },
            { icon: '➕', text: 'Producto "Mermelada" importado', date: '2025-08-12 13:10' },
            { icon: '❌', text: 'Producto "Refresco" eliminado', date: '2025-08-11 19:45' },
            { icon: '🖼️', text: 'Imagen de producto actualizada', date: '2025-08-11 18:20' },
        ];
    }
    // Logros basados en datos de estadistica.json
    getDataAchievements() {
        const stats = window.estadistica || [];
        const logrosIniciales = [
            {icon:'🌟', text:'¡Bienvenido a Asere Analytics!'},
            {icon:'📊', text:'¡Comienza a analizar tus datos!'},
            {icon:'💫', text:'¡Descubre insights valiosos!'}
        ];
        
        // Si no hay datos, retornar estructura básica
        if (!Array.isArray(stats) || stats.length === 0) {
            return {
                logros: logrosIniciales,
                analisis: {
                    ventas: { total: 0, maxVentaDiaria: 0, diasConVentas: new Set(), ventasPorDia: {} },
                    pedidos: { total: 0, grandes: 0, clientesUnicos: new Set(), clientesRecurrentes: new Map() },
                    productos: { totalVendidos: 0, diferentes: new Set(), categorias: { alimentos: 0, bebidas: 0 } }
                }
            };
        }

        let logros = logrosIniciales.slice(); // Empezamos con los logros iniciales
        let analisis = {
            ventas: {
                total: 0,
                maxVentaDiaria: 0,
                diasConVentas: new Set(),
                ventasPorDia: {}
            },
            pedidos: {
                total: stats.length,
                grandes: 0,
                clientesUnicos: new Set(),
                clientesRecurrentes: new Map()
            },
            productos: {
                totalVendidos: 0,
                diferentes: new Set(),
                categorias: {
                    alimentos: 0,
                    bebidas: 0
                }
            },
            paises: new Set()
        };

        // Análisis detallado de estadísticas
        stats.forEach(item => {
            const fecha = item.fecha_hora_entrada ? item.fecha_hora_entrada.split('T')[0] : null;
            const hora = item.fecha_hora_entrada ? new Date(item.fecha_hora_entrada).getHours() : null;
            
            // Análisis de horarios
            if (hora !== null) {
                if (hora >= 6 && hora < 12) analisis.horarios.manana++;
                else if (hora >= 12 && hora < 19) analisis.horarios.tarde++;
                else analisis.horarios.noche++;
            }

            if (fecha) {
                analisis.pedidos.pedidosPorDia[fecha] = (analisis.pedidos.pedidosPorDia[fecha] || 0) + 1;
                if (analisis.pedidos.pedidosPorDia[fecha] > analisis.pedidos.maxPorDia) {
                    analisis.pedidos.maxPorDia = analisis.pedidos.pedidosPorDia[fecha];
                }
            }

            // Análisis de clientes
            if (item.cliente) {
                const clienteId = item.cliente;
                analisis.pedidos.clientesUnicos.add(clienteId);
                // Contar cuántas veces aparece cada cliente
                const clientePedidos = stats.filter(s => s.cliente === clienteId).length;
                if (clientePedidos >= 3) {
                    analisis.pedidos.clientesRecurrentes.add(clienteId);
                }
            }

            if (item.compras && Array.isArray(item.compras)) {
                let ventaDiaria = 0;
                let productosPedido = 0;

                item.compras.forEach(c => {
                    // Ventas
                    const precioTotal = c.precio_total || 0;
                    analisis.ventas.total += precioTotal;
                    ventaDiaria += precioTotal;

                    // Productos
                    const cantidad = c.cantidad || 0;
                    analisis.productos.totalVendidos += cantidad;
                    productosPedido += cantidad;

                    if (c.producto) {
                        analisis.productos.porProducto[c.producto] = (analisis.productos.porProducto[c.producto] || 0) + cantidad;
                        analisis.productos.productosUnicos.add(c.producto);
                    }
                });

                analisis.productos.productosPorPedido.push(productosPedido);
                if (productosPedido >= 5) analisis.pedidos.pedidosGrandes++;

                if (fecha) {
                    analisis.ventas.ventasPorDia[fecha] = (analisis.ventas.ventasPorDia[fecha] || 0) + ventaDiaria;
                    if (analisis.ventas.ventasPorDia[fecha] > analisis.ventas.maxVentaDiaria) {
                        analisis.ventas.maxVentaDiaria = analisis.maxVentaDiaria = analisis.ventas.ventasPorDia[fecha];
                    }
                    analisis.ventas.diasConVentas.add(fecha);
                }
            }
        });

        // Calcular promedios y tendencias
        const diasConVenta = Object.keys(analisis.ventas.ventasPorDia);
        if (diasConVenta.length > 0) {
            analisis.ventas.promedioVentaDiaria = analisis.ventas.total / diasConVenta.length;
        }

        // Logros de Análisis Básico
        logros.push({icon:'📊', text:'¡Primer Conjunto de Datos Analizado!'});
        if (analisis.productos.totalVendidos >= 1) logros.push({icon:'�', text:'Primera Venta Completada'});
        if (analisis.pedidos.clientesUnicos.size >= 1) logros.push({icon:'👤', text:'Primer Cliente Atendido'});

        // Logros Nivel Intermedio (Ventas)
        if (analisis.ventas.total >= 100) logros.push({icon:'💵', text:'Primeros $100 en Ventas'});
        if (analisis.ventas.total >= 500) logros.push({icon:'�', text:'¡$500 en Ventas Totales!'});
        if (analisis.ventas.total >= 1000) logros.push({icon:'🏆', text:'¡Meta Alcanzada: $1000 en Ventas!'});
        if (analisis.ventas.total >= 5000) logros.push({icon:'💎', text:'¡Ventas Superiores a $5000!'});
        if (analisis.ventas.maxVentaDiaria >= 500) logros.push({icon:'⭐', text:`¡Récord: $${analisis.ventas.maxVentaDiaria.toFixed(0)} en un día!`});

        // Logros Nivel Avanzado (Pedidos)
        if (analisis.pedidos.total >= 10) logros.push({icon:'�', text:'¡10 Pedidos Completados!'});
        if (analisis.pedidos.total >= 50) logros.push({icon:'�', text:'¡50 Pedidos Exitosos!'});
        if (analisis.pedidos.total >= 100) logros.push({icon:'🚀', text:'¡100 Pedidos Alcanzados!'});
        if (analisis.pedidos.maxPorDia >= 5) logros.push({icon:'⚡', text:`¡${analisis.pedidos.maxPorDia} Pedidos en un Solo Día!`});
        if (analisis.pedidos.pedidosGrandes >= 5) logros.push({icon:'🎁', text:'5 Pedidos Grandes Completados'});

        // Logros de Clientes
        if (analisis.pedidos.clientesUnicos.size >= 10) logros.push({icon:'👥', text:'¡10 Clientes Diferentes!'});
        if (analisis.pedidos.clientesUnicos.size >= 25) logros.push({icon:'🌟', text:'¡25 Clientes Atendidos!'});
        if (analisis.pedidos.clientesRecurrentes.size >= 3) logros.push({icon:'🤝', text:'¡3 Clientes Frecuentes!'});
        if (analisis.pedidos.clientesRecurrentes.size >= 10) logros.push({icon:'💫', text:'¡10 Clientes Leales!'});

        // Logros de Productos
        if (analisis.productos.totalVendidos >= 50) logros.push({icon:'�', text:'50 Productos Vendidos'});
        if (analisis.productos.totalVendidos >= 200) logros.push({icon:'🛍️', text:'200 Productos Vendidos'});
        if (analisis.productos.productosUnicos.size >= 5) logros.push({icon:'�', text:'5 Productos Diferentes Vendidos'});
        if (analisis.productos.productosUnicos.size >= 15) logros.push({icon:'🌈', text:'¡Catálogo Diverso: 15 Productos!'});

        // Logros de Análisis Temporal
        // Retornar objeto con estructura correcta
        return {
            logros: logros,
            analisis: analisis
        };

        // Logros de Análisis de Continuidad
        const diasConsecutivos = this.calcularDiasConsecutivos(Array.from(analisis.ventas.diasConVentas));
        if (diasConsecutivos >= 3) logros.push({icon:'�', text:`¡${diasConsecutivos} Días de Datos Consecutivos!`});
        if (analisis.ventas.diasConVentas.size >= 7) logros.push({icon:'�', text:'¡Análisis Semanal Completo!'});
        if (analisis.ventas.diasConVentas.size >= 30) logros.push({icon:'�', text:'¡Análisis Mensual Alcanzado!'});

        return logros;
    }
    // Logros y consejos
    getRandomAchievement() {
        const achievements = [
            { icon: '📊', text: '¡Nuevo conjunto de datos analizado!' },
            { icon: '�', text: '¡10 registros procesados en un día!' },
            { icon: '�', text: '¡Nuevo récord de volumen de datos!' },
            { icon: '📑', text: '¡Patrón recurrente identificado!' },
            { icon: '�', text: '¡Tendencia positiva detectada!' },
            { icon: '📌', text: '¡Meta de análisis alcanzada!' },
        ];
        // Si hay datos, muestra logros basados en datos
        if (this.dashboard && this.dashboard.orders && this.dashboard.orders.length > 0) {
            const total = this.dashboard.orders.length;
            if (total === 1) return achievements[0];
            if (total > 10) return achievements[1];
            if (this.dashboard.orders.some(o => o.total > 1000)) return achievements[2];
            if (this.getRepeatCustomers().length > 0) return achievements[3];
        }
        // Si no, aleatorio
        return achievements[Math.floor(Math.random() * achievements.length)];
    }

    // Calcula el total de logros posibles
    getTotalPossibleAchievements() {
        return 20; // Número total de logros posibles
    }

    // Helper para categorizar los logros
    renderAchievementCategory(categoria, logros) {
        const categorias = {
            basico: [
                {
                    icon: '📊', 
                    text: 'Análisis de Datos',
                    description: 'Analiza conjuntos de datos para obtener insights',
                    meta: 10,
                    progress: this.currentAnalisis.pedidos.total || 0
                },
                {
                    icon: '📈', 
                    text: 'Registro de Métricas',
                    description: 'Registra y analiza métricas clave',
                    meta: 50,
                    progress: this.currentAnalisis.productos.totalVendidos || 0
                },
                {
                    icon: '👥', 
                    text: 'Análisis Demográfico',
                    description: 'Analiza datos de clientes únicos',
                    meta: 20,
                    progress: this.currentAnalisis.pedidos.clientesUnicos.size || 0
                }
            ],
            financiero: [
                {
                    icon: '💹', 
                    text: 'Análisis de Transacciones',
                    description: 'Analiza el volumen total de transacciones',
                    meta: 1000,
                    progress: this.currentAnalisis.ventas.total || 0
                },
                {
                    icon: '📉', 
                    text: 'Seguimiento Diario',
                    description: 'Monitorea transacciones diarias',
                    meta: 500,
                    progress: this.currentAnalisis.ventas.maxVentaDiaria || 0
                }
            ],
            volumen: [
                {
                    icon: '📋', 
                    text: 'Registros Procesados',
                    description: 'Procesa y analiza registros de datos',
                    meta: 100,
                    progress: this.currentAnalisis.pedidos.total || 0
                },
                {
                    icon: '📚', 
                    text: 'Diversidad de Datos',
                    description: 'Analiza diferentes tipos de productos',
                    meta: 15,
                    progress: this.currentAnalisis.productos.diferentes.size || 0
                }
            ],
            temporal: [
                {
                    icon: '📈', 
                    text: 'Análisis de Patrones',
                    description: 'Identifica patrones temporales',
                    meta: 30,
                    progress: this.currentAnalisis?.ventas?.diasConVentas?.size || 0
                },
                {
                    icon: '📊', 
                    text: 'Análisis por Periodos',
                    description: 'Analiza datos por franjas horarias',
                    meta: 24,
                    progress: Object.keys(this.currentAnalisis.ventas.ventasPorDia).length || 0
                }
            ],
            continuidad: [
                {
                    icon: '📈', 
                    text: 'Análisis Continuo',
                    description: 'Mantén análisis consecutivos',
                    meta: 7,
                    progress: this.currentAnalisis ? this.calcularDiasConsecutivos(Array.from(this.currentAnalisis.ventas.diasConVentas)) : 0
                },
                {
                    icon: '📊', 
                    text: 'Cobertura de Análisis',
                    description: 'Cubre diferentes periodos de tiempo',
                    meta: 30,
                    progress: this.currentAnalisis?.ventas?.diasConVentas?.size || 0
                }
            ]
        };

        // Marcar los logros completados
        categorias[categoria].forEach(logro => {
            if (logros.some(l => l.text === logro.text)) {
                logro.completed = true;
            }
        });

        return categorias[categoria].map(logro => {
            const porcentaje = Math.min(100, Math.round((logro.progress / logro.meta) * 100));
            const completado = porcentaje >= 100;
            
            return `
                <div class='bot-achievement-panel ${completado ? 'completed' : ''}'>
                    <div class='achievement-header'>
                        <span class='achievement-icon'>${logro.icon}</span>
                        <div class='achievement-info'>
                            <div class='achievement-title'>${logro.text}</div>
                            <div class='achievement-description'>${logro.description}</div>
                        </div>
                        ${completado ? '<span class="achievement-completed">✓</span>' : ''}
                    </div>
                    <div class='achievement-progress'>
                        <div class='progress-bar'>
                            <div class='progress-fill' style='width: ${porcentaje}%'></div>
                        </div>
                        <div class='progress-text'>
                            <span class='progress-current'>${logro.progress}</span>
                            <span class='progress-separator'>/</span>
                            <span class='progress-goal'>${logro.meta}</span>
                            <span class='progress-percent'>${porcentaje}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getRandomTip() {
        const tips = [
            '¿Sabías que puedes filtrar los datos por región para identificar patrones geográficos?',
            '¡Revisa los indicadores de menor rendimiento para encontrar áreas de mejora!',
            'Los patrones recurrentes son clave: analiza las tendencias temporales.',
            '¿Ya exploraste el análisis por franjas horarias? Descubre los picos de actividad.',
            '¡Mantén un seguimiento de las métricas principales y sus variaciones!',
            'Revisa el panel de novedades para ver las últimas herramientas de análisis.',
            '¡Revisa la sección de logros para ver tu progreso en el análisis de datos!',
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }
    // NUEVO: Sugerencias para productos menos vendidos
    getLowSalesProductAdvice(products) {
        if (!products || products.length === 0) return '';
        const productNames = products.map(p => `<strong>${p.product}</strong>`).join(', ');
        return `Considera revisar precios, promociones o visibilidad de: ${productNames}. ¡Una campaña puede ayudar a impulsar sus ventas!`;
    }
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
            "1.2.2": [
                "Nuevo análisis de productos menos vendidos",
                "Mensajes personalizados según baja actividad de ventas",
                "Panel de novedades ahora muestra mejoras recientes automáticamente"
            ],
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
        // Forzar nueva versión para mostrar mejoras
        this.currentVersion = "1.2.2";
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
                    <button class="bot-achievements-btn" title="Ver logros"><i class="fas fa-trophy"></i></button>
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
        this.achievementsBtn = this.botContainer.querySelector('.bot-achievements-btn');
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

        // Confeti animado
        const confettiCanvas = document.createElement('canvas');
        confettiCanvas.className = 'bot-confetti-canvas';
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.top = '0';
        confettiCanvas.style.left = '0';
        confettiCanvas.style.width = '100vw';
        confettiCanvas.style.height = '100vh';
        confettiCanvas.style.pointerEvents = 'none';
        confettiCanvas.style.zIndex = '10000';
        whatsNewPanel.appendChild(confettiCanvas);

        // Lógica simple de confeti
        function launchConfetti() {
            const ctx = confettiCanvas.getContext('2d');
            const W = window.innerWidth;
            const H = window.innerHeight;
            confettiCanvas.width = W;
            confettiCanvas.height = H;
            const confettiColors = ['#00ff9d', '#00ccff', '#ffef00', '#ff6b6b', '#ffffff'];
            let confettiPieces = [];
            for (let i = 0; i < 80; i++) {
                confettiPieces.push({
                    x: Math.random() * W,
                    y: Math.random() * -H,
                    r: Math.random() * 6 + 4,
                    d: Math.random() * 80 + 40,
                    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                    tilt: Math.random() * 10 - 10,
                    tiltAngle: 0,
                    tiltAngleIncremental: (Math.random() * 0.07) + 0.05
                });
            }
            let angle = 0;
            function draw() {
                ctx.clearRect(0, 0, W, H);
                angle += 0.01;
                for (let i = 0; i < confettiPieces.length; i++) {
                    let p = confettiPieces[i];
                    p.y += (Math.cos(angle + p.d) + 3 + p.r / 2) / 2;
                    p.x += Math.sin(angle);
                    p.tiltAngle += p.tiltAngleIncremental;
                    p.tilt = Math.sin(p.tiltAngle) * 15;
                    ctx.beginPath();
                    ctx.lineWidth = p.r;
                    ctx.strokeStyle = p.color;
                    ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                    ctx.lineTo(p.x + p.tilt, p.y + p.r * 2);
                    ctx.stroke();
                }
            }
            let confettiInterval = setInterval(draw, 16);
            setTimeout(() => {
                clearInterval(confettiInterval);
                ctx.clearRect(0, 0, W, H);
                confettiCanvas.remove();
            }, 2500);
        }

        setTimeout(launchConfetti, 200);

        const versionChanges = this.versionHistory[this.currentVersion] || [];
        const previousVersion = this.lastSeenVersion || '1.2.1';
        const achievement = this.getRandomAchievement();
        const tip = this.getRandomTip();

        whatsNewPanel.innerHTML += `
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
                    <div class="bot-achievement">
                        <span class="bot-achievement-icon">${achievement.icon}</span>
                        <span class="bot-achievement-text">${achievement.text}</span>
                    </div>
                    <div class="bot-tip">
                        <i class="fas fa-lightbulb"></i> ${tip}
                    </div>
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
        // Panel de historial de mejoras
        const changelog = this.getChangelogHistory();
        if (changelog.length > 0) {
            this.messages.push({
                title: '📜 Historial de Mejoras',
                content: `
                    <div class="bot-changelog-history">
                        ${changelog.map(log => `
                            <div class='bot-changelog-version'>
                                <span class='bot-changelog-version-label'>v${log.version}</span>
                                <ul class='bot-changelog-list'>
                                    ${log.changes.map(change => `<li>${change}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                `
            });
        }

        // Panel de actividad reciente
        const recent = this.getRecentActivity();
        if (recent.length > 0) {
            this.messages.push({
                title: '⏰ Actividad Reciente',
                content: `
                    <div class="bot-recent-activity">
                        ${recent.map(a => `<div class='bot-activity-item'><span class='bot-activity-icon'>${a.icon}</span> <span class='bot-activity-text'>${a.text}</span> <span class='bot-activity-date'>${a.date}</span></div>`).join('')}
                    </div>
                `
            });
        }

        // Logros destacados de estadistica.json
        const dataAchievements = this.getDataAchievements();
        if (dataAchievements.length > 0) {
            this.messages.push({
                title: '🏆 Logros Destacados',
                content: `
                    <div class="bot-data-achievements">
                        ${dataAchievements.map(l => `<div class='bot-data-achievement'><span class='bot-data-achievement-icon'>${l.icon}</span> <span class='bot-data-achievement-text'>${l.text}</span></div>`).join('')}
                    </div>
                `
            });
        }
        this.messages = [];
        // Si no hay datos
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
        const lastOrderTime = lastOrders[0] ? this.formatTimeAgo(lastOrders[0].date) : 'recientemente';
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

        // 3. Resumen de ventas con insights y mensaje personalizado por baja actividad
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
        let lowActivityMsg = '';
        if (todaySales < avgOrder * 0.5) {
            lowActivityMsg = `<div class='bot-alert-low-activity'>⚠️ <strong>Actividad baja:</strong> Las ventas de hoy están muy por debajo del promedio. Considera lanzar una promoción o contactar a tus clientes frecuentes.</div>`;
        }
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
                ${lowActivityMsg}
            `
        });


        // 4. Productos más vendidos con recomendaciones
        const topProductsBest = this.dashboard.getTopProducts(this.dashboard.orders, 3);
        this.messages.push({
            title: '🏆 Productos Estrella',
            content: `
                <div class="bot-message-intro">${this.getRandomPhrase()} Estos productos están dominando:</div>
                ${topProductsBest.map(product => this.createProductCard(product)).join('')}
                <div class="bot-analysis">${this.getProductRecommendations(topProductsBest)}</div>
            `
        });

        // 5. NUEVO: Productos menos vendidos
        const allProductsList = this.dashboard.getTopProducts(this.dashboard.orders, 1000);
        const bottomProducts = allProductsList.slice(-3);
        if (bottomProducts.length > 0) {
            this.messages.push({
                title: '📉 Productos con Menos Ventas',
                content: `
                    <div class="bot-message-intro">${this.getRandomPhrase()} Estos productos podrían necesitar atención:</div>
                    ${bottomProducts.map(product => this.createProductCard(product)).join('')}
                    <div class="bot-analysis">${this.getLowSalesProductAdvice(bottomProducts)}</div>
                `
            });
        }

        // 6. Análisis de afiliados (si hay datos)
        if (this.dashboard.affiliates && this.dashboard.affiliates.length > 0) {
            const topAffiliates = [...this.dashboard.affiliates]
                .sort((a, b) => b.numeroInt - a.numero)
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

        // 7. Análisis de tendencia horaria (nuevo)
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

        // 8. Clientes recurrentes (nuevo)
        const repeatCustomersList = this.getRepeatCustomers();
        if (repeatCustomersList.length > 0) {
            this.messages.push({
                title: '🔄 Clientes Recurrentes',
                content: `
                    <div class="bot-message-intro">${this.getRandomPhrase()} Estos clientes vuelven por más:</div>
                    ${repeatCustomersList.map(customer => this.createCustomerCard(customer)).join('')}
                    <div class="bot-analysis">${this.getRepeatCustomerAnalysis(repeatCustomersList)}</div>
                `
            });
        }

        // Actualizar contador
        if (this.counter) {
            this.counter.textContent = `1/${this.messages.length}`;
        }

// NUEVO: Sugerencias para productos menos vendidos

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

        // Botón de logros
        if (this.achievementsBtn) {
            this.achievementsBtn.addEventListener('click', () => this.showAchievementsPanel());
        }

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