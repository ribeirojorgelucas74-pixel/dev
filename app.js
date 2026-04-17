/**
 * NomesApp - Lógica Principal
 * Gerencia Bases, Registros, UI e Persistência
 */

// --- 1. ESTADO DA APLICAÇÃO ---
let state = {
    bases: JSON.parse(localStorage.getItem('na_bases')) || [],
    records: JSON.parse(localStorage.getItem('na_records')) || [],
    settings: JSON.parse(localStorage.getItem('na_settings')) || { darkMode: true },
    currentSort: 'recent',
    statusFilter: 'todos',
    searchQuery: ''
};

// --- 2. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Aplicar tema
    toggleDark(state.settings.darkMode);
    document.getElementById('toggle-dark').checked = state.settings.darkMode;

    // Simular carregamento (Splash Screen)
    setTimeout(() => {
        document.getElementById('splash').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        renderAll();
    }, 1500);
}

// Salva dados no LocalStorage
function saveData() {
    localStorage.setItem('na_bases', JSON.stringify(state.bases));
    localStorage.setItem('na_records', JSON.stringify(state.records));
    localStorage.setItem('na_settings', JSON.stringify(state.settings));
}

// --- 3. NAVEGAÇÃO ---
function showPage(pageId) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Mostrar a página selecionada
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');

    // Atualizar botões da Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // Controle do botão voltar
    const btnBack = document.getElementById('btn-back');
    if (pageId === 'home' || pageId === 'bases' || pageId === 'reports' || pageId === 'settings') {
        btnBack.classList.add('hidden');
    } else {
        btnBack.classList.remove('hidden');
    }

    renderPageData(pageId);
}

function goBack() {
    showPage('home');
}

// --- 4. GESTÃO DE BASES ---
function createBase() {
    const name = document.getElementById('nb-name').value;
    const category = document.getElementById('nb-category').value;
    
    if (!name) return showToast("Dê um nome à base!");

    // Capturar campos selecionados
    const selectedFields = [];
    document.querySelectorAll('#fields-picker input:checked').forEach(el => {
        selectedFields.push(el.value);
    });

    const newBase = {
        id: Date.now().toString(),
        name,
        category,
        fields: selectedFields,
        createdAt: new Date()
    };

    state.bases.push(newBase);
    saveData();
    closeModal();
    showPage('bases');
    showToast("Base criada com sucesso!");
}

function renderBases() {
    const container = document.getElementById('bases-list');
    container.innerHTML = '';

    state.bases.forEach(base => {
        const count = state.records.filter(r => r.baseId === base.id).length;
        const card = document.createElement('div');
        card.className = 'base-card';
        card.innerHTML = `
            <div class="base-info">
                <h4>${base.name}</h4>
                <span>${base.category} • ${count} registros</span>
            </div>
            <button class="btn-icon-sm" onclick="deleteBase('${base.id}')">✕</button>
        `;
        card.onclick = (e) => {
            if(e.target.tagName !== 'BUTTON') openBaseDetail(base.id);
        };
        container.appendChild(card);
    });
}

