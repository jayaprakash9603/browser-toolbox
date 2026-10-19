(function() {
	//#region src/chrome/content/adblock/cosmetic.ts
	var STYLE_ID = "toolbox-adblock-cosmetic";
	var COUNT_THROTTLE_MS = 2500;
	var SELECTOR_CHUNK = 150;
	var IS_TOP = window.top === window;
	var active = false;
	var selectorChunks = [];
	var observer = null;
	var countTimer = null;
	var counted = /* @__PURE__ */ new WeakSet();
	function siteHost() {
		return location.hostname.replace(/^www\./, "").toLowerCase();
	}
	function hostCandidates(host) {
		const parts = host.split(".");
		const out = [];
		for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
		return out;
	}
	function isAllowlisted(host, allowlist) {
		return allowlist.some((entry) => {
			const e = entry.replace(/^www\./, "").toLowerCase();
			return host === e || host.endsWith(`.${e}`);
		});
	}
	function shouldRun(state) {
		if (state?.enabled === false || state?.cosmeticEnabled === false) return false;
		return !isAllowlisted(siteHost(), state?.allowlist ?? []);
	}
	async function fetchText(path) {
		try {
			return await (await fetch(chrome.runtime.getURL(path))).text();
		} catch {
			return "";
		}
	}
	function selectorsFromCss(css) {
		const out = [];
		for (const line of css.split("\n")) {
			const end = line.lastIndexOf("{");
			if (end > 0) out.push(line.slice(0, end).trim());
		}
		return out;
	}
	function isValidSelector(selector) {
		try {
			document.createDocumentFragment().querySelector(selector);
			return true;
		} catch {
			return false;
		}
	}
	function buildChunks(selectors) {
		const chunks = [];
		for (let i = 0; i < selectors.length; i += SELECTOR_CHUNK) {
			const slice = selectors.slice(i, i + SELECTOR_CHUNK);
			const joined = slice.join(",");
			if (isValidSelector(joined)) chunks.push(joined);
			else {
				const valid = slice.filter(isValidSelector);
				if (valid.length) chunks.push(valid.join(","));
			}
		}
		return chunks;
	}
	async function buildSpecificCss(host) {
		let file = {
			specific: {},
			exceptions: {}
		};
		try {
			file = await (await fetch(chrome.runtime.getURL("adblock/cosmetic/specific.json"))).json();
		} catch {}
		const candidates = hostCandidates(host);
		const exceptions = new Set(candidates.flatMap((h) => file.exceptions[h] ?? []));
		const selectors = [...new Set(candidates.flatMap((h) => file.specific[h] ?? []))].filter((s) => !exceptions.has(s));
		const hide = selectors.map((s) => `${s}{display:none!important}`);
		const unhide = [...exceptions].map((s) => `${s}{display:revert!important}`);
		return {
			css: [...hide, ...unhide].join("\n"),
			selectors
		};
	}
	function report(hidden) {
		if (hidden <= 0) return;
		try {
			chrome.runtime.sendMessage({
				type: "ADBLOCK_COSMETIC_REPORT",
				hidden
			}).catch(() => {});
		} catch {}
	}
	function countHidden() {
		countTimer = null;
		if (!active) return;
		let fresh = 0;
		for (const chunk of selectorChunks) for (const el of document.querySelectorAll(chunk)) {
			if (counted.has(el)) continue;
			counted.add(el);
			fresh++;
		}
		report(fresh);
	}
	function scheduleCount() {
		if (!countTimer) countTimer = setTimeout(countHidden, COUNT_THROTTLE_MS);
	}
	/** Google's full-page "vignette" interstitial leaves a hash and a scroll lock behind. */
	function clearVignette() {
		if (location.hash === "#google_vignette") history.replaceState(history.state, "", location.href.replace(/#google_vignette$/, ""));
		for (const el of [document.documentElement, document.body]) if (el && el.style.overflow === "hidden" && !document.querySelector("[aria-modal=\"true\"]")) el.style.removeProperty("overflow");
	}
	async function activate(state) {
		const specific = await buildSpecificCss(siteHost());
		let style = document.getElementById(STYLE_ID);
		if (!style) {
			style = document.createElement("style");
			style.id = STYLE_ID;
			(document.head ?? document.documentElement).appendChild(style);
		}
		style.textContent = specific.css;
		active = true;
		if (!IS_TOP) return;
		const extraFiles = ["adblock/cosmetic/generic.css"];
		if (state?.cookieBanners) extraFiles.push("adblock/cosmetic/cookies.css");
		if (state?.distractions) extraFiles.push("adblock/cosmetic/distractions.css");
		const generic = (await Promise.all(extraFiles.map(fetchText))).flatMap(selectorsFromCss);
		selectorChunks = buildChunks([...specific.selectors, ...generic]);
		observer ??= new MutationObserver(() => {
			scheduleCount();
			if (location.hash === "#google_vignette") clearVignette();
		});
		const start = () => {
			observer?.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
			clearVignette();
			scheduleCount();
		};
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
		else start();
		window.addEventListener("hashchange", clearVignette);
	}
	function deactivate() {
		active = false;
		document.getElementById(STYLE_ID)?.remove();
		observer?.disconnect();
		observer = null;
		if (countTimer) clearTimeout(countTimer);
		countTimer = null;
	}
	function apply(state) {
		if (shouldRun(state)) activate(state);
		else deactivate();
	}
	var guarded = window;
	if (!guarded.__toolboxCosmetic) {
		guarded.__toolboxCosmetic = true;
		chrome.storage.local.get("adblock", (result) => apply(result.adblock));
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area === "local" && changes.adblock) apply(changes.adblock.newValue);
		});
	}
	//#endregion
})();
