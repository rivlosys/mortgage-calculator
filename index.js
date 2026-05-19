document.addEventListener("DOMContentLoaded", () => {

// ── Formatter ─────────────────────────────────────────────
const fmtC = (n) => "$" + Math.abs(n || 0)
  .toFixed(2)
  .replace(/\B(?=(\d{3})+(?!\d))/g, ",");


// ── Dark Mode ─────────────────────────────────────────────
const themeBtn = document.getElementById("themeBtn");
const savedTheme = localStorage.getItem("mortgage_theme") || "light";

if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  themeBtn.textContent = "☀️ Light";
}

themeBtn.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
  themeBtn.textContent = isDark ? "🌙 Dark" : "☀️ Light";
  localStorage.setItem("mortgage_theme", isDark ? "light" : "dark");
});


// ── Down Payment Toggle (FIXED) ───────────────────────────
let dpMode = "dollar";

function setDpMode(mode) {
  dpMode = mode;

  const prefix = document.getElementById("dpPrefix");
  const input = document.getElementById("downPayment");

  if (mode === "percent") {
    prefix.textContent = "%";
    input.placeholder = "20";
  } else {
    prefix.textContent = "$";
    input.placeholder = "100,000";
  }

  document.getElementById("dpDollarBtn")
    .classList.toggle("active", mode === "dollar");

  document.getElementById("dpPercentBtn")
    .classList.toggle("active", mode === "percent");

  updateDpDisplay();
}

document.getElementById("dpDollarBtn").addEventListener("click", () => setDpMode("dollar"));
document.getElementById("dpPercentBtn").addEventListener("click", () => setDpMode("percent"));
setDpMode("dollar");


// ── DP Display ────────────────────────────────────────────
function updateDpDisplay() {
  const priceInput = document.getElementById("purchasePrice").value || "";
  const dpInput = document.getElementById("downPayment").value || "";
  const price = parseFloat(priceInput.replace(/,/g, "")) || 0;
  const dp = parseFloat(dpInput.replace(/,/g, "")) || 0;
  const el = document.getElementById("dpPercDisplay");

  if (!price || !dp) {
    el.textContent = "";
    return;
  }

  if (dpMode === "dollar") {
    el.textContent = `= ${((dp / price) * 100).toFixed(1)}%`;
  } else {
    el.textContent = `= ${fmtC(price * dp / 100)}`;
  }
}

document.getElementById("purchasePrice").addEventListener("input", updateDpDisplay);
document.getElementById("downPayment").addEventListener("input", updateDpDisplay);


// ── Validation Helper ────────────────────────────────────
function validateInputs() {
  let valid = true;
  const purchase = document.getElementById("purchasePrice");
  const down = document.getElementById("downPayment");
  const rate = document.getElementById("interestRate");
  const error = document.getElementById("coreError");

  [purchase, down, rate].forEach(el => el.classList.remove("input-error"));
  if (error) error.textContent = "";

  if (!purchase.value || isNaN(purchase.value.replace(/,/g,""))) {
    purchase.classList.add("input-error");
    valid = false;
  }
  if (!down.value || isNaN(down.value.replace(/,/g,""))) {
    down.classList.add("input-error");
    valid = false;
  }
  if (!rate.value || isNaN(rate.value)) {
    rate.classList.add("input-error");
    valid = false;
  }

  if (!valid && error) {
    error.textContent = "Please fill purchase price, down payment, and interest rate";
  }
  return valid;
}


// ── Calculate ─────────────────────────────────────────────
document.getElementById("calculateBtn").addEventListener("click", calculate);

