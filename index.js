document.addEventListener("DOMContentLoaded", () => {

  // ── Embed Detection ──────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  if (params.get("embed") === "true") document.body.classList.add("is-embed");

  if (typeof gtag === "function") {
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href
    });
  }

  // ── Element Cache (Consolidated) ──────────────────────────
  const els = {
    purchasePrice: document.getElementById("purchasePrice"),
    downPayment: document.getElementById("downPayment"),
    interestRate: document.getElementById("interestRate"),
    amortization: document.getElementById("amortization"),
    payFrequency: document.getElementById("payFrequency"),
    extraPayment: document.getElementById("extraPayment"),
    currentRate: document.getElementById("currentRate"),
    province: document.getElementById("province"),
    propertyTax: document.getElementById("propertyTax"),
    heatingCost: document.getElementById("heatingCost"),
    condoFees: document.getElementById("condoFees"),
    newBuild: document.getElementById("newBuild"),
    firstTimeBuyer: document.getElementById("firstTimeBuyer"),
    modePurchaseBtn: document.getElementById("modePurchaseBtn"),
    modeRefiBtn: document.getElementById("modeRefiBtn"),
    calculateBtn: document.getElementById("calculateBtn"),
    resultsSection: document.getElementById("resultsSection"),
    dpDollarBtn: document.getElementById("dpDollarBtn"),
    dpPercentBtn: document.getElementById("dpPercentBtn"),
    coreError: document.getElementById("coreError"),
    saveIndicator: document.getElementById("saveIndicator"),
    paymentLabel: document.getElementById("paymentLabel"),
    totalCost: document.getElementById("totalCost"),
    downPct: document.getElementById("downPct"),
    cmhcAmount: document.getElementById("cmhcAmount"),
    payoffDate: document.getElementById("payoffDate"),
    breakdownRows: document.getElementById("breakdownRows"),
    paymentSub: document.getElementById("paymentSub"),
    mortgageAmount: document.getElementById("mortgageAmount"),
    totalInterest: document.getElementById("totalInterest"),
    stressTestBox: document.getElementById("stressTestBox"),
    closingCosts: document.getElementById("closingCosts"),
    dpPrefix: document.getElementById("dpPrefix"),
    dpPercDisplay: document.getElementById("dpPercDisplay"),
    themeBtn: document.getElementById("themeBtn"),
    shareBtn: document.getElementById("shareBtn"),
    copyBtn: document.getElementById("copyBtn"),
    printBtn: document.getElementById("printBtn"),
    csvBtn: document.getElementById("csvBtn"),
    resetBtn: document.getElementById("resetBtn"),
    paymentAmount: document.getElementById("paymentAmount"),
    paymentHeroMeta: document.getElementById("paymentHeroMeta"),
    mainH1: document.getElementById("mainH1"),
    qualifyBadge: document.getElementById("qualifyBadge"),
    themeNudge: document.getElementById("themeNudge"),
    shockBarArea: document.getElementById("shockBarArea"),
    moduleTabs: document.querySelectorAll(".module-tab"),
    moduleSections: document.querySelectorAll(".module-section"),
    pageWrap: document.querySelector(".page-wrap"),
    offersSection: document.querySelector('.site-footer .card'),
    steps: [
      document.getElementById("step1"),
      document.getElementById("step2"),
      document.getElementById("step3"),
      document.getElementById("step4")
    ],
    stepProgressText: document.getElementById("stepProgressText")
  };

  // ── Configuration & Constants ──────────────────────────────
  const CONFIG = {
    CLOSING_COST_RATE: 0.015,
    MAX_AMORT_MONTHS: 600,
    STRESS_TEST_FLOOR: 5.25,
    GDS_LIMIT: 0.39,
    TDS_LIMIT: 0.44,
    AVG_BUYER_DP: 18,
    REFI_PENALTY_EST: 3000
  };

  // ── Utility Functions ─────────────────────────────────────
  const toNumber = (val) => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^\d.-]/g, "")) || 0;
  };

  const track = (event, data) => {
    if (typeof gtag === 'function') {
      gtag('event', event, data);
    }
  };
  window.track = track; // Fix Bug 2: Make track global for inline onclicks in affiliate CTA blocks

  // ── Analytics & Funnel State ──────────────────────────────
  let hasStartedTyping = false;
  let mode = "purchase";
  let hasPerformedCalc = false;

  // ── Lazy Script Loader ──────────────────────────────────
  let chartLoaded = false;
  let modulesLoaded = false;

  function loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = (e) => {
        console.warn("Optional script failed to load:", src, e);
        resolve(); // Never reject — a missing module must not kill the chart
      };
      document.body.appendChild(script);
    });
  }

  function loadChartLib() {
    if (chartLoaded || document.querySelector('script[src*="chart.js"]')) return Promise.resolve();
    return new Promise(resolve => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
      script.onload = () => {
        chartLoaded = true;
        resolve();
      };
        script.onerror = (e) => {
          console.error("Failed to load Chart.js:", e);
          resolve(); // Resolve anyway to not block the main app, but chart won't work
        };
      document.body.appendChild(script);
    });
  }

  // ── High-Performance Formatter ────────────────────────────
  const fmtC = (n) => new Intl.NumberFormat('en-CA', { 
    style: 'currency', 
    currency: 'CAD',
    maximumFractionDigits: 0 
  }).format(n || 0);

  let calcTimeout;
  function triggerCalc() {
    clearTimeout(calcTimeout);
    calcTimeout = setTimeout(() => calculate(), 150);
  }

  function updateStepper(targetStep) {
    if (!els.steps[0]) return;
    els.steps.forEach((step, idx) => {
      const stepNum = idx + 1;
      step.classList.remove("active", "completed");
      
      if (stepNum < targetStep) {
        step.classList.add("completed");
      } else if (stepNum === targetStep) {
        step.classList.add("active");
      }
    });

    // Update progression text
    const labels = ["🧠 Understanding: Growing...", "💡 Insight unlocked at Step 2", "💰 Savings revealed at Step 3", "🔥 Best deal shown at Step 4"];
    const nextActions = ["Next: See your analysis →", "Next: Compare real rates →", "Next: View final offers →", "✅ You’ve built your mortgage plan. Now lock in the best rate — this decision can save you $100K+ over time."];
    
    if (els.stepProgressText) {
      const currentLabel = labels[targetStep - 1] || "Details";
      const nextAction = nextActions[targetStep - 1] || "";
      els.stepProgressText.innerHTML = `
        Step ${targetStep} of 4 — ${currentLabel} 
        <span style="display:block; font-size:11px; opacity:0.8; margin-top:2px;">${nextAction}</span>
      `;
    }

    // Analytics for step progression
    if (targetStep > 1) track(`funnel_step_${targetStep}`);
  }


