
/* ==========================================
   SHADDRACK GALLERY - LOGIN PARTICLE EFFECTS
   Safe against duplicate script loading
========================================== */

(function () {
    "use strict";

    // Prevent the effects from running twice
    if (window.__shaddrackLoginEffectsLoaded) {
        return;
    }

    window.__shaddrackLoginEffectsLoaded = true;

    const shaddrackParticles =
        document.getElementById("particles");

    if (!shaddrackParticles) {
        console.warn("Particle container was not found.");
        return;
    }

    function createShaddrackParticle() {
        const particle = document.createElement("span");

        particle.className = "particle";

        particle.style.left =
            Math.random() * 100 + "%";

        particle.style.animationDuration =
            (Math.random() * 8 + 6) + "s";

        particle.style.animationDelay =
            Math.random() * 3 + "s";

        const size = Math.random() * 4 + 2;

        particle.style.width = size + "px";
        particle.style.height = size + "px";

        shaddrackParticles.appendChild(particle);

        setTimeout(function () {
            particle.remove();
        }, 16000);
    }

    // Initial particles
    for (let i = 0; i < 35; i++) {
        createShaddrackParticle();
    }

    // Continuously create new particles
    setInterval(createShaddrackParticle, 450);

})();
