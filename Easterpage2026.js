// JavaScript for Easter Page 2026
// This script handles the RSVP form by collecting user input and
// triggering the default email client via a mailto: link.  It is
// deliberately simple and runs entirely on the client side.

// Placeholder address for the email.  Update before launch.
const RSVP_EMAIL = 'John.Pastor@fakeemail.org'; // change this address later

// Helps CSS apply motion styles only when JavaScript is available.
document.documentElement.classList.add('js');

// build a mailto: URL containing the form data and navigate to it
// causing the user's mail program to open a new message.
function sendByEmail(data) {
    const subject = encodeURIComponent('Easter RSVP');
    let body = '';
    body += `Name: ${data.name}\n`;
    body += `Email: ${data.email}\n`;
    body += `Adults: ${data.adults}\n`;
    body += `Children: ${data.children}\n`;

    const mailto = `mailto:${RSVP_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
}

function validateRsvpData(data) {
    // Basic client-side checks so users get fast feedback before mail app opens.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.name || data.name.trim().length < 2) {
        return 'Please enter your name (at least 2 characters).';
    }
    if (!emailPattern.test(data.email)) {
        return 'Please enter a valid email address.';
    }
    if (!Number.isInteger(data.adults) || data.adults < 0) {
        return 'Adults must be a whole number of 0 or more.';
    }
    if (!Number.isInteger(data.children) || data.children < 0) {
        return 'Children must be a whole number of 0 or more.';
    }
    return '';
}

// wait until page is ready, then hook up the form submit handler
// the handler collects values, logs them, alerts the user, sends email,
// and finally resets the form fields for another entry.
document.addEventListener('DOMContentLoaded', function () {
    // RSVP form wiring.
    const form = document.getElementById('rsvp-form');
    const status = document.getElementById('form-status');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const data = {
                name: form.name.value.trim(),
                email: form.email.value.trim(),
                adults: Number(form.adults.value),
                children: form.children.value === '' ? 0 : Number(form.children.value)
            };

            const errorMessage = validateRsvpData(data);
            if (errorMessage) {
                if (status) {
                    status.textContent = errorMessage;
                    status.style.color = '#b00020';
                }
                return;
            }

            console.log('Form data submitted:', data);
            if (status) {
                status.textContent = 'Opening your email app to send RSVP...';
                status.style.color = '#2f6f44';
            }
            sendByEmail(data);
            form.reset();
        });
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