// ── Dark Mode ─────────────────────────────────────────────
const savedTheme = localStorage.getItem("mortgage_theme") || "light";

if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  if (els.themeBtn) els.themeBtn.textContent = "☀️ Night Mode Off";
  if (els.themeNudge) els.themeNudge.style.display = "block";
}

els.themeBtn?.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
  els.themeBtn.textContent = isDark ? "🌙 Night Mode" : "☀️ Night Mode Off";
  if (els.themeNudge) els.themeNudge.style.display = isDark ? "none" : "block";
  localStorage.setItem("mortgage_theme", isDark ? "light" : "dark");
});


// ── Down Payment Toggle (UPGRADED) ───────────────────────────
let dpMode = "dollar";

function setDpMode(mode) {
  const price = toNumber(els.purchasePrice.value);

  // Analytics: Track when user starts interacting
  if (!hasStartedTyping) {
    hasStartedTyping = true;
    track('funnel_input_start');
  }

  let value = toNumber(els.downPayment.value);

  // Limit protection
  if (mode === "percent" && value > 100) value = 100;

  // Convert value when switching
  if (mode === "percent" && dpMode === "dollar" && price > 0) {
    value = (value / price) * 100;
    els.downPayment.value = value.toFixed(1);
  }

  if (mode === "dollar" && dpMode === "percent" && price > 0) {
    value = (price * value) / 100;
    els.downPayment.value = Math.round(value).toLocaleString();
  }

  dpMode = mode;

  // Update UI
  if (mode === "percent") {
    els.dpPrefix.textContent = "%";
    els.downPayment.placeholder = "20";
  } else {
    els.dpPrefix.textContent = "$";
    els.downPayment.placeholder = "100,000";
  }

  els.dpDollarBtn.classList.toggle("active", mode === "dollar");
  els.dpPercentBtn.classList.toggle("active", mode === "percent");

  if (els.dpPercDisplay) updateDpDisplay();
}

if (els.dpDollarBtn) els.dpDollarBtn.addEventListener("click", () => setDpMode("dollar"));
if (els.dpPercentBtn) els.dpPercentBtn.addEventListener("click", () => setDpMode("percent"));
setDpMode("dollar");


// ── DP Display (UPGRADED) ────────────────────────────────────
function updateDpDisplay() {
  const price = toNumber(els.purchasePrice.value);
  const dp = toNumber(els.downPayment.value);

  if (!price || isNaN(dp)) {
    els.dpPercDisplay.textContent = "";
    return;
  }

  // Auto-reset unrealistic percent values
  if (dpMode === "percent" && dp > 100) {
    els.downPayment.value = "100";
  }

  if (dpMode === "dollar") {
    const percent = (dp / price) * 100;
    els.dpPercDisplay.textContent = `= ${percent.toFixed(1)}% of home price`;
  } else {
    const amount = (price * dp) / 100;
    els.dpPercDisplay.textContent = `= ${Math.round(amount).toLocaleString()} down payment`;
  }
}

els.purchasePrice.addEventListener("input", updateDpDisplay);
els.downPayment.addEventListener("input", updateDpDisplay);


// ── Validation Helper ────────────────────────────────────
function validateInputs(isScenario = false) { // Added isScenario flag
  let valid = true;
  if (els.coreError) els.coreError.textContent = "";
  // Clear all errors from relevant fields
  els.purchasePrice?.classList.remove("input-error");
  els.interestRate?.classList.remove("input-error");
  els.amortization?.classList.remove("input-error");
  els.downPayment?.classList.remove("input-error");
  els.currentRate?.classList.remove("input-error");

  const check = (el, name) => {
    if (!el) return;
    const isHidden = el.offsetParent === null;
    if (isHidden) return;
    const val = toNumber(el.value);
    if (el.value === "" || isNaN(val)) {
      el.classList.add("input-error");
      if (els.coreError) els.coreError.textContent = `Please check the highlighted fields.`;
      valid = false;
    }
  };

  check(els.purchasePrice, "purchase price");
  // Specific validation for interestRate: must be a positive number
  const interestRateValue = toNumber(els.interestRate.value);
  if (isNaN(interestRateValue) || interestRateValue <= 0) {
    els.interestRate.classList.add("input-error");
    if (els.coreError) els.coreError.textContent = `Interest rate must be a positive number.`;
    valid = false;
  }

  check(els.amortization, "amortization");

  if (mode === "purchase") {
    check(els.downPayment, "down payment amount");
  } else { // refinance mode
    check(els.currentRate, "current rate");
  }
  return valid;
}

/**
 * CMHC Insurance Logic (2026 Rules)
 * Cap: Homes >= $1.5M cannot have insured mortgages.
 */
function calculateInsurance(price, mortgageAmount, downPct) {
  if (price >= 1500000 || downPct >= 20) return 0;
  let rate = 0;
  if (downPct < 10) rate = 0.04;
  else if (downPct < 15) rate = 0.031;
  else rate = 0.028;
  return mortgageAmount * rate;
}

