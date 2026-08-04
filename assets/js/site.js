/* ============================================================
   Space Console landing — one ES module, no dependencies.
   Everything here is enhancement: the page reads fine with js off
   (marquees become scrollable rows, reveals render visible, the
   diagram shows its handshake state).
   ============================================================ */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------- nav border */
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ------------------------------------------------ scroll reveals */
/* .step elements also get .in — the roster seats stagger off it.  */
{
  const targets = document.querySelectorAll('.reveal, .step');
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(el => io.observe(el));
  }
}

/* -------------------------------------------- beams (SMIL guards) */
/* SMIL ignores prefers-reduced-motion, so we pause the svg clocks
   ourselves — permanently under reduced motion, and whenever a
   beam is off-screen so the packets cost nothing.                 */
{
  const svgs = document.querySelectorAll('.beam, #hoodSvg, .steps-rail svg');
  if (reduced) {
    svgs.forEach(s => s.pauseAnimations && s.pauseAnimations());
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.target.pauseAnimations) continue;
        e.isIntersecting ? e.target.unpauseAnimations() : e.target.pauseAnimations();
      }
    }, { threshold: 0 });
    svgs.forEach(s => io.observe(s));
  }
}

/* -------------------------------------------------- stylized QR */
/* Fill the step-2 QR with a deterministic cell pattern (a hash of
   "3WGL") so it draws no request and always renders the same.     */
{
  const cells = document.querySelector('.qr-cells');
  if (cells) {
    let seed = 0x3258595a; // "3WGL"
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const svgNS = 'http://www.w3.org/2000/svg';
    const frag = document.createDocumentFragment();
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        const inEye = (x < 4 && y < 4) || (x > 7 && y < 4) || (x < 4 && y > 7);
        if (inEye || rnd() < 0.55) continue;
        const r = document.createElementNS(svgNS, 'rect');
        r.setAttribute('x', 6 + x * 7);  r.setAttribute('y', 6 + y * 7);
        r.setAttribute('width', 5);      r.setAttribute('height', 5);
        r.setAttribute('rx', 1);
        frag.appendChild(r);
      }
    }
    cells.appendChild(frag);
  }
}

/* --------------------------------------- the controller morphs */
{
  const chips    = [...document.querySelectorAll('.chip')];
  const pads     = [...document.querySelectorAll('.pad')];
  const device   = document.getElementById('liveDevice');
  const caption  = document.getElementById('padCaption');
  const readout  = document.getElementById('padReadout');
  const roVals   = [document.getElementById('roProfile'), document.getElementById('roInput')];

  /* copy is factual: cap/ro are what the game declares. NBSP glues the
     caption tails so no line ends on a one- or two-word orphan.       */
  const NB = '\u00a0';
  const INFO = {
    menu:      { cap: `menu → d-pad · Select · Back — the fallback when a game declares${NB}nothing`,
                 ro:  ['d-pad', 'select · back'],
                 aria: 'Phone controller showing the menu layout: d-pad with Select and Back' },
    pinball:   { cap: `pinball → two held flipper buttons, left${NB}and${NB}right`,
                 ro:  ['flippers', 'left · right · hold'],
                 aria: 'Phone controller showing the pinball layout: two large hold buttons for the left and right flippers' },
    rc:        { cap: `rc rush → landscape driving pad: stick · gas · brake · drift, streamed as continuous${NB}frames`,
                 ro:  ['driving', 'stick · gas · brake · drift'],
                 aria: 'Phone rotated to landscape showing the driving pad: steering joystick with gas, brake and drift buttons' },
    mines:     { cap: `minesweeper → Reveal + Flag over a compact${NB}d-pad`,
                 ro:  ['d-pad', 'reveal · flag'],
                 aria: 'Phone controller showing the minesweeper layout: d-pad with Reveal and Flag buttons' },
    blackjack: { cap: `blackjack → Hit · Stand · Double${NB}·${NB}Split`,
                 ro:  ['buttons', 'hit · stand · double · split'],
                 aria: 'Phone controller showing the blackjack layout: Hit, Stand, Double and Split buttons' },
  };

  const show = (id) => {
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.pad === id)));
    pads.forEach(p => p.classList.toggle('is-on', p.dataset.pad === id));
    device.classList.toggle('landscape', id === 'rc');
    device.setAttribute('aria-label', INFO[id].aria);
    caption.textContent = INFO[id].cap;
    if (readout) {
      roVals.forEach((el, k) => { el.textContent = INFO[id].ro[k]; });
      readout.classList.remove('swap');
      void readout.offsetWidth;              // restart the value fade
      readout.classList.add('swap');
    }
  };

  /* auto-cycle once the section scrolls into view; any user touch
     of the chips hands control over for good. */
  const order = ['menu', 'pinball', 'rc', 'mines', 'blackjack'];
  let i = 0, timer = null;

  const stopCycle = () => { clearInterval(timer); timer = null; };
  const startCycle = () => {
    if (timer || reduced) return;
    timer = setInterval(() => { i = (i + 1) % order.length; show(order[i]); }, 3000);
  };

  chips.forEach(c => c.addEventListener('click', () => {
    stopCycle();
    startCycle.disabled = true;            // never resume after interaction
    i = order.indexOf(c.dataset.pad);
    show(c.dataset.pad);
  }));

  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (startCycle.disabled) { io.disconnect(); return; }
        e.isIntersecting ? startCycle() : stopCycle();
      }
    }, { threshold: 0.35 });
    io.observe(device);
  }
}

