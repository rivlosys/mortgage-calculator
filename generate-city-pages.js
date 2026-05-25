const fs = require('fs');
const path = require('path');

/**
 * CONFIGURATION: Add your 100 cities here.
 * avgPrice: Recent average home price in that city.
 * taxEst: Estimated annual property tax for that price point.
 */
const cities = [
  { name: "Mississauga", province: "ON", avgPrice: 950000, taxEst: 7200 },
  { name: "Kelowna", province: "BC", avgPrice: 780000, taxEst: 4200 },
  { name: "Halifax", province: "NS", avgPrice: 520000, taxEst: 5800 },
  { name: "Brampton", province: "ON", avgPrice: 850000, taxEst: 8200 },
  { name: "Surrey", province: "BC", avgPrice: 910000, taxEst: 5100 },
  { name: "Winnipeg", province: "MB", avgPrice: 395000, taxEst: 4900 },
  { name: "London", province: "ON", avgPrice: 620000, taxEst: 7400 },
  { name: "Saskatoon", province: "SK", avgPrice: 410000, taxEst: 4400 },
  { name: "Windsor", province: "ON", avgPrice: 540000, taxEst: 7900 },
  { name: "Victoria", province: "BC", avgPrice: 880000, taxEst: 4800 }
  // Add the remaining 90+ cities here...
];

const year = 2026;
let sitemapEntries = "";

const toolsDir = path.join(__dirname, 'tools');
// Ensure the tools directory exists before writing files
if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });

function generateCityPage(city) {
  const slug = `mortgage-calculator-${city.name.toLowerCase().replace(/\s+/g, '-')}`;
  const fileName = `${slug}.html`;
  const filePath = path.join(toolsDir, fileName);

  // Province-specific LTT descriptions for SEO uniqueness
  const lttDesc = {
    "ON": "Ontario Land Transfer Tax and potential first-time buyer rebates ($4,000 max)",
    "BC": "British Columbia Property Transfer Tax (PTT) rates",
    "AB": "Alberta's low-cost land title registration fees (No Land Transfer Tax)",
    "QC": "Quebec's Welcome Tax (Taxe de mutation) tiered brackets",
    "NS": "Nova Scotia's Municipal Land Transfer Tax"
  }[city.province] || "Provincial Land Transfer Tax rules";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${city.name} Mortgage Calculator ${year} — Payments & Land Transfer Tax</title>
  <meta name="description" content="Calculate mortgage payments and closing costs for homes in ${city.name}, ${city.province}. Factoring in ${year} rates and ${city.province} tax rules." />
  <link rel="canonical" href="https://mortgage.usecos.app/tools/${fileName}" />
  <link rel="stylesheet" href="../style.css" />
  <link rel="icon" type="image/png" href="../favicon.png" />
  <script defer src="https://cloud.umami.is/script.js" data-website-id="8e17ec5e-e75b-40f3-bbd3-844f1e17c686"></script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "How much is a mortgage in ${city.name} per month?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For a home in ${city.name} priced at $${city.avgPrice.toLocaleString()}, a typical monthly payment ranges from $3,800 to $4,600 depending on your down payment and current ${year} interest rates."
      }
    }, {
      "@type": "Question",
      "name": "What are closing costs in ${city.name}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Buyers should budget for ${lttDesc}, plus legal fees and home inspections, which usually total 1.5% to 3% of the purchase price."
      }
    }]
  }
  </script>
</head>
<body>
  <div class="page-wrap">
    <header class="site-header">
      <div class="brand" onclick="window.location.href='/'" style="cursor:pointer">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="url(#logo_grad_city)"/>
          <path d="M22 11L13.5 20L10 16.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="logo_grad_city" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#1b76df"/><stop offset="1" stop-color="#22c98a"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="brand-name-container">
          <div class="brand-name">use<span style="color:#22c98a">cos</span> · Canadian Mortgage Tools</div>
          <div class="brand-tag">${city.name} Edition</div>
        </div>
      </div>
    </header>

    <div class="hero">
      <h1>🏠 ${city.name} Mortgage Calculator</h1>
      <p>Estimate your monthly payments and land transfer tax for the ${city.name} market.</p>
    </div>

    <div class="card">
      <h2>Buying in ${city.name}?</h2>
      <p>The ${city.name} real estate market has unique property tax and closing cost requirements. Our tool pre-fills ${city.province} regulations to help you plan your budget with confidence.</p>
      <button class="primary-btn" onclick="window.location.href='/?province=${city.province}&price=${city.avgPrice}&propertyTax=${city.taxEst}'">Launch ${city.name} Calculator</button>
    </div>

    <div class="card content-rich" style="line-height: 1.8;">
      <h3>Qualifying for a Home in ${city.name}</h3>
      <p>Lenders evaluate your application based on the <b>B-20 Stress Test</b>. Even if your contract rate is 4.5%, you must prove you can handle payments at roughly 6.5%. For an average priced home of $${city.avgPrice.toLocaleString()}, household income requirements are often upwards of $160,000.</p>
      <h3>Local Market Insights</h3>
      <p>Purchasing in ${city.name} requires careful consideration of ${lttDesc}. Our calculator factors these into your 'Cash Required' summary so there are no surprises on closing day.</p>
    </div>

    <footer class="site-footer">
       <div style="font-size:11px; color:var(--muted);">
        © use<span style="color:#22c98a">cos</span> · Specialized ${city.name} Financing Tools
      </div>
    </footer>
  </div>
</body>
</html>`;

  fs.writeFileSync(filePath, html);
  
  // Build sitemap entry for this city
  sitemapEntries += `  <url>\n    <loc>https://mortgage.usecos.app/tools/${fileName}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  
  console.log(`✅ Generated: ${fileName}`);
}

cities.forEach(generateCityPage);

// Write sitemap fragment to a file for easy copying
fs.writeFileSync(path.join(__dirname, 'sitemap_fragment.xml'), sitemapEntries);

console.log(`\n🚀 All ${cities.length} city pages generated successfully.`);
console.log(`📂 Sitemap fragment saved to: sitemap_fragment.xml`);