let currentLoans = [];

// Load loans on page load
document.addEventListener('DOMContentLoaded', function() {
    loadLoans();
    setupEventListeners();
});

function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(function() {
        loadLoans();
    }, 500));
    
    // Filter
    document.getElementById('statusFilter').addEventListener('change', function() {
        loadLoans();
    });
    
    // Review form
    document.getElementById('reviewForm')?.addEventListener('submit', submitReview);
    
    // Disburse form
    document.getElementById('disburseForm')?.addEventListener('submit', submitDisbursement);
}

async function loadLoans() {
    try {
        const search = document.getElementById('searchInput').value;
        const status = document.getElementById('statusFilter').value;
        
        let url = `${API_URL}/loans?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (status) url += `status=${status}&`;
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            currentLoans = await response.json();
            displayLoans(currentLoans);
        } else {
            throw new Error('Failed to load loans');
        }
    } catch (error) {
        console.error('Error loading loans:', error);
        handleAPIError(error);
    }
}

function displayLoans(loans) {
    const tableBody = document.getElementById('loansTable');
    const userStr = localStorage.getItem('user');
    const user = JSON.parse(userStr);
    
    if (!loans || loans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No loan applications found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = loans.map(loan => {
        const refNo = `LOAN-${String(loan.id).padStart(6, '0')}`;
        const applicant = `${loan.first_name} ${loan.last_name}`;
        const amount = formatCurrency(loan.loan_amount);
        const period = `${loan.loan_period_months} months`;
        const date = formatDate(loan.created_at);
        const status = getStatusBadge(loan.status);
        
        let actions = `<button class="btn btn-sm btn-info btn-icon" onclick="viewLoanDetails(${loan.id})">View</button>`;
        
        if (user.role === 'checker' && loan.status === 'pending') {
            actions += ` <button class="btn btn-sm btn-primary btn-icon" onclick="openReviewModal(${loan.id})">Review</button>`;
        }
        
        if (user.role === 'accountant' && loan.status === 'approved') {
            actions += ` <button class="btn btn-sm btn-success btn-icon" onclick="openDisburseModal(${loan.id})">Disburse</button>`;
        }
        
        return `
            <tr>
                <td>${refNo}</td>
                <td>${applicant}</td>
                <td>${loan.id_number}</td>
                <td>${loan.contact_number}</td>
                <td>${amount}</td>
                <td>${period}</td>
                <td>${date}</td>
                <td>${status}</td>
                <td class="action-buttons">${actions}</td>
            </tr>
        `;
    }).join('');
}

async function viewLoanDetails(loanId) {
    try {
        const response = await fetch(`${API_URL}/loans/${loanId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const loan = await response.json();
            displayLoanModal(loan);
        }
    } catch (error) {
        console.error('Error loading loan details:', error);
    }
}

function displayLoanModal(loan) {
    const detailsDiv = document.getElementById('loanDetails');
    const refNo = `LOAN-${String(loan.id).padStart(6, '0')}`;
    
    detailsDiv.innerHTML = `
        <div class="loan-details-content">
            <div class="detail-section">
                <h3>Loan Reference: ${refNo}</h3>
                <p><strong>Status:</strong> ${getStatusBadge(loan.status)}</p>
            </div>
            
            <div class="detail-section">
                <h3>Borrower Information</h3>
                <p><strong>Name:</strong> ${loan.first_name} ${loan.last_name}</p>
                <p><strong>ID Number:</strong> ${loan.id_number}</p>
                <p><strong>Contact:</strong> ${loan.contact_number}</p>
                <p><strong>Physical Address:</strong> ${loan.physical_address}</p>
                <p><strong>Postal Address:</strong> ${loan.postal_address}</p>
            </div>
            
            <div class="detail-section">
                <h3>Next of Kin</h3>
                <p><strong>Name:</strong> ${loan.kin_name}</p>
                <p><strong>Relationship:</strong> ${loan.kin_relationship}</p>
                <p><strong>Address:</strong> ${loan.kin_address}</p>
            </div>
            
            ${loan.married_in_community ? `
            <div class="detail-section">
                <h3>Spouse Information</h3>
                <p><strong>Name:</strong> ${loan.spouse_name || 'N/A'}</p>
                <p><strong>ID:</strong> ${loan.spouse_id_number || 'N/A'}</p>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3>Loan Details</h3>
                <p><strong>Amount:</strong> ${formatCurrency(loan.loan_amount)}</p>
                <p><strong>Interest:</strong> ${loan.interest_rate}%</p>
                <p><strong>Total Amount:</strong> ${formatCurrency(loan.total_amount)}</p>
                <p><strong>Period:</strong> ${loan.loan_period_months} months</p>
                <p><strong>Date:</strong> ${formatDate(loan.loan_date)}</p>
            </div>
            
            <div class="detail-section">
                <h3>Bank Information</h3>
                <p><strong>Bank:</strong> ${loan.bank_name}</p>
                <p><strong>Account:</strong> ${loan.account_number}</p>
                <p><strong>Branch:</strong> ${loan.branch}</p>
            </div>
            
            ${loan.checker_comments ? `
            <div class="detail-section">
                <h3>Reviewer Comments</h3>
                <p>${loan.checker_comments}</p>
                <p><small>Reviewed by: ${loan.checker_name} on ${formatDate(loan.checked_at)}</small></p>
            </div>
            ` : ''}
            
            ${loan.disbursement_reference ? `
            <div class="detail-section">
                <h3>Disbursement Information</h3>
                <p><strong>Reference:</strong> ${loan.disbursement_reference}</p>
                <p><strong>Disbursed by:</strong> ${loan.accountant_name}</p>
                <p><strong>Date:</strong> ${formatDate(loan.disbursed_at)}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    showModal('loanModal');
}

function openReviewModal(loanId) {
    document.getElementById('reviewLoanId').value = loanId;
    document.getElementById('reviewAction').value = '';
    document.getElementById('reviewComments').value = '';
    showModal('reviewModal');
}

function closeReviewModal() {
    closeModal('reviewModal');
}

async function submitReview(e) {
    e.preventDefault();
    
    const loanId = document.getElementById('reviewLoanId').value;
    const action = document.getElementById('reviewAction').value;
    const comments = document.getElementById('reviewComments').value;
    
    try {
        const response = await fetch(`${API_URL}/loans/${loanId}/review`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ action, comments })
        });
        
        if (response.ok) {
            alert('Loan reviewed successfully');
            closeReviewModal();
            loadLoans();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review');
    }
}

function openDisburseModal(loanId) {
    document.getElementById('disburseLoanId').value = loanId;
    document.getElementById('referenceNumber').value = '';
    showModal('disburseModal');
}

function closeDisburseModal() {
    closeModal('disburseModal');
}

async function submitDisbursement(e) {
    e.preventDefault();
    
    const loanId = document.getElementById('disburseLoanId').value;
    const referenceNumber = document.getElementById('referenceNumber').value;
    
    if (!confirm('Have you confirmed that the funds have been transferred?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/loans/${loanId}/disburse`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ referenceNumber })
        });
        
        if (response.ok) {
            alert('Loan disbursed successfully');
            closeDisburseModal();
            loadLoans();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error disbursing loan:', error);
        alert('Failed to disburse loan');
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
