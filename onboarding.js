document.addEventListener("DOMContentLoaded", async function () {

  /* =========================================
     SUPABASE CONFIG
  ========================================= */

  var SUPABASE_URL =
    "https://yjcspbpynvzvtmswtgyu.supabase.co";

  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqY3NwYnB5bnZ6dnRtc3d0Z3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTU5MzQsImV4cCI6MjEwMjk3MTkzNH0.4JpkOxv6IFAwbXwUYXZqU5HVvRcEOqBFbG0-bPrCjf8";


  var sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


  /* =========================================
     TEMPORARY REDIRECT

     Change this to dashboard.html once
     your dashboard is built.
  ========================================= */

  var REDIRECT_AFTER_ONBOARDING = "dashboard.html";


  /* =========================================
     ELEMENTS
  ========================================= */

  var steps =
    document.querySelectorAll(".onboarding-step");

  var progressSegments =
    document.querySelectorAll(".progress-segment");


  var nextBtn =
    document.getElementById("nextBtn");

  var backBtn =
    document.getElementById("backBtn");

  var finishBtn =
    document.getElementById("finishBtn");


  var fullNameEl =
    document.getElementById("fullName");

  var emailEl =
    document.getElementById("email");

  var phoneEl =
    document.getElementById("phone");

  var whatsappEl =
    document.getElementById("whatsapp");


  var storeNameEl =
    document.getElementById("storeName");

  var businessTypeEl =
    document.getElementById("businessType");

  var locationEl =
    document.getElementById("location");

  var descriptionEl =
    document.getElementById("description");

  var currencyEl =
    document.getElementById("currency");


  var accountEmail =
    document.getElementById("accountEmail");

  var changeAccountBtn =
    document.getElementById("changeAccountBtn");


  var slugPreview =
    document.getElementById("slugPreview");

  var slugPreviewText =
    document.getElementById("slugPreviewText");


  var descriptionCount =
    document.getElementById("descriptionCount");


  var onboardingError =
    document.getElementById("onboardingError");

  var onboardingErrorText =
    document.getElementById("onboardingErrorText");


  var currentStep = 1;

  var currentUser = null;



  /* =========================================
     HELPER FUNCTIONS
  ========================================= */

  function slugify(value) {

    return String(value || "")
      .toLowerCase()
      .trim()

      .replace(/['"]/g, "")

      .replace(/[^a-z0-9]+/g, "-")

      .replace(/^-+|-+$/g, "")

      .substring(0, 60);

  }


  function showError(message) {

    if (!onboardingError) return;

    onboardingError.hidden = false;

    if (onboardingErrorText) {
      onboardingErrorText.textContent = message;
    } else {
      onboardingError.textContent = message;
    }

    if (window.lucide) {
      lucide.createIcons();
    }

  }


  function clearError() {

    if (!onboardingError) return;

    onboardingError.hidden = true;

    if (onboardingErrorText) {
      onboardingErrorText.textContent = "";
    }

  }


  function setFieldError(element, message) {

    if (!element) return;

    var group =
      element.closest(".form-group");

    if (!group) return;

    var error =
      group.querySelector(".field-error");

    if (error) {
      error.textContent = message || "";
    }

    if (message) {
      element.classList.add("has-error");
    } else {
      element.classList.remove("has-error");
    }

  }


  function setFinishLoading(loading) {

    if (!finishBtn) return;

    var finishContent =
      document.getElementById("finishContent");

    var finishLoader =
      document.getElementById("finishLoader");


    finishBtn.disabled = loading;


    if (finishContent) {
      finishContent.style.opacity =
        loading ? "0" : "1";
    }


    if (finishLoader) {
      finishLoader.style.display =
        loading ? "block" : "none";
    }

  }



  /* =========================================
     AUTH CHECK
  ========================================= */

  async function checkAuth() {

    var sessionResult =
      await sb.auth.getSession();


    if (sessionResult.error) {

      console.error(
        "Session error:",
        sessionResult.error
      );

      window.location.replace(
        "auth.html?mode=login"
      );

      return false;
    }


    var session =
      sessionResult.data.session;


    if (!session || !session.user) {

      window.location.replace(
        "auth.html?mode=login"
      );

      return false;
    }


    currentUser = session.user;


    /*
      Populate email
    */

    if (emailEl) {
      emailEl.value =
        currentUser.email || "";
    }


    if (accountEmail) {
      accountEmail.textContent =
        currentUser.email || "";
    }


    /*
      Get full name from signup metadata
    */

    if (
      currentUser.user_metadata &&
      currentUser.user_metadata.full_name &&
      fullNameEl
    ) {

      fullNameEl.value =
        currentUser.user_metadata.full_name;

    }


    return true;

  }



  /* =========================================
     CHECK IF USER ALREADY COMPLETED SETUP
  ========================================= */

  async function checkExistingOnboarding() {

    var result =
      await sb
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", currentUser.id)
        .maybeSingle();


    if (result.error) {

      console.error(
        "Profile check error:",
        result.error
      );

      return;
    }


    if (
      result.data &&
      result.data.onboarding_completed === true
    ) {

      window.location.replace(
        REDIRECT_AFTER_ONBOARDING
      );

    }

  }



  /* =========================================
     CHANGE ACCOUNT / LOG OUT
  ========================================= */

  if (changeAccountBtn) {

    changeAccountBtn.addEventListener(
      "click",
      async function () {

        changeAccountBtn.disabled = true;

        await sb.auth.signOut();

        window.location.replace(
          "auth.html?mode=login"
        );

      }
    );

  }



  /* =========================================
     SHOW STEP
  ========================================= */

  function showStep(stepNumber) {

    currentStep = stepNumber;


    steps.forEach(function (step) {

      var number =
        Number(step.dataset.step);

      step.hidden =
        number !== stepNumber;

    });


    progressSegments.forEach(
      function (segment) {

        var number =
          Number(segment.dataset.segment);


        segment.classList.remove(
          "is-active",
          "is-done"
        );


        if (number < stepNumber) {

          segment.classList.add(
            "is-done"
          );

        }


        if (number === stepNumber) {

          segment.classList.add(
            "is-active"
          );

        }

      }
    );


    /*
      Buttons
    */

    if (backBtn) {
      backBtn.hidden =
        stepNumber === 1;
    }


    if (nextBtn) {
      nextBtn.hidden =
        stepNumber === 3;
    }


    if (finishBtn) {
      finishBtn.hidden =
        stepNumber !== 3;
    }


    clearError();


    if (window.lucide) {
      lucide.createIcons();
    }


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }



  /* =========================================
     STEP 1 VALIDATION
  ========================================= */

  function validateStep1() {

    clearError();


    var fullName =
      (fullNameEl.value || "").trim();

    var phone =
      (phoneEl.value || "").trim();


    var valid = true;


    setFieldError(
      fullNameEl,
      ""
    );


    setFieldError(
      phoneEl,
      ""
    );


    if (!fullName) {

      setFieldError(
        fullNameEl,
        "Enter your full name."
      );

      valid = false;

    }


    if (fullName.length < 2) {

      setFieldError(
        fullNameEl,
        "Enter a valid full name."
      );

      valid = false;

    }


    if (!phone) {

      setFieldError(
        phoneEl,
        "Enter your phone number."
      );

      valid = false;

    }


    if (phone.length < 7) {

      setFieldError(
        phoneEl,
        "Enter a valid phone number."
      );

      valid = false;

    }


    return valid;

  }



  /* =========================================
     STEP 2 VALIDATION
  ========================================= */

  function validateStep2() {

    clearError();


    var storeName =
      (storeNameEl.value || "").trim();

    var businessType =
      businessTypeEl.value;

    var location =
      (locationEl.value || "").trim();


    var valid = true;


    setFieldError(
      storeNameEl,
      ""
    );


    setFieldError(
      businessTypeEl,
      ""
    );


    setFieldError(
      locationEl,
      ""
    );


    if (!storeName) {

      setFieldError(
        storeNameEl,
        "Enter your business name."
      );

      valid = false;

    }


    if (storeName.length < 2) {

      setFieldError(
        storeNameEl,
        "Enter a valid business name."
      );

      valid = false;

    }


    if (!businessType) {

      setFieldError(
        businessTypeEl,
        "Choose a business type."
      );

      valid = false;

    }


    if (!location) {

      setFieldError(
        locationEl,
        "Enter your city or area."
      );

      valid = false;

    }


    return valid;

  }



  /* =========================================
     BUSINESS SLUG PREVIEW
  ========================================= */

  if (storeNameEl) {

    storeNameEl.addEventListener(
      "input",
      function () {

        var slug =
          slugify(storeNameEl.value);


        if (!slug) {

          slugPreview.hidden = true;

          return;

        }


        slugPreview.hidden = false;


        slugPreviewText.textContent =
          "runambiz.com/" + slug;


        if (window.lucide) {
          lucide.createIcons();
        }

      }
    );

  }



  /* =========================================
     DESCRIPTION COUNTER
  ========================================= */

  if (descriptionEl) {

    descriptionEl.addEventListener(
      "input",
      function () {

        if (!descriptionCount) return;


        descriptionCount.textContent =
          descriptionEl.value.length +
          " / 300";

      }
    );

  }



  /* =========================================
     BUILD REVIEW SCREEN
  ========================================= */

  function buildReview() {

    var storeSlug =
      slugify(storeNameEl.value);


    document.getElementById(
      "reviewName"
    ).textContent =
      fullNameEl.value.trim();


    document.getElementById(
      "reviewEmail"
    ).textContent =
      emailEl.value;


    document.getElementById(
      "reviewPhone"
    ).textContent =
      phoneEl.value.trim();


    document.getElementById(
      "reviewWhatsapp"
    ).textContent =
      whatsappEl.value.trim() ||
      "Not added";


    document.getElementById(
      "reviewStore"
    ).textContent =
      storeNameEl.value.trim();


    document.getElementById(
      "reviewType"
    ).textContent =
      businessTypeEl.options[
        businessTypeEl.selectedIndex
      ].text;


    document.getElementById(
      "reviewLocation"
    ).textContent =
      locationEl.value.trim();


    document.getElementById(
      "reviewCurrency"
    ).textContent =
      currencyEl.options[
        currencyEl.selectedIndex
      ].text;


    document.getElementById(
      "reviewSlug"
    ).textContent =
      "runambiz.com/" + storeSlug;

  }



  /* =========================================
     NEXT BUTTON
  ========================================= */

  if (nextBtn) {

    nextBtn.addEventListener(
      "click",
      function () {

        if (currentStep === 1) {

          if (!validateStep1()) {
            return;
          }


          showStep(2);

          return;

        }


        if (currentStep === 2) {

          if (!validateStep2()) {
            return;
          }


          buildReview();

          showStep(3);

        }

      }
    );

  }



  /* =========================================
     BACK BUTTON
  ========================================= */

  if (backBtn) {

    backBtn.addEventListener(
      "click",
      function () {

        if (currentStep > 1) {

          showStep(
            currentStep - 1
          );

        }

      }
    );

  }



  /* =========================================
     SAVE PROFILE
  ========================================= */

  async function saveProfile() {

    var profileData = {

      id:
        currentUser.id,

      full_name:
        fullNameEl.value.trim(),

      phone:
        phoneEl.value.trim(),

      whatsapp:
        whatsappEl.value.trim() || null,

      onboarding_completed:
        false,

      updated_at:
        new Date().toISOString()

    };


    var result =
      await sb
        .from("profiles")
        .upsert(
          profileData,
          {
            onConflict: "id"
          }
        );


    if (result.error) {
      throw result.error;
    }

  }



  /* =========================================
     SAVE BUSINESS

     Retry with a different slug if another
     business already owns that URL.
  ========================================= */

  async function saveBusiness() {

    var baseSlug =
      slugify(storeNameEl.value);


    if (!baseSlug) {

      baseSlug =
        "business-" +
        currentUser.id.substring(0, 6);

    }


    var slug = baseSlug;


    for (
      var attempt = 0;
      attempt < 5;
      attempt++
    ) {


      var businessData = {

        owner_id:
          currentUser.id,

        name:
          storeNameEl.value.trim(),

        slug:
          slug,

        business_type:
          businessTypeEl.value,

        location:
          locationEl.value.trim(),

        description:
          descriptionEl.value.trim() || null,

        currency:
          currencyEl.value,

        is_published:
          false,

        updated_at:
          new Date().toISOString()

      };


      var result =
        await sb
          .from("businesses")
          .upsert(
            businessData,
            {
              onConflict: "owner_id"
            }
          )
          .select()
          .single();


      if (!result.error) {

        return result.data;

      }


      /*
        Postgres unique violation.

        Usually means the requested slug
        belongs to another store.
      */

      if (
        result.error.code === "23505"
      ) {

        slug =
          baseSlug +
          "-" +
          Math.floor(
            1000 +
            Math.random() * 9000
          );


        continue;

      }


      throw result.error;

    }


    throw new Error(
      "We couldn't generate a unique store link. Please try again."
    );

  }



  /* =========================================
     MARK ONBOARDING COMPLETE
  ========================================= */

  async function completeOnboarding() {

    var result =
      await sb
        .from("profiles")
        .update({

          onboarding_completed:
            true,

          updated_at:
            new Date().toISOString()

        })
        .eq(
          "id",
          currentUser.id
        );


    if (result.error) {
      throw result.error;
    }

  }



  /* =========================================
     FINISH
  ========================================= */

  if (finishBtn) {

    finishBtn.addEventListener(
      "click",
      async function () {

        clearError();


        if (
          !validateStep1() ||
          !validateStep2()
        ) {

          showError(
            "Please check your information before creating your store."
          );

          return;

        }


        setFinishLoading(true);


        try {


          /*
            Make sure session still exists
          */

          var sessionResult =
            await sb.auth.getSession();


          if (
            !sessionResult.data.session
          ) {

            throw new Error(
              "Your session has expired. Please sign in again."
            );

          }


          currentUser =
            sessionResult.data.session.user;


          /*
            1. Save profile
          */

          await saveProfile();


          /*
            2. Save business
          */

          var business =
            await saveBusiness();


          /*
            3. Keep Auth metadata name updated
          */

          await sb.auth.updateUser({

            data: {

              full_name:
                fullNameEl.value.trim()

            }

          });


          /*
            4. Mark onboarding finished
          */

          await completeOnboarding();


          /*
            Store optional business ID locally.

            This is NOT used for security.
            Supabase/RLS remains the authority.
          */

          if (
            business &&
            business.id
          ) {

            localStorage.setItem(
              "runambiz_business_id",
              business.id
            );

          }


          /*
            Redirect
          */

          window.location.replace(
            REDIRECT_AFTER_ONBOARDING
          );


        } catch (error) {


          console.error(
            "Onboarding error:",
            error
          );


          var message =
            "Something went wrong while creating your store. Please try again.";


          if (
            error &&
            error.message
          ) {

            message =
              error.message;

          }


          showError(message);


          setFinishLoading(false);

        }

      }
    );

  }



  /* =========================================
     START PAGE
  ========================================= */

  var authenticated =
    await checkAuth();


  if (!authenticated) {
    return;
  }


  await checkExistingOnboarding();


  showStep(1);


  if (window.lucide) {
    lucide.createIcons();
  }

});