/** ── Mode Switch Logic ── **/
function setMode(m) {
  mode = m;
  if (els.pageWrap) els.pageWrap.setAttribute("data-mode", m);
  if (els.modePurchaseBtn) els.modePurchaseBtn.classList.toggle("active", m === "purchase");
  if (els.modeRefiBtn) els.modeRefiBtn.classList.toggle("active", m === "refinance");

  triggerCalc();
}
if (els.modePurchaseBtn) els.modePurchaseBtn.addEventListener("click", () => setMode("purchase"));
if (els.modeRefiBtn) els.modeRefiBtn.addEventListener("click", () => setMode("refinance"));

// ── Core Math Engine (Pure Function) ───────────────────────
function calculateMortgage(params) {
  const { 
    mode, purchasePrice, dpRaw, dpMode, rate, amortYears, extraPayment, freq, currentRate 
  } = params;

  let mortgageAmount;
  let data_cmhc = 0;
  let downPayment = 0;
  let downPct = 0;

  if (mode === "purchase") {
    downPayment = dpMode === "dollar" ? dpRaw : purchasePrice * dpRaw / 100;
    const mortgageBase = purchasePrice - downPayment;
    downPct = (downPayment / purchasePrice) * 100;
    const cmhc = calculateInsurance(purchasePrice, mortgageBase, downPct);
    mortgageAmount = mortgageBase + cmhc;
    data_cmhc = cmhc;
  } else {
    mortgageAmount = purchasePrice;
    data_cmhc = 0;
    downPct = 0;
  }

  // Canadian Semi-Annual Compounding Formula
  const r = Math.pow(Math.pow(1 + (rate / 100) / 2, 2), 1 / 12) - 1;
  const nOriginal = amortYears * 12;

  const monthlyBasePayment =
    r > 0
      ? mortgageAmount * r / (1 - Math.pow(1 + r, -nOriginal))
      : mortgageAmount / nOriginal;

  // Normalize frequency for calculation
  const paymentFreq = freq || "monthly";

  let payment = monthlyBasePayment;
  if (paymentFreq === "biweekly") payment = monthlyBasePayment * 12 / 26;
  if (paymentFreq === "weekly") payment = monthlyBasePayment * 12 / 52;
  if (paymentFreq === "biweekly_acc") payment = monthlyBasePayment / 2;
  if (paymentFreq === "weekly_acc") payment = monthlyBasePayment / 4;

  let paymentWithExtra = payment;
  if (paymentFreq === "monthly") paymentWithExtra += extraPayment;
  if (paymentFreq === "biweekly" || paymentFreq === "biweekly_acc") paymentWithExtra += (extraPayment * 12 / 26);
  if (paymentFreq === "weekly" || paymentFreq === "weekly_acc") paymentWithExtra += (extraPayment * 12 / 52);

  let remainingBalance = mortgageAmount;
  let monthsToPayoff = 0;

  // Normalize the simulation payment to a monthly equivalent based on frequency
  let simMonthlyPayment = paymentWithExtra;
  if (paymentFreq.includes("biweekly")) {
    simMonthlyPayment = (paymentWithExtra * 26 / 12);
  } else if (paymentFreq.includes("weekly")) {
    simMonthlyPayment = (paymentWithExtra * 52 / 12);
  }

  // ── Bulletproof Negative Amortization Check ──
  const monthlyEquiv = paymentFreq === "monthly" ? paymentWithExtra : (paymentWithExtra * (paymentFreq.includes("biweekly") ? 26 : 52) / 12);
  let negativeAmort = monthlyEquiv <= (mortgageAmount * r);

  if (!negativeAmort && simMonthlyPayment > (mortgageAmount * r)) {
    while (remainingBalance > 0 && monthsToPayoff < CONFIG.MAX_AMORT_MONTHS) {
      let interestPart = remainingBalance * r;
      let principalPart = simMonthlyPayment - interestPart;
      remainingBalance -= principalPart;
      monthsToPayoff++;
    }
  } else {
    monthsToPayoff = CONFIG.MAX_AMORT_MONTHS;
  }

  const totalInterest = (simMonthlyPayment * monthsToPayoff) - mortgageAmount;
  const finalAmortYears = monthsToPayoff / 12;

  // Refinance Intelligence
  let refiData = null;
  if (mode === "refinance") {
    const oldRate = toNumber(currentRate);
    const rOld = oldRate / 100 / 12;
    const oldPmt = rOld > 0 ? mortgageAmount * rOld / (1 - Math.pow(1 + rOld, -nOriginal)) : mortgageAmount / nOriginal;
    const monthlySavings = oldPmt - monthlyBasePayment;
    refiData = { oldPmt, monthlySavings, totalSavings: monthlySavings * nOriginal, breakEven: monthlySavings > 0 ? CONFIG.REFI_PENALTY_EST / monthlySavings : 0 };
  }

  return {
    purchasePrice,
    downPayment,
    downPct,
    mortgageAmount,
    rate,
    amortYears,
    finalAmortYears,
    refi: refiData,
    payment: paymentWithExtra,
    monthlyBase: monthlyBasePayment,
    negativeAmort,
    frequency: paymentFreq,
    totalInterest,
    cmhc: data_cmhc
  };
}

// ── Calculate Orchestrator ────────────────────────────────
if (els.calculateBtn) els.calculateBtn.addEventListener("click", triggerCalc);

