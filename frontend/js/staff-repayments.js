// Load repayments on page load
document.addEventListener('DOMContentLoaded', function() {
    loadRepaymentStats();
    loadRepayments();
    loadDisbursedLoans();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('recordPaymentBtn').addEventListener('click', openPaymentModal);
    document.getElementById('paymentForm').addEventListener('submit', submitPayment);
    document.getElementById('loanSelect').addEventListener('change', loadLoanInfo);
}

async function loadRepaymentStats() {
    try {
        const response = await fetch(`${API_URL}/repayments/stats/summary`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalLoaned').textContent = formatCurrency(stats.totalLoaned || 0);
            document.getElementById('totalCollected').textContent = formatCurrency(stats.total_collected || 0);
            document.getElementById('outstanding').textContent = formatCurrency(stats.outstandingBalance || 0);
            document.getElementById('activeLoans').textContent = stats.active_loans || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRepayments() {
    try {
        const response = await fetch(`${API_URL}/repayments`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            displayRepayments(data.repayments);
        }
    } catch (error) {
        console.error('Error loading repayments:', error);
    }
}

function displayRepayments(repayments) {
    const tableBody = document.getElementById('repaymentsTable');
    
    if (!repayments || repayments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No repayments recorded</td></tr>';
        return;
    }
    
    tableBody.innerHTML = repayments.map(payment => {
        const loanRef = `LOAN-${String(payment.loan_id).padStart(6, '0')}`;
        const borrower = `${payment.first_name} ${payment.last_name}`;
        
        return `
            <tr>
                <td>${formatDate(payment.payment_date)}</td>
                <td><a href="#" onclick="viewLoanRepayments(${payment.loan_id}); return false;">${loanRef}</a></td>
                <td>${borrower}</td>
                <td>${formatCurrency(payment.amount_paid)}</td>
                <td>${payment.payment_method || 'N/A'}</td>
                <td>${payment.reference_number || 'N/A'}</td>
                <td>${payment.recorded_by_name}</td>
            </tr>
        `;
    }).join('');
}

async function loadDisbursedLoans() {
    try {
        const response = await fetch(`${API_URL}/loans?status=disbursed`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const loans = await response.json();
            const loanSelect = document.getElementById('loanSelect');
            
            loanSelect.innerHTML = '<option value="">Select a loan...</option>';
            loans.forEach(loan => {
                const refNo = `LOAN-${String(loan.id).padStart(6, '0')}`;
                const borrower = `${loan.first_name} ${loan.last_name}`;
                loanSelect.innerHTML += `<option value="${loan.id}">${refNo} - ${borrower}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading loans:', error);
    }
}

async function loadLoanInfo() {
    const loanId = document.getElementById('loanSelect').value;
    
    if (!loanId) {
        document.getElementById('loanInfo').style.display = 'none';
        return;
    }
    
    try {
        // Get loan details
        const loanResponse = await fetch(`${API_URL}/loans/${loanId}`, {
            headers: getAuthHeaders()
        });
        
        // Get repayment history
        const repaymentsResponse = await fetch(`${API_URL}/repayments/loan/${loanId}`, {
            headers: getAuthHeaders()
        });
        
        if (loanResponse.ok && repaymentsResponse.ok) {
            const loan = await loanResponse.json();
            const data = await repaymentsResponse.json();
            
            document.getElementById('infoName').textContent = `${loan.first_name} ${loan.last_name}`;
            document.getElementById('infoAmount').textContent = formatCurrency(loan.total_amount);
            document.getElementById('infoPaid').textContent = formatCurrency(data.summary.totalPaid);
            document.getElementById('infoBalance').textContent = formatCurrency(data.summary.balance);
            document.getElementById('loanInfo').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading loan info:', error);
    }
}

function openPaymentModal() {
    document.getElementById('paymentForm').reset();
    document.getElementById('loanInfo').style.display = 'none';
    document.getElementById('paymentDate').valueAsDate = new Date();
    showModal('paymentModal');
}

function closePaymentModal() {
    closeModal('paymentModal');
}

async function submitPayment(e) {
    e.preventDefault();
    
    const formData = {
        loanId: parseInt(document.getElementById('loanSelect').value),
        paymentDate: document.getElementById('paymentDate').value,
        amountPaid: parseFloat(document.getElementById('amountPaid').value),
        paymentMethod: document.getElementById('paymentMethod').value,
        referenceNumber: document.getElementById('paymentReference').value,
        notes: document.getElementById('paymentNotes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/repayments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('Payment recorded successfully');
            closePaymentModal();
            loadRepaymentStats();
            loadRepayments();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        alert('Failed to record payment');
    }
}

async function viewLoanRepayments(loanId) {
    try {
        const response = await fetch(`${API_URL}/repayments/loan/${loanId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            displayLoanRepaymentsModal(loanId, data);
        }
    } catch (error) {
        console.error('Error loading loan repayments:', error);
    }
}

function displayLoanRepaymentsModal(loanId, data) {
    const detailsDiv = document.getElementById('loanRepaymentDetails');
    const refNo = `LOAN-${String(loanId).padStart(6, '0')}`;
    
    let repaymentsHtml = '';
    if (data.repayments && data.repayments.length > 0) {
        repaymentsHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Recorded By</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.repayments.map(payment => `
                        <tr>
                            <td>${formatDate(payment.payment_date)}</td>
                            <td>${formatCurrency(payment.amount_paid)}</td>
                            <td>${payment.payment_method || 'N/A'}</td>
                            <td>${payment.reference_number || 'N/A'}</td>
                            <td>${payment.recorded_by_name}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        repaymentsHtml = '<p>No repayments recorded yet</p>';
    }
    
    detailsDiv.innerHTML = `
        <div class="detail-section">
            <h3>Loan Reference: ${refNo}</h3>
            <div class="stats-grid" style="margin: 20px 0;">
                <div class="stat-card">
                    <div class="stat-details">
                        <div class="stat-value">${formatCurrency(data.summary.loanAmount)}</div>
                        <div class="stat-label">Total Loan Amount</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-details">
                        <div class="stat-value">${formatCurrency(data.summary.totalPaid)}</div>
                        <div class="stat-label">Total Paid</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-details">
                        <div class="stat-value">${formatCurrency(data.summary.balance)}</div>
                        <div class="stat-label">Outstanding Balance</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Payment History</h3>
            ${repaymentsHtml}
        </div>
    `;
    
    showModal('loanRepaymentsModal');
}
