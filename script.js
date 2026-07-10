(() => {
  const PASSCODE = '110709';
  const stateElements = Array.from(document.querySelectorAll('.app-state'));
  const keypadButtons = Array.from(document.querySelectorAll('[data-key]'));
  const pinDots = Array.from(document.querySelectorAll('.pin-dot'));
  const sealButton = document.getElementById('seal-button');
  const surpriseLink = document.getElementById('surprise-link');
  const cakeButton = document.getElementById('cake-button');
  const countdownNumber = document.getElementById('countdown-number');
  const blowPrompt = document.getElementById('blow-prompt');
  const specialButton = document.getElementById('special-button');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const wishLayer = document.getElementById('wish-layer');
  const birthdayAudio = document.getElementById('birthday-audio');
  const birthdayVideo = document.getElementById('birthday-video');
  const letterPanel = document.querySelector('.letter-panel');
  const letterBody = document.querySelector('.letter-body');

  const ctx = confettiCanvas.getContext('2d');
  let currentState = 1;
  let passcode = '';
  let loadingTimer = null;
  let countdownTimer = null;
  let confettiFrame = null;
  let audioStarted = false;
  let wishTimers = [];

  const wishes = [
    'Wishing you the best year ever! 💖',
    'To my partner in crime! 🥂',
    'May all your soft dreams come true ✨',
    'You deserve every little sparkle today 🎀',
  ];

  const particles = [];

  function splitLetterText(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.split(' ') : [];
  }

  function prepareLetterReveal() {
    if (!letterPanel || !letterBody || letterBody.dataset.revealed === 'true') return;

    const fragment = document.createDocumentFragment();
    const words = splitLetterText(letterBody.textContent || '');

    letterBody.textContent = '';

    words.forEach((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'letter-line';
      wordSpan.style.animationDelay = `${index * 70}ms`;
      wordSpan.textContent = word;
      fragment.appendChild(wordSpan);
      fragment.appendChild(document.createTextNode(' '));
    });

    letterBody.appendChild(fragment);
    letterBody.dataset.revealed = 'true';
  }

  function revealLetterPanel() {
    if (!letterPanel) return;

    prepareLetterReveal();
    letterPanel.classList.remove('is-revealed');
    void letterPanel.offsetWidth;
    letterPanel.classList.add('is-revealed');
    letterPanel.scrollTop = 0;

    const letterState = document.querySelector('.state-4 .state-inner');
    if (letterState) {
      letterState.scrollTop = 0;
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    confettiCanvas.width = Math.floor(window.innerWidth * ratio);
    confettiCanvas.height = Math.floor(window.innerHeight * ratio);
    confettiCanvas.style.width = '100%';
    confettiCanvas.style.height = '100%';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function activateState(nextState) {
    currentState = nextState;
    stateElements.forEach((section) => {
      section.classList.toggle('is-active', Number(section.dataset.state) === nextState);
    });
  }

  function syncPins() {
    pinDots.forEach((dot, index) => {
      dot.classList.toggle('is-filled', index < passcode.length);
    });
  }

  function resetPasscode() {
    passcode = '';
    syncPins();
  }

  function clickTone(frequency = 880, duration = 0.03, type = 'sine', gainValue = 0.02) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = clickTone.audioContext || new AudioContextClass();
    clickTone.audioContext = audioContext;
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function ensureAudio() {
    if (audioStarted) return;
    audioStarted = true;
    if (!birthdayAudio) return;
    birthdayAudio.volume = 0.55;
    const playPromise = birthdayAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        audioStarted = false;
      });
    }
  }

  function fadeOutAudio() {
    if (!birthdayAudio) return;
    const startVolume = birthdayAudio.volume;
    const startTime = performance.now();
    const fadeStep = (now) => {
      const progress = Math.min((now - startTime) / 700, 1);
      birthdayAudio.volume = startVolume * (1 - progress);
      if (progress < 1) {
        requestAnimationFrame(fadeStep);
      } else {
        birthdayAudio.pause();
      }
    };
    requestAnimationFrame(fadeStep);
  }

  function onPasscodeComplete() {
    clickTone(988, 0.08, 'triangle', 0.03);
    const lockCard = document.querySelector('.lock-card');
    if (lockCard) {
      lockCard.style.transform = 'scale(0.94)';
      lockCard.style.opacity = '0.2';
      lockCard.style.transition = 'transform 0.45s ease, opacity 0.45s ease';
    }
    ensureAudio();
    setTimeout(() => {
      activateState(2);
      startLoadingSequence();
    }, 320);
  }

  function handleDigit(digit) {
    if (passcode.length >= 6) return;
    passcode += digit;
    syncPins();
    clickTone(740 + (Number(digit) * 18), 0.025, 'square', 0.012);
    if (passcode.length === 6) {
      if (passcode === PASSCODE) {
        onPasscodeComplete();
      } else {
        const lockCard = document.querySelector('.lock-card');
        if (lockCard) {
          lockCard.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }],
            { duration: 280, easing: 'ease-out' }
          );
        }
        setTimeout(resetPasscode, 260);
      }
    }
  }

  function handleClear() {
    if (!passcode) return;
    passcode = passcode.slice(0, -1);
    syncPins();
    clickTone(480, 0.02, 'sine', 0.01);
  }

  function handleDeleteAll() {
    passcode = '';
    syncPins();
    clickTone(360, 0.05, 'triangle', 0.015);
  }

  function startLoadingSequence() {
    window.clearTimeout(loadingTimer);
    loadingTimer = window.setTimeout(() => {
      activateState(3);
    }, 3500);
  }

  function openEnvelope() {
    if (!sealButton) return;
    sealButton.classList.add('is-open');
    clickTone(1260, 0.05, 'triangle', 0.02);
    window.clearTimeout(loadingTimer);
    setTimeout(() => handleStateTransitions(4), 900);
  }

  function flipCard(card) {
    card.classList.toggle('is-flipped');
    clickTone(920, 0.02, 'square', 0.008);
  }

  function startCountdown() {
    window.clearInterval(countdownTimer);
    const sequence = [3, 2, 1];
    let index = 0;
    countdownNumber.classList.remove('is-hidden');
    countdownNumber.textContent = String(sequence[index]);
    blowPrompt.textContent = 'Make a Wish ✨';

    countdownTimer = window.setInterval(() => {
      index += 1;
      if (index < sequence.length) {
        countdownNumber.textContent = String(sequence[index]);
        clickTone(840 - index * 80, 0.03, 'triangle', 0.012);
        return;
      }

      window.clearInterval(countdownTimer);
      countdownNumber.classList.add('is-hidden');
      blowPrompt.textContent = 'Tap to Blow Candles!';
      specialButton.classList.add('is-visible');
    }, 1000);
  }

  function blowCandles() {
    const candles = Array.from(document.querySelectorAll('.candle'));
    candles.forEach((candle, index) => {
      candle.classList.add('blown');
      window.setTimeout(() => {
        candle.classList.add('is-extinguished');
      }, index * 90);
    });

    burstConfetti();
    spawnWishes();
    blowPrompt.textContent = 'Happy Birthday!';
    clickTone(220, 0.11, 'sawtooth', 0.03);
    window.setTimeout(() => specialButton.classList.add('is-visible'), 450);
  }

  function burstConfetti() {
    particles.length = 0;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.58;
    const colors = ['#ffcf7a', '#ff7fa1', '#ffd9e2', '#7ad7ff', '#ffffff', '#ff9f68'];

    for (let i = 0; i < 220; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 30,
        y: centerY + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 7,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.35,
        color: colors[i % colors.length],
        life: 140 + Math.random() * 40,
        shape: i % 4,
      });
    }

    if (confettiFrame) {
      cancelAnimationFrame(confettiFrame);
    }
    animateConfetti();
  }

  function drawParticle(particle) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;
    if (particle.shape === 0) {
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 1.6);
    } else if (particle.shape === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.shape === 2) {
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size * 1.4, particle.size * 0.7);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -particle.size);
      ctx.lineTo(particle.size * 0.7, particle.size * 0.7);
      ctx.lineTo(-particle.size * 0.7, particle.size * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.09;
      particle.rotation += particle.rotationSpeed;
      particle.life -= 1;
      drawParticle(particle);
    });

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }

    if (particles.length) {
      confettiFrame = requestAnimationFrame(animateConfetti);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  function spawnWishes() {
    wishLayer.innerHTML = '';
    wishTimers.forEach((timerId) => clearTimeout(timerId));
    wishTimers = [];
    const count = 4;
    for (let i = 0; i < count; i += 1) {
      const timerId = window.setTimeout(() => {
        const bubble = document.createElement('div');
        bubble.className = `wish-bubble ${i % 2 ? 'alt' : ''}`;
        bubble.textContent = wishes[(Math.random() * wishes.length) | 0];
        bubble.style.left = `${12 + Math.random() * 70}%`;
        bubble.style.top = `${52 + Math.random() * 18}%`;
        bubble.style.animationDelay = '0s';
        bubble.style.transform = `translateY(${10 + Math.random() * 12}px) scale(${0.92 + Math.random() * 0.08})`;
        wishLayer.appendChild(bubble);
        window.setTimeout(() => bubble.remove(), 4200);
      }, (i + 1) * 2000);
      wishTimers.push(timerId);
    }
  }

  function toFinalState() {
    fadeOutAudio();
    activateState(6);
    if (birthdayVideo) {
      birthdayVideo.currentTime = 0;
      birthdayVideo.play().catch(() => {});
    }
  }

  function onStateFourEntry() {
    window.clearInterval(countdownTimer);
    countdownNumber.textContent = '3';
    countdownNumber.classList.remove('is-hidden');
    specialButton.classList.remove('is-visible');
    blowPrompt.textContent = 'Make a Wish ✨';
    const candles = Array.from(document.querySelectorAll('.candle'));
    candles.forEach((candle) => candle.classList.remove('blown', 'is-extinguished'));
    startCountdown();
  }

  function handleStateTransitions(nextState) {
    activateState(nextState);
    if (nextState === 4) revealLetterPanel();
    if (nextState === 5) onStateFourEntry();
  }

  keypadButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.key;
      if (key === 'clear') {
        handleClear();
        return;
      }
      if (key === 'delete') {
        handleDeleteAll();
        return;
      }
      handleDigit(key);
    });
  });

  sealButton?.addEventListener('click', openEnvelope);
  surpriseLink?.addEventListener('click', () => handleStateTransitions(5));

  document.querySelectorAll('[data-flip-card]').forEach((card) => {
    card.addEventListener('click', () => flipCard(card));
  });

  cakeButton?.addEventListener('click', () => {
    if (currentState !== 5) return;
    if (!document.querySelector('.candle:not(.blown)')) return;
    blowCandles();
  });

  cakeButton?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      blowCandles();
    }
  });

  specialButton?.addEventListener('click', toFinalState);

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  syncPins();
  prepareLetterReveal();
  activateState(1);
})();