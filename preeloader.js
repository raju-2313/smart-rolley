const $ = id => document.getElementById(id);

    const els = {
      preloader:    $('preloader'),
      corners:      document.querySelectorAll('.corner'),
      titleBlock:   $('titleBlock'),
      barcodeWrap:  $('barcodeWrap'),
      barcodeSvg:   $('barcodeSvg'),
      laser:        $('laser'),
      productIcon:  $('productIcon'),
      cartArea:     $('cartArea'),
      flyItem:      $('flyItem'),
      cartItem1:    $('cartItem1'),
      cartItem2:    $('cartItem2'),
      cartItem3:    $('cartItem3'),
      progressWrap: $('progressWrap'),
      progressFill: $('progressFill'),
      pctLabel:     $('pctLabel'),
      readyText:    $('readyText'),
      pulseRing:    $('pulseRing'),
      mainContent:  $('main-content'),
    };

    // Utility: show corners
    function showCorners() {
      els.corners.forEach(c => c.classList.add('visible'));
    }

    // Utility: animate percentage counter
    function animatePct(from, to, duration, onUpdate, onDone) {
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
        const val = Math.round(from + eased * (to - from));
        onUpdate(val);
        if (t < 1) requestAnimationFrame(tick);
        else onDone && onDone();
      }
      requestAnimationFrame(tick);
    }

    
    // ── SEQUENCE ─────────────────────────────────────────────
    function runSequence() {

      // Step 1 — blank slate (already dark bg) + corners slide in
      delay(100, () => showCorners());

      // Step 2 — Title fades in
      delay(300, () => els.titleBlock.classList.add('visible'));

      // Step 3 — Barcode appears
      delay(800, () => els.barcodeWrap.classList.add('visible'));

      // Step 4 — Laser scans
      delay(1100, () => els.laser.classList.add('scanning'));

      // Step 5 — Barcode → Product icon
      delay(1800, () => {
        // fade out barcode bars, show box
        els.barcodeSvg.style.transition = 'opacity 0.4s ease';
        els.barcodeSvg.style.opacity    = '0';
        setTimeout(() => els.productIcon.classList.add('visible'), 200);
      });

      // Step 6 — Cart appears + product flies in
      delay(2300, () => {
        els.cartArea.classList.add('visible');
        setTimeout(() => {
          els.flyItem.classList.add('fly-animate');
          // pop items into cart progressively
          setTimeout(() => { els.cartItem1.style.transition = 'opacity 0.3s'; els.cartItem1.style.opacity = '1'; }, 400);
          setTimeout(() => { els.cartItem2.style.transition = 'opacity 0.3s'; els.cartItem2.style.opacity = '1'; }, 600);
          setTimeout(() => { els.cartItem3.style.transition = 'opacity 0.3s'; els.cartItem3.style.opacity = '1'; }, 800);
        }, 300);
      });

    // Step 7 — Progress bar fills
    delay(3000, () => {
        els.progressWrap.classList.add('visible');
        setTimeout(() => {
            els.progressFill.classList.add('filled');
            animatePct(0, 100, 1700, v => els.pctLabel.textContent = v + '%', null);
        }, 100);

        // Play via Web Audio API — no autoplay block
       
    });

      // Step 8 — "Smart Trolley Ready"
      delay(4000, () => {
        els.readyText.classList.add('visible');
        setTimeout(() => els.pulseRing.classList.add('active'), 400);
      });

      // Step 9 — Fade out preloader, reveal main content
      delay(5500, () => {
          els.preloader.classList.add('fade-out');

          if (els.mainContent) {
              setTimeout(() => els.mainContent.classList.add('visible'), 100);
          }

          setTimeout(() => els.preloader.style.display = 'none', 1200);
          // Robot overlay is already loaded underneath — appears instantly
      });
    }

    function delay(ms, fn) { setTimeout(fn, ms); }

    // Kick off when DOM is ready
    document.addEventListener('DOMContentLoaded', runSequence);