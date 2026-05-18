// ── Advanced Modules ─────────────────────────────────────────────────────────
// Each module is self-contained. Comment out any module to disable it.

// ── Module: Affordability Calculator ─────────────────────────────────────────
function renderAffordability(data) {
  const el = document.getElementById("tab-affordability");
  if (!el) return;
  const propTax    = data.propertyTax  || 0;
  const heating    = data.heatingCost  || 150;
  const condoFees  = data.condoFees    || 0;
  el.innerHTML = `
    <div class="grid-2" style="margin-bottom:12px;">
      <div class="field">
        <label>Annual Household Income</label>
        <div class="input-wrap">
          <span class="input-prefix">$</span>
          <input type="number" id="afi_income" class="has-prefix" placeholder="120,000" />
        </div>
      </div>
      <div class="field">
        <label>Monthly Debts (car, student loan etc.)</label>
        <div class="input-wrap">
          <span class="input-prefix">$</span>
          <input type="number" id="afi_debts" class="has-prefix" placeholder="500" />
        </div>
      </div>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-bottom:10px;">Using property tax ${propTax > 0 ? fmtC(propTax)+'/yr' : '(not entered)'}, heating ${fmtC(heating)}/mo, and condo fees ${condoFees > 0 ? fmtC(condoFees)+'/mo (50% counted)' : '$0/mo'} from Property Details above.</p>
    <button class="action-btn" id="afi_calcBtn" style="margin-bottom:12px;">Calculate Affordability</button>
    <div id="afi_result"></div>
  `;
  document.getElementById("afi_calcBtn").addEventListener("click", () => {
    const income  = parseFloat(document.getElementById("afi_income").value) || 0;
    const debts   = parseFloat(document.getElementById("afi_debts").value) || 0;
    const rate    = data.rate;
    if (!income) { document.getElementById("afi_result").innerHTML = `<span style="color:var(--red);font-size:12px;">Please enter your income.</span>`; return; }

    const stressRate     = Math.max(rate + 2, 5.25);
    const monthlyIncome  = income / 12;
    // GDS: PITH (principal+interest+tax+heating + 50% condo)
    const monthlyTax     = propTax / 12;
    const condoFactor    = condoFees * 0.5;
    const maxGDS_budget  = (monthlyIncome * 0.39) - monthlyTax - heating - condoFactor;
    const maxTDS_budget  = (monthlyIncome * 0.44) - debts - monthlyTax - heating - condoFactor;
    const maxPayment     = Math.max(0, Math.min(maxGDS_budget, maxTDS_budget));

    // Back-calculate max mortgage at stress test rate
    const stressMonthly = stressRate / 100 / 12;
    const n = data.amortYears * 12;
    const maxMortgage = stressMonthly > 0
      ? maxPayment * (1 - Math.pow(1 + stressMonthly, -n)) / stressMonthly
      : maxPayment * n;

    const maxPurchase = maxMortgage / (1 - data.downPct / 100);
    const gdsRatio    = ((data.monthlyPayment + monthlyTax + heating + condoFactor) / monthlyIncome) * 100;
    const qualifies   = maxPayment >= data.monthlyPayment;

    document.getElementById("afi_result").innerHTML = `
      <div class="breakdown-row"><span class="row-label">Max P&I Payment (after PITH)</span><span class="row-val">${fmtC(maxPayment)}</span></div>
      <div class="breakdown-row"><span class="row-label">Max Mortgage Amount</span><span class="row-val" style="color:var(--blue)">${fmtC(maxMortgage)}</span></div>
      <div class="breakdown-row"><span class="row-label">Max Purchase Price (est.)</span><span class="row-val" style="color:var(--green)">${fmtC(maxPurchase)}</span></div>
      <div class="breakdown-row"><span class="row-label">Your GDS Ratio</span><span class="row-val ${gdsRatio > 39 ? 'red' : 'green'}">${gdsRatio.toFixed(1)}% ${gdsRatio > 39 ? '⚠️ over 39% limit' : '✅ within limit'}</span></div>
      <div class="stress-box ${qualifies ? 'pass' : 'fail'}" style="margin-top:10px;">
        <div class="stress-title">${qualifies ? "✅ Likely Qualifies" : "⚠️ May Not Qualify"}</div>
        <div class="stress-sub">${qualifies
          ? `Your income supports this mortgage at the stress test rate of ${stressRate.toFixed(2)}%.`
          : `Your income may not meet lender requirements at the stress test rate of ${stressRate.toFixed(2)}%. Consider a lower purchase price or larger down payment.`
        }</div>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:8px;">GDS ≤39% and TDS ≤44% (Canadian standard). Qualification tested at stress test rate ${stressRate.toFixed(2)}%.</p>
    `;
  });
}

