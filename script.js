
// ==========================================
// SHADDRACK GALLERY - PARTICLE EFFECTS
// ==========================================

const particleContainer = document.getElementById("particles");

function createParticle() {
    if (!particleContainer) return;

    const particle = document.createElement("span");

    particle.className = "particle";

    particle.style.left = Math.random() * 100 + "%";
    particle.style.animationDuration =
        (Math.random() * 8 + 6) + "s";

    particle.style.animationDelay =
        Math.random() * 5 + "s";

    const size = Math.random() * 4 + 2;

    particle.style.width = size + "px";
    particle.style.height = size + "px";

    particleContainer.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, 16000);
}

// Create particles gradually
for (let i = 0; i < 35; i++) {
    createParticle();
}

// Keep generating particles
setInterval(createParticle, 450);
