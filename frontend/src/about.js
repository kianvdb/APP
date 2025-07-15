// about.js - About page specific functionality
console.log('📄 About page loading...');

// Immediate reveal fallback
window.addEventListener('load', function() {
    setTimeout(() => {
        const pageContent = document.querySelector('.page-content');
        if (pageContent && !pageContent.classList.contains('revealed')) {
            console.log('⚡ Emergency reveal - showing page content');
            pageContent.style.opacity = '1';
            pageContent.classList.add('revealed');
        }
    }, 1000); // Give other systems 1 second to load
});

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ About page DOM loaded');
    
    // Check if loading system exists, if not reveal page immediately
    setTimeout(() => {
        const pageContent = document.querySelector('.page-content');
        const loadingOverlay = document.getElementById('about-loading-overlay') || 
                             document.getElementById('comprehensive-loading-overlay');
        
        if (!loadingOverlay && pageContent) {
            console.log('⚠️ No loading system detected, revealing page content directly');
            pageContent.classList.add('revealed');
        }
    }, 100);
    
    // Mark DOM as loaded for loading system
    if (window.loadingManager) {
        window.loadingManager.setLoaded('dom');
    }
    
    // Smooth scroll functionality
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerOffset = 80;
                const elementPosition = targetSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add scroll effect to header
    const header = document.querySelector('.header');
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            header.style.boxShadow = '';
            header.style.background = '#0a0a0a';
        } else {
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.8)';
            header.style.background = 'rgba(10, 10, 10, 0.95)';
        }
        
        lastScroll = currentScroll;
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });

    // Observe step cards
    const stepCards = document.querySelectorAll('.step-card');
    stepCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Observe blog cards
    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Observe FAQ items
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });

    // Animate stats numbers
    const animateValue = (element, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value + element.dataset.suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    };

    // Trigger stats animation when in view
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                entry.target.classList.add('animated');
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    const text = stat.textContent;
                    const number = parseInt(text.replace(/[^0-9]/g, ''));
                    const suffix = text.replace(/[0-9]/g, '');
                    stat.dataset.suffix = suffix;
                    animateValue(stat, 0, number, 2000);
                });
            }
        });
    }, { threshold: 0.5 });

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        statsObserver.observe(heroStats);
    }

    // Mark page-specific elements as loaded
    setTimeout(() => {
        if (window.loadingManager) {
            // Since this is the about page, we don't have 3D models or assets to load
            window.loadingManager.setLoaded('model3d');
            window.loadingManager.setLoaded('assets');
            window.loadingManager.setLoaded('page');
        }
        
        // Final check to ensure page is visible
        const pageContent = document.querySelector('.page-content');
        if (pageContent && !pageContent.classList.contains('revealed')) {
            console.log('🎨 Force revealing page content');
            pageContent.classList.add('revealed');
        }
    }, 500);
});

// Initialize loading manager for about page if not already done
if (!window.loadingManager) {
    // Create a simplified loading manager for the about page
    window.loadingManager = {
        loadingStates: {
            dom: false,
            auth: false,
            accountDropdown: false,
            model3d: false,
            assets: false,
            page: false
        },
        setLoaded: function(component) {
            this.loadingStates[component] = true;
            console.log(`✅ About page: ${component} loaded`);
            this.checkCompletion();
        },
        checkCompletion: function() {
            const allLoaded = Object.values(this.loadingStates).every(Boolean);
            if (allLoaded) {
                console.log('🎉 About page fully loaded');
                // Remove any loading overlay
                const overlay = document.getElementById('comprehensive-loading-overlay');
                if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                    }, 500);
                }
                // Reveal page content
                const pageContent = document.querySelector('.page-content');
                if (pageContent) {
                    pageContent.classList.add('revealed');
                }
            }
        }
    };
}

console.log('✅ About page script loaded');