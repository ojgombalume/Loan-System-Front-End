// Load dashboard data
async function loadDashboardData() {
    try {
        // Load statistics
        const statsResponse = await fetch(`${API_URL}/loans/stats/summary`, {
            headers: getAuthHeaders()
        });
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateStatistics(stats);
        }
        
        // Load recent loans
        const loansResponse = await fetch(`${API_URL}/loans?limit=10`, {
            headers: getAuthHeaders()
        });
        
        if (loansResponse.ok) {
            const loans = await loansResponse.json();
            displayRecentLoans(loans);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateStatistics(stats) {
    document.getElementById('totalLoans').textContent = stats.total || 0;
    document.getElementById('pendingLoans').textContent = stats.pending || 0;
    document.getElementById('approvedLoans').textContent = stats.approved || 0;
    document.getElementById('disbursedLoans').textContent = stats.disbursed || 0;
    document.getElementById('rejectedLoans').textContent = stats.rejected || 0;
    document.getElementById('totalAmount').textContent = formatCurrency(stats.totalAmount || 0);
}

function displayRecentLoans(loans) {
    const tableBody = document.getElementById('recentLoansTable');
    
    if (!loans || loans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No recent applications</td></tr>';
        return;
    }
    
    const userStr = localStorage.getItem('user');
    const user = JSON.parse(userStr);
    
    tableBody.innerHTML = loans.slice(0, 10).map(loan => {
        const refNo = `LOAN-${String(loan.id).padStart(6, '0')}`;
        const applicant = `${loan.first_name} ${loan.last_name}`;
        const amount = formatCurrency(loan.loan_amount);
        const date = formatDate(loan.created_at);
        const status = getStatusBadge(loan.status);
        
        let actions = `<button class="btn btn-sm btn-info" onclick="viewLoan(${loan.id})">View</button>`;
        
        if (user.role === 'checker' && loan.status === 'pending') {
            actions += ` <button class="btn btn-sm btn-primary" onclick="reviewLoan(${loan.id})">Review</button>`;
        }
        
        if (user.role === 'accountant' && loan.status === 'approved') {
            actions += ` <button class="btn btn-sm btn-success" onclick="disburseLoan(${loan.id})">Disburse</button>`;
        }
        
        return `
            <tr>
                <td>${refNo}</td>
                <td>${applicant}</td>
                <td>${amount}</td>
                <td>${date}</td>
                <td>${status}</td>
                <td class="action-buttons">${actions}</td>
            </tr>
        `;
    }).join('');
}

function viewLoan(loanId) {
    window.location.href = `staff-loans.html?id=${loanId}`;
}

function reviewLoan(loanId) {
    window.location.href = `staff-loans.html?review=${loanId}`;
}

function disburseLoan(loanId) {
    window.location.href = `staff-loans.html?disburse=${loanId}`;
}

// Load data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
});
