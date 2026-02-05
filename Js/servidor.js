(function(){
    // Configurable base URL (default to provided backend)
    const STORAGE_KEY = 'SERVER_BASE_URL';
    const AUTO_REFRESH_KEY = 'SERVER_AUTO_REFRESH';
    const AUTO_INTERVAL_KEY = 'SERVER_REFRESH_INTERVAL';
    const BANNER_DISMISSED = 'SERVIDOR_BANNER_DISMISSED';
    const DEFAULT_BASE = 'https://servidor-estadisticas.onrender.com';

    function getBase() { return localStorage.getItem(STORAGE_KEY) || DEFAULT_BASE; }

    function apiUrl(path) {
        const base = getBase().replace(/\/$/, '');
        if (path.startsWith('http')) return path;
        return `${base}${path.startsWith('/') ? '' : '/'}${path}`.replace(/([^:])\/\//g, '$1/');
    }

    function showToast(msg, type='info') {
        console.log('[Servidor]', type, msg);
        const p = document.getElementById('server-logs-pre');
        if (p) {
            const now = new Date().toLocaleTimeString();
            p.textContent = `[${now}] ${msg}\n` + p.textContent;
        }
    }

    function setPre(id, data) {
        const el = document.getElementById(id);
        if (!el) return;
        if (typeof data === 'string') { el.textContent = data; return; }
        try { el.textContent = JSON.stringify(data, null, 2); } catch (e) { el.textContent = String(data); }
    }

    async function safeFetch(path, opts={}) {
        const url = apiUrl(path);
        try {
            const res = await fetch(url, opts);
            const text = await res.text();
            try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
            catch { return { ok: res.ok, status: res.status, data: text }; }
        } catch (err) {
            return { ok:false, status:0, error: err.message };
        }
    }

    // Charts
    let chartNewOrders = null;
    let chartComparison = null;
    let serverStart = null;
    let uptimeTimer = null;
    let lastNewOrders = [];

    function formatDateLabel(d) { const dt = new Date(d); return dt.toLocaleDateString(); }

    function formatUptime(startTime){
        if(!startTime) return '-';
        const start = new Date(startTime).getTime();
        if (isNaN(start)) return '-';
        const diff = Date.now() - start;
        const s = Math.floor(diff/1000);
        const days = Math.floor(s/86400); const hours = Math.floor((s%86400)/3600);
        const mins = Math.floor((s%3600)/60); const secs = s%60;
        return (days? days+ 'd ':'') + String(hours).padStart(2,'0')+':'+String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
    }

    async function getServerStatus(){
        setPre('server-status-pre','Cargando...');
        const r = await safeFetch('/api/server-status');
        if (r.ok) {
            setPre('server-status-pre', r.data);
            if (r.data) {
                // Logs
                if (r.data.logs) {
                    const logs = Array.isArray(r.data.logs) ? r.data.logs : (String(r.data.logs).split('\n') || []);
                    setPre('server-logs-pre', logs.slice(0,200).reverse().join('\n'));
                    const reqCount = logs.length || 0;
                    const rcEl = document.getElementById('server-requests-count'); if(rcEl) rcEl.textContent = String(reqCount);
                }
                // Uptime
                serverStart = r.data.startTime || r.data.serverStartTime || r.data.start;
                const uptimeEl = document.getElementById('server-uptime'); if (uptimeEl) uptimeEl.textContent = formatUptime(serverStart);
                // start a ticking uptime counter
                if (uptimeTimer) clearInterval(uptimeTimer);
                uptimeTimer = setInterval(()=>{ try{ if (serverStart){ const el = document.getElementById('server-uptime'); if(el) el.textContent = formatUptime(serverStart); } }catch(e){} }, 1000);
            }
            showToast('Estado obtenido', 'success');
        } else {
            setPre('server-status-pre', r.error || `Error ${r.status}`);
            showToast(`Error al obtener estado: ${r.error||r.status}`, 'error');
        }
        updateLastUpdated();
    }

    async function getComparison(){
        const el = document.getElementById('comparison-list'); if(!el) return;
        el.textContent='Cargando...';
        const r = await safeFetch('/api/get-comparison');
        if (r.ok && r.data && r.data.success){
            const items = r.data.comparisonData || [];
            renderComparisonList(items);
            renderComparisonChart(items);
        } else if (r.ok && Array.isArray(r.data)){
            renderComparisonList(r.data);
            renderComparisonChart(r.data);
        } else {
            el.textContent = r.error || `Error ${r.status}`;
        }
        updateLastUpdated();
    }

    // Users preview (from /obtener-estadisticas)
    async function getUsersPreview(limit=8){
        const el = document.getElementById('server-users-preview'); if(!el) return;
        el.textContent = 'Cargando...';
        const r = await safeFetch('/obtener-estadisticas');
        let items = [];
        if (r.ok && Array.isArray(r.data)) items = r.data;
        else if (r.ok && r.data && Array.isArray(r.data.estadistica)) items = r.data.estadistica;
        else { el.textContent = r.error || `Error ${r.status}`; return; }

        const countEl = document.getElementById('server-users-count'); if(countEl) countEl.textContent = String(items.length || 0);
        const list = items.slice(0, limit).map((it,idx)=>{
            const name = it.nombre||it.nombre_comprador||it.nombre_completo||`Usuario ${idx+1}`;
            const ip = it.ip||it.ip_cliente||'N/A';
            const when = it.fecha_hora_entrada||it.fecha||'';
            return `<div class="list-item"><strong>#${idx+1}</strong> <span class="srv-muted">${when}</span><div>${escapeHtml(name)} · ${escapeHtml(ip)}</div></div>`;
        }).join('');
        el.innerHTML = list || '<div class="muted">Sin usuarios</div>';
        // also render aggregated users by country
        renderUsersByCountry(items);
    }

    function renderUsersByCountry(items){
        const el = document.getElementById('server-users-by-country'); if(!el) return;
        const map = {};
        (items||[]).forEach(it=>{
            const c = (it.pais || it.country || it.pais_origen || 'Desconocido');
            map[c] = (map[c]||0) + 1;
        });
        const list = Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([country,count])=>{
            return `<div class="list-item"><strong>${escapeHtml(country)}</strong> <div class="srv-muted">${count} usuario${count!==1?'s':''}</div></div>`;
        }).join('');
        el.innerHTML = list || '<div class="muted">Sin datos por país</div>';
        // Render a small bar chart of top countries
        try{
            const ctx = document.getElementById('chart-users-country');
            if (!ctx) return;
            const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
            const labels = entries.map(e=>e[0]);
            const data = entries.map(e=>e[1]);
            if (window._chartUsersCountry) window._chartUsersCountry.destroy();
            window._chartUsersCountry = new Chart(ctx.getContext('2d'), {
                type: 'bar', data: { labels, datasets:[{ label:'Usuarios', data, backgroundColor: generateColors(labels.length) }]}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{autoSkip:true}}, y:{beginAtZero:true, precision:0}} }
            });
        }catch(e){ console.error('chart users country error', e); }
    }

    // --- Save new orders into GitHub estadistica.json via GitHub Contents API ---
    async function saveNewOrdersToGitHub(){
        if (!lastNewOrders || !lastNewOrders.length) return alert('No hay pedidos nuevos para guardar.');
        // Read token from token modal input
        const tokenInput = document.getElementById('github-token-input');
        const token = tokenInput ? tokenInput.value.trim() : '';
        if (!token) return alert('Para guardar en GitHub necesitas una token de acceso con permisos de repo. Ábre el modal de token y pega tu llave.');

        const apiUrl = 'https://api.github.com/repos/HCoreBeat/Analytics-Asere/contents/Json/estadistica.json';
        try{
            showSpinner(true);
            // Get current file
            const res = await fetch(apiUrl + '?ref=main', { headers: { 'Accept':'application/vnd.github+json', 'Authorization': 'token '+token } });
            if (!res.ok) throw new Error('No se pudo leer estadistica.json: '+res.status+' '+res.statusText);
            const data = await res.json();
            if (!data.content || !data.sha) throw new Error('Contenido inesperado de GitHub API');
            // decode base64 (handle newlines)
            const contentB64 = data.content.replace(/\n/g,'');
            const decoded = decodeURIComponent(escape(window.atob(contentB64)));
            let json = null;
            try{ json = JSON.parse(decoded); }catch(e){ throw new Error('Error parseando JSON remoto: '+e.message); }

            // Build set of existing keys for dedupe: use ip + fecha_hora_entrada + precio_compra_total
            const existingKeys = new Set();
            const existingItems = Array.isArray(json) ? json : (json && Array.isArray(json.estadistica) ? json.estadistica : []);
            existingItems.forEach(it => {
                const key = `${(it.ip||'')}_${(it.fecha_hora_entrada||it.fecha||'')}_${(it.precio_compra_total||it.precio_total||'')}`;
                existingKeys.add(key);
            });

            // Filter new orders to avoid duplicates
            const toAdd = (lastNewOrders||[]).filter(it => {
                const key = `${(it.ip||'')}_${(it.fecha_hora_entrada||it.fecha||'')}_${(it.precio_compra_total||it.precio_total||'')}`;
                return !existingKeys.has(key);
            });

            if (!toAdd.length) {
                showSpinner(false);
                showModal('Sin cambios', 'No hay pedidos nuevos únicos para agregar (todos los pedidos nuevos ya existen en el repositorio).');
                return;
            }

            // Merge: append to array or estadistica
            if (Array.isArray(json)){
                json.push(...toAdd);
            } else if (json && Array.isArray(json.estadistica)){
                json.estadistica.push(...toAdd);
            } else {
                if (!json) json = [];
                if (Array.isArray(json)) json.push(...toAdd);
                else json.estadistica = (json.estadistica||[]).concat(toAdd);
            }

            const newContentStr = JSON.stringify(json, null, 2);
            // base64 encode unicode
            function base64EncodeUnicode(str){ return window.btoa(unescape(encodeURIComponent(str))); }
            const newB64 = base64EncodeUnicode(newContentStr);

            // Prepare commit
            const body = { message: 'Add new orders via UI', content: newB64, sha: data.sha, branch: 'main' };
            const putRes = await fetch(apiUrl, { method:'PUT', headers:{ 'Accept':'application/vnd.github+json', 'Authorization':'token '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
            if (!putRes.ok){ const txt = await putRes.text(); throw new Error('PUT failed: '+putRes.status+' '+putRes.statusText+' - '+txt); }
            const putJson = await putRes.json();
            showToast('Pedidos guardados en GitHub: ' + (putJson && putJson.commit && putJson.commit.sha ? putJson.commit.sha : 'OK'),'success');
            // clear lastNewOrders (only those added)
            lastNewOrders = [];
            showSpinner(false);
            showModal('Guardado OK', `Se agregaron ${toAdd.length} pedidos. Commit: ${putJson && putJson.commit && putJson.commit.sha ? putJson.commit.sha : 'OK'}`);
            // Refresh some UI
            getComparison(); getNewOrders();
        }catch(err){
            showSpinner(false);
            console.error(err);
            showModal('Error', 'Error guardando en GitHub: ' + (err && err.message ? err.message : String(err)));
        }
    }

    // Spinner and modal helpers
    function showSpinner(on){
        const s = document.getElementById('srv-spinner'); if(!s) return;
        if(on){ s.classList.remove('hidden'); s.setAttribute('aria-hidden','false'); }
        else { s.classList.add('hidden'); s.setAttribute('aria-hidden','true'); }
    }

    function showModal(title, body, desc){
        const m = document.getElementById('srv-save-modal');
        const content = m?.querySelector('.srv-modal-content');
        const h = document.getElementById('srv-save-modal-title');
        const pre = document.getElementById('srv-save-modal-pre');
        const overlay = document.getElementById('srv-modal-overlay');
        const copyBtn = document.getElementById('srv-save-modal-copy');
        const closeBtn = document.getElementById('srv-save-modal-close-btn');
        const closeAction = document.getElementById('srv-save-modal-close');
        const descEl = document.getElementById('srv-save-modal-desc');
        if(!m||!h||!pre) return;

        const bodyText = (typeof body === 'string') ? body : JSON.stringify(body, null, 2);
        h.textContent = title || 'Resultado';
        descEl && (descEl.textContent = desc || 'Vista previa del mensaje que se enviará al cliente.');
        pre.textContent = bodyText;
        pre.dataset.text = bodyText;

        // track who had focus to restore later
        const previouslyFocused = document.activeElement;

        // Open modal and animate
        m.classList.remove('hidden');
        // small timeout to allow CSS transitions
        setTimeout(()=>{ content && content.classList.add('open'); }, 25);

        // Focus management and trap
        const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(m.querySelectorAll(focusableSelector)).filter(el => !el.hasAttribute('disabled'));
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length-1];
        firstFocusable && firstFocusable.focus();

        function trapTab(e){
            if (e.key !== 'Tab') return;
            if (e.shiftKey) { // shift + tab
                if (document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable.focus(); }
            } else {
                if (document.activeElement === lastFocusable) { e.preventDefault(); firstFocusable.focus(); }
            }
        }

        function onKeyDown(e){
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
            trapTab(e);
        }

        document.addEventListener('keydown', onKeyDown);

        // Close handler that cleans up listeners and restores focus
        function closeModal(){
            document.removeEventListener('keydown', onKeyDown);
            m.classList.add('hidden');
            content && content.classList.remove('open');
            try{ previouslyFocused && previouslyFocused.focus(); }catch(e){}
        }

        // Bind overlay and close buttons (use once)
        overlay && overlay.addEventListener('click', closeModal, { once: true });
        closeBtn && closeBtn.addEventListener('click', closeModal, { once: true });
        closeAction && closeAction.addEventListener('click', closeModal, { once: true });

        // Copy action with feedback (temporary state)
        if(copyBtn){
            copyBtn.onclick = async (e)=>{
                e.preventDefault();
                const text = pre.dataset.text || pre.textContent || '';
                const original = copyBtn.innerHTML;
                try{
                    await navigator.clipboard.writeText(text);
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado';
                    copyBtn.disabled = true;
                    showToast('Texto copiado al portapapeles','success');
                    setTimeout(()=>{ copyBtn.innerHTML = original; copyBtn.disabled = false; }, 1600);
                }catch(err){
                    // fallback
                    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
                    try{ document.execCommand('copy'); showToast('Texto copiado al portapapeles (fallback)','success'); }catch(e){ showToast('No se pudo copiar automáticamente. Seleccione y copie manualmente.','error'); }
                    ta.remove();
                }
            };
        }
    }

    function renderComparisonList(items){
        const el = document.getElementById('comparison-list'); if(!el) return;
        if (!items || items.length===0){ el.textContent='No hay comparison guardado.'; return; }
        el.innerHTML = items.map((it,idx)=>{
            const date = it.fecha_hora_entrada||it.date||'N/A';
            const total = it.precio_compra_total!=null?it.precio_compra_total:(it.total||'N/A');
            return `<div class="list-item"><strong>#${idx+1}</strong> <span class="muted">${date}</span><div>IP:${it.ip||'N/A'} · Total:${total}</div></div>`;
        }).join('');
    }

    async function getNewOrders(){
        const el = document.getElementById('new-orders-list'); if(!el) return;
        el.textContent='Cargando...';
        const r = await safeFetch('/api/new-orders');
        let items = [];
        if (r.ok && r.data && r.data.success) items = r.data.newOrders||[];
        else if (r.ok && Array.isArray(r.data)) items = r.data;
        else { el.textContent = r.error || `Error ${r.status}`; return; }

    if (!items.length) { el.textContent='No hay nuevos pedidos.'; renderNewOrdersChart([]); lastNewOrders = []; updateLastUpdated(); return; }

        el.innerHTML = items.map((it,idx)=>{
            const buyer = it.nombre_comprador||'Comprador';
            const date = it.fecha_hora_entrada||'';
            const total = it.precio_compra_total||it.total||0;
            const details = encodeURIComponent(JSON.stringify(it));
            return `<div class="srv-order-item" data-idx="${idx}">
                <div class="srv-order-row"><strong>#${idx+1}</strong> <span class="srv-muted">${date}</span> <b>${buyer}</b> · ${total}</div>
                <div class="srv-order-actions">
                    <button class="btn btn-sm srv-preview-btn" type="button">Vista</button>
                    <button class="btn btn-sm srv-copy-btn" type="button">Copiar</button>
                </div>
                <div class="srv-order-details srv-hidden">${escapeHtml(JSON.stringify(it, null, 2))}</div>
            </div>`;
        }).join('');

        // Wire toggles
        document.querySelectorAll('.srv-order-item .srv-order-row').forEach(row=>{
            row.addEventListener('click', (e)=>{
                const parent = row.parentElement;
                const details = parent.querySelector('.srv-order-details');
                if (details) details.classList.toggle('srv-hidden');
            });
        });

        // Generar texto compacto para enviar al cliente
        function generateCustomerMessage(it, idx){
            if (!it) return '';
            const buyer = it.nombre_comprador || 'Cliente';
            const date = it.fecha_hora_entrada ? new Date(it.fecha_hora_entrada).toLocaleString() : '';
            const total = (it.precio_compra_total || it.total || 0);
            const address = it.direccion_envio || 'Dirección pendiente';
            const phone = it.telefono_comprador || '';
            const productos = (it.compras || []).map(p => `${p.cantidad||1} x ${p.producto}`).join(', ');
            return [
                `Hola ${buyer},`,
                ``,
                `Hemos recibido tu pedido (${idx+1}) el ${date}.`,
                `Productos: ${productos}.`,
                `Total: $${parseFloat(total).toFixed(2)}.`,
                `Dirección: ${address}.`,
                `Teléfono: ${phone}.`,
                ``,
                `Gracias por comprar con nosotros. Pronto te confirmaremos la entrega.`
            ].join('\n');
        }

        // Botón de vista (muestra el mensaje en modal)
        document.querySelectorAll('.srv-order-item .srv-preview-btn').forEach(btn=>{
            btn.addEventListener('click', (e)=>{
                e.stopPropagation();
                const parent = btn.closest('.srv-order-item');
                const idx = Number(parent?.dataset?.idx);
                const it = items[idx];
                const msg = generateCustomerMessage(it, idx);
                showModal('Vista de notificación', msg);
            });
        });

        // Botón de copiar al portapapeles
        document.querySelectorAll('.srv-order-item .srv-copy-btn').forEach(btn=>{
            btn.addEventListener('click', async (e)=>{
                e.stopPropagation();
                const parent = btn.closest('.srv-order-item');
                const idx = Number(parent?.dataset?.idx);
                const it = items[idx];
                const msg = generateCustomerMessage(it, idx);
                try{
                    await navigator.clipboard.writeText(msg);
                    showToast('Mensaje copiado al portapapeles','success');
                }catch(err){
                    // Fallback tradicional
                    const ta = document.createElement('textarea'); ta.value = msg; document.body.appendChild(ta); ta.select();
                    try{ document.execCommand('copy'); showToast('Mensaje copiado al portapapeles','success'); }catch(e){ showToast('No se pudo copiar automáticamente. Seleccione y copie manualmente.','error'); }
                    ta.remove();
                }
            });
        });

        renderNewOrdersChart(items);
        lastNewOrders = items;
        const nEl = document.getElementById('new-orders-count'); if(nEl) nEl.textContent = String(items.length || 0);
        updateLastUpdated();
    }

    function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    async function updateComparison(){
        const btn = document.getElementById('btn-update-comparison'); if(btn) btn.disabled=true;
        const r = await safeFetch('/api/update-comparison', { method:'POST' });
        if (r.ok && r.data && r.data.success){ showToast(`Update OK. Nuevos:${(r.data.newOrders||[]).length}`,'success'); }
        else showToast(`Update error: ${r.error||JSON.stringify(r.data)}`,'error');
        if (btn) btn.disabled=false; await getComparison(); await getNewOrders();
    }

    async function clearStatistics(){
        if (!confirm('¿Deseas limpiar las estadísticas en el backend?')) return;
        const btn = document.getElementById('btn-clear-statistics'); if(btn) btn.disabled=true;
        const r = await safeFetch('/api/clear-statistics', { method:'POST' });
        if (r.ok && r.data && r.data.success) showToast('Estadísticas limpiadas','success');
        else showToast(`Error limpiar: ${r.error||JSON.stringify(r.data)}`,'error');
        if(btn) btn.disabled=false; await getServerStatus(); await getComparison(); await getNewOrders();
    }

    function renderNewOrdersChart(items){
        const ctx = document.getElementById('chart-new-orders');
        if(!ctx) return;
        // Count per day
        const counts = {};
        const countries = {};
        items.forEach(it=>{
            const d = it.fecha_hora_entrada ? new Date(it.fecha_hora_entrada).toISOString().slice(0,10) : 'unknown';
            counts[d] = (counts[d]||0)+1;
            const c = it.pais||it.country||'Desconocido';
            countries[c] = (countries[c]||0)+1;
        });
        const labels = Object.keys(counts).sort();
        const data = labels.map(l=>counts[l]);
        if (chartNewOrders) chartNewOrders.destroy();
        chartNewOrders = new Chart(ctx.getContext('2d'), {
            type: 'bar', data: { labels, datasets:[{ label:'Nuevos Pedidos', data, backgroundColor:'#4f46e5' }]}, options:{responsive:true, maintainAspectRatio:false}
        });
        // Also render countries in comparison chart area
        renderCountriesChart(Object.entries(countries).map(([k,v])=>({k,v})));
    }

    function renderComparisonChart(items){
        const ctx = document.getElementById('chart-comparison'); if(!ctx) return;
        const byCountry = {};
        items.forEach(it=>{ const c = it.pais||it.country||'Desconocido'; byCountry[c]=(byCountry[c]||0)+1; });
        const labels = Object.keys(byCountry); const data = labels.map(l=>byCountry[l]);
        if (chartComparison) chartComparison.destroy();
        chartComparison = new Chart(ctx.getContext('2d'), { type:'pie', data:{ labels, datasets:[{ data, backgroundColor: generateColors(labels.length) }]}, options:{responsive:true, maintainAspectRatio:false} });
    }

    function renderCountriesChart(list){
        // reuse chartComparison if present by setting its data
        if (!chartComparison) return;
        const labels = list.map(i=>i.k); const data = list.map(i=>i.v);
        chartComparison.data.labels = labels; chartComparison.data.datasets[0].data = data; chartComparison.update();
    }

    function generateColors(n){ const palette=['#4f46e5','#06b6d4','#f59e0b','#ef4444','#10b981','#8b5cf6','#f97316','#06b6d4','#3b82f6']; return Array.from({length:n},(v,i)=>palette[i%palette.length]); }

    // Wiring buttons + UI
    function wireButtons(){
        document.getElementById('btn-get-server-status')?.addEventListener('click', getServerStatus);
        document.getElementById('btn-get-comparison')?.addEventListener('click', getComparison);
        document.getElementById('btn-get-new-orders')?.addEventListener('click', getNewOrders);
        document.getElementById('btn-update-comparison')?.addEventListener('click', updateComparison);
        document.getElementById('btn-clear-statistics')?.addEventListener('click', clearStatistics);

        document.getElementById('btn-save-base-url')?.addEventListener('click', ()=>{
            // Changing the backend URL from the UI is not permitted. Keep as no-op.
            showToast('La URL del backend está fijada y no puede cambiarse desde aquí.','warning');
        });

        document.getElementById('btn-save-new-orders')?.addEventListener('click', async ()=>{
            const ok = confirm('¿Deseas guardar los pedidos nuevos en el archivo remoto de GitHub? Asegúrate de tener la token en el modal de token con permisos de repo.');
            if (!ok) return;
            const btn = document.getElementById('btn-save-new-orders'); if(btn) btn.disabled=true;
            try { await saveNewOrdersToGitHub(); } finally { if(btn) btn.disabled=false; }
        });

        document.getElementById('server-auto-refresh')?.addEventListener('change',(e)=>{
            localStorage.setItem(AUTO_REFRESH_KEY, e.target.checked? '1':'0');
            setupAutoRefresh();
        });
        document.getElementById('server-refresh-interval')?.addEventListener('change',(e)=>{ localStorage.setItem(AUTO_INTERVAL_KEY, e.target.value); setupAutoRefresh(); });
    }

    let autoTimer = null;
    function setupAutoRefresh(){
        const enabled = localStorage.getItem(AUTO_REFRESH_KEY) === '1';
        const intervalSec = parseInt(localStorage.getItem(AUTO_INTERVAL_KEY) || '30',10);
        document.getElementById('server-auto-refresh').checked = enabled;
        document.getElementById('server-refresh-interval').value = String(intervalSec);
        if (autoTimer) { clearInterval(autoTimer); autoTimer=null; }
        if (enabled) {
            autoTimer = setInterval(()=>{ getServerStatus(); getComparison(); getNewOrders(); getUsersPreview(); }, Math.max(1000, intervalSec*1000));
        }
    }

    function updateLastUpdated(){
        const el = document.getElementById('server-last-updated'); if(!el) return;
        el.textContent = 'Última: ' + new Date().toLocaleString();
    }

    // Observe activation of view
    function observeViewActivation(){
        const target=document.getElementById('servidor-view'); if(!target) return;
        const obs=new MutationObserver(muts=>{ muts.forEach(m=>{ if(m.attributeName==='class'){ const visible = !target.classList.contains('hidden'); if(visible){ getServerStatus(); getComparison(); getNewOrders(); getUsersPreview(); } } }); });
        obs.observe(target,{attributes:true});
    }

    document.addEventListener('DOMContentLoaded', ()=>{
        // initialize inputs
        document.getElementById('server-base-url').value = getBase();
        wireButtons(); setupAutoRefresh(); observeViewActivation();
        // Banner handling (dismissible)
        try{
            const banner = document.getElementById('srv-warning-banner');
            const closeBtn = document.getElementById('srv-warning-close');
            if (banner && closeBtn){
                const dismissed = localStorage.getItem(BANNER_DISMISSED) === '1';
                if (dismissed) banner.style.display = 'none';
                closeBtn.addEventListener('click', ()=>{ banner.style.display='none'; localStorage.setItem(BANNER_DISMISSED,'1'); });
            }
        }catch(e){/* ignore */}

        // init charts placeholders
        try{ const ctx1 = document.getElementById('chart-new-orders'); if(ctx1) ctx1.getContext('2d'); const ctx2 = document.getElementById('chart-comparison'); if(ctx2) ctx2.getContext('2d'); }catch(e){}
        // If visible now
        const t = document.getElementById('servidor-view'); if(t && !t.classList.contains('hidden')){ getServerStatus(); getComparison(); getNewOrders(); getUsersPreview(); }
    });
})();
