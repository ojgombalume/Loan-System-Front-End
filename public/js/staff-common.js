// API Configuration - dynamically set based on environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod/api';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadUserInfo();
    setupLogout();
    updateCurrentDate();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'staff-login.html';
        return false;
    }
    
    return true;
}

function loadUserInfo() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    const user = JSON.parse(userStr);
    
    // Update user info in sidebar
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = user.full_name;
    if (userRole) userRole.textContent = user.role;
    if (userAvatar) {
        const initials = user.full_name.split(' ').map(n => n[0]).join('');
        userAvatar.textContent = initials;
    }
    
    // Show/hide admin menu
    if (user.role === 'admin') {
        const adminMenu = document.getElementById('adminMenu');
        if (adminMenu) adminMenu.style.display = 'block';
    }
    
    // Show role-specific actions
    if (user.role === 'checker') {
        const checkerActions = document.getElementById('checkerActions');
        if (checkerActions) checkerActions.style.display = 'block';
    }
    
    if (user.role === 'accountant') {
        const accountantActions = document.getElementById('accountantActions');
        if (accountantActions) accountantActions.style.display = 'block';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'staff-login.html';
        });
    }
}

function updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function formatCurrency(amount) {
    return 'P ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending">Pending</span>',
        'approved': '<span class="status-badge status-approved">Approved</span>',
        'rejected': '<span class="status-badge status-rejected">Rejected</span>',
        'disbursed': '<span class="status-badge status-disbursed">Disbursed</span>'
    };
    return badges[status] || status;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Close modal on close button click
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', function() {
        this.closest('.modal').classList.remove('show');
    });
});

// Handle API errors
function handleAPIError(error) {
    console.error('API Error:', error);
    if (error.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'staff-login.html';
    } else {
        alert('An error occurred. Please try again.');
    }
}