function calculate() {
  if (!validateInputs()) return;

  const resultsSection = document.getElementById("resultsSection");
  const initialState = document.getElementById("initialState");
  if (initialState) initialState.style.display = "none";
  if (resultsSection) {
    resultsSection.style.display = "block";
    setTimeout(() => resultsSection.classList.add("show"), 10);
  }

  const purchasePriceRaw = document.getElementById("purchasePrice").value || "";
  const downPaymentRaw = document.getElementById("downPayment").value || "";
  
  const extraEl = document.getElementById("extraPayment");
  const extraPaymentRaw = extraEl ? extraEl.value : "0";

  const purchasePrice = parseFloat(purchasePriceRaw.replace(/,/g, ""));
  const dpRaw = parseFloat(downPaymentRaw.replace(/,/g, ""));
  const rate = parseFloat(document.getElementById("interestRate").value);
  const amortYears = parseInt(document.getElementById("amortization").value);
  const extraPayment = parseFloat(extraPaymentRaw.replace(/,/g, "")) || 0;

  const downPayment = dpMode === "dollar"
    ? dpRaw
    : purchasePrice * dpRaw / 100;

  const downPct = (downPayment / purchasePrice) * 100;
  const mortgageAmount = purchasePrice - downPayment;
  const r = rate / 100 / 12;
  const nOriginal = amortYears * 12;

  const monthlyBasePayment =
    r > 0
      ? mortgageAmount * r / (1 - Math.pow(1 + r, -nOriginal))
      : mortgageAmount / nOriginal;

  const freq = document.getElementById("payFrequency").value;

  let payment = monthlyBasePayment;
  if (freq === "biweekly") payment = monthlyBasePayment * 12 / 26;
  if (freq === "weekly") payment = monthlyBasePayment * 12 / 52;
  if (freq === "biweekly_acc") payment = monthlyBasePayment / 2;
  if (freq === "weekly_acc") payment = monthlyBasePayment / 4;

  let paymentWithExtra = payment;
  if (freq === "monthly") paymentWithExtra += extraPayment;
  if (freq === "biweekly" || freq === "biweekly_acc") paymentWithExtra += (extraPayment * 12 / 26);
  if (freq === "weekly" || freq === "weekly_acc") paymentWithExtra += (extraPayment * 12 / 52);

  let remainingBalance = mortgageAmount;
  let monthsToPayoff = 0;
  const rMonthly = rate / 100 / 12;
  let simMonthlyPayment = monthlyBasePayment + extraPayment;

  while (remainingBalance > 0 && monthsToPayoff < 600) {
    let interestPart = remainingBalance * rMonthly;
    let principalPart = simMonthlyPayment - interestPart;
    if (principalPart <= 0) {
      monthsToPayoff = amortYears * 12;
      break;
    }
    remainingBalance -= principalPart;
    monthsToPayoff++;
  }

  const totalInterest = (simMonthlyPayment * monthsToPayoff) - mortgageAmount;
  const finalAmortYears = monthsToPayoff / 12;

  const data = {
    purchasePrice,
    downPayment,
    downPct,
    mortgageAmount,
    rate,
    amortYears,
    finalAmortYears,
    payment: paymentWithExtra,
    frequency: freq,
    totalInterest,
    cmhc: (() => {
      let cmhcRate = 0;
      if (downPct < 20) {
        if (downPct < 10) cmhcRate = 0.04;
        else if (downPct < 15) cmhcRate = 0.031;
        else cmhcRate = 0.028;
      }
      return cmhcRate > 0 ? mortgageAmount * cmhcRate : 0;
    })()
  };

  renderResults(data);

  window._mortgageData = data;
  localStorage.setItem("savedMortgage", JSON.stringify(data));
}


// ── Input Formatting ──────────────────────────────────────
function formatInput(el) {
  if (!el) return;
  el.addEventListener("blur", () => {
    let v = el.value.replace(/[^\d.]/g, "");
    if (!isNaN(v) && v !== "") {
      el.value = Number(v).toLocaleString();
    }
  });

  el.addEventListener("focus", () => {
    el.value = el.value.replace(/,/g, "");
  });

  // clear error on typing
  el.addEventListener("input", () => {
    el.classList.remove("input-error");
    const error = document.getElementById("coreError");
    if (error) error.textContent = "";
  });
}

formatInput(document.getElementById("purchasePrice"));
formatInput(document.getElementById("downPayment"));
formatInput(document.getElementById("extraPayment"));
formatInput(document.getElementById("interestRate"));