// ── Module: Prepayment Calculator ────────────────────────────────────────────
function renderPrepayment(data) {
  const el = document.getElementById("tab-prepayment");
  if (!el) return;
  el.innerHTML = `
    <div class="grid-2" style="margin-bottom:12px;">
      <div class="field">
        <label>Extra Monthly Payment</label>
        <div class="input-wrap">
          <span class="input-prefix">$</span>
          <input type="number" id="pre_extra" class="has-prefix" placeholder="200" min="0" />
        </div>
      </div>
      <div class="field">
        <label>One-Time Lump Sum</label>
        <div class="input-wrap">
          <span class="input-prefix">$</span>
          <input type="number" id="pre_lump" class="has-prefix" placeholder="10,000" min="0" />
        </div>
      </div>
    </div>
    <button class="action-btn" id="pre_calcBtn" style="margin-bottom:12px;">Calculate Savings</button>
    <div id="pre_result"></div>
  `;
  document.getElementById("pre_calcBtn").addEventListener("click", () => {
    const extra = parseFloat(document.getElementById("pre_extra").value) || 0;
    const lump  = parseFloat(document.getElementById("pre_lump").value) || 0;
    if (!extra && !lump) { document.getElementById("pre_result").innerHTML = `<span style="color:var(--red);font-size:12px;">Enter an extra payment amount.</span>`; return; }

    const r = data.rate / 100 / 12;
    const originalN = data.amortYears * 12;
    let balance = data.mortgageAmount - lump;
    if (balance < 0) balance = 0;

    const newPayment = data.monthlyPayment + extra;
    let months = 0;
    let totalInterestNew = 0;
    let bal = balance;

    while (bal > 0 && months < originalN) {
      const interestCharge = bal * r;
      totalInterestNew += interestCharge;
      const principal = newPayment - interestCharge;
      bal = Math.max(0, bal - principal);
      months++;
    }

    const savedMonths = originalN - months;
    const savedYears  = Math.floor(savedMonths / 12);
    const savedMos    = savedMonths % 12;
    const savedInterest = data.totalInterest - totalInterestNew;

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);

    document.getElementById("pre_result").innerHTML = `
      <div class="breakdown-row"><span class="row-label">New Payoff Date</span><span class="row-val green">${payoffDate.toLocaleDateString('en-CA', {year:'numeric',month:'long'})}</span></div>
      <div class="breakdown-row"><span class="row-label">Time Saved</span><span class="row-val" style="color:var(--green)">${savedYears > 0 ? savedYears + "y " : ""}${savedMos}m</span></div>
      <div class="breakdown-row"><span class="row-label">Interest Saved</span><span class="row-val" style="color:var(--green)">${fmtC(Math.max(0, savedInterest))}</span></div>
      <div class="breakdown-row"><span class="row-label">New Total Interest</span><span class="row-val red">${fmtC(totalInterestNew)}</span></div>
    `;
  });
}

// ── Module: Rate Comparison ───────────────────────────────────────────────────
function renderRateCompare(data) {
  const el = document.getElementById("tab-ratecompare");
  if (!el) return;
  el.innerHTML = `
    <p style="font-size:12px;color:var(--subtext);margin-bottom:12px;">Compare two rates to see which saves more over your amortization.</p>
    <div class="grid-2" style="margin-bottom:12px;">
      <div class="field">
        <label>Rate A (Fixed)</label>
        <div class="input-wrap">
          <input type="number" id="rc_rateA" class="has-suffix" placeholder="${data.rate}" step="0.01" value="${data.rate}" />
          <span class="input-suffix">%</span>
        </div>
      </div>
      <div class="field">
        <label>Rate B (Variable)</label>
        <div class="input-wrap">
          <input type="number" id="rc_rateB" class="has-suffix" placeholder="${(data.rate - 0.5).toFixed(2)}" step="0.01" />
          <span class="input-suffix">%</span>
        </div>
      </div>
    </div>
    <button class="action-btn" id="rc_calcBtn" style="margin-bottom:12px;">Compare Rates</button>
    <div id="rc_result"></div>
  `;
  document.getElementById("rc_calcBtn").addEventListener("click", () => {
    const rA = parseFloat(document.getElementById("rc_rateA").value);
    const rB = parseFloat(document.getElementById("rc_rateB").value);
    if (!rA || !rB) { document.getElementById("rc_result").innerHTML = `<span style="color:var(--red);font-size:12px;">Enter both rates.</span>`; return; }

    const calc = (rate) => {
      const r = rate / 100 / 12;
      const n = data.amortYears * 12;
      const pmt = r > 0 ? data.mortgageAmount * r / (1 - Math.pow(1 + r, -n)) : data.mortgageAmount / n;
      const totalInt = pmt * n - data.mortgageAmount;
      return { pmt, totalInt };
    };

    const a = calc(rA);
    const b = calc(rB);
    const winner = a.totalInt < b.totalInt ? "A" : "B";
    const saved  = Math.abs(a.totalInt - b.totalInt);

    document.getElementById("rc_result").innerHTML = `
      <div class="breakdown-row"><span class="row-label">Rate A (${rA}%) — Monthly</span><span class="row-val">${fmtC(a.pmt)}</span></div>
      <div class="breakdown-row"><span class="row-label">Rate A — Total Interest</span><span class="row-val red">${fmtC(a.totalInt)}</span></div>
      <div class="breakdown-row"><span class="row-label">Rate B (${rB}%) — Monthly</span><span class="row-val">${fmtC(b.pmt)}</span></div>
      <div class="breakdown-row"><span class="row-label">Rate B — Total Interest</span><span class="row-val red">${fmtC(b.totalInt)}</span></div>
      <div class="breakdown-row total-row"><span class="row-label">Rate ${winner} saves you</span><span class="row-val" style="color:var(--green)">${fmtC(saved)}</span></div>
    `;
  });
}

