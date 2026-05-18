// ── Canadian Mortgage Calculator — index.js ───────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  const fmtC = window.AdvancedModules?.fmtC || (n => "$" + Math.abs(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","));

  // ── Dark Mode ─────────────────────────────────────────────
  const themeBtn = document.getElementById("themeBtn");
  const savedTheme = localStorage.getItem("mortgage_theme") || "light";
  if (savedTheme === "dark") { document.documentElement.setAttribute("data-theme", "dark"); themeBtn.textContent = "☀️ Light"; }

  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
    themeBtn.textContent = isDark ? "🌙 Dark" : "☀️ Light";
    localStorage.setItem("mortgage_theme", isDark ? "light" : "dark");
  });

  // ── Land Transfer Tax ──────────────────────────────────────
  const LTT = {
    ON: (price, firstTime) => {
      let tax = 0;
      if (price <= 55000)          tax = price * 0.005;
      else if (price <= 250000)    tax = 275 + (price - 55000) * 0.010;
      else if (price <= 400000)    tax = 2225 + (price - 250000) * 0.015;
      else if (price <= 2000000)   tax = 4475 + (price - 400000) * 0.020;
      else                          tax = 36475 + (price - 2000000) * 0.025;
      if (firstTime) tax = Math.max(0, tax - 4000);
      return tax;
    },
    BC: (price, firstTime) => {
      let tax = 0;
      if (price <= 200000)         tax = price * 0.01;
      else if (price <= 2000000)   tax = 2000 + (price - 200000) * 0.02;
      else if (price <= 3000000)   tax = 38000 + (price - 2000000) * 0.03;
      else                          tax = 68000 + (price - 3000000) * 0.05;
      if (firstTime && price <= 500000) tax = 0;
      else if (firstTime && price <= 525000) tax *= ((price - 500000) / 25000);
      return tax;
    },
    QC: (price) => {
      let tax = 0;
      if (price <= 51700)          tax = price * 0.005;
      else if (price <= 258600)    tax = 258.5 + (price - 51700) * 0.010;
      else if (price <= 517100)    tax = 2324.5 + (price - 258600) * 0.015;
      else if (price <= 1034200)   tax = 6201 + (price - 517100) * 0.020;
      else                          tax = 16543 + (price - 1034200) * 0.025;
      return tax;
    },
    MB: (price) => {
      if (price <= 30000) return 0;
      let tax = 0;
      if (price <= 90000)          tax = (price - 30000) * 0.005;
      else if (price <= 150000)    tax = 300 + (price - 90000) * 0.010;
      else if (price <= 200000)    tax = 900 + (price - 150000) * 0.015;
      else                          tax = 1650 + (price - 200000) * 0.020;
      return tax;
    },
    NS: (price) => price * 0.015,
    PE: (price) => price * 0.01,
    NB: () => 0,
    NL: () => 0,
    AB: () => 0,
    SK: () => 0,
    NT: () => 0,
    NU: () => 0,
    YT: () => 0,
  };

  // ── CMHC Insurance ────────────────────────────────────────
  function calcCMHC(price, downPct, amortYears) {
    if (downPct >= 20) return 0;
    if (price > 1500000) return 0; // Not eligible
    let rate = 0;
    if (downPct < 10)       rate = 0.0400;
    else if (downPct < 15)  rate = 0.0310;
    else if (downPct < 20)  rate = 0.0280;
    if (amortYears > 25) rate += 0.0020; // Extended amortization surcharge
    const insuredAmount = price - (price * downPct / 100);
    return insuredAmount * rate;
  }

  // ── Down Payment Toggle ───────────────────────────────────
  let dpMode = "dollar";
  document.getElementById("dpDollarBtn").addEventListener("click", () => {
    dpMode = "dollar";
    document.getElementById("dpDollarBtn").classList.add("active");
    document.getElementById("dpPercentBtn").classList.remove("active");
    document.getElementById("dpPrefix").textContent = "$";
    document.getElementById("downPayment").placeholder = "100,000";
    updateDpDisplay();
  });
  document.getElementById("dpPercentBtn").addEventListener("click", () => {
    dpMode = "percent";
    document.getElementById("dpPercentBtn").classList.add("active");
    document.getElementById("dpDollarBtn").classList.remove("active");
    document.getElementById("dpPrefix").textContent = "%";
    document.getElementById("downPayment").placeholder = "20";
    updateDpDisplay();
  });

  function updateDpDisplay() {
    const price = parseFloat(document.getElementById("purchasePrice").value) || 0;
    const dp    = parseFloat(document.getElementById("downPayment").value) || 0;
    const el    = document.getElementById("dpPercDisplay");
    if (!price || !dp) { el.textContent = ""; return; }
    if (dpMode === "dollar") {
      el.textContent = `= ${((dp / price) * 100).toFixed(1)}% of purchase price`;
    } else {
      el.textContent = `= ${fmtC(price * dp / 100)} down`;
    }
  }

  document.getElementById("purchasePrice").addEventListener("input", updateDpDisplay);
  document.getElementById("downPayment").addEventListener("input", updateDpDisplay);

  // ── Payment frequency multipliers ────────────────────────
  const FREQ = {
    monthly:       { label: "Monthly",              perYear: 12,  accel: false },
    biweekly:      { label: "Bi-Weekly",             perYear: 26,  accel: false },
    weekly:        { label: "Weekly",                perYear: 52,  accel: false },
    biweekly_acc:  { label: "Accelerated Bi-Weekly", perYear: 26,  accel: true  },
    weekly_acc:    { label: "Accelerated Weekly",    perYear: 52,  accel: true  },
  };

  // ── Main Calculate ────────────────────────────────────────
  document.getElementById("calculateBtn").addEventListener("click", calculate);

  function calculate() {
    const errorEl = document.getElementById("coreError");

    const purchasePrice = parseFloat(document.getElementById("purchasePrice").value);
    const dpRaw         = parseFloat(document.getElementById("downPayment").value);
    const rate          = parseFloat(document.getElementById("interestRate").value);
    const amortYears    = parseInt(document.getElementById("amortization").value);
    const freqKey       = document.getElementById("payFrequency").value;
    const province      = document.getElementById("province").value;
    const firstTime     = document.getElementById("firstTimeBuyer").value === "yes";
    const newBuild      = document.getElementById("newBuild").value === "yes";
    const propertyTax   = parseFloat(document.getElementById("propertyTax").value) || 0;
    const heatingCost   = parseFloat(document.getElementById("heatingCost").value) || 150;
    const condoFees     = parseFloat(document.getElementById("condoFees").value) || 0;

    // Validation
    if (!purchasePrice || purchasePrice <= 0) { showError(errorEl, "Enter a valid purchase price."); return; }
    if (!dpRaw || dpRaw <= 0)                 { showError(errorEl, "Enter a valid down payment."); return; }
    if (!rate || rate <= 0)                   { showError(errorEl, "Enter a valid interest rate."); return; }
    showError(errorEl, "");

    const downPayment = dpMode === "dollar" ? dpRaw : (purchasePrice * dpRaw / 100);
    const downPct     = (downPayment / purchasePrice) * 100;

    if (downPct < 5)  { showError(errorEl, "Minimum down payment is 5% in Canada."); return; }
    if (purchasePrice > 1500000 && downPct < 20) { showError(errorEl, "Homes over $1.5M require 20% down (insured mortgage cap)."); return; }

    // 30-year amort eligibility: insured (<20% down) only for first-time buyers or new builds
    const amort30Warn = document.getElementById("amort30Warning");
    if (amortYears === 30 && downPct < 20 && !firstTime && !newBuild) {
      amort30Warn.style.display = "block";
      showError(errorEl, "30-year amortization on an insured mortgage requires being a first-time buyer or purchasing a new build.");
      return;
    } else {
      if (amort30Warn) amort30Warn.style.display = "none";
    }

    const cmhc          = calcCMHC(purchasePrice, downPct, amortYears);
    const mortgageAmount = purchasePrice - downPayment + cmhc;

    // Monthly payment calculation
    const monthlyRate = rate / 100 / 12;
    const n           = amortYears * 12;
    const monthlyPmt  = monthlyRate > 0
      ? mortgageAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n))
      : mortgageAmount / n;

    // Payment by frequency
    const freq = FREQ[freqKey];
    let payment;
    if (freq.accel) {
      payment = monthlyPmt / (freq.perYear === 26 ? 2 : 4);
    } else {
      const periodRate = rate / 100 / freq.perYear;
      const periods    = amortYears * freq.perYear;
      payment = periodRate > 0
        ? mortgageAmount * periodRate / (1 - Math.pow(1 + periodRate, -periods))
        : mortgageAmount / periods;
    }

    const totalPaid    = payment * (freq.accel ? freq.perYear * amortYears : freq.perYear * amortYears);
    const totalInterest = totalPaid - mortgageAmount;

    // Payoff date
    const payoff = new Date();
    payoff.setFullYear(payoff.getFullYear() + amortYears);

    // Land transfer tax
    const lttFn  = LTT[province] || (() => 0);
    const ltt    = lttFn(purchasePrice, firstTime);

    // Closing costs estimation
    const legal      = 1500;
    const inspection = 500;
    const titleIns   = Math.min(Math.max(purchasePrice * 0.001, 150), 400);
    const appraisal  = 350;
    const totalClosing = ltt + legal + inspection + titleIns + appraisal + cmhc;

    // Stress test
    const stressRate = Math.max(rate + 2, 5.25);
    const stressMonthlyRate = stressRate / 100 / 12;
    const stressPmt  = stressMonthlyRate > 0
      ? mortgageAmount * stressMonthlyRate / (1 - Math.pow(1 + stressMonthlyRate, -n))
      : mortgageAmount / n;

    // Bi-weekly savings vs monthly
    const biweeklyAccPmt = monthlyPmt / 2;
    let biwBalance = mortgageAmount, biwMonths = 0;
    const biwR = rate / 100 / 26;
    for (let i = 0; i < amortYears * 26; i++) {
      const interest  = biwBalance * biwR;
      const principal = biweeklyAccPmt - interest;
      biwBalance = Math.max(0, biwBalance - principal);
      biwMonths++;
      if (biwBalance <= 0) break;
    }
    const biwYears = biwMonths / 26;
    const biwSavedYears = amortYears - biwYears;

    // Render results
    renderResults({
      purchasePrice, downPayment, downPct, mortgageAmount, cmhc,
      monthlyPayment: monthlyPmt, payment, freq, freqKey,
      totalInterest, totalPaid, payoff, rate, amortYears,
      stressRate, stressPmt, ltt, province, firstTime, newBuild,
      legal, inspection, titleIns, appraisal, totalClosing,
      biwSavedYears, closingCosts: totalClosing,
      propertyTax, heatingCost, condoFees
    });

    // Save to URL for sharing
    saveToURL({ purchasePrice, dp: downPayment, rate, amortYears, freqKey, province, firstTime: firstTime ? 1 : 0 });
  }

  // ── Render Results ────────────────────────────────────────
  function renderResults(d) {
    document.getElementById("resultsSection").style.display = "block";
    document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });

    // Payment hero
    const freqLabel = { monthly: "/month", biweekly: "/bi-week", weekly: "/week", biweekly_acc: "/bi-week (acc.)", weekly_acc: "/week (acc.)" };
    document.getElementById("paymentLabel").textContent = d.freq.label + " Payment";
    document.getElementById("paymentAmount").textContent = fmtC(d.payment);
    document.getElementById("paymentSub").textContent = `${fmtC(d.mortgageAmount)} mortgage · ${d.amortYears} year amortization`;

    // Tiles
    document.getElementById("mortgageAmount").textContent = fmtC(d.mortgageAmount);
    document.getElementById("totalInterest").textContent  = fmtC(d.totalInterest);
    document.getElementById("totalCost").textContent      = fmtC(d.purchasePrice + d.totalInterest + d.totalClosing);
    document.getElementById("downPct").textContent        = d.downPct.toFixed(1) + "%";
    document.getElementById("cmhcAmount").textContent     = d.cmhc > 0 ? fmtC(d.cmhc) : "Not required";
    document.getElementById("payoffDate").textContent     = d.payoff.toLocaleDateString("en-CA", { year: "numeric", month: "short" });

    // Breakdown
    const lttLabel = d.province === "ON" ? "Land Transfer Tax (ON)" :
                     d.province === "BC" ? "Property Transfer Tax (BC)" :
                     d.province === "QC" ? "Welcome Tax (QC)" : `Land Transfer Tax (${d.province})`;
    const ftLabel  = d.firstTime ? " (1st Time Buyer Rebate Applied)" : "";

    document.getElementById("breakdownRows").innerHTML = `
      <div class="breakdown-row"><span class="row-label">Purchase Price</span><span class="row-val">${fmtC(d.purchasePrice)}</span></div>
      <div class="breakdown-row"><span class="row-label">Down Payment (${d.downPct.toFixed(1)}%)</span><span class="row-val green">− ${fmtC(d.downPayment)}</span></div>
      ${d.cmhc > 0 ? `<div class="breakdown-row"><span class="row-label">Mortgage Default Insurance (CMHC/Sagen)</span><span class="row-val orange">+ ${fmtC(d.cmhc)}</span></div>` : ""}
      <div class="breakdown-row"><span class="row-label">Mortgage Amount</span><span class="row-val blue">${fmtC(d.mortgageAmount)}</span></div>
      <div class="breakdown-row"><span class="row-label">Total Interest (${d.amortYears}y)</span><span class="row-val red">+ ${fmtC(d.totalInterest)}</span></div>
      <div class="breakdown-row"><span class="row-label">${lttLabel}${ftLabel}</span><span class="row-val">${fmtC(d.ltt)}</span></div>
      ${d.biwSavedYears > 0.5 ? `<div class="breakdown-row"><span class="row-label">💡 Switch to Acc. Bi-Weekly — save</span><span class="row-val green">${d.biwSavedYears.toFixed(1)} yrs</span></div>` : ""}
      <div class="breakdown-row total-row"><span class="row-label">Total Cost of Homeownership</span><span class="row-val">${fmtC(d.purchasePrice + d.totalInterest + d.totalClosing)}</span></div>
    `;

    // Stress Test
    document.getElementById("stressTestBox").innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span>Your rate: <strong>${d.rate}%</strong></span>
        <span style="color:var(--muted)">→</span>
        <span>Stress test rate: <strong>${d.stressRate.toFixed(2)}%</strong></span>
      </div>
      <div class="stress-box pass">
        <div class="stress-title">📋 Stress Test Payment</div>
        <div class="stress-sub">Your lender will qualify you at <strong>${fmtC(d.stressPmt)}/month</strong> (stress test rate). Use the <strong>Affordability tab</strong> above to check if you qualify based on your income.</div>
      </div>
    `;

    // Closing Costs
    document.getElementById("closingCosts").innerHTML = `
      <div class="breakdown-row"><span class="row-label">${lttLabel}${ftLabel}</span><span class="row-val">${fmtC(d.ltt)}</span></div>
      <div class="breakdown-row"><span class="row-label">Legal / Notary Fees (est.)</span><span class="row-val">${fmtC(d.legal)}</span></div>
      <div class="breakdown-row"><span class="row-label">Home Inspection (est.)</span><span class="row-val">${fmtC(d.inspection)}</span></div>
      <div class="breakdown-row"><span class="row-label">Title Insurance (est.)</span><span class="row-val">${fmtC(d.titleIns)}</span></div>
      <div class="breakdown-row"><span class="row-label">Appraisal Fee (est.)</span><span class="row-val">${fmtC(d.appraisal)}</span></div>
      ${d.cmhc > 0 ? `<div class="breakdown-row"><span class="row-label">Mortgage Default Insurance (CMHC/Sagen)</span><span class="row-val orange">${fmtC(d.cmhc)}</span></div>` : ""}
      <div class="breakdown-row total-row"><span class="row-label">Total Estimated Closing Costs</span><span class="row-val red">${fmtC(d.totalClosing)}</span></div>
      <p style="font-size:11px;color:var(--muted);margin-top:8px;">Estimates only. Actual costs vary. Always budget an additional 1.5–4% of purchase price for closing costs.</p>
    `;

    // Advanced modules
    const moduleData = {
      rate: d.rate, amortYears: d.amortYears,
      mortgageAmount: d.mortgageAmount, monthlyPayment: d.monthlyPayment,
      totalInterest: d.totalInterest, purchasePrice: d.purchasePrice,
      downPct: d.downPct, downPayment: d.downPayment,
      closingCosts: d.totalClosing,
      propertyTax: d.propertyTax, heatingCost: d.heatingCost, condoFees: d.condoFees
    };

    if (window.AdvancedModules) {
      window.AdvancedModules.renderAffordability(moduleData);
      window.AdvancedModules.renderPrepayment(moduleData);
      window.AdvancedModules.renderRateCompare(moduleData);
      window.AdvancedModules.renderRentVsBuy(moduleData);
      window.AdvancedModules.renderRenewal(moduleData);
      window.AdvancedModules.renderAmortSchedule(moduleData);
    }

    // Store for export
    window._mortgageData = { ...d, moduleData };

    // Auto-render chart — guard prevents duplicate script injection on rapid recalculates
    const wrap = document.getElementById("chartWrap");
    wrap.classList.add("visible");
    if (window.Chart) {
      drawChart(d);
    } else if (!window._chartLoading) {
      window._chartLoading = true;
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js";
      script.onload = () => { window._chartLoading = false; drawChart(d); };
      document.head.appendChild(script);
    }
  }

  // ── Module Tabs ───────────────────────────────────────────
  document.querySelectorAll(".module-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".module-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".module-section").forEach(s => s.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });


  function drawChart(d) {
    const r = d.rate / 100 / 12;
    const n = d.amortYears * 12;
    const pmt = d.monthlyPayment;
    let bal = d.mortgageAmount;

    const labels = [], principalData = [], interestData = [], balanceData = [];
    let cumPrincipal = 0, cumInterest = 0;

    for (let year = 1; year <= d.amortYears; year++) {
      let yp = 0, yi = 0;
      for (let m = 0; m < 12 && bal > 0; m++) {
        const interest  = bal * r;
        const principal = Math.min(pmt - interest, bal);
        yi += interest; yp += principal;
        bal = Math.max(0, bal - principal);
      }
      cumPrincipal += yp; cumInterest += yi;
      labels.push("Y" + year);
      principalData.push(Math.round(cumPrincipal));
      interestData.push(Math.round(cumInterest));
      balanceData.push(Math.round(bal));
    }

    const ctx = document.getElementById("mortgageChart").getContext("2d");
    if (window._mortgageChart) window._mortgageChart.destroy();
    window._mortgageChart = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Cumulative Principal", data: principalData, backgroundColor: "rgba(27,118,223,0.7)", borderRadius: 3 },
          { label: "Cumulative Interest",  data: interestData,  backgroundColor: "rgba(220,38,38,0.6)",  borderRadius: 3 },
          { label: "Remaining Balance",    data: balanceData,   type: "line", borderColor: "#059669", backgroundColor: "rgba(5,150,105,0.1)", tension: 0.4, fill: false, pointRadius: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
        scales: {
          y: { ticks: { callback: v => "$" + (v >= 1000 ? (v/1000).toFixed(0) + "K" : v) } }
        }
      }
    });
  }

  // ── Copy ──────────────────────────────────────────────────
  document.getElementById("copyBtn").addEventListener("click", async () => {
    const d = window._mortgageData;
    if (!d) return;
    const text = `🏠 Mortgage Summary
