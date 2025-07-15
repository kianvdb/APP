// generatePageCoordinator.js - MINIMAL COMPATIBLE VERSION
// This version works with the enhanced page loader

(function() {
    'use strict';
    
    console.log('🎯 Generate Page Coordinator - MINIMAL COMPATIBLE');
    
    // Check if we came from page transition
    const fromTransition = sessionStorage.getItem('fromPageTransition');
    const transitionActive = sessionStorage.getItem('transitionActive');
    
    if (fromTransition === 'true' || transitionActive === 'true') {
        console.log('✅ Arrived via page transition, coordinator will handle');
        
        // The enhanced page loader is already handling this
        // Just ensure we don't interfere
        console.log('✅ Deferring to enhanced page loader coordination');
    } else {
        console.log('🔄 Direct page load, no coordination needed');
        
        // For direct loads, ensure page content is properly revealed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    const pageContent = document.querySelector('.page-content');
                    if (pageContent && !pageContent.classList.contains('revealed')) {
                        pageContent.classList.add('revealed');
                        console.log('✅ Page content revealed for direct load');
                    }
                }, 100);
            });
        } else {
            // DOM already loaded
            setTimeout(() => {
                const pageContent = document.querySelector('.page-content');
                if (pageContent && !pageContent.classList.contains('revealed')) {
                    pageContent.classList.add('revealed');
                    console.log('✅ Page content revealed for direct load');
                }
            }, 100);
        }
    }
})();