// ── Module: Rent vs Buy ───────────────────────────────────────────────────────
function renderRentVsBuy(data) {
  const el = document.getElementById("tab-rentvsbuy");
  if (!el) return;
  el.innerHTML = `
    <div class="grid-2" style="margin-bottom:12px;">
      <div class="field">
        <label>Monthly Rent</label>
        <div class="input-wrap">
          <span class="input-prefix">$</span>
          <input type="number" id="rvb_rent" class="has-prefix" placeholder="2,200" />
        </div>
      </div>
      <div class="field">
        <label>Annual Home Appreciation (%)</label>
        <div class="input-wrap">
          <input type="number" id="rvb_appreciation" class="has-suffix" placeholder="3.0" step="0.1" value="3" />
          <span class="input-suffix">%</span>
        </div>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:12px;">
      <div class="field">
        <label>Annual Rent Increase (%)</label>
        <div class="input-wrap">
          <input type="number" id="rvb_rentincrease" class="has-suffix" placeholder="2.5" step="0.1" value="2.5" />
          <span class="input-suffix">%</span>
        </div>
      </div>
      <div class="field">
        <label>Years to Compare</label>
        <select id="rvb_years">
          <option value="5">5 years</option>
          <option value="10" selected>10 years</option>
          <option value="15">15 years</option>
          <option value="20">20 years</option>
        </select>
      </div>
    </div>
    <button class="action-btn" id="rvb_calcBtn" style="margin-bottom:12px;">Compare</button>
    <div id="rvb_result"></div>
  `;
  document.getElementById("rvb_calcBtn").addEventListener("click", () => {
    const rent        = parseFloat(document.getElementById("rvb_rent").value) || 0;
    const appreciation= parseFloat(document.getElementById("rvb_appreciation").value) / 100 || 0.03;
    const rentIncrease= parseFloat(document.getElementById("rvb_rentincrease").value) / 100 || 0.025;
    const years       = parseInt(document.getElementById("rvb_years").value);
    if (!rent) { document.getElementById("rvb_result").innerHTML = `<span style="color:var(--red);font-size:12px;">Enter monthly rent.</span>`; return; }

    // Total rent paid over period
    let totalRent = 0, r = rent;
    for (let y = 0; y < years; y++) { totalRent += r * 12; r *= (1 + rentIncrease); }

    // Home value after appreciation
    const futureHomeValue = data.purchasePrice * Math.pow(1 + appreciation, years);
    const equityGained    = futureHomeValue - data.purchasePrice;

    // Total buying cost (mortgage payments + closing costs - equity)
    const totalMortgagePayments = data.monthlyPayment * 12 * years;
    const totalBuyCost = totalMortgagePayments + data.closingCosts - equityGained - data.downPayment;

    const winner = totalBuyCost < totalRent ? "Buying" : "Renting";
    const diff   = Math.abs(totalBuyCost - totalRent);

    document.getElementById("rvb_result").innerHTML = `
      <div class="breakdown-row"><span class="row-label">Total Rent Paid (${years}y)</span><span class="row-val red">${fmtC(totalRent)}</span></div>
      <div class="breakdown-row"><span class="row-label">Total Mortgage Payments</span><span class="row-val">${fmtC(totalMortgagePayments)}</span></div>
      <div class="breakdown-row"><span class="row-label">Estimated Equity Gained</span><span class="row-val green">${fmtC(equityGained)}</span></div>
      <div class="breakdown-row"><span class="row-label">Future Home Value</span><span class="row-val blue">${fmtC(futureHomeValue)}</span></div>
      <div class="breakdown-row total-row"><span class="row-label">${winner} saves approx.</span><span class="row-val" style="color:var(--green)">${fmtC(diff)}</span></div>
      <p style="font-size:11px;color:var(--muted);margin-top:8px;">Simplified estimate. Does not include property tax, maintenance, or investment returns on down payment.</p>
    `;
  });
}