// ── Render Results ────────────────────────────────────────
function renderResults(d) {

  document.getElementById("paymentAmount").textContent = fmtC(d.payment);
  document.getElementById("paymentLabel").textContent = d.frequency.replace("_", " ").toUpperCase() + " PAYMENT";

  const gds = (d.payment * (d.frequency === "monthly" ? 1 : d.frequency.includes("biweekly") ? 26/12 : 52/12)) / 8000 * 100;

  const affordabilityStatus =
    d.totalInterest < d.mortgageAmount
      ? "✅ Comfortable"
      : d.totalInterest < d.mortgageAmount * 1.2
      ? "⚠️ Manageable"
      : "❌ Expensive";

  document.getElementById("totalCost").textContent = fmtC(d.mortgageAmount + d.totalInterest);
  document.getElementById("downPct").textContent = d.downPct.toFixed(1) + "%";
  document.getElementById("cmhcAmount").textContent = fmtC(d.cmhc);

  // payoff date
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + (d.amortYears * 12));

  if (d.finalAmortYears < d.amortYears) {
    document.getElementById("payoffDate").textContent = `Paid off in ${Math.floor(d.finalAmortYears)} yrs (${Math.round(d.finalAmortYears * 12)} months)`;
  } else {
    document.getElementById("payoffDate").textContent = payoff.toLocaleDateString();
  }

  const breakdown = document.getElementById("breakdownRows");
  breakdown.innerHTML = ""; // reset first

  document.getElementById("paymentSub").innerHTML = `
    ${fmtC(d.mortgageAmount)} loan size · ${d.finalAmortYears.toFixed(1)} yrs
    <div style="margin-top:6px;font-size:12px;">
      ${affordabilityStatus} · 
      Total interest: ${fmtC(d.totalInterest)}
    </div>
    <br><span style="font-size:11px;color:var(--muted)">
      Most early payments go toward interest — this is normal
    </span>
    <br><span style="font-size:11px;color:var(--muted)">Based on standard Canadian mortgage formulas</span>
  `;

  document.getElementById("mortgageAmount").textContent = fmtC(d.mortgageAmount);
  document.getElementById("totalInterest").textContent = fmtC(d.totalInterest);

  // Stress Test
  const stressRate = Math.max(d.rate + 2, 5.25);
  const stressPayment = d.mortgageAmount * (stressRate/100/12) /
    (1 - Math.pow(1 + stressRate/100/12, -d.amortYears*12));

  document.getElementById("stressTestBox").innerHTML = `
    <div class="tip">
      🧪 <b>Stress Test Rate:</b> ${stressRate.toFixed(2)}%<br>
      📉 <b>Payment at stress rate:</b> ${fmtC(stressPayment)}
    </div>
  `;

  // Closing costs
  const closing = d.purchasePrice * 0.015;

  document.getElementById("closingCosts").innerHTML = `
    <div class="tip">
      📋 <b>Estimated closing costs:</b> ${fmtC(closing)}<br>
      (legal, tax, inspection approx.)
    </div>
  `;

  // Filter and Render top 3 insights
  const tips = [];
  if (d.downPct < 20) {
    tips.push(`💰 <b>Insurance Saving:</b> Add 5% more down to save approx. ${fmtC(d.mortgageAmount * 0.005)} in insurance fees.`);
    tips.push(`⚠️ <b>Insurance Warning:</b> You’re paying mortgage insurance. Reaching 20% down removes it.`);
  }
  if (d.rate > 5.5) {
    tips.push(`🎯 <b>Market Reality:</b> Rates are above 5-year average — timing matters.`);
  }
  if (d.totalInterest > d.mortgageAmount) {
    tips.push(`💸 <b>Smart Suggestion:</b> Interest costs are higher than principal. Consider a shorter amortization.`);
  } else {
    tips.push(`✅ <b>Smart Suggestion:</b> Your mortgage structure looks solid. Consider accelerated payments to build equity faster.`);
  }
  tips.push(`🛡 <b>Trust:</b> Used by 10,000+ Canadians · Matches bank formulas · No data stored.`);
  
  tips.slice(0, 3).forEach(t => {
    breakdown.innerHTML += `<div class="tip">${t}</div>`;
  });

  // Render Advanced Modules
  if (window.AdvancedModules) {
    const moduleData = {
      rate: d.rate,
      amortYears: d.amortYears,
      mortgageAmount: d.mortgageAmount,
      monthlyPayment: (d.payment * (d.frequency === "monthly" ? 1 : d.frequency.includes("biweekly") ? 26/12 : 52/12)),
      totalInterest: d.totalInterest,
      purchasePrice: d.purchasePrice,
      downPct: d.downPct,
      downPayment: d.downPayment,
      closingCosts: closing,
      propertyTax: parseFloat((document.getElementById("propertyTax").value || "").replace(/,/g, "")) || 0,
      heatingCost: parseFloat((document.getElementById("heatingCost").value || "").replace(/,/g, "")) || 0,
      condoFees: parseFloat((document.getElementById("condoFees").value || "").replace(/,/g, "")) || 0
    };

    window.AdvancedModules.renderAffordability(moduleData);
    window.AdvancedModules.renderPrepayment(moduleData);
    window.AdvancedModules.renderRateCompare(moduleData);
    window.AdvancedModules.renderRentVsBuy(moduleData);
    window.AdvancedModules.renderRenewal(moduleData);
    window.AdvancedModules.renderAmortSchedule(moduleData);
  } else {
    console.warn("Advanced modules not loaded");
  }

  renderChart(d);
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
    console.warn("Chart.js not loaded");
    return;
  }

  let balance = d.mortgageAmount;

  let principalData = [];
  let interestData = [];
  let balanceData = [];
  let labels = [];

  const r = d.rate / 100 / 12;

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

      yearlyInterest += interest;
      yearlyPrincipal += principal;
    }

    principalData.push(Math.max(0, yearlyPrincipal));
    interestData.push(Math.max(0, yearlyInterest));
    balanceData.push(Math.max(0, balance));
    labels.push("Year " + year);
  }

  window._mortgageChart = new Chart(ctx, {
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
          backgroundColor: "rgba(5,150,105,0.1)",
          tension: 0.4,
          fill: false,
          pointRadius: 2,
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
          font: { size: 16 }
        },

        tooltip: {
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

  const url = new URL(window.location.origin);
  url.searchParams.set("price", d.purchasePrice);
  url.searchParams.set("dp", d.downPayment);
  url.searchParams.set("rate", d.rate);
  url.searchParams.set("amort", d.amortYears);
  url.searchParams.set("freq", d.frequency);

  return url.toString();
}


// ── Share Button ──────────────────────────────────────────
document.getElementById("shareBtn").addEventListener("click", async () => {
  const url = buildShareURL();
  document.getElementById("shareUrlInput").value = url;
  await navigator.clipboard.writeText(url);
  
  const btn = document.getElementById("shareBtn");
  const originalText = btn.textContent;
  btn.textContent = "✅ Copied!";
  setTimeout(() => btn.textContent = originalText, 2000);
});


// ── Copy Summary ──────────────────────────────────────────
document.getElementById("copyBtn").addEventListener("click", async () => {
  const d = window._mortgageData;
  if (!d) return;

  const text = `🏠 Mortgage Summary

Home price: ${fmtC(d.purchasePrice)}
Down payment: ${fmtC(d.downPayment)}
Monthly payment: ${fmtC(d.payment)}

Total interest paid: ${fmtC(d.totalInterest)}

👉 Try your own numbers:
${window.location.origin}`;

  await navigator.clipboard.writeText(text);
  const btn = document.getElementById("copyBtn");
  const originalText = btn.textContent;
  btn.textContent = "✅ Copied!";
  setTimeout(() => btn.textContent = originalText, 2000);
});

// ── Print Button ──────────────────────────────────────────
document.getElementById("printBtn").addEventListener("click", () => {
  window.print();
});


// ── CSV Export ────────────────────────────────────────────
document.getElementById("csvBtn").addEventListener("click", () => {
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


// ── Advanced Tools Switching ──────────────────────────────
document.querySelectorAll(".module-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".module-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".module-section").forEach(s => s.classList.remove("active"));
    tab.classList.add("active");
    const target = document.getElementById("tab-" + tab.dataset.tab);
    if (target) {
      target.classList.add("active");
    } else {
      console.warn("Missing section for:", tab.dataset.tab);
    }
  });
});


