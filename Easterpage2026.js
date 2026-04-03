// JavaScript for Easter Page 2026

// Helps CSS apply motion styles only when JavaScript is available.
document.documentElement.classList.add('js');

// Wait until page is ready, then wire up any interactive UI pieces.
document.addEventListener('DOMContentLoaded', function () {
    // Set default volume for the welcome video to 75%.
    const welcomeVideo = document.querySelector('#welcome_message video');
    if (welcomeVideo) {
        welcomeVideo.volume = 0.75;
    }

    // Scroll-triggered animation for the parking map (runs once).
    const parkingMap = document.querySelector('.parking-map');
    if (parkingMap) {
        const revealMap = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    parkingMap.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        revealMap.observe(parkingMap);
    }

    // Kids slideshow controller (auto-play + manual arrows/dots).
    const slideshow = document.querySelector('.kids-slideshow');
    if (!slideshow) {
        return;
    }

    const track = slideshow.querySelector('.slideshow-track');
    const prevBtn = slideshow.querySelector('.slide-arrow-left');
    const nextBtn = slideshow.querySelector('.slide-arrow-right');
    const dots = Array.from(slideshow.querySelectorAll('.slide-dot'));
    if (!track || dots.length === 0) {
        return;
    }

    const totalRealSlides = 3; // excludes the duplicated last slide used for seamless looping
    const holdMs = 4500;
    const transitionMs = 800;
    let current = 0;
    let autoTimer = null;

    function activeDotIndex() {
        // When we land on the duplicated slide, keep dot highlighting on slide 1.
        return current >= totalRealSlides ? 0 : current;
    }

    function updateDots() {
        const active = activeDotIndex();
        dots.forEach(function (dot, i) {
            dot.classList.toggle('active', i === active);
        });
    }

    function setSlidePosition() {
        // Smooth move used for normal next/prev transitions.
        track.style.transition = 'transform 0.8s ease';
        track.style.transform = 'translateX(-' + (current * 25) + '%)';
        updateDots();
    }

    function setSlidePositionInstant() {
        // Instant jump used after reaching duplicate slide to reset loop seamlessly.
        track.style.transition = 'none';
        track.style.transform = 'translateX(-' + (current * 25) + '%)';
        updateDots();
    }

    function restartAuto() {
        // Any manual action restarts timing so users get a full pause on the new slide.
        if (autoTimer) {
            clearInterval(autoTimer);
        }
        autoTimer = setInterval(goNext, holdMs + transitionMs);
    }

    function goTo(index) {
        current = index;
        setSlidePosition();
        restartAuto();
    }

    function goNext() {
        current += 1;
        setSlidePosition();

        if (current === totalRealSlides) {
            // After animating into duplicate first slide, snap back to actual first slide.
            window.setTimeout(function () {
                current = 0;
                setSlidePositionInstant();
            }, transitionMs);
        }
    }

    function goPrev() {
        if (current === 0) {
            // Going backward from first slide: jump to duplicate end, then animate to real last slide.
            current = totalRealSlides;
            setSlidePositionInstant();
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    current = totalRealSlides - 1;
                    setSlidePosition();
                });
            });
        } else {
            current -= 1;
            setSlidePosition();
        }

        restartAuto();
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            goNext();
            restartAuto();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', goPrev);
    }

    dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
            const index = Number(dot.getAttribute('data-slide'));
            if (!Number.isNaN(index)) {
                goTo(index);
            }
        });
    });

    setSlidePositionInstant();
    restartAuto();
});