async function calculate() {
  if (!validateInputs()) return;
  const originalBtnText = els.calculateBtn?.textContent || "Calculate";
  
  try {
    els.calculateBtn.textContent = "Calculating...";
    els.calculateBtn.disabled = true;

    if (els.resultsSection) {
      els.resultsSection.style.display = "block";
      setTimeout(() => els.resultsSection.classList.add("show"), 10);
    }

    track('mortgage_calculate', {
      price: toNumber(els.purchasePrice.value),
      rate: toNumber(els.interestRate.value),
      amortization: parseInt(els.amortization.value)
    });

    const results = calculateMortgage({
      mode,
      purchasePrice: toNumber(els.purchasePrice.value),
      dpRaw: toNumber(els.downPayment.value),
      dpMode,
      rate: toNumber(els.interestRate.value),
      amortYears: parseInt(els.amortization.value),
      extraPayment: toNumber(els.extraPayment?.value),
      freq: els.payFrequency.value,
      currentRate: els.currentRate?.value
    });

    // ── Dynamic SEO & UX Multipliers ──
    const priceLabel = fmtC(results.purchasePrice).replace(".00", "");
    document.title = `${fmtC(results.payment)} payment — ${priceLabel} home (Canada)`;
    
    if (els.mainH1 && results.purchasePrice > 0) {
      els.mainH1.textContent = mode === "purchase"
        ? `Buying a ${priceLabel} Home: Mortgage Breakdown`
        : `Refinance Analysis: ${priceLabel} Balance`;
    }

    // 1. Render Core UI immediately
    renderCoreResults(results);
    updateStepper(2);
    els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!hasPerformedCalc) {
      hasPerformedCalc = true;
      track('funnel_first_calc');
    }

    window._mortgageData = results;
    
    updateURLState();

    // 2a. Load Chart.js first — independently so advanced.js can never block it
    await loadChartLib();
    if (typeof Chart !== "undefined") {
      renderChart(results);
    } else {
      let retries = 0;
      const retryChart = setInterval(() => {
        retries++;
        if (retries > 10 || typeof Chart !== "undefined") {
          clearInterval(retryChart);
          renderChart(results);
        }
      }, 300);
    }

    // 2b. Load advanced modules separately — a missing file never affects the chart
    await loadScript("modules/advanced.js");

    // 3. Render advanced details (works even if advanced.js failed to load)
    renderAdvancedDetails(results);

    const activeTabElement = document.querySelector(".module-tab.active");
    if (activeTabElement && window.AdvancedModules) {
      const activeModuleName = activeTabElement.dataset.tab;
      renderSpecificAdvancedModule(activeModuleName, results);
    }

  } catch (err) {
    console.error("Calculation failed:", err);
  } finally {
    els.calculateBtn.textContent = originalBtnText;
    checkBtnState();
  }
}

function updateURLState() {
  try {
    const url = buildShareURL();
    window.history.replaceState(null, "", url);
    if (els.saveIndicator) {
      els.saveIndicator.style.opacity = "1";
      setTimeout(() => { els.saveIndicator.style.opacity = "0"; }, 2000);
    }
  } catch(e) {
    // Silently ignore when running as a local file (file:// origin restriction)
  }
}

// ── Input Formatting (UPGRADED) ──────────────────────────────
function formatCurrencyInput(el) {
  if (!el) return;
  el.addEventListener("input", () => {
    let raw = el.value.replace(/[^\d.]/g, ""); 
    // Prevent multiple dots
    const parts = raw.split(".");
    if (parts.length > 2) raw = parts[0] + "." + parts[1];
    el.value = raw;
    // Auto-clear error when user types
    el.classList.remove("input-error");
    if (els.coreError) els.coreError.textContent = "";
  });
  el.addEventListener("blur", () => {
    let val = toNumber(el.value);
    if (!isNaN(val) && val > 0) el.value = Number(val).toLocaleString();
  });
  el.addEventListener("focus", () => el.value = el.value.replace(/,/g, ""));
}

formatCurrencyInput(els.purchasePrice);
formatCurrencyInput(els.downPayment);
formatCurrencyInput(els.extraPayment);

// ── Debounced Auto-Calc Listeners ───────────────────────────
[els.purchasePrice, els.downPayment, els.interestRate, els.extraPayment].forEach(el => {
  if (el) el.addEventListener("input", () => {
    if (!hasStartedTyping) {
      hasStartedTyping = true;
      track('funnel_input_start');
    }
    triggerCalc();
  });
});

[els.amortization, els.payFrequency, els.province, els.newBuild, els.firstTimeBuyer].forEach(el => {
  if (el) el.addEventListener("change", triggerCalc);
});

// Standard formatting for interest rate
if (els.interestRate) {
  els.interestRate.addEventListener("input", () => {
    els.interestRate.classList.remove("input-error");
    if (els.coreError) els.coreError.textContent = "";
  });
}


// ── Template Functions ────────────────────────────────────
function renderShockBarHTML(d) {
  const totalWithInterest = d.mortgageAmount + d.totalInterest;
  const equityPct = (d.mortgageAmount / totalWithInterest) * 100;
  const interestPct = (d.totalInterest / totalWithInterest) * 100;
  return `
    <div class="shock-bar-label">
      <span>🏠 Home Equity: <b>${fmtC(d.mortgageAmount)}</b></span>
      <span>${equityPct.toFixed(0)}%</span>
    </div>
    <div class="shock-bar-track">
      <div class="shock-bar-fill fill-equity" style="width: ${equityPct}%"></div>
    </div>
    <div class="shock-bar-label">
      <span>🏦 You pay the bank (Interest): <b>${fmtC(d.totalInterest)}</b></span>
      <span>${interestPct.toFixed(0)}%</span>
    </div>
    <div class="shock-bar-track">
      <div class="shock-bar-fill fill-interest" style="width: ${interestPct}%"></div>
    </div>
  `;
}

// ── Core Render (Non-blocking) ────────────────────────────
function renderCoreResults(d) {
  if (!els.resultsSection) return;
  els.resultsSection.style.display = "block";
  els.resultsSection.classList.add("show");

  els.paymentAmount.textContent = fmtC(d.payment);
  els.paymentLabel.textContent = d.frequency.replace("_", " ").toUpperCase() + " PAYMENT";

  if (els.shockBarArea) els.shockBarArea.innerHTML = renderShockBarHTML(d);
  
  els.mortgageAmount.textContent = fmtC(d.mortgageAmount);
  els.totalInterest.textContent = fmtC(d.totalInterest);
}

