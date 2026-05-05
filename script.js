const CATEGORY_ICONS = {
    'Alimentação': '🍽️',
    'Transporte': '🚗',
    'Moradia': '🏠',
    'Lazer': '🎮',
    'Salário': '💼',
    'Outros': '📦'
};

const initialTransactions = [
    { id: 1, description: 'Salário Mensal', amount: 8500, type: 'income', category: 'Salário', date: '2026-05-01' },
    { id: 2, description: 'Aluguel', amount: 2200, type: 'expense', category: 'Moradia', date: '2026-05-02' },
    { id: 3, description: 'Supermercado Extra', amount: 580, type: 'expense', category: 'Alimentação', date: '2026-05-03' },
    { id: 4, description: 'Uber', amount: 45, type: 'expense', category: 'Transporte', date: '2026-05-04' },
    { id: 5, description: 'Freelance Design', amount: 1200, type: 'income', category: 'Outros', date: '2026-05-04' },
    { id: 6, description: 'Cinema', amount: 80, type: 'expense', category: 'Lazer', date: '2026-05-05' }
];

let transactions = JSON.parse(localStorage.getItem('transactions')) || initialTransactions;

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function calculateTotals() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
}

function renderSummary() {
    const { income, expense, balance } = calculateTotals();
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);
}

function renderTransactions() {
    const list = document.getElementById('transactionList');
    const recent = [...transactions].reverse().slice(0, 6);

    if (recent.length === 0) {
        list.innerHTML = '<li style="text-align:center;padding:24px;color:var(--text-secondary)">Nenhuma transação ainda</li>';
        return;
    }

    list.innerHTML = recent.map(t => `
        <li class="transaction">
            <div class="transaction-icon">${CATEGORY_ICONS[t.category] || '💵'}</div>
            <div class="transaction-info">
                <div class="description">${t.description}</div>
                <div class="meta">${t.category} · ${formatDate(t.date)}</div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(Number(t.amount))}
            </div>
        </li>
    `).join('');
}

function renderCategories() {
    const list = document.getElementById('categoryList');
    const expensesByCategory = {};

    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
        });

    const total = Object.values(expensesByCategory).reduce((s, v) => s + v, 0);
    const sorted = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        list.innerHTML = '<li style="text-align:center;color:var(--text-secondary);padding:20px">Sem despesas</li>';
        return;
    }

    list.innerHTML = sorted.map(([name, value]) => {
        const percent = total > 0 ? (value / total) * 100 : 0;
        return `
            <li class="category-item">
                <div class="category-info">
                    <span class="name">${CATEGORY_ICONS[name] || ''} ${name}</span>
                    <span class="value">${formatCurrency(value)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${percent}%"></div>
                </div>
            </li>
        `;
    }).join('');
}

function renderChart() {
    const svg = document.getElementById('chart');
    const W = 600, H = 240, P = 20;

    const days = 7;
    const today = new Date();
    const dailyData = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);

        let income = 0, expense = 0;
        transactions.forEach(t => {
            if (t.date === key) {
                if (t.type === 'income') income += Number(t.amount);
                else expense += Number(t.amount);
            }
        });

        dailyData.push({ income, expense, label: d.toLocaleDateString('pt-BR', { weekday: 'short' }) });
    }

    const maxVal = Math.max(...dailyData.flatMap(d => [d.income, d.expense]), 100);
    const stepX = (W - P * 2) / (days - 1);

    const buildPath = (key) => dailyData.map((d, i) => {
        const x = P + i * stepX;
        const y = H - P - (d[key] / maxVal) * (H - P * 2);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const buildArea = (key) => {
        const path = dailyData.map((d, i) => {
            const x = P + i * stepX;
            const y = H - P - (d[key] / maxVal) * (H - P * 2);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        return `${path} L ${P + (days - 1) * stepX} ${H - P} L ${P} ${H - P} Z`;
    };

    const labels = dailyData.map((d, i) => {
        const x = P + i * stepX;
        return `<text x="${x}" y="${H - 4}" text-anchor="middle" fill="#8b94ad" font-size="11">${d.label}</text>`;
    }).join('');

    svg.innerHTML = `
        <defs>
            <linearGradient id="incomeGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <path d="${buildArea('income')}" fill="url(#incomeGrad)"/>
        <path d="${buildArea('expense')}" fill="url(#expenseGrad)"/>
        <path d="${buildPath('income')}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${buildPath('expense')}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${labels}
    `;
}

function renderAll() {
    renderSummary();
    renderTransactions();
    renderCategories();
    renderChart();
}

const modal = document.getElementById('transactionModal');
const openBtn = document.getElementById('addTransactionBtn');
const closeBtn = document.getElementById('closeModal');
const form = document.getElementById('transactionForm');

openBtn.addEventListener('click', () => modal.classList.add('active'));
closeBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newTransaction = {
        id: Date.now(),
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        type: document.querySelector('input[name="type"]:checked').value,
        category: document.getElementById('category').value,
        date: new Date().toISOString().slice(0, 10)
    };
    transactions.push(newTransaction);
    saveTransactions();
    renderAll();
    form.reset();
    modal.classList.remove('active');
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    });
});

renderAll();
