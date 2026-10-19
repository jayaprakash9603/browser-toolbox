(function() {
	//#endregion
	//#region src/core/protection/constants.ts
	/** Message key the page-world guards use to talk to the isolated protection script. */
	var PAGE_MESSAGE_KEY = "__toolboxProtection";
	/** Message key the isolated script uses to command the page-world guards. */
	var PAGE_COMMAND_KEY = "__toolboxProtectionCmd";
	//#endregion
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
	/** Wording typical of fake virus alerts and "call support" browser lockers. */
	var SCAM_PHRASES = [
		/windows defender (security )?(warning|alert)/i,
		/(your )?(computer|pc|device|system|browser) (has been|is|was) (locked|blocked|infected|compromised|hacked)/i,
		/call (microsoft|apple|windows|amazon|paypal) (support|help|technicians?|helpline)/i,
		/(microsoft|windows|apple) (technical )?support (team|number|helpline)/i,
		/do not (close|restart|shut ?down|turn off) (this (window|page)|your (computer|pc|device)|the browser)/i,
		/(trojan|spyware|virus|malware|ransomware|pornographic spyware)[^.]{0,30}(detected|alert|infection|found)/i,
		/access to this (pc|computer|device) has been blocked/i,
		/(firewall|security) (alert|warning)[^.]{0,20}(call|contact)/i,
		/error (code|#)[:\s#]*[a-z0-9]{5,}/i,
		/your (personal|banking|credit card) (data|information|details) (is|are|may be) (at risk|being stolen|stolen)/i
	];
	var PHONE_NUMBER = /(toll[- ]?free|\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{3,4})/i;
	/** Official vendor domains that legitimately talk about viruses and support numbers. */
	var SCAM_TEXT_EXEMPT = [
		"microsoft.com",
		"apple.com",
		"support.google.com",
		"malwarebytes.com",
		"norton.com",
		"mcafee.com",
		"kaspersky.com",
		"avast.com",
		"bitdefender.com",
		"eset.com",
		"wikipedia.org"
	];
	/** Fake "your computer is infected, call this number" pages. */
	function assessScamText(host, title, text) {
		const registrable = registrableDomain(host);
		if (SCAM_TEXT_EXEMPT.some((d) => registrable === d || host.endsWith(`.${d}`) || host === d)) return { level: "none" };
		const sample = `${title}\n${text}`.slice(0, 2e4);
		const hits = SCAM_PHRASES.filter((re) => re.test(sample)).length;
		const phone = PHONE_NUMBER.test(sample);
		if (hits >= 2 && phone || hits >= 3) return {
			level: "high",
			reason: "tech_support_scam"
		};
		return { level: "none" };
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
	/**
	* Isolated world, all frames, document_start.
	* - Top frame: look-alike sign-in pages and tech-support scam text, with warning overlays.
	* - Every frame: relays page-world guard signals to the background and reports user
	*   gestures so the download guard can tell clicked downloads from automatic ones.
	*/
	var OVERLAY_ID = "toolbox-protection-overlay";
	var SCAM_RECHECK_MS = 2500;
	var GESTURE_THROTTLE_MS = 1500;
	var IS_TOP = window.top === window;
	var state = {};
	var decided = false;
	var observer = null;
	var lastGestureSent = 0;
	function isActive() {
		if (state.enabled === false) return false;
		const host = location.hostname.replace(/^www\./, "");
		return !(state.trusted ?? []).some((t) => host === t || host.endsWith(`.${t}`));
	}
	function send(message) {
		try {
			chrome.runtime.sendMessage(message).catch(() => {});
		} catch {}
	}
	function report(category) {
		send({
			type: "PROTECTION_REPORT",
			category,
			host: location.hostname.replace(/^www\./, ""),
			source: "heuristic"
		});
	}
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
	function removeOverlay() {
		document.getElementById(OVERLAY_ID)?.remove();
	}
	var OVERLAY_CSS = `
  :host { all: initial; }
  .wrap {
    position: fixed; inset: 0; z-index: 2147483646;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,.6); font-family: system-ui, sans-serif;
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
    font-size: .875rem; cursor: pointer; background: #f5f5f5; color: #111;
  }
  button.primary { background: #111; color: #fff; border-color: #111; }
  .banner {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483645;
    padding: .75rem 1rem; background: #fef3c7; color: #78350f; font-size: .8125rem;
    display: flex; align-items: center; justify-content: space-between; gap: .5rem;
    font-family: system-ui, sans-serif;
  }
  .banner.danger { background: #fee2e2; color: #7f1d1d; }
`;
	var OVERLAY_COPY = {
		lookalike: {
			title: "Suspicious sign-in page",
			body: "This page asks for a password but the address does not match the real {brand}. Leaving is recommended.",
			modal: true
		},
		lookalikeLow: {
			title: "",
			body: "This page may not be secure. Check the address before entering a password.",
			modal: false
		},
		techscam: {
			title: "Fake security alert blocked",
			body: "This page shows a fake virus or \"computer locked\" warning to make you call a scam phone number. Your computer is not locked. Do not call the number or install anything it asks for.",
			modal: true
		},
		clipboard: {
			title: "",
			body: "Blocked: this page tried to copy a hidden command to your clipboard. Never paste commands from a website into Run, Terminal or PowerShell.",
			modal: false
		}
	};
	function button(action, label, primary = false) {
		const el = document.createElement("button");
		el.type = "button";
		el.dataset.action = action;
		el.textContent = label;
		if (primary) el.className = "primary";
		return el;
	}
	function renderOverlay(kind, brand) {
		removeOverlay();
		const copy = OVERLAY_COPY[kind];
		const root = document.createElement("div");
		root.id = OVERLAY_ID;
		const shadow = root.attachShadow({ mode: "closed" });
		const style = document.createElement("style");
		style.textContent = OVERLAY_CSS;
		const panel = document.createElement("div");
		const body = copy.body.replace("{brand}", brand ?? "service");
		if (copy.modal) {
			panel.className = "wrap";
			panel.setAttribute("role", "alertdialog");
			panel.setAttribute("aria-modal", "true");
			const card = document.createElement("div");
			card.className = "card";
			const title = document.createElement("h2");
			title.textContent = copy.title;
			const text = document.createElement("p");
			text.textContent = body;
			const actions = document.createElement("div");
			actions.className = "actions";
			actions.append(button("leave", "Leave this site", true), button("trust", "I trust this site"));
			card.append(title, text, actions);
			panel.append(card);
		} else {
			panel.className = kind === "clipboard" ? "banner danger" : "banner";
			panel.setAttribute("role", "alert");
			const text = document.createElement("span");
			text.textContent = body;
			panel.append(text, button("dismiss", "Dismiss"));
		}
		shadow.append(style, panel);
		document.documentElement.appendChild(root);
		shadow.querySelector("[data-action=\"leave\"]")?.addEventListener("click", () => {
			window.location.href = "about:blank";
		});
		shadow.querySelector("[data-action=\"trust\"]")?.addEventListener("click", () => {
			send({
				type: "PROTECTION_TRUST_SITE",
				host: location.hostname
			});
			removeOverlay();
		});
		shadow.querySelector("[data-action=\"dismiss\"]")?.addEventListener("click", () => removeOverlay());
	}
	function postLockdown() {
		window.postMessage({ [PAGE_COMMAND_KEY]: "lockdown" }, location.origin || "*");
	}
	function flagTechScam() {
		if (decided) return;
		decided = true;
		stopObserving();
		postLockdown();
		renderOverlay("techscam");
		report("techscam");
	}
	function checkScamText() {
		if (decided || state.scamGuard === false || !isActive()) return;
		const text = document.body?.innerText ?? "";
		if (assessScamText(location.hostname, document.title, text).level === "high") flagTechScam();
	}
	function checkLookalike() {
		if (decided || state.lookalike === false || !isActive()) return;
		const verdict = assessPage(collectSignals());
		if (verdict.level === "none") return;
		decided = true;
		stopObserving();
		if (verdict.level === "high") {
			renderOverlay("lookalike", verdict.brand);
			report("lookalike");
		} else renderOverlay("lookalikeLow");
	}
	function stopObserving() {
		observer?.disconnect();
		observer = null;
	}
	function scheduleChecks() {
		(typeof requestIdleCallback === "function" ? requestIdleCallback : (cb) => window.setTimeout(cb, 0))(() => {
			checkScamText();
			checkLookalike();
		});
	}
	function startTopFrameChecks() {
		if (!IS_TOP || observer) return;
		scheduleChecks();
		window.setTimeout(checkScamText, SCAM_RECHECK_MS);
		observer = new MutationObserver(() => {
			if (!decided) scheduleChecks();
		});
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
	function onPageSignal(event) {
		if (event.source !== window || !isActive()) return;
		const data = event.data;
		const kind = data && typeof data === "object" ? data[PAGE_MESSAGE_KEY] : void 0;
		if (kind === "lockdown" && IS_TOP && state.scamGuard !== false) flagTechScam();
		else if (kind === "clipboard" && state.clipboardGuard !== false) {
			if (IS_TOP) renderOverlay("clipboard");
			report("clipboard");
		} else if (kind === "notification" && state.notificationGuard !== false) report("notification");
	}
	function onGesture(event) {
		if (!event.isTrusted || state.downloadGuard === false || state.enabled === false) return;
		const now = Date.now();
		if (now - lastGestureSent < GESTURE_THROTTLE_MS) return;
		lastGestureSent = now;
		send({
			type: "PROTECTION_GESTURE",
			host: location.hostname
		});
	}
	function apply(next) {
		state = next ?? {};
		if (!isActive()) {
			decided = false;
			stopObserving();
			removeOverlay();
			return;
		}
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startTopFrameChecks, { once: true });
		else startTopFrameChecks();
	}
	var guarded = window;
	if (!guarded.__toolboxProtectionHeuristics) {
		guarded.__toolboxProtectionHeuristics = true;
		window.addEventListener("message", onPageSignal);
		window.addEventListener("pointerdown", onGesture, true);
		window.addEventListener("keydown", onGesture, true);
		chrome.storage.local.get("protection", (result) => apply(result.protection));
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area === "local" && changes.protection) apply(changes.protection.newValue);
		});
	}
	//#endregion
})();
