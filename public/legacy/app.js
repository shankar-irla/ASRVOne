document.documentElement.classList.add('js');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('.primary-nav');
const themeToggle = document.querySelector('.site-header [data-theme-toggle]');
const themeStorageKey = 'asrvone-theme';

function setPlatformTheme(theme, persist = false) {
  document.querySelectorAll('.platform-page').forEach((page) => page.classList.toggle('theme-dark', theme === 'dark'));
  if (themeToggle) {
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }
  if (persist) {
    try { localStorage.setItem(themeStorageKey, theme); } catch {}
  }
}

let savedTheme = 'light';
try { savedTheme = localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light'; } catch {}
setPlatformTheme(savedTheme);
themeToggle?.addEventListener('click', () => setPlatformTheme(themeToggle.getAttribute('aria-pressed') === 'true' ? 'light' : 'dark', true));

function setMenu(open) {
  menuToggle?.setAttribute('aria-expanded', String(open));
  menuToggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  primaryNav?.classList.toggle('is-open', open);
}

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  setMenu(!isOpen);
});

primaryNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

const hero = document.querySelector('.hero');
const palace = document.querySelector('#palace-scene');
const palaceWrap = document.querySelector('.palace-wrap');
const journeySection = document.querySelector('#journey');
const journeyStage = document.querySelector('.journey-stage');
const journeyCopy = document.querySelector('.journey-copy');
const journeyCount = document.querySelector('#journey-count');
const journeyTitle = document.querySelector('#journey-title');
const journeyDescription = document.querySelector('#journey-description');
const journeySteps = [...document.querySelectorAll('.journey-step')];
const journeyChapters = [
  { title: 'Discover', description: 'Follow the question you can’t quite leave alone.' },
  { title: 'Learn', description: 'Give curiosity good foundations, then let understanding find its own voice.' },
  { title: 'Code', description: 'Turn an idea into something the machine can understand—and someone can use.' },
  { title: 'Connect', description: 'The right question grows when it meets another thoughtful mind.' },
  { title: 'Grow', description: 'Practice moves the horizon a little farther, one brave attempt at a time.' },
  { title: 'Succeed', description: 'Success is not the end of the story. It is what you are ready to give back.' }
];
let activeJourneyIndex = 0;
let journeyChangeTimer = 0;

function setJourneyChapter(index, animate = true) {
  const nextIndex = Math.max(0, Math.min(journeyChapters.length - 1, index));
  if (nextIndex === activeJourneyIndex && journeyTitle?.textContent?.startsWith(journeyChapters[nextIndex].title)) return;
  activeJourneyIndex = nextIndex;
  const chapter = journeyChapters[nextIndex];
  journeySteps.forEach((button, step) => {
    const current = step === nextIndex;
    button.classList.toggle('is-current', current);
    if (current) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  journeyStage?.setAttribute('data-step', String(nextIndex));
  document.documentElement.style.setProperty('--journey-progress', (nextIndex / Math.max(1, journeyChapters.length - 1)).toFixed(4));

  const updateCopy = () => {
    if (journeyCount) journeyCount.innerHTML = `${String(nextIndex + 1).padStart(2, '0')} <i>/ 06</i>`;
    if (journeyTitle) journeyTitle.innerHTML = `${chapter.title}<span>.</span>`;
    if (journeyDescription) journeyDescription.textContent = chapter.description;
    journeyCopy?.classList.remove('is-changing');
  };

  if (!animate || reducedMotion || !journeyCopy) {
    window.clearTimeout(journeyChangeTimer);
    updateCopy();
    return;
  }
  journeyCopy.classList.add('is-changing');
  window.clearTimeout(journeyChangeTimer);
  journeyChangeTimer = window.setTimeout(updateCopy, 150);
}

journeySteps.forEach((button) => {
  button.addEventListener('click', () => {
    if (!journeySection) return;
    const index = Number(button.dataset.step);
    const travel = Math.max(0, journeySection.offsetHeight - window.innerHeight);
    const start = journeySection.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: start + travel * (index / Math.max(1, journeySteps.length - 1)), behavior: reducedMotion ? 'auto' : 'smooth' });
  });
});