Purchase Price: ${fmtC(d.purchasePrice)}
Down Payment: ${fmtC(d.downPayment)} (${d.downPct.toFixed(1)}%)
Mortgage: ${fmtC(d.mortgageAmount)}
Rate: ${d.rate}% · ${d.amortYears}yr amortization
${d.freq.label} Payment: ${fmtC(d.payment)}
Total Interest: ${fmtC(d.totalInterest)}
CMHC: ${d.cmhc > 0 ? fmtC(d.cmhc) : "Not required"}
Closing Costs (est.): ${fmtC(d.totalClosing)}
Calculated at rivlosys.github.io/mortgage-calculator`;
    try { await navigator.clipboard.writeText(text); } catch { }
    flashBtn(document.getElementById("copyBtn"), "✓ Copied!");
  });

  // ── Print ─────────────────────────────────────────────────
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  // ── CSV ───────────────────────────────────────────────────
  document.getElementById("csvBtn").addEventListener("click", () => {
    const d = window._mortgageData;
    if (!d) return;
    const header = "Field,Value";
    const rows = [
      ["Purchase Price", d.purchasePrice],
      ["Down Payment", d.downPayment],
      ["Down Payment %", d.downPct.toFixed(2)],
      ["Mortgage Amount", d.mortgageAmount.toFixed(2)],
      ["Interest Rate %", d.rate],
      ["Amortization Years", d.amortYears],
      ["Payment Frequency", d.freq.label],
      ["Payment Amount", d.payment.toFixed(2)],
      ["Total Interest", d.totalInterest.toFixed(2)],
      ["CMHC Insurance", d.cmhc.toFixed(2)],
      ["Total Closing Costs", d.totalClosing.toFixed(2)],
      ["Province", d.province],
    ].map(([k, v]) => `"${k}","${v}"`).join("\n");
    const csv  = header + "\n" + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "mortgage_calc.csv"; a.click();
    URL.revokeObjectURL(url);
    flashBtn(document.getElementById("csvBtn"), "✓ Saved!");
  });

  // ── Share URL ─────────────────────────────────────────────
  function saveToURL(params) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    window.history.replaceState({}, "", url);
  }

  document.getElementById("shareBtn").addEventListener("click", async () => {
    const url = window.location.href;
    const box = document.getElementById("shareUrlBox");
    document.getElementById("shareUrlInput").value = url;
    box.style.display = box.style.display === "block" ? "none" : "block";
    try { await navigator.clipboard.writeText(url); flashBtn(document.getElementById("shareBtn"), "✓ Link Copied!"); }
    catch { flashBtn(document.getElementById("shareBtn"), "🔗 Link Ready"); }
  });

  // ── Restore from URL ──────────────────────────────────────
  function restoreFromURL() {
    const p = new URLSearchParams(window.location.search);
    if (!p.get("purchasePrice")) return;
    document.getElementById("purchasePrice").value = p.get("purchasePrice") || "";
    document.getElementById("downPayment").value   = p.get("dp") || "";
    document.getElementById("interestRate").value  = p.get("rate") || "";
    document.getElementById("amortization").value  = p.get("amortYears") || "25";
    document.getElementById("payFrequency").value  = p.get("freqKey") || "monthly";
    document.getElementById("province").value      = p.get("province") || "ON";
    document.getElementById("firstTimeBuyer").value= p.get("firstTime") === "1" ? "yes" : "no";
    updateDpDisplay();
    setTimeout(calculate, 100);
  }

  restoreFromURL();

  // ── Currency input formatting (blur) ─────────────────────
  const currencyInputs = ["purchasePrice", "downPayment", "propertyTax", "heatingCost", "condoFees"];
  currencyInputs.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("blur", () => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) {
        // Display formatted value as placeholder-style — keep raw value for calculation
        input.setAttribute("data-raw", val);
        input.title = "$" + val.toLocaleString("en-CA");
      }
    });
    input.addEventListener("focus", () => {
      const raw = input.getAttribute("data-raw");
      if (raw) input.value = raw;
    });
  });

  // ── Helper ────────────────────────────────────────────────
  function showError(el, msg) {
    el.textContent = msg;
    el.style.display = msg ? "block" : "none";
  }

  function flashBtn(btn, msg) {
    const orig = btn.textContent;
    btn.textContent = msg;
    btn.classList.add("success");
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("success"); }, 1800);
  }

});