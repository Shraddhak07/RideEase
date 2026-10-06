/**
 * RideEase - Client-side helpers
 * All pricing/availability decisions are made on the SERVER (PHP);
 * the calculations below are UI previews only.
 */

(function () {
  'use strict';

  /* ---------- 1. Auto-dismiss non-critical alerts ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.alert[data-auto-dismiss]').forEach(function (el) {
      setTimeout(function () {
        var bsAlert = bootstrap.Alert.getOrCreateInstance(el);
        bsAlert.close();
      }, 5000);
    });
  });

  /* ---------- 2. Date inputs: never allow past dates ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var today = new Date();
    var iso = today.toISOString().slice(0, 10);
    document.querySelectorAll('input[type="date"][data-min-today]').forEach(function (input) {
      input.min = iso;
    });
  });

  /* ---------- 3. Booking cost calculator (preview only) ---------- */
  // Usage: give the form the ids #pickup_date, #return_date and
  // data-price-per-day on the form (or a .booking-calc container).
  function calcBooking(form) {
    var pickup = form.querySelector('#pickup_date');
    var ret    = form.querySelector('#return_date');
    if (!pickup || !ret) return;

    var perDay = parseFloat(form.getAttribute('data-price-per-day') || '0') || 0;
    var deposit = parseFloat(form.getAttribute('data-security-deposit') || '0') || 0;
    var latePerDay = parseFloat(form.getAttribute('data-late-fee-per-day') || '0') || 0;

    var outDays = form.querySelector('[data-out="days"]');
    var outRental = form.querySelector('[data-out="rental"]');
    var outTotal = form.querySelector('[data-out="total"]');

    var p = new Date(pickup.value + 'T00:00:00');
    var r = new Date(ret.value + 'T00:00:00');

    var days = 0;
    if (!isNaN(p) && !isNaN(r) && r > p) {
      days = Math.round((r - p) / 86400000); // ms per day
    }

    var rental = days * perDay;
    var total = rental + deposit;

    if (outDays)   outDays.textContent = days;
    if (outRental) outRental.textContent = formatMoney(rental);
    if (outTotal)  outTotal.textContent = formatMoney(total);
  }

  function formatMoney(n) {
    // Intl with the site currency; falls back gracefully offline.
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
    } catch (e) {
      return '₹' + n.toFixed(2);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form.booking-calc').forEach(function (form) {
      calcBooking(form);
      form.addEventListener('change', function () { calcBooking(form); });
      form.addEventListener('input', function () { calcBooking(form); });
    });
  });

  /* ---------- 4. Confirm dialogs for destructive actions ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-confirm]');
    if (!el) return;
    var msg = el.getAttribute('data-confirm');
    if (!window.confirm(msg)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });

  /* ---------- 5. Print receipt button ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-print]');
    if (el) {
      ev.preventDefault();
      window.print();
    }
  });

  /* ---------- 6. Sync return date minimum with pickup date ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var pickup = document.querySelector('#pickup_date');
    var ret = document.querySelector('#return_date');
    if (pickup && ret) {
      pickup.addEventListener('change', function () {
        if (pickup.value) {
          ret.min = pickup.value; // same-day pickup/return = 1 day minimum
          if (ret.value && ret.value < pickup.value) { ret.value = pickup.value; }
        }
      });
    }
  });

})();