let scrollFrame = 0;
function updateScrollExperience() {
  scrollFrame = 0;
  header?.classList.toggle('is-scrolled', window.scrollY > 24);
  const pageLength = document.documentElement.scrollHeight - window.innerHeight;
  const pageProgress = pageLength > 0 ? Math.min(1, Math.max(0, window.scrollY / pageLength)) : 0;
  document.documentElement.style.setProperty('--page-progress', pageProgress.toFixed(4));

  if (journeySection) {
    const travel = Math.max(1, journeySection.offsetHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -journeySection.getBoundingClientRect().top / travel));
    document.documentElement.style.setProperty('--journey-progress', progress.toFixed(4));
    journeySection.style.setProperty('--journey-lift', `${((progress - 0.5) * 24).toFixed(1)}px`);
    journeyStage?.style.setProperty('--rail-progress', progress.toFixed(4));
    const nextIndex = Math.round(progress * (journeyChapters.length - 1));
    setJourneyChapter(nextIndex);
  }

  if (!hero || !palace || reducedMotion) return;
  const travel = Math.max(0, -hero.getBoundingClientRect().top);
  const reveal = Math.min(1, travel / Math.max(1, hero.offsetHeight * 0.68));
  palace.style.setProperty('--scroll-y', `${(-reveal * 82).toFixed(1)}px`);
  palace.style.setProperty('--scroll-scale', (1 + reveal * 0.17).toFixed(3));
  palace.style.setProperty('--scroll-opacity', (1 - reveal * 0.74).toFixed(3));
  hero.style.setProperty('--dawn-opacity', (reveal * 0.14).toFixed(3));
  hero.style.setProperty('--copy-lift', `${(-reveal * 48).toFixed(1)}px`);
  hero.style.setProperty('--copy-opacity', (1 - reveal * 0.86).toFixed(3));
}
function requestScrollExperience() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollExperience);
}
updateScrollExperience();
window.addEventListener('scroll', requestScrollExperience, { passive: true });
window.addEventListener('resize', requestScrollExperience, { passive: true });

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const pathCopy = {
  clarity: {
    number: '01',
    eyebrow: 'CONCEPTS WITH CLARITY',
    title: 'Understand the why.<br /><em>Then write the how.</em>',
    description: 'Strong foundations are built when a concept makes sense in your own words. We make room for questions before we ask you to memorise answers.'
  },
  practice: {
    number: '02',
    eyebrow: 'PRACTICE WITH PURPOSE',
    title: 'Let understanding<br /><em>meet the keyboard.</em>',
    description: 'Turn each idea into a small act of making. Work through problems, compare approaches, and let regular practice give your understanding its shape.'
  },
  guidance: {
    number: '03',
    eyebrow: 'GUIDANCE & MENTORSHIP',
    title: 'You can go far.<br /><em>You need not go alone.</em>',
    description: 'When the next step feels hidden, a mentor can offer direction while you keep ownership of the journey. Questions belong here.'
  }
};

const pathTabs = [...document.querySelectorAll('.path-tab')];
const pathPanel = document.querySelector('#path-panel');
const pathNumber = document.querySelector('#path-number');
const pathEyebrow = document.querySelector('#path-eyebrow');
const pathTitle = document.querySelector('#path-title');
const pathDescription = document.querySelector('#path-description');

function selectPath(tab, moveFocus = false) {
  const path = pathCopy[tab.dataset.path];
  if (!path) return;
  pathTabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  pathPanel?.setAttribute('aria-labelledby', tab.id);
  if (moveFocus) tab.focus();
  if (pathNumber) pathNumber.textContent = path.number;
  if (pathEyebrow) pathEyebrow.textContent = path.eyebrow;
  if (pathTitle) pathTitle.innerHTML = path.title;
  if (pathDescription) pathDescription.textContent = path.description;
}

