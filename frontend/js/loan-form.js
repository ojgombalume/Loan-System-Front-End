// API Configuration
const API_URL = 'http://localhost:3000/api';

let currentStep = 1;
const totalSteps = 5;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize form
    showStep(currentStep);
    
    // Navigation buttons
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('prevBtn').addEventListener('click', prevStep);
    document.getElementById('loanApplicationForm').addEventListener('submit', submitForm);
    
    // Spouse fields toggle
    document.getElementById('marriedInCommunity').addEventListener('change', function() {
        const spouseFields = document.getElementById('spouseFields');
        spouseFields.style.display = this.value === 'Yes' ? 'block' : 'none';
        
        // Toggle required attribute
        const spouseInputs = spouseFields.querySelectorAll('input');
        spouseInputs.forEach(input => {
            input.required = this.value === 'Yes';
        });
    });
    
    // Auto-calculate total amount
    document.getElementById('loanAmount').addEventListener('input', calculateTotal);
    document.getElementById('interestRate').addEventListener('input', calculateTotal);
    
    // File upload handling
    document.getElementById('attachments').addEventListener('change', handleFileSelect);
    
    // Set today's date as default
    document.getElementById('loanDate').valueAsDate = new Date();
    document.getElementById('paymentDate')?.valueAsDate && (document.getElementById('paymentDate').valueAsDate = new Date());
});

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
    // Show current step
    const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
    if (currentStepEl) {
        currentStepEl.classList.add('active');
    }
    
    // Update progress indicator
    document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });
    
    // Update navigation buttons
    document.getElementById('prevBtn').style.display = step === 1 ? 'none' : 'inline-block';
    document.getElementById('nextBtn').style.display = step === totalSteps ? 'none' : 'inline-block';
    document.getElementById('submitBtn').style.display = step === totalSteps ? 'inline-block' : 'none';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
    if (validateStep(currentStep)) {
        currentStep++;
        if (currentStep > totalSteps) currentStep = totalSteps;
        showStep(currentStep);
    }
}

function prevStep() {
    currentStep--;
    if (currentStep < 1) currentStep = 1;
    showStep(currentStep);
}

function validateStep(step) {
    const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
    const inputs = stepEl.querySelectorAll('input[required], select[required], textarea[required]');
    
    let isValid = true;
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            // For checkboxes in terms section
            if (input.name === 'terms') {
                const checkedTerms = stepEl.querySelectorAll('input[name="terms"]:checked');
                if (checkedTerms.length < 11) {
                    alert('Please accept all terms and conditions');
                    isValid = false;
                    return;
                }
            }
        } else if (!input.value.trim()) {
            input.style.borderColor = 'red';
            isValid = false;
        } else {
            input.style.borderColor = '';
        }
    });
    
    // Validate repayment method
    if (step === 2) {
        const repaymentChecked = stepEl.querySelectorAll('input[name="repaymentMethod"]:checked');
        if (repaymentChecked.length === 0) {
            alert('Please select at least one repayment method');
            isValid = false;
        }
    }
    
    return isValid;
}

function calculateTotal() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    
    const interest = (loanAmount * interestRate) / 100;
    const totalAmount = loanAmount + interest;
    
    document.getElementById('totalAmount').value = totalAmount.toFixed(2);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <button type="button" onclick="removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    const fileInput = document.getElementById('attachments');
    const dt = new DataTransfer();
    const files = Array.from(fileInput.files);
    
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    fileInput.files = dt.files;
    handleFileSelect({ target: fileInput });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

async function submitForm(e) {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Show loading
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        // Gather form data
        const formData = new FormData(document.getElementById('loanApplicationForm'));
        
        // Get repayment methods
        const repaymentMethods = [];
        document.querySelectorAll('input[name="repaymentMethod"]:checked').forEach(cb => {
            repaymentMethods.push(cb.value);
        });
        formData.delete('repaymentMethod');
        formData.append('repaymentMethod', repaymentMethods.join(','));
        
        // Get terms
        const terms = [];
        document.querySelectorAll('input[name="terms"]:checked').forEach(cb => {
            terms.push(cb.value);
        });
        formData.delete('terms');
        formData.append('termsAccepted', JSON.stringify(terms));
        
        // Submit to API
        const response = await fetch(`${API_URL}/loans/apply`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Show success message
            document.getElementById('loanApplicationForm').style.display = 'none';
            document.querySelector('.progress-container').style.display = 'none';
            document.getElementById('referenceNumber').textContent = result.reference;
            document.getElementById('successMessage').style.display = 'block';
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('Failed to submit application. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}