// ── Render Advanced Details (After modules loaded) ────────────────────────
function renderAdvancedDetails(d) {
  // Note: renderCoreResults(d) is called immediately in calculate()
  // This function handles the rest of the UI updates after modules are loaded.
  // ── Qualification Badge (Dashbord Style) ──
  if (els.qualifyBadge) {
    const stressRate = Math.max(d.rate + 2, CONFIG.STRESS_TEST_FLOOR);
    if (d.negativeAmort) {
      els.qualifyBadge.textContent = "🚨 Warning: Payment too low";
      els.qualifyBadge.style.background = "var(--red)";
    } else if (d.downPct < 5 && d.purchasePrice < 1500000) {
      els.qualifyBadge.textContent = "⚠️ Low Down Payment";
      els.qualifyBadge.style.background = "var(--orange)";
    } else {
      els.qualifyBadge.textContent = `✅ Passes Stress Test (${stressRate.toFixed(2)}%)`;
      els.qualifyBadge.style.background = "rgba(255,255,255,0.2)";
    }
    els.qualifyBadge.style.display = "inline-block";
  }


  // ── Clean & Credible Contextual CTA ──
  const isHighRate = d.rate > 5.5;
  const ctaText = mode === "purchase" ? "→ Check Today’s Lowest Rates" : "→ Find Lowest Refinance Rate";
  
  const ctaHTML = `
    <div class="card cta-block-premium" style="border:3px solid ${isHighRate ? 'var(--red)' : 'var(--blue)'}; background:var(--blue-light); cursor:pointer; margin-top:15px; text-align:center; padding: 25px;"
         onclick="track('click_ratehub_insight', { type: '${mode}', rate: ${d.rate} }); window.open('https://www.ratehub.ca', '_blank')">
      <h3 style="font-size: 18px; margin-bottom: 8px;">🚀 Lock in a Lower Rate Now</h3>
      <p style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">See real offers from 30+ lenders in 60 seconds</p>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 15px; font-size: 12px; font-weight: 500;">
        <span>✅ No impact on credit</span>
        <span>✅ Personalized rates</span>
        <span>✅ Takes less than 1 minute</span>
      </div>
      <span style="color:var(--blue); font-weight:700; display:block; margin-top:8px; font-size: 15px;">${ctaText}</span>
      <p style="font-size: 11px; margin-top: 10px; color: var(--subtext); font-style: italic;">Rates change daily — don’t overpay on your interest.</p>
    </div>
  `;

  // ── Accurate Amortization Simulation ──
  let balSim = d.mortgageAmount;
  let totalInt5 = 0;
  const rM = Math.pow(Math.pow(1 + (d.rate / 100) / 2, 2), 1 / 12) - 1;
  for (let i = 0; i < 60; i++) {
    const interest = balSim * rM;
    const principal = d.monthlyBase - interest;
    balSim -= principal;
    totalInt5 += interest;
    if (balSim <= 0) break;
  }
  const bankShare = (totalInt5 / (d.monthlyBase * 60)) * 100;

  // Timeline Break-even logic
  const breakEvenMonth = Math.log(2) / Math.log(1 + rM); 

  // Conversion Boost under payment
  if (els.paymentHeroMeta) {
    const divisor = d.purchasePrice || d.mortgageAmount || 1;
    const intPercent = Math.round((d.totalInterest / divisor) * 100);
    const contextLabel = mode === "purchase" ? "home price" : "loan balance";
    els.paymentHeroMeta.innerHTML = `⚠️ Over ${d.amortYears} years, you pay <b>${fmtC(d.totalInterest)}</b> in interest (${intPercent}% of ${contextLabel}).`;
  }

  // ── SMART INSIGHTS ──
  const rLower = (d.rate - 0.5) / 100 / 12;
  const pmtLower = rLower > 0 ? d.mortgageAmount * rLower / (1 - Math.pow(1 + rLower, -(d.amortYears * 12))) : d.mortgageAmount / (d.amortYears * 12);
  const rateSavings = (d.monthlyBase - pmtLower);
  const timeSaved = d.amortYears - d.finalAmortYears;

  const affordabilityStatus =
    d.totalInterest < d.mortgageAmount
      ? "✅ Efficient structure"
      : d.totalInterest < d.mortgageAmount * 1.5
      ? "⚠️ Interest-heavy profile"
      : "🚨 High interest load";

  // Add micro-delay animation to results
  els.breakdownRows.style.opacity = "0";
  setTimeout(() => {
    els.breakdownRows.style.transition = "opacity 0.5s ease";
    els.breakdownRows.style.opacity = "1";
    
    let insightsHTML = '';
    if (d.negativeAmort) {
      insightsHTML += `<div class="tip" style="background:var(--red-bg); border:2px solid var(--red); color:var(--red);">🚨 <b>Warning:</b> Negative Amortization. Your payment is too low to cover interest. The loan will never be paid off.</div>`;
    }

    if (mode === "refinance" && d.refi) {
      insightsHTML += `
        <div class="tip" style="background:var(--green-bg); border-color:var(--green);">
          💡 <b>Refinance Impact:</b> By switching to ${d.rate}%, you save <b>${fmtC(d.refi.monthlySavings)}/month</b> and <b>${fmtC(d.refi.totalSavings)}</b> over your remaining term.
        </div>
        <div class="tip">
          🧮 <b>Refinance Break-even:</b> Your costs are recovered via savings in <b>${Math.round(d.refi.breakEven)} months</b>.
        </div>
      `;
    }

    insightsHTML += `
      <div class="tip" style="background:var(--blue-light); border-color:var(--blue);">
        💡 <b>Optimization:</b> A 0.5% lower rate would save you <b>${fmtC(rateSavings)}/month</b>.
      </div>
    `;

    if (d.totalInterest > d.purchasePrice) {
      insightsHTML += `<div class="tip" style="background:var(--red-bg); border-color:var(--red);">📊 <b>Long-term cost insight:</b> Your total interest payments will eventually exceed the original price of the home.</div>`;
    } else {
      insightsHTML += `<div class="tip" style="background:var(--red-bg); border-color:var(--red);">⏳ <b>5-Year Outlook:</b> <b>${Math.round(bankShare)}%</b> of your payments go toward interest rather than building equity.</div>`;
    }

    if (d.downPct < 20) {
      insightsHTML += `<div class="tip">💰 <b>Insurance Saving:</b> Add 5% more down to save approx. ${fmtC(d.mortgageAmount * 0.005)} in insurance fees.</div>`;
    }
    if (mode === "purchase" && d.purchasePrice >= 1500000 && d.downPct < 20) {
      insightsHTML += `<div class="tip" style="color:var(--red)">🚨 <b>Hard Rule:</b> Homes over $1.5M require 20% down. Insured mortgages are not allowed.</div>`;
    }

    // ── What to Do Next Section ──
    const nextStepHTML = `
      <div style="margin-top:20px; border-top:2px dashed var(--border); padding-top:15px;">
        <h4 style="font-size:14px; margin-bottom:10px; color:var(--text);">✅ What to Do Next:</h4>
        <p style="font-size:13px; margin-bottom:15px; color:var(--subtext); line-height:1.5;">
          Compare today’s lowest rates and see if refinancing or a different term is worth it. 
          Optimize your <span style="color:var(--blue); font-weight:700;">🔵 Payment</span>, 
          minimize <span style="color:var(--red); font-weight:700;">🔴 Interest</span>, 
          and accelerate <span style="color:var(--green); font-weight:700;">🟢 Equity</span> growth.
        </p>
      </div>
    `;

    const extraInsightsHTML = `
      <div class="tip" style="border-left-color: var(--green);">
        💡 <b>Strategy Insight:</b> Adding just $200/month could cut ~4 years off your mortgage and save ~$30K+ in interest.
      </div>
      <div class="tip" style="border-left-color: var(--blue);">
        💡 <b>Comparison Shock:</b> If you secure a ${(d.rate - 0.5).toFixed(2)}% rate instead of ${d.rate.toFixed(2)}%, you could save <b>${fmtC(rateSavings * d.amortYears * 12)}</b> over your mortgage amortization.
      </div>
      <div class="tip" style="border-left-color: var(--red);">
        ⚠️ <b>Warning:</b> Most buyers only focus on monthly payments — but the real cost is <b>long-term interest</b>. A small rate difference today can cost you tens of thousands later.
      </div>
      <div class="tip" style="border-left-color: var(--orange);">
        📊 <b>Share-Worthy Insight:</b> Most Canadians renew their mortgage 4–5 times — your long-term rate strategy matters more than the initial sign-up.
      </div>
    `;

    els.breakdownRows.innerHTML = insightsHTML + extraInsightsHTML + nextStepHTML + ctaHTML;
  }, 400);

  els.totalCost.textContent = fmtC(d.mortgageAmount + d.totalInterest);
  els.downPct.textContent = d.downPct.toFixed(1) + "%";
  els.cmhcAmount.textContent = fmtC(d.cmhc);

  // payoff date
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + Math.round(d.finalAmortYears * 12));

  els.payoffDate.textContent = (d.finalAmortYears < d.amortYears) 
    ? `Paid off in ${Math.floor(d.finalAmortYears)} yrs (${Math.round(d.finalAmortYears * 12)} months)`
    : payoff.toLocaleDateString();

  // Stress Test
  const stressRate = Math.max(d.rate + 2, CONFIG.STRESS_TEST_FLOOR);
  const rStress = Math.pow(Math.pow(1 + (stressRate / 100) / 2, 2), 1 / 12) - 1;
  const nStress = d.amortYears * 12;
  const stressPayment = rStress > 0 
    ? d.mortgageAmount * rStress / (1 - Math.pow(1 + rStress, -nStress))
    : d.mortgageAmount / nStress;

  els.stressTestBox.innerHTML = `
    <div class="tip">
      🧪 <b>Stress Test Rate:</b> ${stressRate.toFixed(2)}%<br>
      📉 <b>Payment at stress rate:</b> ${fmtC(stressPayment)}
    </div>
  `;

  // Closing costs
  const closing = d.purchasePrice * CONFIG.CLOSING_COST_RATE;

  els.closingCosts.innerHTML = `
    <div class="tip">
      📋 <b>Estimated closing costs:</b> ${fmtC(closing)}<br>
      (legal, tax, inspection approx.)
    </div>
  `;

  // Render Advanced Modules
  // This is now handled directly in the calculate() function after modules are loaded.
}