// --- 5. GESTÃO DE REGISTROS (CRUD) ---
function updateFieldsForBase() {
    const baseId = document.getElementById('new-base').value;
    const container = document.getElementById('dynamic-fields');
    const actions = document.getElementById('form-actions');
    
    container.innerHTML = '';
    if (!baseId) {
        actions.classList.add('hidden');
        return;
    }

    const base = state.bases.find(b => b.id === baseId);
    base.fields.forEach(field => {
        if (field === 'status') return; // Status é fixo
        
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
            <label>${field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input type="${field === 'data_nasc' || field === 'data_entrada' ? 'date' : 'text'}" 
                   id="fld-${field}" placeholder="Digite o ${field}...">
        `;
        container.appendChild(group);
    });
    
    actions.classList.remove('hidden');
}

function saveRecord() {
    const baseId = document.getElementById('new-base').value;
    const base = state.bases.find(b => b.id === baseId);
    
    let newRecord = {
        id: Date.now().toString(),
        baseId: baseId,
        category: base.category,
        status: 'Pendente', // Valor inicial padrão
        timestamp: new Date().toISOString()
    };

    base.fields.forEach(field => {
        const input = document.getElementById(`fld-${field}`);
        if (input) newRecord[field] = input.value;
    });

    state.records.push(newRecord);
    saveData();
    showPage('home');
    showToast("Registro salvo!");
}

// --- 6. RENDERIZAÇÃO E FILTROS ---
function renderRecords() {
    const list = document.getElementById('records-list');
    const empty = document.getElementById('empty-state');
    
    // Filtragem
    let filtered = state.records.filter(r => {
        const matchesSearch = r.nome?.toLowerCase().includes(state.searchQuery.toLowerCase());
        const matchesStatus = state.statusFilter === 'todos' || r.status === state.statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Ordenação
    if (state.currentSort === 'nome') filtered.sort((a,b) => a.nome.localeCompare(b.nome));
    if (state.currentSort === 'recent') filtered.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    list.innerHTML = '';
    document.getElementById('records-count').innerText = filtered.length;

    if (filtered.length === 0) {
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        filtered.forEach(rec => {
            const item = document.createElement('div');
            item.className = 'record-item';
            item.innerHTML = `
                <div class="rec-avatar">${rec.nome ? rec.nome[0] : '?'}</div>
                <div class="rec-info">
                    <div class="rec-name">${rec.nome}</div>
                    <div class="rec-meta">${rec.category} • ID: ${rec.id.slice(-4)}</div>
                </div>
                <span class="badge badge-${rec.status.toLowerCase()}">${rec.status}</span>
            `;
            list.appendChild(item);
        });
    }
    
    updateStats();
}

function updateStats() {
    document.getElementById('stat-total').innerText = state.records.length;
    document.getElementById('stat-bases').innerText = state.bases.length;
}

// --- 7. UTILITÁRIOS E UI ---
function toggleDark(isDark) {
    document.body.classList.toggle('light-mode', !isDark);
    state.settings.darkMode = isDark;
    saveData();
}

function showToast(msg) {
    const toast = document.getElementById('modal-toast');
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Auxiliares para fechar modais e atualizar listas
function closeModal() {
    document.querySelectorAll('.modal, .modal-overlay').forEach(m => m.classList.add('hidden'));
}

function showNewBaseModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-newbase').classList.remove('hidden');
}

// Mapeamento de carregamento de dados por página
function renderPageData(pageId) {
    if (pageId === 'home') renderRecords();
    if (pageId === 'bases') renderBases();
    if (pageId === 'new') {
        const select = document.getElementById('new-base');
        select.innerHTML = '<option value="">Selecione uma base...</option>';
        state.bases.forEach(b => {
            select.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
    }
}
/**
 * SISTEMA DE IMPORTAÇÃO CSV
 */

// 1. Abre o modal e limpa seleções anteriores
function showImportModal(type) {
    if (type !== 'excel') {
        showToast("No momento, apenas CSV é suportado na versão básica.");
        return;
    }
    
    const baseSelect = document.getElementById('import-base-select');
    baseSelect.innerHTML = '<option value="">Selecione a base de destino...</option>';
    
    state.bases.forEach(base => {
        baseSelect.innerHTML += `<option value="${base.id}">${base.name}</option>`;
    });

    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('modal-import').classList.remove('hidden');
}

// 2. Lê o arquivo selecionado
function handleFileImport(input) {
    const file = input.files[0];
    const btn = document.getElementById('btn-confirm-import');
    
    if (file) {
        btn.disabled = false;
        showToast(`Arquivo "${file.name}" carregado.`);
    }
}

// 3. Processa o CSV ao confirmar
function confirmImport() {
    const baseId = document.getElementById('import-base-select').value;
    const fileInput = document.getElementById('import-file');
    
    if (!baseId) return showToast("Selecione uma base de destino!");
    if (!fileInput.files[0]) return showToast("Selecione um arquivo CSV!");

    const reader = new FileReader();
    const base = state.bases.find(b => b.id === baseId);

    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n'); // Divide por linhas
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase()); // Cabeçalhos

        let count = 0;
        // Pula a primeira linha (cabeçalho)
        for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;

            const values = rows[i].split(',');
            let newRecord = {
                id: Date.now().toString() + i,
                baseId: baseId,
                category: base.category,
                status: 'Ativo',
                timestamp: new Date().toISOString()
            };

            // Mapeia colunas do CSV para os campos da base
            base.fields.forEach(field => {
                const colIndex = headers.indexOf(field.toLowerCase());
                if (colIndex !== -1) {
                    newRecord[field] = values[colIndex]?.trim();
                }
            });

            state.records.push(newRecord);
            count++;
        }

        saveData();
        closeModal();
        renderRecords();
        showToast(`${count} registros importados!`);
    };

    reader.readAsText(fileInput.files[0]);
}