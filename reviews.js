(function () {
  "use strict";

  const SUPABASE_URL = "https://yjcspbpynvzvtmswtgyu.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqY3NwYnB5bnZ6dnRtc3d0Z3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTU5MzQsImV4cCI6MjEwMjk3MTkzNH0.4JpkOxv6IFAwbXwUYXZqU5HVvRcEOqBFbG0-bPrCjf8";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase library missing — add the CDN script before reviews.js.");
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function initials(name) {
    return (name || "").trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w[0] ? w[0].toUpperCase() : ""; }).join("");
  }

  function starString(rating) {
    var full = Math.round(rating);
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  }

  function timeAgo(dateStr) {
    var days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 30) return days + " days ago";
    var months = Math.floor(days / 30);
    if (months < 12) return months + (months === 1 ? " month ago" : " months ago");
    var years = Math.floor(months / 12);
    return years + (years === 1 ? " year ago" : " years ago");
  }

  function escapeHtml(str) {
    return (str || "").replace(/</g, "&lt;");
  }

  async function loadReviews() {
    var grid = document.getElementById("reviewsGrid");
    var empty = document.getElementById("reviewsEmpty");
    var summary = document.getElementById("reviewsSummary");
    if (!grid) return;

    var res = await sb
      .from("reviews")
      .select("name, business_name, rating, message, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(9);

    if (res.error || !res.data || res.data.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    var reviews = res.data;
    var avg = reviews.reduce(function (sum, r) { return sum + r.rating; }, 0) / reviews.length;

    if (summary) {
      summary.hidden = false;
      summary.innerHTML =
        '<span class="stars">' + starString(avg) + "</span> " +
        avg.toFixed(1) + " out of 5 — from " + reviews.length + (reviews.length === 1 ? " review" : " reviews");
    }

    grid.innerHTML = reviews.map(function (r) {
      var name = escapeHtml(r.name || "Anonymous");
      var biz = escapeHtml(r.business_name || "");
      var msg = escapeHtml(r.message || "");
      return (
        '<div class="review-card">' +
          '<span class="stars">' + starString(r.rating) + "</span>" +
          "<p>" + msg + "</p>" +
          '<div class="review-person">' +
            '<span class="review-avatar">' + initials(r.name) + "</span>" +
            "<div><strong>" + name + "</strong>" +
            "<span>" + (biz ? biz + " · " : "") + timeAgo(r.created_at) + "</span></div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------- write-a-review form ---------- */
  var toggleBtn = document.getElementById("toggleReviewForm");
  var form = document.getElementById("reviewForm");
  var thanks = document.getElementById("reviewThanks");

  if (toggleBtn && form) {
    toggleBtn.addEventListener("click", function () {
      form.hidden = !form.hidden;
      toggleBtn.hidden = !form.hidden;
    });
  }

  var starButtons = document.querySelectorAll(".star-btn");
  var ratingInput = document.getElementById("reviewRating");
  starButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = parseInt(btn.getAttribute("data-value"), 10);
      ratingInput.value = value;
      starButtons.forEach(function (b) {
        b.classList.toggle("is-active", parseInt(b.getAttribute("data-value"), 10) <= value);
      });
    });
  });

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      var name = document.getElementById("reviewName").value.trim();
      var business = document.getElementById("reviewBusiness").value.trim();
      var rating = parseInt(ratingInput.value, 10);
      var message = document.getElementById("reviewMessage").value.trim();
      var submitBtn = form.querySelector('button[type="submit"]');

      if (!name || !message || !rating) {
        alert("Please add your name, a rating, and a short review.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";

      var res = await sb.from("reviews").insert({
        name: name,
        business_name: business || null,
        rating: rating,
        message: message,
        is_approved: false
      });

      submitBtn.disabled = false;
      submitBtn.textContent = "Submit review";

      if (res.error) {
        alert("Something went wrong — please try again.");
        return;
      }

      form.hidden = true;
      thanks.hidden = false;
    });
  }

  loadReviews();
})();