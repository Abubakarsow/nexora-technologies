// Centralized, deferred JS for improved functionality & performance
(function(){
    'use strict';

    // Utilities
    const $ = selector => document.querySelector(selector);
    const $$ = selector => Array.from(document.querySelectorAll(selector));
    const noop = () => {};

    function debounce(fn, wait=120){
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
    }

    function rand(min, max){ return Math.random() * (max - min) + min; }

    // Mobile menu
    function initMobileMenu(){
        const hamburger = $('#hamburger');
        const navLinks = $('#navLinks');
            if (!hamburger || !navLinks) return;
        
            // Add ARIA attributes for accessibility
            hamburger.setAttribute('aria-label', 'Menu');
            hamburger.setAttribute('aria-expanded', 'false');
            hamburger.setAttribute('role', 'button');
            hamburger.setAttribute('tabindex', '0');
        
            // Handle menu state
            let isMenuOpen = false;
        
            function toggleMenu(open) {
                isMenuOpen = typeof open === 'boolean' ? open : !isMenuOpen;
                hamburger.setAttribute('aria-expanded', String(isMenuOpen));
                navLinks.classList.toggle('active', isMenuOpen);
                hamburger.classList.toggle('active', isMenuOpen);
            
                // Prevent body scroll when menu is open
                document.body.style.overflow = isMenuOpen ? 'hidden' : '';
            
                // Add animation class
                navLinks.classList.add('animating');
                setTimeout(() => navLinks.classList.remove('animating'), 300);
            }
        
            // Toggle menu on hamburger click
            hamburger.addEventListener('click', () => toggleMenu());
        
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (isMenuOpen && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
                    toggleMenu(false);
                }
            });
        
            // Close menu when clicking nav links
            navLinks.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    toggleMenu(false);
                
                    // Smooth scroll to section
                    e.preventDefault();
                    const targetId = e.target.getAttribute('href').substring(1);
                    const targetSection = document.getElementById(targetId);
                    if (targetSection) {
                        targetSection.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }
                }
            });
        
            // Handle keyboard navigation
            hamburger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleMenu();
                }
                if (e.key === 'Escape' && isMenuOpen) {
                    toggleMenu(false);
                }
            });
    }

    // Scroll reveal using IntersectionObserver
    function initScrollReveal(){
        const nodes = $$('[data-animate]');
        if(!nodes.length) return;
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if(en.isIntersecting){
                    en.target.setAttribute('data-animate','visible');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
        nodes.forEach(n => io.observe(n));
    }

    // Simple lazy-upgrade for images using data-src, plus ensure loading attribute
    function initLazyImages(){
        const imgs = $$('img');
        imgs.forEach(img => {
            if(!img.hasAttribute('loading')) img.setAttribute('loading','lazy');
            if(!img.hasAttribute('decoding')) img.setAttribute('decoding','async');
            // upgrade data-src pattern
            const ds = img.getAttribute('data-src');
            if(ds && !img.src){ img.src = ds; }
        });
    }

    // Dynamic year (single call)
    function initYear(){
        const el = document.getElementById('year');
        if(el) el.textContent = new Date().getFullYear();
    }

    // Form handler: try EmailJS if configured, otherwise fallback to mailto:
    function initForm(){
        const form = document.getElementById('contactForm');
        if(!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = form.querySelector('button');
            if(!btn) return;
            btn.disabled = true;
            btn.textContent = 'Sending…';

            const formData = new FormData(form);
            const payload = {
                name: formData.get('name') || 'Anonymous',
                email: formData.get('email') || '',
                subject: formData.get('subject') || '(no subject)',
                message: formData.get('message') || ''
            };

            // If EmailJS is present and configured: use it
            try{
                if(window.emailjs && window.__EMAILJS && window.__EMAILJS.serviceID && window.__EMAILJS.templateID){
                    // Ensure emailjs is initialized (user may have called emailjs.init elsewhere)
                    if(typeof emailjs.init === 'function' && window.__EMAILJS.userID){
                        try{ emailjs.init(window.__EMAILJS.userID); } catch(err){}
                    }
                    const templateParams = {
                        from_name: payload.name,
                        from_email: payload.email,
                        to_email: 'abubakarsow111@gmail.com',
                        subject: payload.subject,
                        message: payload.message
                    };
                    await emailjs.send(window.__EMAILJS.serviceID, window.__EMAILJS.templateID, templateParams);
                    btn.textContent = 'Sent ✔';
                    setTimeout(()=>{ btn.textContent = 'Transmit'; btn.disabled = false; form.reset(); }, 1500);
                    return;
                }
            }catch(err){
                // fall through to mailto fallback
                console.warn('EmailJS send failed, falling back to mailto:', err);
            }

            // Fallback: open mail client with pre-filled email (mailto). This opens user's email client and does NOT send automatically from the form's email.
            try{
                const to = encodeURIComponent('abubakarsow111@gmail.com');
                const subject = encodeURIComponent(payload.subject + ' — via portfolio contact');
                const body = encodeURIComponent(
                    `Name: ${payload.name}\nEmail: ${payload.email}\n\nMessage:\n${payload.message}`
                );
                // mailto doesn't reliably support Reply-To headers across clients; include sender in body.
                const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
                window.location.href = mailto;
                btn.textContent = 'Opened Mail Client';
                setTimeout(()=>{ btn.textContent = 'Transmit'; btn.disabled = false; form.reset(); }, 1500);
                return;
            }catch(err){
                console.error('Mailto fallback failed', err);
                btn.textContent = 'Error';
                setTimeout(()=>{ btn.textContent = 'Transmit'; btn.disabled = false; }, 2000);
            }
        });
    }

    // Bubble injector (improved performance)
    function initBubbles(){
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const variants = ['bubbles-soft','bubbles-glass','bubbles-spot','bubbles-ghost'];
        const targets = Array.from(document.querySelectorAll('header, section, footer'));

        function createBubblesFor(el, variantIndex){
            // remove existing
            const prev = el.querySelector('.bubbles');
            if(prev) prev.remove();
            const container = document.createElement('div');
            container.className = 'bubbles ' + variants[variantIndex % variants.length];
            container.setAttribute('aria-hidden','true');
            const frag = document.createDocumentFragment();
            const height = el.getBoundingClientRect().height || 600;
            const count = Math.min(12, Math.max(3, Math.round(height / 160)));
            for(let i=0;i<count;i++){
                const b = document.createElement('div');
                b.className = 'bubble';
                const size = Math.round(rand(14, 80));
                b.style.width = size + 'px';
                b.style.height = size + 'px';
                b.style.left = Math.round(rand(-8, 108)) + '%';
                b.style.bottom = Math.round(rand(-30, 20)) + '%';
                b.style.setProperty('--b-dur', rand(10, 36).toFixed(1) + 's');
                b.style.setProperty('--b-drift', Math.round(rand(-80, 80)) + 'px');
                b.style.setProperty('--b-opa', (rand(0.02, 0.12)).toFixed(3));
                b.style.setProperty('--b-blur', rand(2, 10).toFixed(1) + 'px');
                b.style.setProperty('--b-scale', (rand(0.6, 1.2)).toFixed(2));
                b.style.animationDelay = rand(-20, 0).toFixed(2) + 's';
                frag.appendChild(b);
            }
            container.appendChild(frag);
            el.classList.add('has-bubbles');
            el.insertBefore(container, el.firstChild);
        }

        // initial
        targets.forEach((el, i) => { try{ createBubblesFor(el, i); } catch(e){} });

        // responsive: recreate on resize (debounced)
        const onResize = debounce(()=>{
            targets.forEach((el, i) => { try{ createBubblesFor(el, i); } catch(e){} });
        }, 250);
        window.addEventListener('resize', onResize, { passive:true });

        // pause when tab not visible to improve perf
        document.addEventListener('visibilitychange', () => {
            const paused = document.hidden;
            $$('div.bubbles .bubble').forEach(b => {
                try{ b.style.animationPlayState = paused ? 'paused' : 'running'; } catch(e){}
            });
        });
    }

    // Prefetch important external links (hover), small perf win
    function initPrefetch(){
        const links = $$('a[href*="github.com"], a[href*="linkedin.com"], a[href*="twitter.com"]');
        links.forEach(a => {
            let timer;
            const pre = () => { timer = setTimeout(()=>{ const l = document.createElement('link'); l.rel='prefetch'; l.href = a.href; document.head.appendChild(l); }, 120); };
            const cancel = ()=>{ clearTimeout(timer); };
            a.addEventListener('mouseenter', pre, {passive:true});
            a.addEventListener('mouseleave', cancel, {passive:true});
        });
    }

    // Pause heavy animations on page hide and resume on show for perf
    function initVisibilityPause(){
        document.addEventListener('visibilitychange', () => {
            const paused = document.hidden;
            // pause CSS animations on key elements
            ['.bubbles .bubble', '.polaroid', '.hero-image', '.glass'].forEach(sel => {
                $$(sel).forEach(el => el.style.animationPlayState = paused ? 'paused' : 'running');
            });
        });
    }

    // Hero tilt (pointer-based) - subtle 3D tilt + parallax for shapes
    function initHeroTilt(){
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const wrap = document.querySelector('.hero-image-wrapper');
        const image = wrap ? wrap.querySelector('.hero-image') : null;
        const shapes = wrap ? Array.from(wrap.querySelectorAll('.geometric-shapes .shape')) : [];
        if(!wrap || !image) return;

        let raf = null;
        let lx = 0, ly = 0; // last applied
        const maxTilt = 7; // degrees
        const maxTranslate = 12; // px for shapes

        function apply(x, y){
            // x,y are -1..1
            const rotY = x * maxTilt * -1; // invert for natural movement
            const rotX = y * maxTilt;
            const transX = x * (maxTranslate * 0.6);
            const transY = y * (maxTranslate * 0.6);
            image.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`;
            // parallax shapes (subtle)
            shapes.forEach((s, i) => {
                const depth = (i % 3) * 0.45 + 0.6; // varied depth
                const sx = transX * depth * -1;
                const sy = transY * depth * -1;
                s.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
            });
        }

        function onMove(e){
            const r = wrap.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
            const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
            const dx = (clientX - cx) / (r.width/2);
            const dy = (clientY - cy) / (r.height/2);
            const nx = Math.max(-1, Math.min(1, dx));
            const ny = Math.max(-1, Math.min(1, dy));
            // throttle with rAF
            if(raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(()=> apply(nx, ny));
        }

        function reset(){
            if(raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(()=>{
                image.style.transform = '';
                shapes.forEach(s => s.style.transform = '');
            });
        }

        wrap.addEventListener('pointermove', onMove, {passive:true});
        wrap.addEventListener('pointerleave', reset, {passive:true});
        wrap.addEventListener('pointercancel', reset, {passive:true});
    }

    // Scroll-driven parallax for shapes and orbs (uses rAF loop for smoothness)
    function initParallax(){
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const elems = Array.from(document.querySelectorAll('.geometric-shapes .shape, .orb-tray .orb'));
        if(!elems.length) return;

        let ticking = false;

        function update(){
            const wh = window.innerHeight;
            elems.forEach((el, i) => {
                const r = el.getBoundingClientRect();
                // distance from center (-1..1)
                const dist = ((r.top + r.height/2) - wh/2) / (wh/2);
                const range = el.classList.contains('orb') ? 18 : 28; // orbs move less
                const ty = -dist * range * (el.classList.contains('orb') ? 0.7 : 1);
                const tx = Math.sin((i+1) * 0.7 + Date.now()/6000) * 6 * (el.classList.contains('orb') ? 0.2 : 1);
                el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            });
            ticking = false;
        }

        function request(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }

        window.addEventListener('scroll', request, {passive:true});
        window.addEventListener('resize', debounce(request, 120), {passive:true});
        // run once to seed positions
        request();
    }

    // Boot
    function init(){
        initMobileMenu();
        initScrollReveal();
        initYear();
        initForm();
        initLazyImages();
        initBubbles();
        initPrefetch();
        initVisibilityPause();
        // new advanced effects
        initHeroTilt();
        initParallax();
    }

    if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