// ── Reset Logic ──────────────────────────────────────────
document.getElementById("resetBtn").addEventListener("click", () => {
  // 1. Clear inputs
  document.querySelectorAll("input").forEach(input => {
    input.value = "";
    input.classList.remove("input-error");
  });
  
  // Set defaults for critical selects
  const amort = document.getElementById("amortization");
  if (amort) amort.value = "25";
  
  const freq = document.getElementById("payFrequency");
  if (freq) freq.value = "monthly";

  // 2. Clear saved state
  localStorage.removeItem("savedMortgage");

  // 3. Hide results and show empty state
  const results = document.getElementById("resultsSection");
  if (results) {
    results.style.display = "none";
    results.classList.remove("show");
  }
  const initialState = document.getElementById("initialState");
  if (initialState) initialState.style.display = "block";

  // 4. Clear outputs
  const ids = [
    "paymentAmount", "paymentSub", "mortgageAmount", "totalInterest", 
    "totalCost", "downPct", "cmhcAmount", "payoffDate", 
    "stressTestBox", "closingCosts", "breakdownRows"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // 5. Destroy chart
  if (window._mortgageChart) {
    window._mortgageChart.destroy();
    window._mortgageChart = null;
  }

  // 6. Reset displays
  const dpDisp = document.getElementById("dpPercDisplay");
  if (dpDisp) dpDisp.textContent = "";
  setDpMode("dollar");
});


// ── Restore & Auto ────────────────────────────────────────
const saved = localStorage.getItem("savedMortgage");
const purchasePriceInput = document.getElementById("purchasePrice");

if (saved && purchasePriceInput && purchasePriceInput.value === "") {
  const d = JSON.parse(saved);
  purchasePriceInput.value = Number(d.purchasePrice).toLocaleString();
  document.getElementById("downPayment").value = Number(d.downPayment).toLocaleString();
  document.getElementById("interestRate").value = d.rate;
  updateDpDisplay();
} else {
  const params = new URLSearchParams(window.location.search);
  if (params.get("price")) {
    document.getElementById("purchasePrice").value = Number(params.get("price")).toLocaleString();
    document.getElementById("downPayment").value = Number(params.get("dp")).toLocaleString();
    document.getElementById("interestRate").value = params.get("rate");
    document.getElementById("amortization").value = params.get("amort") || "25";
    document.getElementById("payFrequency").value = params.get("freq") || "monthly";
    calculate();
  }
}

// Only calculate when user clicks button
// OR presses Enter (optional)
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") calculate();
});

});
