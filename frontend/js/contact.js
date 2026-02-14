document.getElementById('contactForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value
    };
    
    // In a real application, this would send to a backend endpoint
    // For now, we'll just show a success message
    console.log('Contact form submitted:', formData);
    
    alert('Thank you for your message! We will get back to you shortly.');
    this.reset();
});