pathTabs.forEach((tab, index) => {
  tab.tabIndex = index === 0 ? 0 : -1;
  tab.addEventListener('click', () => selectPath(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + pathTabs.length) % pathTabs.length;
    if (event.key === 'ArrowRight') next = (index + 1) % pathTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = pathTabs.length - 1;
    selectPath(pathTabs[next], true);
  });
});

document.querySelectorAll('.curriculum-trigger').forEach((button) => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const content = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(!expanded));
    if (content) content.hidden = expanded;
    const marker = button.querySelector('.curriculum-plus');
    if (marker) marker.textContent = expanded ? '+' : '−';
  });
});

const learnerAdvice = {
  new: 'Begin with Java foundations: learn the language, then make control flow and methods feel like your own.',
  java: 'Move into arrays and strings. Build a habit of tracing each step before you ask the code to run.',
  dsa: 'Choose a problem, make your reasoning visible, then compare the time and space your approach asks for.'
};
const finderButtons = [...document.querySelectorAll('.finder-option')];
const finderAnswer = document.querySelector('#finder-answer');
finderButtons.forEach((button) => {
  button.addEventListener('click', () => {
    finderButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    if (finderAnswer) finderAnswer.textContent = learnerAdvice[button.dataset.choice] ?? learnerAdvice.new;
  });
  button.setAttribute('aria-pressed', String(button.classList.contains('is-selected')));
});

const exercises = [
  {
    label: 'JAVA · 01',
    question: 'A learner passes with 70 marks or more. Which condition includes 70?',
    hint: 'A boundary deserves a precise operator.',
    options: ['marks > 70', 'marks >= 70', 'marks == 70'],
    answer: 1,
    explanation: '>= includes the boundary and every value above it. > starts one mark later; == accepts only exactly 70.'
  },
  {
    label: 'JAVA · 02',
    question: 'For an array of length n, which loop visits each valid index once?',
    hint: 'The first index is 0. The last is one less than the length.',
    options: ['for (int i = 0; i < n; i++)', 'for (int i = 0; i <= n; i++)', 'for (int i = 1; i < n; i++)'],
    answer: 0,
    explanation: 'Array indices run from 0 through n - 1, so i < n visits each valid position and stops before n.'
  }
];
let exerciseIndex = 0;
const exerciseNumber = document.querySelector('#exercise-number');
const exerciseQuestion = document.querySelector('#exercise-question');
const exerciseHint = document.querySelector('#exercise-hint');
const exerciseFeedback = document.querySelector('#exercise-feedback');
const exerciseGroup = document.querySelector('#exercise-options');
const exerciseOptions = [...document.querySelectorAll('.exercise-option')];

function renderExercise() {
  const exercise = exercises[exerciseIndex];
  if (exerciseNumber) exerciseNumber.textContent = exercise.label;
  if (exerciseQuestion) exerciseQuestion.textContent = exercise.question;
  if (exerciseHint) exerciseHint.textContent = exercise.hint;
  exerciseGroup?.setAttribute('aria-label', exerciseIndex === 0 ? 'Choose a Java condition' : 'Choose a valid index loop');
  if (exerciseFeedback) {
    exerciseFeedback.hidden = true;
    exerciseFeedback.textContent = '';
    exerciseFeedback.classList.remove('is-correct');
  }
  exerciseOptions.forEach((button, index) => {
    button.setAttribute('aria-pressed', 'false');
    const code = button.querySelector('code');
    if (code) code.textContent = exercise.options[index];
  });
}

