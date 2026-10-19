(function() {
	//#region src/core/protection/heuristics.ts
	var MULTI_PART_SUFFIXES = /* @__PURE__ */ new Set([
		"co.uk",
		"org.uk",
		"ac.uk",
		"gov.uk",
		"com.au",
		"net.au",
		"org.au",
		"co.in",
		"com.br",
		"com.mx",
		"co.jp",
		"co.kr",
		"com.tr",
		"com.sg",
		"com.hk"
	]);
	/** Brand label -> official registrable domains (not exhaustive; reduces false positives). */
	var BRAND_OFFICIAL = {
		paypal: ["paypal.com"],
		apple: ["apple.com", "icloud.com"],
		microsoft: [
			"microsoft.com",
			"live.com",
			"office.com",
			"office365.com",
			"outlook.com"
		],
		office: [
			"microsoft.com",
			"office.com",
			"office365.com"
		],
		outlook: [
			"outlook.com",
			"live.com",
			"microsoft.com"
		],
		google: [
			"google.com",
			"google.co.uk",
			"googleapis.com",
			"gmail.com"
		],
		gmail: ["gmail.com", "google.com"],
		amazon: [
			"amazon.com",
			"amazon.co.uk",
			"amazon.in",
			"aws.amazon.com"
		],
		netflix: ["netflix.com"],
		facebook: [
			"facebook.com",
			"fb.com",
			"meta.com"
		],
		instagram: ["instagram.com"],
		whatsapp: ["whatsapp.com"],
		meta: ["meta.com", "facebook.com"],
		coinbase: ["coinbase.com"],
		binance: ["binance.com"],
		metamask: ["metamask.io"],
		stripe: ["stripe.com"],
		sbi: ["sbi.co.in", "onlinesbi.sbi"],
		hdfcbank: ["hdfcbank.com"],
		icicibank: ["icicibank.com"],
		paytm: ["paytm.com"],
		chase: ["chase.com"],
		bankofamerica: ["bankofamerica.com"]
	};
	function registrableDomain(host) {
		const h = host.replace(/^www\./, "").toLowerCase();
		const parts = h.split(".");
		if (parts.length < 2) return h;
		for (const suffix of MULTI_PART_SUFFIXES) {
			const suffixParts = suffix.split(".");
			if (parts.length > suffixParts.length) {
				if (parts.slice(-suffixParts.length).join(".") === suffix) return parts.slice(-(suffixParts.length + 1)).join(".");
			}
		}
		return parts.slice(-2).join(".");
	}
	function levenshtein(a, b) {
		if (a === b) return 0;
		const m = a.length;
		const n = b.length;
		if (m === 0) return n;
		if (n === 0) return m;
		const row = new Array(n + 1);
		for (let j = 0; j <= n; j++) row[j] = j;
		for (let i = 1; i <= m; i++) {
			let prev = row[0];
			row[0] = i;
			for (let j = 1; j <= n; j++) {
				const temp = row[j];
				const cost = a[i - 1] === b[j - 1] ? 0 : 1;
				row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
				prev = temp;
			}
		}
		return row[n];
	}
	function hostContainsBrand(host, brand) {
		return host.split(".").some((label) => label === brand || label.includes(brand));
	}
	function isOfficialDomain(registrable, official) {
		return official.some((o) => registrable === o || registrable.endsWith(`.${o}`));
	}
	function punycodeLooksLikeBrand(host) {
		if (!host.includes("xn--")) return null;
		try {
			const ascii = new URL(`http://${host}`).hostname;
			for (const brand of Object.keys(BRAND_OFFICIAL)) if (ascii.includes(brand)) return brand;
		} catch {}
		return null;
	}
	function typosquatBrand(host) {
		const label = registrableDomain(host).split(".")[0];
		if (label.length < 4) return null;
		for (const brand of Object.keys(BRAND_OFFICIAL)) {
			if (label === brand) continue;
			if (levenshtein(label, brand) === 1) return brand;
		}
		return null;
	}
	function assessPage(signals) {
		if (!signals.hasPassword) return { level: "none" };
		const host = signals.host.replace(/^www\./, "").toLowerCase();
		const registrable = registrableDomain(host);
		const punyBrand = punycodeLooksLikeBrand(host);
		if (punyBrand) return {
			level: "high",
			brand: punyBrand,
			reason: "punycode"
		};
		const typoBrand = typosquatBrand(host);
		if (typoBrand && !isOfficialDomain(registrable, BRAND_OFFICIAL[typoBrand] ?? [])) return {
			level: "high",
			brand: typoBrand,
			reason: "typosquat"
		};
		for (const [brand, official] of Object.entries(BRAND_OFFICIAL)) {
			if (!hostContainsBrand(host, brand)) continue;
			if (!isOfficialDomain(registrable, official)) return {
				level: "high",
				brand,
				reason: "brand_impersonation"
			};
		}
		if (signals.protocol === "http:") return {
			level: "low",
			reason: "http_password"
		};
		for (const action of signals.formActions) try {
			const actionHost = new URL(action, `https://${host}`).hostname;
			if (registrableDomain(actionHost) !== registrable) return {
				level: "low",
				reason: "cross_domain_form"
			};
		} catch {}
		const titleLower = signals.title.toLowerCase();
		for (const brand of Object.keys(BRAND_OFFICIAL)) if (titleLower.includes(brand) && !hostContainsBrand(host, brand)) return {
			level: "low",
			reason: "title_brand_mismatch"
		};
		return { level: "none" };
	}
	//#endregion
	//#region src/chrome/content/protection/heuristics.ts
	var OVERLAY_ID = "toolbox-protection-overlay";
	function collectSignals() {
		const hasPassword = document.querySelector("input[type=\"password\"]") != null || document.querySelector("input[autocomplete=\"current-password\"]") != null;
		const formActions = [];
		for (const form of document.querySelectorAll("form")) {
			const action = form.getAttribute("action");
			if (action) formActions.push(action);
		}
		return {
			host: location.hostname,
			protocol: location.protocol,
			hasPassword,
			formActions,
			title: document.title
		};
	}
	function reportLookalike(host) {
		try {
			chrome.runtime.sendMessage({
				type: "PROTECTION_REPORT",
				category: "lookalike",
				host,
				source: "heuristic"
			}).catch(() => {});
		} catch {}
	}
	function removeOverlay() {
		document.getElementById(OVERLAY_ID)?.remove();
	}
	function renderOverlay(level, brand) {
		removeOverlay();
		const host = document.documentElement;
		const root = document.createElement("div");
		root.id = OVERLAY_ID;
		const shadow = root.attachShadow({ mode: "closed" });
		const panel = document.createElement("div");
		panel.setAttribute("role", "alertdialog");
		panel.setAttribute("aria-modal", "true");
		const style = document.createElement("style");
		style.textContent = `
    :host { all: initial; }
    .wrap {
      position: fixed; inset: 0; z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.55); font-family: system-ui, sans-serif;
    }
    .card {
      max-width: 28rem; margin: 1rem; padding: 1.25rem; border-radius: 12px;
      background: #fff; color: #111; box-shadow: 0 8px 32px rgba(0,0,0,.2);
    }
    h2 { margin: 0 0 .5rem; font-size: 1.125rem; }
    p { margin: 0 0 1rem; font-size: .875rem; line-height: 1.4; }
    .actions { display: flex; flex-direction: column; gap: .5rem; }
    button {
      padding: .5rem .75rem; border-radius: 8px; border: 1px solid #ccc;
      font-size: .875rem; cursor: pointer; background: #f5f5f5;
    }
    button.primary { background: #111; color: #fff; border-color: #111; }
    .banner {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483645;
      padding: .75rem 1rem; background: #fef3c7; color: #78350f; font-size: .8125rem;
      display: flex; align-items: center; justify-content: space-between; gap: .5rem;
    }
  `;
		if (level === "high") panel.innerHTML = `
      <div class="wrap">
        <div class="card">
          <h2>Suspicious sign-in page</h2>
          <p>This page asks for a password but the address does not match the real ${brand ?? "service"}. Leaving is recommended.</p>
          <div class="actions">
            <button type="button" class="primary" data-action="leave">Leave this site</button>
            <button type="button" data-action="trust">I trust this site</button>
          </div>
        </div>
      </div>`;
		else panel.innerHTML = `
      <div class="banner">
        <span>This page may not be secure. Check the address before entering a password.</span>
        <button type="button" data-action="dismiss">Dismiss</button>
      </div>`;
		shadow.append(style, panel);
		host.appendChild(root);
		shadow.querySelector("[data-action=\"leave\"]")?.addEventListener("click", () => {
			window.location.href = "about:blank";
		});
		shadow.querySelector("[data-action=\"trust\"]")?.addEventListener("click", () => {
			chrome.runtime.sendMessage({
				type: "PROTECTION_TRUST_SITE",
				host: location.hostname
			});
			removeOverlay();
		});
		shadow.querySelector("[data-action=\"dismiss\"]")?.addEventListener("click", () => removeOverlay());
		if (level === "high") reportLookalike(location.hostname.replace(/^www\./, ""));
	}
	var decided = false;
	var observer = null;
	function runCheck() {
		if (decided || window.top !== window) return;
		const verdict = assessPage(collectSignals());
		if (verdict.level === "none") return;
		decided = true;
		observer?.disconnect();
		observer = null;
		renderOverlay(verdict.level, verdict.brand);
	}
	function scheduleCheck() {
		(typeof requestIdleCallback === "function" ? requestIdleCallback : (cb) => window.setTimeout(cb, 0))(() => runCheck());
	}
	function start() {
		scheduleCheck();
		observer = new MutationObserver(() => {
			if (!decided) scheduleCheck();
		});
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
	function shouldRun(state) {
		if (state?.enabled === false || state?.lookalike === false) return false;
		return true;
	}
	function apply(state) {
		if (!shouldRun(state)) {
			decided = false;
			observer?.disconnect();
			observer = null;
			removeOverlay();
			return;
		}
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
		else start();
	}
	var guarded = window;
	if (!guarded.__toolboxProtectionHeuristics) {
		guarded.__toolboxProtectionHeuristics = true;
		chrome.storage.local.get("protection", (result) => apply(result.protection));
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area === "local" && changes.protection) apply(changes.protection.newValue);
		});
	}
	//#endregion
})();
