(function() {
	//#region src/core/sites/instagram/features.ts
	var INSTAGRAM_FEATURES = [
		{
			id: "videoControls",
			section: "player",
			kind: "toggle",
			default: true
		},
		{
			id: "playbackSpeed",
			section: "player",
			kind: "select",
			default: "1"
		},
		{
			id: "pictureInPicture",
			section: "player",
			kind: "toggle",
			default: true
		},
		{
			id: "mediaDownload",
			section: "download",
			kind: "toggle",
			default: true
		},
		{
			id: "ghostStories",
			section: "privacy",
			kind: "toggle",
			default: false
		}
	];
	new Map(INSTAGRAM_FEATURES.map((f) => [f.id, f]));
	//#endregion
	//#region src/core/sites/instagram/constants.ts
	var SITE_FILES = {
		instagramCss: "sites/instagram/instagram.css",
		isolatedJs: "sites/scripts/ig-isolated.js"
	};
	//#endregion
	//#region src/core/sites/instagram/helpers.ts
	function isFeatureOn(values, id) {
		return values[id] === true;
	}
	function playbackRate(values) {
		const raw = values.playbackSpeed;
		const n = typeof raw === "string" ? Number.parseFloat(raw) : typeof raw === "number" ? raw : 1;
		return Number.isFinite(n) && n > 0 ? n : 1;
	}
	//#endregion
	//#region src/core/i18n/chromeMessages.ts
	var CHROME_UI_FALLBACKS = {
		extName: "Browser Toolbox",
		extDescription: "All-in-one productivity toolbox: clipboard, text, developer, QA and web utilities in one side panel.",
		actionTitle: "Open Browser Toolbox",
		contextMenuOpen: "Open Browser Toolbox",
		contextMenuPauseAdblock: "Pause ad blocking on this site",
		contextMenuSaveImageAs: "Save image as",
		contextMenuPip: "Picture-in-Picture",
		commandTogglePip: "Toggle Picture-in-Picture for the current tab"
	};
	function getChromeMessage(messageName) {
		try {
			if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
				const value = chrome.i18n.getMessage(messageName);
				if (value) return value;
			}
		} catch {}
		return CHROME_UI_FALLBACKS[messageName] ?? "";
	}
	function getExtensionName() {
		return getChromeMessage("extName") || CHROME_UI_FALLBACKS.extName;
	}
	getExtensionName();
	//#endregion
	//#region src/core/sites/instagram/service.ts
	function defaultInstagramValues() {
		const values = {};
		for (const f of INSTAGRAM_FEATURES) values[f.id] = f.default;
		return values;
	}
	defaultInstagramValues();
	//#endregion
	//#region src/chrome/content/sites/instagram/manager.ts
	var STYLE_LINK_ID = "toolbox-ig-css";
	var ACTIVE_ATTR = "data-tbx-ig-active";
	var observerKey = "__toolboxIgObserver";
	function ensureCssLink() {
		if (document.getElementById(STYLE_LINK_ID)) return;
		const link = document.createElement("link");
		link.id = STYLE_LINK_ID;
		link.rel = "stylesheet";
		link.href = chrome.runtime.getURL(SITE_FILES.instagramCss);
		document.head.appendChild(link);
	}
	function findMediaUrl(video) {
		return video.currentSrc || video.src || null;
	}
	function attachDownloadButton(video) {
		if (video.dataset.tbxIgDl === "1") return;
		video.dataset.tbxIgDl = "1";
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "tbx-ig-download";
		btn.textContent = "↓";
		btn.title = "Download media";
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const url = findMediaUrl(video);
			if (!url) return;
			const a = document.createElement("a");
			a.href = url;
			a.download = `instagram-${Date.now()}.mp4`;
			a.rel = "noopener";
			a.click();
		});
		const parent = video.parentElement;
		if (parent) {
			parent.style.position = parent.style.position || "relative";
			parent.appendChild(btn);
		}
	}
	function enhanceVideo(video, state) {
		if (isFeatureOn(state.values, "videoControls")) video.controls = true;
		const rate = playbackRate(state.values);
		if (rate !== 1) video.playbackRate = rate;
		if (isFeatureOn(state.values, "mediaDownload")) attachDownloadButton(video);
		if (isFeatureOn(state.values, "pictureInPicture") && !video.dataset.tbxIgPip) {
			video.dataset.tbxIgPip = "1";
			video.addEventListener("dblclick", () => {
				if (document.pictureInPictureElement) document.exitPictureInPicture();
				else video.requestPictureInPicture().catch(() => {});
			}, { passive: true });
		}
	}
	function scanVideos(state) {
		document.querySelectorAll("video").forEach((v) => enhanceVideo(v, state));
	}
	function startObserver(state) {
		const guarded = window;
		guarded[observerKey]?.disconnect();
		const obs = new MutationObserver(() => scanVideos(state));
		obs.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		guarded[observerKey] = obs;
		scanVideos(state);
	}
	function stopObserver() {
		const guarded = window;
		guarded[observerKey]?.disconnect();
		delete guarded[observerKey];
	}
	function applyInstagramEnhancer(state) {
		if (!state.enabled) {
			stopAll();
			return;
		}
		ensureCssLink();
		document.documentElement.setAttribute(ACTIVE_ATTR, "true");
		startObserver(state);
	}
	function stopAll() {
		stopObserver();
		document.documentElement.removeAttribute(ACTIVE_ATTR);
		document.getElementById(STYLE_LINK_ID)?.remove();
		document.querySelectorAll(".tbx-ig-download").forEach((el) => el.remove());
		document.querySelectorAll("video[data-tbx-ig-dl]").forEach((v) => {
			v.removeAttribute("data-tbx-ig-dl");
			v.removeAttribute("data-tbx-ig-pip");
		});
	}
	//#endregion
	//#region src/chrome/content/sites/instagram/isolated.ts
	function readState(raw) {
		if (!raw || typeof raw !== "object") return null;
		const o = raw;
		if (!o.values) return null;
		return o;
	}
	function apply(raw) {
		const state = readState(raw);
		if (!state?.enabled) {
			stopAll();
			return;
		}
		applyInstagramEnhancer(state);
	}
	var guarded = window;
	if (!guarded.__toolboxIgEnhancer) {
		guarded.__toolboxIgEnhancer = true;
		if (window === window.top) {
			chrome.storage.local.get("instagramEnhancer", (result) => apply(result.instagramEnhancer));
			chrome.storage.onChanged.addListener((changes, area) => {
				if (area === "local" && changes.instagramEnhancer) apply(changes.instagramEnhancer.newValue);
			});
		}
	}
	//#endregion
})();