// ── Module: Renewal Planner ───────────────────────────────────────────────────
function renderRenewal(data) {
  const el = document.getElementById("tab-renewal");
  if (!el) return;
  el.innerHTML = `
    <p style="font-size:12px;color:var(--subtext);margin-bottom:12px;">See how a rate change at renewal affects your payments.</p>
    <div class="grid-2" style="margin-bottom:12px;">
      <div class="field">
        <label>Term Length (years)</label>
        <select id="ren_term">
          <option value="1">1 year</option>
          <option value="2">2 years</option>
          <option value="3">3 years</option>
          <option value="5" selected>5 years</option>
          <option value="7">7 years</option>
          <option value="10">10 years</option>
        </select>
      </div>
      <div class="field">
        <label>New Rate at Renewal (%)</label>
        <div class="input-wrap">
          <input type="number" id="ren_newRate" class="has-suffix" placeholder="${(data.rate + 1).toFixed(2)}" step="0.01" />
          <span class="input-suffix">%</span>
        </div>
      </div>
    </div>
    <button class="action-btn" id="ren_calcBtn" style="margin-bottom:12px;">Calculate Renewal</button>
    <div id="ren_result"></div>
  `;
  document.getElementById("ren_calcBtn").addEventListener("click", () => {
    const term    = parseInt(document.getElementById("ren_term").value);
    const newRate = parseFloat(document.getElementById("ren_newRate").value);
    if (!newRate) { document.getElementById("ren_result").innerHTML = `<span style="color:var(--red);font-size:12px;">Enter renewal rate.</span>`; return; }

    // Balance remaining after term
    const r = data.rate / 100 / 12;
    const n = data.amortYears * 12;
    const termMonths = term * 12;
    let bal = data.mortgageAmount;
    for (let i = 0; i < termMonths; i++) {
      const interest = bal * r;
      const principal = data.monthlyPayment - interest;
      bal = Math.max(0, bal - principal);
    }

    const remainingYears = data.amortYears - term;
    const newR = newRate / 100 / 12;
    const newN = remainingYears * 12;
    const newPmt = newR > 0 ? bal * newR / (1 - Math.pow(1 + newR, -newN)) : bal / newN;
    const diff   = newPmt - data.monthlyPayment;

    document.getElementById("ren_result").innerHTML = `
      <div class="breakdown-row"><span class="row-label">Balance at Renewal</span><span class="row-val blue">${fmtC(bal)}</span></div>
      <div class="breakdown-row"><span class="row-label">Remaining Amortization</span><span class="row-val">${remainingYears} years</span></div>
      <div class="breakdown-row"><span class="row-label">Current Monthly Payment</span><span class="row-val">${fmtC(data.monthlyPayment)}</span></div>
      <div class="breakdown-row"><span class="row-label">New Monthly Payment</span><span class="row-val ${diff > 0 ? 'red' : 'green'}">${fmtC(newPmt)}</span></div>
      <div class="breakdown-row total-row"><span class="row-label">Monthly Change</span><span class="row-val ${diff > 0 ? 'red' : 'green'}">${diff > 0 ? '+' : ''}${fmtC(diff)}</span></div>
    `;
  });
}

// ── Module: Amortization Schedule ────────────────────────────────────────────
function renderAmortSchedule(data) {
  const el = document.getElementById("tab-amortschedule");
  if (!el) return;

  const r = data.rate / 100 / 12;
  const n = data.amortYears * 12;
  const pmt = data.monthlyPayment;

  let rows = "";
  let bal  = data.mortgageAmount;
  let yearInterest = 0, yearPrincipal = 0;

  for (let month = 1; month <= n && bal > 0; month++) {
    const interest  = bal * r;
    const principal = Math.min(pmt - interest, bal);
    bal = Math.max(0, bal - principal);
    yearInterest  += interest;
    yearPrincipal += principal;

    if (month % 12 === 0 || month === n) {
      const year = Math.ceil(month / 12);
      rows += `<tr>
        <td>Year ${year}</td>
        <td>${fmtC(yearPrincipal)}</td>
        <td>${fmtC(yearInterest)}</td>
        <td>${fmtC(bal)}</td>
      </tr>`;
      yearInterest = 0; yearPrincipal = 0;
    }
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="amort-table">
        <thead><tr><th>Year</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:8px;">Annual breakdown. Scroll to see full schedule.</p>
  `;
}

// ── Shared formatter ──────────────────────────────────────────────────────────
function fmtC(n) {
  if (isNaN(n) || n === null) return "—";
  return "$" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Export for use in index.js
window.AdvancedModules = {
  renderAffordability,
  renderPrepayment,
  renderRateCompare,
  renderRentVsBuy,
  renderRenewal,
  renderAmortSchedule,
  fmtC
};