// ── Render Specific Advanced Module ────────────────────────
function renderSpecificAdvancedModule(moduleName, data) {
  const methodName = "render" + moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

  if (!window.AdvancedModules || typeof window.AdvancedModules[methodName] !== 'function') {
    console.warn("Advanced module failed to load", {
      module: methodName,
      hasData: !!window._mortgageData,
      hasModules: !!window.AdvancedModules
    });
    return;
  }
  const closing = data.purchasePrice * CONFIG.CLOSING_COST_RATE;
  const moduleData = {
    rate: data.rate,
    amortYears: data.amortYears,
    mortgageAmount: data.mortgageAmount,
    monthlyPayment: (data.payment * (data.frequency === "monthly" ? 1 : data.frequency.includes("biweekly") ? 26/12 : 52/12)),
    totalInterest: data.totalInterest,
    purchasePrice: data.purchasePrice,
    downPct: data.downPct,
    downPayment: data.downPayment,
    closingCosts: closing,
    propertyTax: toNumber(els.propertyTax.value),
    heatingCost: toNumber(els.heatingCost.value),
    condoFees: toNumber(els.condoFees.value)
  };
  if (window.AdvancedModules && window.AdvancedModules[methodName]) {
    window.AdvancedModules[methodName](moduleData);
  }
}

