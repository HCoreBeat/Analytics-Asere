(function(){
    // Use same default backend URL as the rest of the app
    const DEFAULT_BASE = 'https://servidor-estadisticas.onrender.com';
    function getBase(){ return localStorage.getItem('SERVER_BASE_URL') || DEFAULT_BASE; }
    function apiUrl(path){
        const base = getBase().replace(/\/$/, '');
        if (path.startsWith('http')) return path;
        return `${base}${path.startsWith('/') ? '' : '/'}${path}`.replace(/([^:])\/\//g, '$1/');
    }

    function showMessage(msg, type='info'){
        const el = document.getElementById('exchange-rates-message');
        if(!el) return; el.textContent = msg; el.className = (type==='error') ? 'muted error' : 'muted';
    }

    function formatCell(v){ return v==null ? '—' : String(v); }

    async function loadRates(){
        const container = document.getElementById('exchange-rates-container');
        if(!container) return;
        container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Cargando tasas...</div>';
        showMessage('Cargando tasas...');
        try{
            const res = await fetch(apiUrl('/api/rates'));
            const text = await res.text();
            let json = null;
            try{ json = JSON.parse(text); }catch(e){ json = text; }

            if (!res.ok) throw new Error((json && json.message) ? json.message : `Error ${res.status}`);

            // Backend returns { status: 'success', data: [...] }
            let rates = [];
            if (json && Array.isArray(json)) rates = json;
            else if (json && json.status === 'success' && Array.isArray(json.data)) rates = json.data;
            else if (json && Array.isArray(json.data)) rates = json.data;

            renderRates(rates || []);
            showMessage('Tasas cargadas.', 'info');
            return rates;
        }catch(err){
            container.innerHTML = '<div class="muted">Error cargando tasas.</div>';
            console.error('loadRates error', err);
            showMessage('Error al cargar tasas: ' + err.message, 'error');
            return [];
        }
    }

    function renderRates(rates){
        const container = document.getElementById('exchange-rates-container');
        if(!container) return;
        if(!rates || !rates.length){ container.innerHTML = '<div class="muted">No hay tasas disponibles.</div>'; return; }

        // Create responsive wrapper for the table
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive-wrapper';

        const table = document.createElement('table');
        table.className = 'rates-table rates-table-enhanced';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="text-align:left;">Descripción</th>
                    <th style="text-align:left; min-width:80px;">Origen</th>
                    <th style="text-align:left;">Rango</th>
                    <th style="text-align:left; min-width:100px;">Tasa</th>
                    <th style="text-align:left; min-width:90px;">Acción</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        rates.forEach((r, idx)=>{
            const tr = document.createElement('tr');
            tr.style.borderTop = '1px solid rgba(255,255,255,0.05)';
            
            const id = r.id ?? r.ID ?? (r._id||(`row-${idx}`));
            const origen = r.origen || r.origin || r.source || '-';
            const moneda = r.moneda || r.currency || '';
            const descripcion = r.descripcion || r.description || r.desc || '-';
            const rangoMin = r.rango_min ?? r.min ?? 0;
            const rangoMax = r.rango_max ?? r.max ?? 999999999999;
            const tasaVal = (r.tasa ?? r.value ?? r.rate ?? r.tasa_cambio ?? '');

            // Format range with proper display
            let rangoDisplay = '—';
            if (rangoMin === 0 && rangoMax >= 999999999999) {
                rangoDisplay = 'Sin límite';
            } else if (rangoMin === 0) {
                rangoDisplay = `0 - ${formatNumber(rangoMax)}`;
            } else if (rangoMax >= 999999999999) {
                rangoDisplay = `${formatNumber(rangoMin)}+`;
            } else {
                rangoDisplay = `${formatNumber(rangoMin)} - ${formatNumber(rangoMax)}`;
            }

            // Format rate with currency
            const tasaDisplay = tasaVal ? `${formatNumber(tasaVal)} ${moneda}` : tasaVal;

            tr.innerHTML = `
                <td><span class="rate-description">${escapeHtml(String(descripcion))}</span></td>
                <td><span class="rate-origen">${escapeHtml(String(origen))}</span></td>
                <td><span class="rate-rango">${escapeHtml(String(rangoDisplay))}</span></td>
                <td>
                    <div class="rate-input-wrapper">
                        <input data-id="${escapeHtml(String(id))}" class="rate-input input-dark" value="${escapeHtml(String(tasaVal))}" type="number" step="any" />
                        <span class="rate-moneda">${escapeHtml(String(moneda))}</span>
                    </div>
                </td>
                <td>
                    <button data-id="${escapeHtml(String(id))}" class="btn btn-primary btn-save-rate">Guardar</button>
                    <span class="rate-status"></span>
                </td>
            `;

            // Store original object for safe partial updates (encoded to avoid DOM issues)
            try {
                tr.dataset.item = encodeURIComponent(JSON.stringify(r));
            } catch (e) { /* noop */ }

            tbody.appendChild(tr);
        });

        wrapper.appendChild(table);
        container.innerHTML = '';
        container.appendChild(wrapper);

        // attach handlers
        container.querySelectorAll('.btn-save-rate').forEach(btn=>{
            btn.addEventListener('click', (e)=>{
                const id = btn.getAttribute('data-id');
                const input = container.querySelector(`input[data-id=\"${cssEscape(id)}\"]`);
                if(!input) return;
                const val = input.value.trim();
                updateRate(id, val, btn);
            });
        });

        // Enter key on input saves
        container.querySelectorAll('.rate-input').forEach(inp=>{
            inp.addEventListener('keydown', (e)=>{
                if (e.key === 'Enter'){
                    e.preventDefault();
                    const id = inp.getAttribute('data-id');
                    const btn = container.querySelector(`.btn-save-rate[data-id=\"${cssEscape(id)}\"]`);
                    if(btn) btn.click();
                }
            });
        });
    }

    async function updateRate(id, newValue, btnEl=null){
        const container = document.getElementById('exchange-rates-container');
        if(!container) return;
        const statusEl = (btnEl && btnEl.parentElement) ? btnEl.parentElement.querySelector('.rate-status') : null;
        const inputEl = container.querySelector(`input[data-id="${cssEscape(id)}"]`);

        // Validation: must be a number
        if (newValue === '' || isNaN(Number(newValue))){
            if (statusEl) { statusEl.textContent = 'Valor inválido'; statusEl.style.color = 'var(--danger-color, #ef4444)'; }
            showMessage('La tasa debe ser un número válido.', 'error');
            return;
        }

        try{
            if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Guardando...'; }
            if (statusEl) { statusEl.textContent = 'Guardando...'; statusEl.style.color = 'var(--muted-color)'; }

            // Build payload by merging the original object and updating only the rate key
            let original = {};
            try {
                const tr = (btnEl && btnEl.closest && btnEl.closest('tr')) ? btnEl.closest('tr') : null;
                if (tr && tr.dataset && tr.dataset.item) {
                    original = JSON.parse(decodeURIComponent(tr.dataset.item));
                }
            } catch (e) { console.warn('Could not parse original item for id', id, e); }

            // Determine the key used by the backend for the rate field and update only that
            const rateKeys = ['tasa', 'value', 'rate', 'tasa_cambio'];
            const existingKey = rateKeys.find(k => Object.prototype.hasOwnProperty.call(original, k));
            const rateKey = existingKey || 'tasa';

            const payload = { ...original, [rateKey]: Number(newValue) };

            const res = await fetch(apiUrl(`/api/rates/${encodeURIComponent(id)}`), {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
            });

            const text = await res.text(); let json = null; try{ json = JSON.parse(text); }catch(e){ json = text; }
            if (!res.ok) throw new Error((json && json.message) ? json.message : `Error ${res.status}`);

            // consider success when backend returns status: 'success'
            if (json && (json.status === 'success' || json.success)){
                // Actualizar solo el input localmente sin recargar toda la tabla
                if (inputEl) { inputEl.value = newValue; }
                if (statusEl) { statusEl.textContent = 'Guardado'; statusEl.style.color = 'var(--success-color, #10b981)'; }
                showMessage('Tasa guardada correctamente.', 'info');
                return json;
            }

            // fallback
            if (inputEl) { inputEl.value = newValue; }
            if (statusEl) { statusEl.textContent = 'OK'; statusEl.style.color = 'var(--success-color, #10b981)'; }
            showMessage('Tasa guardada.', 'info');
            return json;
        }catch(err){
            console.error('updateRate error', err);
            if (statusEl) { statusEl.textContent = 'Error'; statusEl.style.color = 'var(--danger-color, #ef4444)'; }
            showMessage('Error guardando tasa: ' + err.message, 'error');
            return null;
        }finally{
            if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Guardar'; }
        }
    }

    // Utility: simple HTML escape
    function escapeHtml(s){ return String(s)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#039;'); }

    // Format numbers with proper separators
    function formatNumber(num) {
        if (num == null || num === '') return '';
        const n = parseFloat(num);
        if (isNaN(n)) return String(num);
        return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    // CSS-escaping for attribute selector (very small helper)
    function cssEscape(s){ return String(s).replace(/(["'\\])/g,'\\$1'); }

    // wire UI actions and observe view
    document.addEventListener('DOMContentLoaded', ()=>{
        // Wire the refresh button (present in the new Finanzas view)
        document.getElementById('refresh-rates')?.addEventListener('click', ()=>{ loadRates(); });

        // Observe `finanzas-view` visibility to auto-load when visible; fallback to `servidor-view` for compatibility
        const target = document.getElementById('finanzas-view') || document.getElementById('servidor-view');
        if (target){
            const obs = new MutationObserver((muts)=>{ muts.forEach(m=>{ if (m.attributeName === 'class'){ const visible = !target.classList.contains('hidden'); if (visible){ loadRates(); } } }); });
            obs.observe(target, { attributes: true });
            // If already visible, load
            if (!target.classList.contains('hidden')) loadRates();
        } else {
            // fallback: load once
            loadRates();
        }
    });

    // Public API for other modules and tests
    window.ExchangeRatesUI = {
        loadRates,
        updateRate
    };
})();