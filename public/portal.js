(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  let currentUser = null;
  let vehicles = [];
  let selectedVehicle = null;
  let photoPreviewUrl = null;
  let toastTimer;
  let availabilityCheckId = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  async function request(url, options) {
    const response = await fetch(url, options || {});
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'The request could not be completed.');
    return result;
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3600);
  }

  function setError(element, message) {
    if (element) element.textContent = message || '';
  }

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`;
  }

  function formatRentalDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? escapeHtml(value)
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  function renderBookingTimeline(item) {
    const today = dateString(new Date());
    const cancelled = item.status === 'cancelled';
    const started = today >= item.pickup_date;
    const ended = today >= item.return_date;
    const steps = [
      {
        state: cancelled ? 'cancelled' : 'complete',
        title: cancelled ? 'Booking cancelled' : 'Booking confirmed',
        detail: cancelled ? 'This reservation is no longer active.' : `Reference ${item.reference}`
      },
      {
        state: cancelled ? 'upcoming' : started ? 'complete' : 'upcoming',
        title: 'Pickup date',
        detail: formatRentalDate(item.pickup_date)
      },
      {
        state: cancelled ? 'upcoming' : ended ? 'complete' : started ? 'active' : 'upcoming',
        title: ended ? 'Rental period ended' : started ? 'Rental in progress' : 'Rental upcoming',
        detail: ended
          ? `Scheduled return date: ${formatRentalDate(item.return_date)}`
          : started
            ? 'Your booking is within its scheduled rental dates.'
            : `Starts ${formatRentalDate(item.pickup_date)}`
      },
      {
        state: cancelled ? 'upcoming' : ended ? 'complete' : 'upcoming',
        title: 'Return date',
        detail: formatRentalDate(item.return_date)
      }
    ];
    return `
      <section class="booking-tracker" aria-label="Booking timeline">
        <div class="tracker-heading"><strong>Track your booking</strong><span>Booking #${Number(item.id)}</span></div>
        <ol class="booking-timeline">
          ${steps.map((step) => `<li class="timeline-step ${step.state}"><span class="timeline-marker" aria-hidden="true"></span><div><strong>${step.title}</strong><p>${step.detail}</p></div></li>`).join('')}
        </ol>
        <p class="tracker-note">Rental progress follows the scheduled dates; vehicle handover is coordinated between you and the seller.</p>
      </section>`;
  }

  function dateString(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function renderVehicles(searchTerm) {
    const grid = $('#vehicleGrid');
    if (!grid) return;
    const query = String(searchTerm || '').trim().toLocaleLowerCase();
    const matches = vehicles.filter((vehicle) => {
      const searchableText = [
        vehicle.title,
        vehicle.description,
        vehicle.km_driven,
        vehicle.rental_price
      ].join(' ').toLocaleLowerCase();
      return searchableText.includes(query);
    });
    const status = $('#vehicleSearchStatus');
    if (status) {
      status.textContent = query
        ? `${matches.length} bike${matches.length === 1 ? '' : 's'} found`
        : '';
    }
    if (!matches.length) {
      grid.innerHTML = query
        ? '<p class="empty-state">No bikes match your search. Try another name or keyword.</p>'
        : '<p class="empty-state">No approved vehicles are listed yet. Check back soon or <a href="/account?role=seller">list your own.</a></p>';
      return;
    }
    grid.innerHTML = matches.map((vehicle) => `
        <article class="vehicle-card">
          <img src="${escapeHtml(vehicle.image_url)}" alt="${escapeHtml(vehicle.title)}" loading="lazy">
          <div class="vehicle-info">
            <div class="vehicle-top"><h3>${escapeHtml(vehicle.title)}</h3><span class="badge">${vehicle.seller_id ? 'Seller photo' : 'Sample photo'}</span></div>
            <p class="vehicle-meta">${Number(vehicle.km_driven).toLocaleString('en-IN')} km driven</p>
            <div class="price">${currency.format(Number(vehicle.rental_price))}<small> / day</small></div>
            <p class="vehicle-rating" aria-label="${vehicle.review_count ? `${Number(vehicle.average_rating).toFixed(1)} out of 5 from ${Number(vehicle.review_count)} verified reviews` : 'No customer ratings yet'}"><span>${vehicle.review_count ? renderStars(vehicle.average_rating) : '☆☆☆☆☆'}</span> ${vehicle.review_count ? `${Number(vehicle.average_rating).toFixed(1)} · ${Number(vehicle.review_count)} verified` : 'Be the first to review'}</p>
            <p>${escapeHtml(vehicle.description)}</p>
            <button class="button button-primary" type="button" data-book="${Number(vehicle.id)}">Choose dates &amp; book</button>
          </div>
        </article>`).join('');
  }

  async function loadVehicles() {
    const grid = $('#vehicleGrid');
    try {
      const data = await request('/api/bikes');
      vehicles = data.bikes;
      if (!grid) return;
      renderVehicles($('#bikeSearch').value);
    } catch (error) {
      if (grid) grid.innerHTML = `<p class="empty-state">${escapeHtml(error.message)} Try refreshing the page.</p>`;
    }
  }

  function updateEstimate() {
    const pickup = $('#pickupDate');
    const returnDate = $('#returnDate');
    if (!pickup || !returnDate || !selectedVehicle) return;
    if (pickup.value) {
      const minReturn = new Date(`${pickup.value}T00:00:00`);
      minReturn.setDate(minReturn.getDate() + 1);
      returnDate.min = dateString(minReturn);
      if (returnDate.value && returnDate.value < returnDate.min) returnDate.value = returnDate.min;
    }
    const days = (Date.parse(`${returnDate.value}T00:00:00Z`) - Date.parse(`${pickup.value}T00:00:00Z`)) / 86400000;
    if (!pickup.value || !returnDate.value || !Number.isInteger(days) || days < 1) {
      $('#rentalDays').textContent = 'Select your dates';
      $('#rentalTotal').textContent = '—';
      return;
    }
    $('#rentalDays').textContent = `${days} day${days === 1 ? '' : 's'}`;
    $('#rentalTotal').textContent = currency.format(Number(selectedVehicle.rental_price) * days);
  }

  async function checkVehicleAvailability() {
    const status = $('#availabilityStatus');
    const button = $('#confirmBooking');
    if (!status || !button || !selectedVehicle) return;
    const checkId = ++availabilityCheckId;
    const pickupDate = $('#pickupDate').value;
    const returnDate = $('#returnDate').value;
    const days = (Date.parse(`${returnDate}T00:00:00Z`) - Date.parse(`${pickupDate}T00:00:00Z`)) / 86400000;
    const today = dateString(new Date());
    if (!pickupDate || !returnDate || pickupDate < today || !Number.isInteger(days) || days < 1 || days > 90) {
      status.textContent = 'Choose valid dates to check availability.';
      status.dataset.state = 'error';
      button.disabled = true;
      return;
    }

    status.textContent = 'Checking availability…';
    status.dataset.state = 'checking';
    button.disabled = true;
    try {
      const params = new URLSearchParams({ pickupDate, returnDate });
      const result = await request(`/api/bikes/${encodeURIComponent(selectedVehicle.id)}/availability?${params}`);
      if (checkId !== availabilityCheckId) return;
      status.textContent = result.message;
      status.dataset.state = result.available ? 'available' : 'sold-out';
      button.disabled = !result.available;
    } catch (error) {
      if (checkId !== availabilityCheckId) return;
      status.textContent = error.message;
      status.dataset.state = 'error';
      button.disabled = true;
    }
  }

  function openBooking(vehicle) {
    if (!currentUser || currentUser.role !== 'customer') {
      window.location.href = '/account?role=customer';
      return;
    }
    if (Number(vehicle.seller_id) === Number(currentUser.id)) {
      showToast('You cannot rent your own listing.');
      return;
    }
    selectedVehicle = vehicle;
    $('#vehicleId').value = vehicle.id;
    $('#bookingTitle').textContent = vehicle.title;
    $('#bookingRate').textContent = `${currency.format(Number(vehicle.rental_price))} per day`;
    $('#bookingError').textContent = '';
    const today = dateString(new Date());
    $('#pickupDate').min = today;
    $('#pickupDate').value = today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $('#returnDate').value = dateString(tomorrow);
    updateEstimate();
    checkVehicleAvailability();
    $('#bookingDialog').showModal();
  }

  async function submitBooking(event) {
    event.preventDefault();
    const button = $('#confirmBooking');
    const error = $('#bookingError');
    error.textContent = '';
    button.disabled = true;
    try {
      const result = await request('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: Number($('#vehicleId').value),
          pickupDate: $('#pickupDate').value,
          returnDate: $('#returnDate').value,
          paymentMethod: $('#paymentMethod').value
        })
      });
      $('#bookingDialog').close();
      showToast(`${result.message} Receipt ${result.booking.reference}.`);
    } catch (requestError) {
      error.textContent = requestError.message;
    } finally {
      button.disabled = false;
    }
  }

  async function loadAccountActivity() {
    const list = $('#activityList');
    const seller = currentUser.role === 'seller';
    $('#itemsEyebrow').textContent = seller ? 'YOUR LISTINGS' : 'YOUR RENTALS';
    $('#itemsHeading').textContent = seller ? 'Listing status' : 'Booking history';
    $('#itemsDescription').textContent = seller ? 'Pending posts stay private until an admin approves them.' : 'Your demo receipts and upcoming rentals.';
    try {
      const data = await request(seller ? '/api/listings/mine' : '/api/bookings/mine');
      const items = seller ? data.listings : data.bookings;
      if (seller) {
        $('#sellerTotalCount').textContent = items.length;
        $('#sellerPendingCount').textContent = items.filter((item) => item.approval_status === 'pending').length;
        $('#sellerApprovedCount').textContent = items.filter((item) => item.approval_status === 'approved' && !item.seller_removed_at).length;
      }
      if (!items.length) {
        list.innerHTML = `<p class="empty-state">${seller ? 'You have not submitted a vehicle yet.' : 'No bookings yet. Browse the marketplace to find a ride.'}</p>`;
        return;
      }
      list.innerHTML = items.map((item) => {
        if (seller) {
          const removed = Boolean(item.seller_removed_at);
          const futureBookings = Number(item.future_bookings);
          const rentalSlots = (item.bookings || []).map((booking) => {
            const inProgress = dateString(new Date()) >= booking.pickup_date;
            return `<div class="seller-rental-slot"><span class="badge ${inProgress ? 'rental-active' : 'rental-upcoming'}">${inProgress ? 'Booked · rental in progress' : 'Booked'}</span><p>${formatRentalDate(booking.pickup_date)} → ${formatRentalDate(booking.return_date)}</p></div>`;
          }).join('');
          const detail = removed
            ? `Removed from marketplace${futureBookings ? ` · ${futureBookings} upcoming rental${futureBookings === 1 ? '' : 's'} remain confirmed` : ''}`
            : `${currency.format(Number(item.rental_price))} / day · ${new Date(item.created_at).toLocaleDateString()}`;
          const removeAction = removed
            ? ''
            : `<button class="button button-danger button-small" type="button" data-remove-listing="${Number(item.id)}">Delete listing</button>`;
          return `<article class="activity-item seller-listing-item"><img class="activity-image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}"><div class="activity-details"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(detail)}</p>${rentalSlots ? `<div class="seller-rentals"><strong>Rental schedule</strong>${rentalSlots}</div>` : ''}</div><div class="seller-listing-actions"><span class="badge ${removed ? 'rejected' : escapeHtml(item.approval_status)}">${removed ? 'removed' : escapeHtml(item.approval_status)}</span>${futureBookings ? `<span class="badge rental-upcoming">${futureBookings} booked</span>` : ''}${removeAction}</div></article>`;
        }

        let reviewContent;
        if (item.review_rating) {
          reviewContent = `<div class="saved-review"><span class="review-stars">${renderStars(item.review_rating)}</span><span>Your verified rating</span>${item.review_comment ? `<p>${escapeHtml(item.review_comment)}</p>` : ''}</div>`;
        } else if (Number(item.review_eligible)) {
          reviewContent = `
            <form class="customer-review-form" data-review-form data-booking="${Number(item.id)}">
              <label class="review-prompt">How was your ride? <span>Verified rental</span></label>
              <div class="star-picker" role="radiogroup" aria-label="Choose a star rating">
                ${[5, 4, 3, 2, 1].map((rating) => `<label><input type="radio" name="rating" value="${rating}" required><span aria-hidden="true">★</span><span class="sr-only">${rating} star${rating === 1 ? '' : 's'}</span></label>`).join('')}
              </div>
              <textarea name="comment" maxlength="1000" rows="2" placeholder="Share a few words about your rental (optional)"></textarea>
              <p class="review-error" role="alert"></p>
              <button class="button button-primary button-small" type="submit">Submit rating</button>
            </form>`;
        } else {
          reviewContent = `<p class="review-locked">${item.status === 'confirmed' ? 'You can rate this verified rental after the return date.' : 'Only completed rentals can be rated.'}</p>`;
        }

        return `<article class="customer-booking activity-item"><div class="booking-card-heading"><img class="activity-image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}"><div class="booking-summary"><strong>${escapeHtml(item.title)}</strong><p>${formatRentalDate(item.pickup_date)} → ${formatRentalDate(item.return_date)} · ${Number(item.total_days)} days · ${currency.format(Number(item.total_amount))}</p><p>${item.payment_status === 'simulated' ? 'Demo payment simulated — not charged' : 'Pay on pickup'} · receipt ${escapeHtml(item.reference)}</p><span class="badge ${item.status === 'cancelled' ? 'rejected' : 'approved'}">${escapeHtml(item.status)}</span></div></div>${renderBookingTimeline(item)}${reviewContent}</article>`;
      }).join('');
    } catch (error) {
      list.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function loadAdminQueue() {
    const list = $('#approvalList');
    try {
      const data = await request('/api/admin/listings');
      if (!data.listings.length) {
        list.innerHTML = '<p class="empty-state">No seller posts to review yet.</p>';
        return;
      }
      list.innerHTML = data.listings.map((listing) => `
        <article class="approval-card">
          <img src="${escapeHtml(listing.image_url)}" alt="${escapeHtml(listing.title)}" loading="lazy">
          <div class="approval-copy">
            <div class="vehicle-top"><h3>${escapeHtml(listing.title)}</h3><span class="badge ${escapeHtml(listing.approval_status)}">${escapeHtml(listing.approval_status)}</span></div>
            <p>${currency.format(Number(listing.rental_price))} / day · ${Number(listing.km_driven).toLocaleString('en-IN')} km</p>
            <p>${escapeHtml(listing.description)}</p>
            <p>Seller: ${escapeHtml(listing.seller_name || 'RideEase demo inventory')} · ${escapeHtml(listing.seller_email || 'Seed listing')}</p>
            ${listing.approval_status === 'pending' ? `<div class="approval-actions"><button class="button button-success" type="button" data-decision="approved" data-id="${Number(listing.id)}">Approve &amp; publish</button><button class="button button-danger" type="button" data-decision="rejected" data-id="${Number(listing.id)}">Reject</button></div>` : ''}
          </div>
        </article>`).join('');
    } catch (error) {
      list.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function updateListingApproval(event) {
    const button = event.target.closest('[data-decision]');
    if (!button || !$('#approvalList').contains(button)) return;
    const card = button.closest('.approval-card');
    if (!card) return;
    const decision = button.dataset.decision;
    if (!['approved', 'rejected'].includes(decision)) return;
    card.querySelectorAll('[data-decision]').forEach((action) => { action.disabled = true; });
    try {
      const result = await request(`/api/admin/listings/${encodeURIComponent(button.dataset.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision })
      });
      showToast(result.message);
      await loadAdminQueue();
    } catch (error) {
      card.querySelectorAll('[data-decision]').forEach((action) => { action.disabled = false; });
      showToast(error.message);
    }
  }

  function showWorkspace(user) {
    currentUser = user;
    const authSection = $('#authSection');
    const workspace = $('#workspace');
    if (authSection) authSection.classList.add('hidden');
    if (!workspace) return;
    if (user.role === 'admin' && $('#approvalList')) {
      workspace.classList.remove('hidden');
      $('#logoutButton').classList.remove('hidden');
      loadAdminQueue();
      return;
    }
    if (user.role === 'admin') {
      window.location.href = '/admin';
      return;
    }
    if ($('#approvalList')) {
      if (authSection) authSection.classList.remove('hidden');
      setError($('#loginError'), 'Sign in with an admin account to review seller posts.');
      return;
    }
    workspace.classList.remove('hidden');
    $('#logoutButton').classList.remove('hidden');
    $('#userName').textContent = user.name;
    const seller = user.role === 'seller';
    $('#workspaceEyebrow').textContent = seller ? 'SELLER WORKSPACE' : 'CUSTOMER ACCOUNT';
    $('#workspaceDescription').textContent = seller ? 'Submit vehicles and track your approval status.' : 'Book approved vehicles and find your demo receipts here.';
    if (seller) {
      $('#sellerPanel').classList.remove('hidden');
      $('#sellerBanner').classList.remove('hidden');
    }
    loadAccountActivity();
  }

  function initAuthPage() {
    const loginForm = $('#loginForm');
    if (!loginForm) return;
    const registerForm = $('#registerForm');
    const onAdminPage = Boolean($('#approvalList'));
    const tabs = $('#showLogin');
    const showLogin = () => {
      loginForm.classList.remove('hidden');
      if (registerForm) registerForm.classList.add('hidden');
      if (tabs) {
        tabs.classList.add('active');
        $('#showRegister').classList.remove('active');
      }
    };
    const showRegister = () => {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      $('#showRegister').classList.add('active');
      tabs.classList.remove('active');
    };
    if (tabs) {
      tabs.addEventListener('click', showLogin);
      $('#showRegister').addEventListener('click', showRegister);
      if (new URLSearchParams(window.location.search).get('role') === 'seller') {
        $('#registerRole').value = 'seller';
        showRegister();
      }
    }
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError($('#loginError'), '');
      const form = new FormData(loginForm);
      try {
        const result = await request('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: form.get('identifier') || form.get('email'), password: form.get('password'), role: form.get('role') || 'admin' })
        });
        showWorkspace(result.user);
      } catch (error) {
        setError($('#loginError'), error.message);
      }
    });
    const adminPasswordForm = $('#adminPasswordForm');
    if (adminPasswordForm) adminPasswordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError($('#adminPasswordError'), '');
      setError($('#adminPasswordSuccess'), '');
      const form = new FormData(adminPasswordForm);
      const currentPassword = form.get('currentPassword');
      const newPassword = form.get('newPassword');
      if (newPassword !== form.get('confirmPassword')) {
        setError($('#adminPasswordError'), 'The new passwords do not match.');
        return;
      }
      const submitButton = adminPasswordForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      try {
        const result = await request('/api/admin/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        adminPasswordForm.reset();
        setError($('#adminPasswordSuccess'), result.message);
      } catch (error) {
        setError($('#adminPasswordError'), error.message);
      } finally {
        submitButton.disabled = false;
      }
    });
    if (registerForm) registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError($('#registerError'), '');
      const form = new FormData(registerForm);
      try {
        const result = await request('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.get('name'), username: form.get('username'), email: form.get('email'), password: form.get('password'), role: form.get('role') })
        });
        showWorkspace(result.user);
      } catch (error) {
        setError($('#registerError'), error.message);
      }
    });
    request('/api/auth/session').then((result) => {
      if (result.user) showWorkspace(result.user);
    }).catch((error) => setError($('#loginError'), error.message));
    if ($('#listingForm')) {
      const listingForm = $('#listingForm');
      const photoInput = $('#listingPhoto');
      const previewWrap = $('#photoPreviewWrap');
      function clearPhotoPreview() {
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = null;
        previewWrap.classList.add('hidden');
        $('#photoPreview').removeAttribute('src');
        $('#photoFileName').textContent = 'Choose your best photo';
        $('#photoPreviewName').textContent = '';
        photoInput.value = '';
      }
      photoInput.addEventListener('change', () => {
        const photo = photoInput.files[0];
        if (!photo) return clearPhotoPreview();
        if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = URL.createObjectURL(photo);
        $('#photoPreview').src = photoPreviewUrl;
        $('#photoFileName').textContent = photo.name;
        $('#photoPreviewName').textContent = photo.name;
        previewWrap.classList.remove('hidden');
      });
      $('#removePhoto').addEventListener('click', clearPhotoPreview);
      $('#listingForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setError($('#listingError'), '');
        $('#listingSuccess').textContent = '';
        const button = event.submitter;
        button.disabled = true;
        try {
          const result = await request('/api/listings', { method: 'POST', body: new FormData(form) });
          form.reset();
          clearPhotoPreview();
          $('#listingSuccess').textContent = result.message;
          loadAccountActivity();
        } catch (error) {
          setError($('#listingError'), error.message);
        } finally {
          button.disabled = false;
        }
      });
    }
    if ($('#refreshWorkspace')) $('#refreshWorkspace').addEventListener('click', () => {
      if ($('#approvalList')) loadAdminQueue();
      else loadAccountActivity();
    });
    if ($('#approvalList')) $('#approvalList').addEventListener('click', updateListingApproval);
    if ($('#activityList')) $('#activityList').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-remove-listing]');
      if (!button || !$('#activityList').contains(button)) return;
      const listingId = button.dataset.removeListing;
      if (!window.confirm('Remove this bike from the marketplace? Existing confirmed rentals will remain valid.')) return;
      button.disabled = true;
      try {
        const result = await request(`/api/listings/${encodeURIComponent(listingId)}`, { method: 'DELETE' });
        showToast(result.message);
        await loadAccountActivity();
      } catch (error) {
        showToast(error.message);
        button.disabled = false;
      }
    });
    if ($('#activityList')) $('#activityList').addEventListener('submit', async (event) => {
      const form = event.target.closest('[data-review-form]');
      if (!form) return;
      event.preventDefault();
      const rating = new FormData(form).get('rating');
      const button = form.querySelector('[type="submit"]');
      const errorElement = form.querySelector('.review-error');
      setError(errorElement, '');
      button.disabled = true;
      try {
        const result = await request(`/api/bookings/${encodeURIComponent(form.dataset.booking)}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: Number(rating), comment: new FormData(form).get('comment') })
        });
        showToast(result.message);
        await loadAccountActivity();
      } catch (error) {
        setError(errorElement, error.message);
        button.disabled = false;
      }
    });
    $('#logoutButton').addEventListener('click', async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      } catch (error) {
        showToast(error.message);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAuthPage();
    if ($('#vehicleGrid')) {
      loadVehicles();
      $('#refreshVehicles').addEventListener('click', loadVehicles);
      $('#bikeSearchForm').addEventListener('submit', (event) => {
        event.preventDefault();
        renderVehicles($('#bikeSearch').value);
      });
      $('#vehicleGrid').addEventListener('click', (event) => {
        const button = event.target.closest('[data-book]');
        if (button) {
          const vehicle = vehicles.find((item) => Number(item.id) === Number(button.dataset.book));
          if (vehicle) openBooking(vehicle);
        }
      });
      $('#bookingForm').addEventListener('submit', submitBooking);
      $('#pickupDate').addEventListener('change', () => {
        updateEstimate();
        checkVehicleAvailability();
      });
      $('#returnDate').addEventListener('change', () => {
        updateEstimate();
        checkVehicleAvailability();
      });
      $('#closeBooking').addEventListener('click', () => $('#bookingDialog').close());
      $('#bookingDialog').addEventListener('click', (event) => {
        if (event.target === $('#bookingDialog')) $('#bookingDialog').close();
      });
      request('/api/auth/session').then((result) => {
        currentUser = result.user;
        const accountLink = $('#accountLink');
        if (currentUser) {
          accountLink.textContent = `${currentUser.name} · ${currentUser.role}`;
          accountLink.href = currentUser.role === 'admin' ? '/admin' : '/account';
        }
      }).catch((error) => showToast(error.message));
    }
  });
})();