exerciseOptions.forEach((button) => {
  button.addEventListener('click', () => {
    const exercise = exercises[exerciseIndex];
    const choice = Number(button.dataset.option);
    const isCorrect = choice === exercise.answer;
    exerciseOptions.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    if (!exerciseFeedback) return;
    exerciseFeedback.hidden = false;
    exerciseFeedback.classList.toggle('is-correct', isCorrect);
    exerciseFeedback.textContent = isCorrect
      ? `Exactly. ${exercise.explanation}`
      : `Not quite. ${exercise.explanation}`;
  });
});

document.querySelector('#next-problem')?.addEventListener('click', () => {
  exerciseIndex = (exerciseIndex + 1) % exercises.length;
  renderExercise();
});

if (palace && palaceWrap && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
  palaceWrap.addEventListener('pointermove', (event) => {
    const bounds = palaceWrap.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    palace.style.setProperty('--tilt-x', `${(x * 8).toFixed(2)}deg`);
    palace.style.setProperty('--tilt-y', `${(-y * 5).toFixed(2)}deg`);
  });
  palaceWrap.addEventListener('pointerleave', () => {
    palace.style.setProperty('--tilt-x', '0deg');
    palace.style.setProperty('--tilt-y', '0deg');
  });
}

const navLinks = [...document.querySelectorAll('.primary-nav a')];
const trackedSections = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const navObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      const current = link.getAttribute('href') === `#${visible.target.id}`;
      link.classList.toggle('is-current', current);
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-24% 0px -62% 0px', threshold: [0, .15, .4] });
  trackedSections.forEach((section) => navObserver.observe(section));
}

document.querySelector('.brand-crop img')?.addEventListener('error', () => {
  document.querySelector('.brand-crop').hidden = true;
  const fallback = document.querySelector('.brand-fallback');
  if (fallback) fallback.style.display = 'flex';
});

const registrationForm = document.querySelector('#registration-form');
const registrationSuccess = document.querySelector('#registration-success');
const registrationStatus = document.querySelector('#registration-status');
const registrationSubmit = document.querySelector('#registration-submit');
const registrationAgain = document.querySelector('#registration-again');
const applicationReference = document.querySelector('#application-reference');
const registrationDeliveryNote = document.querySelector('#registration-delivery-note');

registrationForm?.addEventListener('input', (event) => {
  if (event.target instanceof HTMLElement) event.target.removeAttribute('aria-invalid');
  if (registrationStatus) registrationStatus.textContent = '';
});

registrationForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!registrationForm.reportValidity()) return;

  const honeypot = registrationForm.querySelector('[name="_gotcha"]');
  if (honeypot?.value) return;

  if (registrationStatus) registrationStatus.textContent = '';
  registrationForm.setAttribute('aria-busy', 'true');
  if (registrationSubmit) {
    registrationSubmit.disabled = true;
    registrationSubmit.dataset.label = registrationSubmit.innerHTML;
    registrationSubmit.innerHTML = 'Sending your note <span aria-hidden="true">…</span>';
  }

  try {
    const response = await fetch(registrationForm.action, {
      method: 'POST',
      body: new FormData(registrationForm),
      headers: { Accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errors = Array.isArray(payload.fields) ? payload.fields : [];
      errors.forEach((item) => {
        const fieldName = item.path?.split('.').at(-1);
        const field = fieldName ? registrationForm.elements.namedItem(fieldName) : null;
        if (field instanceof HTMLElement) field.setAttribute('aria-invalid', 'true');
      });
      const message = errors.map((item) => item.message).filter(Boolean).join(' ');
      throw new Error(message || 'The form could not reach ASRVOne just now. Please check the highlighted fields and try again.');
    }

    if (applicationReference) applicationReference.textContent = payload.applicationId ? `ASRV-${payload.applicationId.slice(0, 8).toUpperCase()}` : 'RECORDED';
    if (registrationDeliveryNote) registrationDeliveryNote.textContent = payload.formspreeAccepted
      ? 'Your application is stored in ASRVOne and was accepted by Formspree for its email workflow.'
      : 'Your application is stored in ASRVOne, but email delivery was not confirmed. Keep this reference for follow-up.';
    registrationForm.hidden = true;
    if (registrationSuccess) {
      registrationSuccess.hidden = false;
      registrationSuccess.focus();
    }
  } catch (error) {
    if (registrationStatus) registrationStatus.textContent = error instanceof Error
      ? error.message
      : 'The form could not reach ASRVOne just now. Please try again.';
  } finally {
    registrationForm.setAttribute('aria-busy', 'false');
    if (registrationSubmit) {
      registrationSubmit.disabled = false;
      registrationSubmit.innerHTML = registrationSubmit.dataset.label || 'Send my registration';
    }
  }
});