// ── Render Chart ──────────────────────────────────────────
function renderChart(d) {
  const canvas = document.getElementById("mortgageChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (window._mortgageChart) {
    window._mortgageChart.destroy();
  }

  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded yet. Retrying in background...");
    return;
  }

  if (d.mortgageAmount <= 0) {
    console.warn("Mortgage amount is zero or negative, skipping chart rendering.");
    return;
  }

  let balance = d.mortgageAmount;

  let principalData = [];
  let interestData = [];
  let balanceData = [];
  let equityCrossoverYear = 0;
  let labels = [];

  const r = Math.pow(Math.pow(1 + (d.rate / 100) / 2, 2), 1 / 12) - 1; // Fix Bug 5: Use Canadian semi-annual compounding formula for chart accuracy

  const monthlyPayment =
    d.frequency === "monthly"
      ? d.payment
      : d.frequency.includes("biweekly")
      ? d.payment * 26 / 12
      : d.payment * 52 / 12;

  for (let year = 1; year <= d.amortYears; year++) {

    let yearlyPrincipal = 0;
    let yearlyInterest = 0;

    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;

      const interest = balance * r;
      const principal = monthlyPayment - interest;

      balance -= principal;

      yearlyInterest += interest; yearlyPrincipal += principal;
    }

    if (equityCrossoverYear === 0 && yearlyPrincipal > yearlyInterest) equityCrossoverYear = year;

    principalData.push(Math.max(0, yearlyPrincipal));
    interestData.push(Math.max(0, yearlyInterest));
    balanceData.push(Math.max(0, balance));
    labels.push("Year " + year);
  }

  window._mortgageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,

      datasets: [
        {
          type: "bar",
          label: "🏦 Cost to Bank (Interest)",
          data: interestData,
          backgroundColor: "rgba(220, 38, 38, 0.7)"
        },
        {
          type: "bar",
          label: "🏠 Equity You Own (Principal)",
          data: principalData,
          backgroundColor: "rgba(27, 118, 223, 0.8)"
        },
        {
          type: "line",
          label: "📉 Remaining Balance",
          data: balanceData,
          borderColor: "#059669",
          backgroundColor: "rgba(5,150,105,0.2)",
          tension: 0.45,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: "y1"
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: true,

      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { size: 12 }
          }
        },

        title: {
          display: true,
          text: "Your Mortgage Story Over Time",
          font: { size: 18, weight: '700' }
        },

        subtitle: {
          display: true,
          text: equityCrossoverYear > 0 ? `✨ Year ${equityCrossoverYear}: This is the "Equity Acceleration" point where you pay more to yourself than the bank.` : 'Initial phase: Your payments are mostly interest.',
          font: { size: 13, style: 'italic' },
          padding: { bottom: 10 }
        },

        tooltip: {
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: function(ctx) {
              return ctx.dataset.label + ": " + fmtC(ctx.raw);
            }
          }
        }
      },

      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: "Year"
          }
        },

        y: {
          stacked: true,
          ticks: {
            callback: v => "$" + (v / 1000) + "k"
          },
          title: {
            display: true,
            text: "Yearly Payments (CAD)"
          }
        },

        y1: {
          position: "right",
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: v => "$" + Math.round(v / 1000) + "k"
          },
          title: {
            display: true,
            text: "Remaining Balance"
          }
        }
      },

      animation: {
        duration: 600
      }
    }
  });
}


// ── Share URL Builder ─────────────────────────────────────
function buildShareURL() {
  const d = window._mortgageData;
  if (!d) return window.location.origin;

  const url = new URL(window.location.href.split('?')[0]); // Fix Bug 1: Use window.location.href as base to preserve path (e.g. /tools/ or /mortgage/)
  url.searchParams.set("price", d.purchasePrice);
  url.searchParams.set("dp", d.downPayment);
  url.searchParams.set("rate", d.rate);
  url.searchParams.set("amort", d.amortYears);
  url.searchParams.set("freq", d.frequency);
  url.searchParams.set("extra", toNumber(els.extraPayment?.value));
  url.searchParams.set("prov", els.province.value);
  url.searchParams.set("tax", els.propertyTax.value);
  url.searchParams.set("heat", els.heatingCost.value); // Fix Bug 4: Save heating to share URL
  url.searchParams.set("condo", els.condoFees.value); // Fix Bug 4: Save condo fees to share URL

  return url.toString();
}


// ── Share Button ──────────────────────────────────────────
if (els.shareBtn) els.shareBtn.addEventListener("click", async () => {
  track('share_clicked');
  const url = buildShareURL();
  document.getElementById("shareUrlInput").value = url;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(url);
  } else {
    // Safari / Private mode fallback
    prompt("Copy your mortgage plan link:", url);
  }

  const btn = document.getElementById("shareBtn");
  const originalText = btn.textContent;
  btn.textContent = "✅ Copied!";
  setTimeout(() => btn.textContent = originalText, 2000);
});


