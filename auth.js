(function () {
  "use strict";

  const SUPABASE_URL = "https://yjcspbpynvzvtmswtgyu.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqY3NwYnB5bnZ6dnRtc3d0Z3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTU5MzQsImV4cCI6MjEwMjk3MTkzNH0.4JpkOxv6IFAwbXwUYXZqU5HVvRcEOqBFbG0-bPrCjf8";

  /* ---------- where things live ----------

     The dashboard is a separate Vercel deployment on its own
     subdomain. Anything that belongs to the React app needs
     an absolute URL; anything on the marketing site stays
     relative. */

  const DASHBOARD_ORIGIN = "https://app.runambiz.com";
  const COOKIE_DOMAIN = ".runambiz.com";

  const REDIRECT_AFTER_AUTH = DASHBOARD_ORIGIN;
  const CLAIM_PAGE = DASHBOARD_ORIGIN + "/claim.html";
  const RESET_PASSWORD_PAGE = "reset-password.html";
  const ONBOARDING_PAGE = "onboarding.html";

  const CLAIM_STORAGE_KEY = "runambiz-claim-token";
  const ACTIVE_CLASS = "active";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "Supabase client library not found. Add this script BEFORE auth.js:\n" +
      '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>'
    );
    return;
  }

  

  const REMEMBER_KEY = "runambiz-remember";
  const ONE_YEAR = 31536000;
 
  /* Chunk below the 4KB ceiling, leaving room for the name,
     domain, path and flags. */
  const CHUNK_SIZE = 3000;
 
 
  function writeCookie(key, value, maxAge) {
 
    var cookie =
      key + "=" + encodeURIComponent(value) +
      "; domain=" + COOKIE_DOMAIN +
      "; path=/" +
      "; secure; samesite=lax";
 
    if (typeof maxAge === "number") {
      cookie += "; max-age=" + maxAge;
    }
 
    document.cookie = cookie;
  }
 
 
  function readCookie(key) {
    var safe = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var match = document.cookie.match(
      new RegExp("(^|;\\s*)" + safe + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[2]) : null;
  }
 
 
  /* Remove the plain cookie and every numbered chunk, so a
     shrinking session never leaves stale tail chunks behind
     that would corrupt the next read. */
 
  function clearCookie(key) {
 
    writeCookie(key, "", 0);
 
    for (var i = 0; i < 20; i++) {
      if (readCookie(key + "." + i) === null) break;
      writeCookie(key + "." + i, "", 0);
    }
 
  }
 
 
  function shouldRemember() {
    return readCookie(REMEMBER_KEY) !== "false";
  }
 
 
  function setRemember(value) {
    writeCookie(REMEMBER_KEY, value ? "true" : "false", ONE_YEAR);
  }
 
 
  var authStorage = {
 
    getItem: function (key) {
 
      /* Short values are stored whole. */
      var single = readCookie(key);
      if (single !== null && single !== "") {
        return single;
      }
 
      var out = "";
 
      for (var i = 0; i < 20; i++) {
        var part = readCookie(key + "." + i);
        if (part === null) break;
        out += part;
      }
 
      return out || null;
 
    },
 
    setItem: function (key, value) {
 
      var age = shouldRemember() ? ONE_YEAR : undefined;
 
      clearCookie(key);
 
      if (value.length <= CHUNK_SIZE) {
        writeCookie(key, value, age);
        return;
      }
 
      for (var i = 0; i * CHUNK_SIZE < value.length; i++) {
        writeCookie(
          key + "." + i,
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          age
        );
      }
 
    },
 
    removeItem: function (key) {
      clearCookie(key);
    }
 
  };


  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      flowType: "implicit"
    }
  });

  /* ---------- outreach claim ----------

     Someone arriving from a claim link carries a token in
     the URL. Remember it across the signup round trip and
     send them back to finish claiming instead of dropping
     them on an empty dashboard.

     The token lives in a cookie too — the claim page is on
     the dashboard subdomain and can't read sessionStorage
     written here. */

  const params = new URLSearchParams(window.location.search);

  (function rememberClaimToken() {
    var incoming = params.get("claim");
    if (incoming) {
      writeCookie(CLAIM_STORAGE_KEY, incoming, 3600);
    }
  })();

  function claimToken() {
    return readCookie(CLAIM_STORAGE_KEY) || "";
  }

  function destinationAfterAuth() {
    var token = claimToken();
    return token
      ? CLAIM_PAGE + "?token=" + encodeURIComponent(token)
      : REDIRECT_AFTER_AUTH;
  }

  function confirmRedirect() {
    var token = claimToken();
    return token
      ? CLAIM_PAGE + "?token=" + encodeURIComponent(token)
      : window.location.origin + "/" + ONBOARDING_PAGE;
  }

  /* ---------- view switching ---------- */
  function switchView(name) {
    var target = document.querySelector('.auth-view[data-view="' + name + '"]');
    if (!target) return; // view doesn't exist yet — do nothing rather than blank the screen
    document.querySelectorAll(".auth-view").forEach(function (v) {
      v.classList.toggle(ACTIVE_CLASS, v === target);
    });
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-switch]");
    if (trigger) {
      e.preventDefault();
      switchView(trigger.getAttribute("data-switch"));
    }
  });

  /* ---------- open the view named in the URL ----------

     index.html links to auth.html?mode=signup, so honour
     that instead of always landing on login. A claim link
     defaults to signup, since the prospect almost certainly
     has no account yet. */

  (function applyModeFromUrl() {

    var mode = params.get("mode");

    if (!mode && claimToken()) {
      mode = "signup";
    }

    if (
      mode === "signup" ||
      mode === "login" ||
      mode === "forgot"
    ) {
      switchView(mode);
    }

  })();

  /* ---------- claim banner ----------

     Tell them why they're here, so signing up doesn't feel
     like a detour. */

  (function showClaimBanner() {

    if (!claimToken()) return;

    var shell = document.querySelector(".auth-shell");
    if (!shell) return;

    var banner = document.createElement("div");
    banner.className = "rb-claim-banner";
    banner.innerHTML =
      '<strong>Your store is waiting</strong>' +
      "<span>Create your account and it's yours — " +
      "products, settings and all.</span>";

    var style = document.createElement("style");
    style.textContent =
      ".rb-claim-banner{display:block;padding:14px 16px;margin-bottom:20px;" +
      "border:1px solid rgba(91,33,182,.18);border-radius:13px;" +
      "background:#F5F3FF;}" +
      ".rb-claim-banner strong{display:block;color:#5B21B6;" +
      "font:700 13.5px/1.4 inherit;}" +
      ".rb-claim-banner span{display:block;margin-top:3px;color:#64748B;" +
      "font:400 12.5px/1.6 inherit;}";

    document.head.appendChild(style);
    shell.insertBefore(banner, shell.firstChild);

  })();

  /* ---------- toast ---------- */
  function injectToastStyles() {
    if (document.getElementById("runambiz-toast-styles")) return;
    var style = document.createElement("style");
    style.id = "runambiz-toast-styles";
    style.textContent =
      ".rb-toast-stack{position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:340px;}" +
      "@media (max-width:520px){.rb-toast-stack{left:16px;right:16px;top:16px;max-width:none;}}" +
      ".rb-toast{display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border-radius:12px;background:#0F172A;color:#fff;" +
      "font:500 13.5px/1.5 Inter,system-ui,sans-serif;box-shadow:0 8px 24px -6px rgba(15,23,42,0.35);" +
      "opacity:0;transform:translateY(-8px);transition:opacity .25s ease,transform .25s ease;}" +
      ".rb-toast.rb-show{opacity:1;transform:translateY(0);}" +
      ".rb-toast.rb-success{background:#1E293B;border-left:3px solid #A3E635;}" +
      ".rb-toast.rb-error{background:#1E293B;border-left:3px solid #F87171;}" +
      ".rb-toast.rb-info{background:#1E293B;border-left:3px solid #5B21B6;}" +
      ".rb-toast-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;}" +
      ".rb-toast.rb-success .rb-toast-dot{background:#A3E635;}" +
      ".rb-toast.rb-error .rb-toast-dot{background:#F87171;}" +
      ".rb-toast.rb-info .rb-toast-dot{background:#8B7BD8;}" +
      ".rb-toast-close{margin-left:auto;background:none;border:none;color:#94A3B8;cursor:pointer;font-size:15px;line-height:1;padding:0 0 0 8px;}" +
      ".terms-check.rb-shake{animation:rb-shake .4s ease;}" +
      "@keyframes rb-shake{10%,90%{transform:translateX(-1px);}20%,80%{transform:translateX(2px);}30%,50%,70%{transform:translateX(-4px);}40%,60%{transform:translateX(4px);}}";
    document.head.appendChild(style);
  }

  function getToastStack() {
    var stack = document.querySelector(".rb-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "rb-toast-stack";
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, type, duration) {
    injectToastStyles();
    var stack = getToastStack();
    var toast = document.createElement("div");
    toast.className = "rb-toast rb-" + (type || "info");
    toast.innerHTML =
      '<span class="rb-toast-dot"></span><span>' +
      message.replace(/</g, "&lt;") +
      '</span><button type="button" class="rb-toast-close" aria-label="Dismiss">\u00D7</button>';
    stack.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add("rb-show"); });

    function remove() {
      toast.classList.remove("rb-show");
      setTimeout(function () { toast.remove(); }, 250);
    }
    toast.querySelector(".rb-toast-close").addEventListener("click", remove);
    setTimeout(remove, duration || 4000);
  }

  var emailSentState = {
    type: null,
    email: null
  };

  function showEmailSentScreen(type, email) {
    var eyebrow = document.getElementById("sentEyebrow");
    var title = document.getElementById("sentTitle");
    var description = document.getElementById("sentDescription");

    emailSentState.type = type;
    emailSentState.email = email;

    if (type === "signup") {
      eyebrow.textContent = "Almost there";
      title.textContent = "Confirm your email";

      description.textContent =
        "We've sent a confirmation link to " +
        email +
        ". Open your inbox or spam and click the link to activate your Runambiz account.";
    }

    if (type === "recovery") {
      eyebrow.textContent = "Check your inbox";
      title.textContent = "Reset link sent";

      description.textContent =
        "We've sent password reset instructions to " +
        email +
        ". Open your inbox or spam and follow the link to create a new password.";
    }

    switchView("sent");
  }

  /* ---------- password show/hide toggle (self-contained icons — doesn't depend on Lucide re-rendering) ---------- */
  var EYE_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.3 21.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.3 21.3 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

  document.addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-password-toggle]");
    if (!toggle) return;
    var wrap = toggle.closest(".input-wrap");
    var input = wrap ? wrap.querySelector('input[type="password"], input[type="text"]') : null;
    if (!input) return;

    var showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
    toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  });

  /* ---------- password strength meter (signup) ---------- */
  var signupPasswordEl = document.getElementById("signupPassword");
  if (signupPasswordEl) {
    var strengthBars = document.querySelectorAll(".strength-bars span");
    var strengthText = document.getElementById("passwordStrengthText");

    signupPasswordEl.addEventListener("input", function () {
      var value = signupPasswordEl.value;
      var score = 0;
      if (value.length >= 8) score++;
      if (/[A-Z]/.test(value)) score++;
      if (/[0-9]/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;

      strengthBars.forEach(function (bar, i) {
        var filled = i < score;
        bar.classList.toggle("is-filled", filled);
        bar.style.background = filled
          ? (score <= 1 ? "#F87171" : score === 2 ? "#FBBF24" : score === 3 ? "#A3E635" : "#4D7C0F")
          : "";
      });

      if (strengthText) {
        if (!value) strengthText.textContent = "Use at least 8 characters.";
        else if (score <= 1) strengthText.textContent = "Too weak.";
        else if (score === 2) strengthText.textContent = "Weak — add a number or symbol.";
        else if (score === 3) strengthText.textContent = "Good.";
        else strengthText.textContent = "Strong.";
      }
    });
  }

  /* ---------- small helpers ---------- */
  function setLoading(button, loading) {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
  }

  function setFieldError(input, message) {
    if (!input) return;
    var wrap = input.closest(".form-group");
    var err = wrap ? wrap.querySelector(".field-error") : null;
    if (err) err.textContent = message || "";
    input.classList.toggle("has-error", !!message);
  }

  function setFormMessage(el, message, type) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("is-error", "is-success");
    if (message) el.classList.add(type === "error" ? "is-error" : "is-success");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function friendlyError(error) {
    if (!error) return "Something went wrong. Please try again.";
    var msg = error.message || "";
    if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
    if (/email not confirmed/i.test(msg)) return "Please confirm your email before signing in.";
    if (/user already registered/i.test(msg)) return "An account with this email already exists. Sign in instead.";
    if (/password should be at least/i.test(msg)) return "Password must be at least 8 characters.";
    if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a moment and try again.";
    return msg || "Something went wrong. Please try again.";
  }

  /* ---------- LOGIN ---------- */
  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var emailEl = document.getElementById("loginEmail");
      var passEl = document.getElementById("loginPassword");
      var rememberEl = document.getElementById("rememberMe");
      var messageEl = document.getElementById("loginMessage");
      var button = loginForm.querySelector('button[type="submit"]');

      setFieldError(emailEl, "");
      setFieldError(passEl, "");
      setFormMessage(messageEl, "", "");

      var email = ((emailEl && emailEl.value) || "").trim();
      var password = (passEl && passEl.value) || "";

      var hasError = false;
      if (!isValidEmail(email)) { setFieldError(emailEl, "Enter a valid email address."); hasError = true; }
      if (!password) { setFieldError(passEl, "Enter your password."); hasError = true; }
      if (hasError) return;

      /* Persist the choice BEFORE signing in, so the storage
         adapter reads the right value when Supabase writes
         the session. */
      setRemember(!!(rememberEl && rememberEl.checked));

      setLoading(button, true);
      var res = await sb.auth.signInWithPassword({ email: email, password: password });
      setLoading(button, false);

      if (res.error) {
        setFormMessage(messageEl, friendlyError(res.error), "error");
        showToast(friendlyError(res.error), "error");
        return;
      }

      var destination = destinationAfterAuth();

      showToast(
        claimToken()
          ? "Signed in — opening your store…"
          : "Welcome back — redirecting…",
        "success",
        1200
      );

      setTimeout(function () { window.location.href = destination; }, 700);
    });
  }

  /* ---------- SIGNUP ---------- */
  var signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      var nameEl = document.getElementById("fullName");
      var emailEl = document.getElementById("signupEmail");
      var passEl = document.getElementById("signupPassword");
      var termsEl = document.getElementById("termsCheckbox");
      var messageEl = document.getElementById("signupMessage");
      var button = signupForm.querySelector('button[type="submit"]');

      [nameEl, emailEl, passEl].forEach(function (el) {
        setFieldError(el, "");
      });

      setFormMessage(messageEl, "", "");

      var name = ((nameEl && nameEl.value) || "").trim();
      var email = ((emailEl && emailEl.value) || "").trim();
      var password = (passEl && passEl.value) || "";

      var hasError = false;

      if (!name) {
        setFieldError(nameEl, "Enter your full name.");
        hasError = true;
      }

      if (!isValidEmail(email)) {
        setFieldError(emailEl, "Enter a valid email address.");
        hasError = true;
      }

      if (password.length < 8) {
        setFieldError(
          passEl,
          "Password must be at least 8 characters."
        );
        hasError = true;
      }

      if (hasError) return;

      if (termsEl && !termsEl.checked) {
        setFormMessage(
          messageEl,
          "Please agree to the Terms and Privacy Policy to continue.",
          "error"
        );

        showToast(
          "Please agree to the Terms and Privacy Policy to continue.",
          "error"
        );

        var termsWrap = termsEl.closest(".terms-check");

        if (termsWrap) {
          termsWrap.classList.remove("rb-shake");
          void termsWrap.offsetWidth;
          termsWrap.classList.add("rb-shake");
        }

        return;
      }

      /* New accounts always persist. */
      setRemember(true);

      setLoading(button, true);

      /* No pre-flight login probe here. Supabase returns
         "User already registered" on its own, and the extra
         failed sign-in was burning the rate limit — a few
         typo'd attempts used to lock people out with a
         confusing error. */

      var res = await sb.auth.signUp({
        email: email,
        password: password,

        options: {
          data: {
            full_name: name
          },

          /*
            A prospect claiming a store goes back to the
            claim page after confirming, not to onboarding —
            they already have a store waiting.
          */

          emailRedirectTo: confirmRedirect()
        }
      });

      setLoading(button, false);

      if (res.error) {
        setFormMessage(
          messageEl,
          friendlyError(res.error),
          "error"
        );

        showToast(
          friendlyError(res.error),
          "error"
        );

        /* Existing account — drop them on the login form
           with the email already filled in. */
        if (/user already registered/i.test(res.error.message || "")) {
          switchView("login");
          var loginEmailEl = document.getElementById("loginEmail");
          if (loginEmailEl) loginEmailEl.value = email;
        }

        return;
      }

      /*
        If email confirmation is disabled in Supabase,
        Supabase may immediately return a session.
      */
      if (res.data && res.data.session) {

        showToast(
          claimToken()
            ? "Account created — opening your store…"
            : "Account created — redirecting…",
          "success",
          1200
        );

        var newDestination = destinationAfterAuth();

        setTimeout(function () {
          window.location.href = newDestination;
        }, 700);

        return;
      }

      /*
        Email confirmation is enabled.
        User must open their email first.
      */
      setFormMessage(
        messageEl,
        "Account created — check your email to confirm your account.",
        "success"
      );

      showToast(
        "Account created! Check your email to confirm your account.",
        "success",
        4000
      );

      showEmailSentScreen("signup", email);
    });
  }

  /* ---------- FORGOT PASSWORD ---------- */
  var forgotForm = document.getElementById("forgotForm");
  var lastForgotEmail = "";

  if (forgotForm) {
    forgotForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var emailEl = document.getElementById("forgotEmail");
      var messageEl = document.getElementById("forgotMessage");
      var button = forgotForm.querySelector('button[type="submit"]');

      setFieldError(emailEl, "");
      setFormMessage(messageEl, "", "");

      var email = ((emailEl && emailEl.value) || "").trim();
      if (!isValidEmail(email)) {
        setFieldError(emailEl, "Enter a valid email address.");
        return;
      }

      setLoading(button, true);
      var res = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/" + RESET_PASSWORD_PAGE
      });
      setLoading(button, false);

      if (res.error) {
        setFormMessage(messageEl, friendlyError(res.error), "error");
        showToast(friendlyError(res.error), "error");
        return;
      }

      lastForgotEmail = email;
      showToast("Reset link sent to " + email, "success");
      showEmailSentScreen("recovery", email);
      startResendCooldown();
    });
  }

  /* ---------- RESEND ---------- */
  var resendButton = document.getElementById("resendButton");
  var resendOriginalText = resendButton ? resendButton.textContent.trim() : "Resend email";

  function startResendCooldown() {
    if (!resendButton) return;
    var seconds = 30;
    resendButton.disabled = true;
    resendButton.textContent = "Resend in " + seconds + "s";
    var timer = setInterval(function () {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(timer);
        resendButton.disabled = false;
        resendButton.textContent = resendOriginalText;
      } else {
        resendButton.textContent = "Resend in " + seconds + "s";
      }
    }, 1000);
  }

  if (resendButton) {
    resendButton.addEventListener("click", async function () {
      if (resendButton.disabled) return;

      /* Resend the right email for whichever screen we're on. */

      if (emailSentState.type === "signup" && emailSentState.email) {

        resendButton.disabled = true;

        var signupRes = await sb.auth.resend({
          type: "signup",
          email: emailSentState.email,
          options: {
            emailRedirectTo: confirmRedirect()
          }
        });

        if (!signupRes.error) {
          startResendCooldown();
          showToast("Confirmation email resent.", "success");
        } else {
          resendButton.disabled = false;
          showToast(friendlyError(signupRes.error), "error");
        }

        return;
      }

      if (!lastForgotEmail) return;

      resendButton.disabled = true;

      var res = await sb.auth.resetPasswordForEmail(lastForgotEmail, {
        redirectTo: window.location.origin + "/" + RESET_PASSWORD_PAGE
      });

      if (!res.error) {
        startResendCooldown();
        showToast("Email resent.", "success");
      } else {
        resendButton.disabled = false;
        showToast(friendlyError(res.error), "error");
      }
    });
  }

  /* ---------- PASSWORD RECOVERY (only acts if you add a #resetForm view) ---------- */
  sb.auth.onAuthStateChange(function (event) {
    if (event === "PASSWORD_RECOVERY") switchView("reset");
  });

  var resetForm = document.getElementById("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var passEl = document.getElementById("resetPassword");
      var confirmEl = document.getElementById("resetConfirmPassword");
      var messageEl = document.getElementById("resetMessage");
      var button = resetForm.querySelector('button[type="submit"]');

      setFieldError(passEl, "");
      setFieldError(confirmEl, "");
      setFormMessage(messageEl, "", "");

      var password = (passEl && passEl.value) || "";
      var confirm = (confirmEl && confirmEl.value) || "";

      var hasError = false;
      if (password.length < 8) { setFieldError(passEl, "Password must be at least 8 characters."); hasError = true; }
      if (confirmEl && confirm !== password) { setFieldError(confirmEl, "Passwords don't match."); hasError = true; }
      if (hasError) return;

      setLoading(button, true);
      var res = await sb.auth.updateUser({ password: password });
      setLoading(button, false);

      if (res.error) {
        setFormMessage(messageEl, friendlyError(res.error), "error");
        return;
      }
      window.location.href = REDIRECT_AFTER_AUTH;
    });
  }

  /* ---------- skip the auth page entirely if already signed in ---------- */
  (async function checkExistingSession() {
    var isRecovery = window.location.hash.indexOf("type=recovery") !== -1;
    if (isRecovery) return;
    var res = await sb.auth.getSession();
    if (res.data && res.data.session) {
      window.location.href = destinationAfterAuth();
    }
  })();

})();