registrationAgain?.addEventListener('click', () => {
  if (!registrationForm || !registrationSuccess) return;
  registrationForm.reset();
  registrationForm.hidden = false;
  registrationSuccess.hidden = true;
  registrationStatus && (registrationStatus.textContent = '');
  document.querySelector('#registration-name')?.focus();
});

function initSkyCanvas() {
  const canvas = document.querySelector('#sky-canvas');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !context || !hero) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let frameId = 0;
  let lastTime = 0;
  let active = !('IntersectionObserver' in window);
  const stars = [];
  const count = window.innerWidth < 700 ? 34 : 74;

  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetStar(star, randomY = true) {
    star.x = Math.random() * width;
    star.y = randomY ? Math.random() * height : height + 4;
    star.depth = 0.22 + Math.random() * 0.78;
    star.radius = 0.35 + star.depth * 1.1;
    star.vx = (Math.random() - 0.5) * (0.08 + star.depth * 0.2);
    star.vy = -(0.05 + star.depth * 0.19);
    star.phase = Math.random() * Math.PI * 2;
  }

  function draw(time, animate) {
    context.clearRect(0, 0, width, height);
    const delta = lastTime ? Math.min((time - lastTime) / 16.67, 2) : 1;
    lastTime = time;

    for (const star of stars) {
      if (animate) {
        star.x += star.vx * delta;
        star.y += star.vy * delta;
        star.phase += 0.012 * delta;
        if (star.y < -5 || star.x < -5 || star.x > width + 5) resetStar(star, false);
      }
      const twinkle = 0.42 + (Math.sin(star.phase) + 1) * 0.24;
      context.beginPath();
      context.fillStyle = `rgba(236, 209, 151, ${twinkle * star.depth})`;
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
      if (star.depth > 0.84) {
        context.beginPath();
        context.fillStyle = `rgba(231, 192, 111, ${twinkle * 0.12})`;
        context.arc(star.x, star.y, star.radius * 5, 0, Math.PI * 2);
        context.fill();
      }
    }

    if (animate) {
      for (let i = 0; i < stars.length; i += 1) {
        for (let j = i + 1; j < stars.length; j += 1) {
          const a = stars[i];
          const b = stars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared > 7200 || Math.abs(a.depth - b.depth) > 0.24) continue;
          const alpha = (1 - distanceSquared / 7200) * 0.095;
          context.strokeStyle = `rgba(200, 164, 98, ${alpha})`;
          context.lineWidth = 0.55;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
    }

    if (animate && active && !document.hidden) frameId = requestAnimationFrame((nextTime) => draw(nextTime, true));
  }

  function start() {
    if (reducedMotion) {
      draw(0, false);
      return;
    }
    if (active && !document.hidden && !frameId) frameId = requestAnimationFrame((time) => draw(time, true));
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastTime = 0;
  }

  resize();
  for (let i = 0; i < count; i += 1) {
    const star = {};
    resetStar(star);
    stars.push(star);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      active ? start() : stop();
    }, { threshold: 0.01 });
    observer.observe(hero);
  }
  window.addEventListener('resize', () => {
    resize();
    if (reducedMotion) draw(0, false);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  start();
}

initSkyCanvas();
