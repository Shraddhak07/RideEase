/**
 * RideEase - small client-side booking and form helpers.
 * Pricing and availability are always verified by the server.
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
    var iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    document.querySelectorAll('input[type="date"][data-min-today]').forEach(function (input) {
      input.min = iso;
    });
  });

  /* ---------- 3. Booking cost calculator (preview only) ---------- */
  // Usage: give the form the ids #pickupDate, #returnDate and
  // data-price-per-day on the form (or a .booking-calc container).
  function calcBooking(form) {
    var pickup = form.querySelector('#pickupDate');
    var ret    = form.querySelector('#returnDate');
    if (!pickup || !ret) return;

    var perDay = parseFloat(form.getAttribute('data-price-per-day') || '0') || 0;
    var deposit = parseFloat(form.getAttribute('data-deposit') || '0') || 0;

    var outDays = form.querySelector('[data-out="days"]');
    var outRental = form.querySelector('[data-out="rental"]');
    var outTotal = form.querySelector('[data-out="total"]');

    var p = new Date(pickup.value + 'T00:00:00Z');
    var r = new Date(ret.value + 'T00:00:00Z');

    var days = 0;
    if (!isNaN(p) && !isNaN(r) && r > p) {
      days = Math.round((r - p) / 86400000);
    }

    var rental = days * perDay;
    var total = rental + deposit;

    if (outDays)   outDays.textContent = days + (days === 1 ? ' day' : ' days');
    if (outRental) outRental.textContent = formatMoney(rental);
    if (outTotal)  outTotal.textContent = formatMoney(total);
  }

  function formatMoney(n) {
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
  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest('form[data-confirm]');
    if (form && !window.confirm(form.getAttribute('data-confirm'))) {
      ev.preventDefault();
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
    var pickup = document.querySelector('#pickupDate');
    var ret = document.querySelector('#returnDate');
    if (pickup && ret) {
      function syncReturnMinimum() {
        if (!pickup.value) return;
        var earliestReturn = new Date(pickup.value + 'T00:00:00Z');
        earliestReturn.setUTCDate(earliestReturn.getUTCDate() + 1);
        ret.min = earliestReturn.toISOString().slice(0, 10);
        if (ret.value && ret.value < ret.min) ret.value = ret.min;
      }
      syncReturnMinimum();
      pickup.addEventListener('change', function () {
        syncReturnMinimum();
        calcBooking(pickup.form);
      });
    }
  });

})();