// ── Copy Summary ──────────────────────────────────────────
if (els.copyBtn) els.copyBtn.addEventListener("click", async () => {
  track('copy_summary');
  const d = window._mortgageData;
  if (!d) return;

  const text = `💥 See if YOU can afford this house!

💰 My Payment: ${fmtC(d.payment)}/mo
🏠 House Price: ${fmtC(d.purchasePrice)}
💸 Total Interest: ${fmtC(d.totalInterest)}

💥 Can you beat this or afford more? 
Check your breakdown: ${buildShareURL()}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    prompt("Copy summary:", text);
  }
  const btn = document.getElementById("copyBtn");
  const originalText = btn.textContent;
  btn.textContent = "✅ Copied!";
  setTimeout(() => btn.textContent = originalText, 2000);
});

// ── Print Button ──────────────────────────────────────────
if (els.printBtn) els.printBtn.addEventListener("click", () => {
  window.print();
});


// ── CSV Export ────────────────────────────────────────────
if (els.csvBtn) els.csvBtn.addEventListener("click", () => {
  const d = window._mortgageData;
  if (!d) return;

  const rows = [
    ["Purchase Price", d.purchasePrice],
    ["Down Payment", d.downPayment],
    ["Mortgage Amount", d.mortgageAmount],
    ["Total Interest", d.totalInterest],
    ["CMHC Insurance", d.cmhc]
  ];

  const csv = "Field,Value\n" + rows.map(([k,v]) => `"${k}","${v}"`).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mortgage.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ── Offer Visibility Observer (Step 4) ────────────────────
if (els.offersSection) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && hasPerformedCalc) {
        updateStepper(4);
      }
    });
  }, { threshold: 0.5 });
  observer.observe(els.offersSection);
}

// ── Reset Logic ──────────────────────────────────────────
if (els.resetBtn) els.resetBtn.addEventListener("click", () => {
  // 1. Stop any pending debounced calculations immediately
  clearTimeout(calcTimeout);

  // 2. Reset the Top Heading and Page Title to original state
  if (els.mainH1) els.mainH1.textContent = "Canadian Mortgage Calculator";
  const sub = document.getElementById("mainSubtitle");
  if (sub) sub.textContent = "Monthly payments · CMHC · Stress test · Land transfer tax · All provinces";
  document.title = "Mortgage Calculator Canada – Instant Monthly Payment Estimate";

  document.querySelectorAll("input").forEach(input => {
    input.value = "";
    input.classList.remove("input-error");
  });
  if (els.amortization) els.amortization.value = "25";
  if (els.payFrequency) els.payFrequency.value = "monthly";
  
  localStorage.removeItem("savedMortgage");
  window.history.replaceState(null, "", window.location.pathname);
  window._mortgageData = null;
  
  els.resultsSection.style.display = "none";
  els.resultsSection.classList.remove("show");
  els.moduleSections.forEach(s => s.innerHTML = "");
  
  [els.paymentAmount, els.paymentSub, els.mortgageAmount, els.totalInterest, 
   els.totalCost, els.downPct, els.cmhcAmount, els.payoffDate,
   els.stressTestBox, els.closingCosts, els.breakdownRows].forEach(el => {
    if (el) el.innerHTML = (el === els.paymentAmount) ? "—" : "";
  });
  if (window._mortgageChart) {
    window._mortgageChart.destroy();
    window._mortgageChart = null;
  }
  updateStepper(1);
  if (els.dpPercDisplay) els.dpPercDisplay.textContent = "";
  setDpMode("dollar");
  checkBtnState();
});

// Initialize default mode state
setMode(mode);

const savedData = localStorage.getItem("savedMortgage");
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has("mode")) setMode(urlParams.get("mode"));

if (urlParams.has("price") || urlParams.has("province") || urlParams.has("tab")) {
  if (urlParams.get("price")) {
    els.purchasePrice.value = Number(urlParams.get("price")).toLocaleString();
    els.downPayment.value = Number(urlParams.get("dp")).toLocaleString();
    els.interestRate.value = urlParams.get("rate");
    els.amortization.value = urlParams.get("amort") || "25";
    els.payFrequency.value = urlParams.get("freq") || "monthly";
    if (urlParams.has("extra")) els.extraPayment.value = Number(urlParams.get("extra")).toLocaleString();
    if (urlParams.has("prov")) els.province.value = urlParams.get("prov");
    if (urlParams.has("tax")) els.propertyTax.value = urlParams.get("tax");
    if (urlParams.has("heat")) els.heatingCost.value = urlParams.get("heat"); // Fix Bug 4: Load heating from URL
    if (urlParams.has("condo")) els.condoFees.value = urlParams.get("condo"); // Fix Bug 4: Load condo fees from URL
  }
  if (urlParams.get("province")) els.province.value = urlParams.get("province");
  if (urlParams.get("propertyTax")) els.propertyTax.value = Number(urlParams.get("propertyTax")).toLocaleString();
  const tabName = urlParams.get("tab");
  if (tabName) {
    const tabBtn = document.querySelector(`.module-tab[data-tab="${tabName}"]`);
    if (tabBtn) tabBtn.click();
  }
  if (urlParams.get("price")) calculate();
} else if (savedData && els.purchasePrice && els.purchasePrice.value === "") {
  const d = JSON.parse(savedData);
  els.purchasePrice.value = Number(d.purchasePrice).toLocaleString();
  els.downPayment.value = Number(d.downPayment).toLocaleString();
  els.interestRate.value = d.rate;
  if (els.amortization) els.amortization.value = d.amortYears || "25";
  updateDpDisplay();
}

// ── Advanced Tools Switching ──────────────────────────────
els.moduleTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    // Moving to Step 3 when they start comparing options
    if (hasPerformedCalc) updateStepper(3);

    els.moduleTabs.forEach(t => t.classList.remove("active"));
    els.moduleSections.forEach(s => s.classList.remove("active"));
    tab.classList.add("active");
    const target = document.getElementById("tab-" + tab.dataset.tab);
    if (target) {
      target.classList.add("active");
      // Render the specific module for the clicked tab
      if (window._mortgageData && window.AdvancedModules) { // Ensure data and modules are loaded
        renderSpecificAdvancedModule(tab.dataset.tab, window._mortgageData);
      } else {
        console.warn("Cannot render advanced module: _mortgageData or AdvancedModules not available.");
      }
    }
  });
});

// ── Rating Logic ──────────────────────────────────────────
const goodBtn = document.getElementById("rateGood");
const badBtn = document.getElementById("rateBad");
const ratingResponse = document.getElementById("ratingResponse");

if (goodBtn && badBtn) {
  goodBtn.addEventListener("click", () => {
    ratingResponse.textContent = "✅ Glad it helped!";
    goodBtn.disabled = true;
    badBtn.disabled = true;
  });

  badBtn.addEventListener("click", () => {
    ratingResponse.innerHTML = `
      🙏 Thanks — tell me what could improve:
      <br>
      <a href="mailto:helpinbx@gmail.com">helpinbx@gmail.com</a>
    `;
    goodBtn.disabled = true;
    badBtn.disabled = true;
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && ["INPUT", "SELECT"].includes(document.activeElement.tagName)) {
    calculate();
  }
});

});