/* ------------------------------------------------------ marquees */
/* Clone each row once for the seamless -50% loop, then arm the css
   animation. Skipped under reduced motion (rows stay scrollable). */
{
  const marquees = document.querySelectorAll('.marquee');
  if (!reduced) {
    marquees.forEach(m => {
      const track = m.querySelector('.marquee-track');
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach(img => img.alt = '');
      track.append(...clone.children);
      m.classList.add('ready');
    });
    /* pause the whole shelf when off-screen — free scrolling is not */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting));
      }, { threshold: 0 });
      marquees.forEach(m => io.observe(m));
    }
  }
}

/* --------------------------------------- under-the-hood phases */
/* Alternate handshake ↔ p2p while visible; settle on p2p (the
   truthful steady state) under reduced motion or with js idle.   */
{
  const svg   = document.getElementById('hoodSvg');
  const phase = document.getElementById('hoodPhase');
  if (svg) {
    const LABELS = ['1 · handshake via signaling', '2 · direct link — server steps out'];
    if (reduced) {
      svg.classList.add('phase-p2p');
      phase.textContent = LABELS[1];
    } else {
      let p = 0, timer = null;
      const tick = () => {
        p = 1 - p;
        svg.classList.toggle('phase-p2p', p === 1);
        phase.textContent = LABELS[p];
      };
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !timer) {
            /* land on the p2p state quickly, then keep alternating */
            setTimeout(tick, 1600);
            timer = setInterval(tick, 4200);
          } else if (!e.isIntersecting && timer) {
            clearInterval(timer); timer = null;
          }
        }
      }, { threshold: 0.4 });
      io.observe(svg);
    }
  }
}

/* -------------------------------------------- finale code flourish */
/* The four slots spin through glyphs and settle on 2 X Y Z each time
   the finale enters the viewport. Pure text swaps — no layout work. */
{
  const code = document.getElementById('finaleCode');
  if (code && !reduced && 'IntersectionObserver' in window) {
    const GLYPHS = 'ABCDEFGHJKMNPQRSTUVWXYZ2345679';
    const slots = [...code.children];
    let spinning = false;

    const spin = () => {
      if (spinning) return;
      spinning = true;
      slots.forEach((el, idx) => {
        const final = el.dataset.ch;
        let n = 0;
        const max = 6 + idx * 3;               // later slots settle later
        const t = setInterval(() => {
          el.textContent = (++n >= max)
            ? final
            : GLYPHS[(Math.random() * GLYPHS.length) | 0];
          if (n >= max) { clearInterval(t); if (idx === slots.length - 1) spinning = false; }
        }, 70);
      });
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) spin(); });
    }, { threshold: 0.6 });
    io.observe(code);
  }
}
