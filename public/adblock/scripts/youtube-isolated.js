(function() {
	//#region src/chrome/content/adblock/youtube/selectors.ts
	var YOUTUBE_COSMETIC_SELECTORS = [
		"ytd-ad-slot-renderer",
		"ytd-banner-promo-renderer",
		"ytd-display-ad-renderer",
		"ytd-promoted-sparkles-web-renderer",
		"ytd-promoted-sparkles-text-search-renderer",
		"ytd-promoted-video-renderer",
		"ytd-compact-promoted-video-renderer",
		"ytd-in-feed-ad-layout-renderer",
		"ytd-search-pyv-renderer",
		"ytd-video-masthead-ad-v3-renderer",
		"ytd-primetime-promo-renderer",
		"ytd-statement-banner-renderer",
		"ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)",
		"ytd-rich-section-renderer:has(ytd-statement-banner-renderer)",
		"ytd-engagement-panel-section-list-renderer[target-id=\"engagement-panel-ads\"]",
		"ytd-merch-shelf-renderer",
		"ytd-player-legacy-desktop-watch-ads-renderer",
		"#masthead-ad",
		"#player-ads",
		"#panels > ytd-engagement-panel-section-list-renderer[target-id=\"engagement-panel-ads\"]",
		".ytp-ad-overlay-slot",
		".ytp-ad-overlay-container",
		".ytp-ad-image-overlay",
		".ytp-suggested-action-badge",
		".ytd-companion-slot-renderer",
		"ytm-promoted-sparkles-web-renderer",
		"ytm-companion-ad-renderer",
		"ad-slot-renderer"
	];
	var YOUTUBE_AD_PLAYER_CLASSES = ["ad-showing", "ad-interrupting"];
	var YOUTUBE_AD_UI_SELECTORS = [
		".ytp-ad-player-overlay",
		".ytp-ad-player-overlay-layout",
		".ytp-ad-text",
		".ytp-ad-preview-container",
		".ytp-ad-simple-ad-badge",
		".video-ads .ytp-ad-module > *"
	];
	var YOUTUBE_SKIP_BUTTON_SELECTORS = [
		".ytp-skip-ad-button",
		".ytp-ad-skip-button:not(.ytp-ad-skip-button-disabled)",
		".ytp-ad-skip-button-modern:not(.ytp-ad-skip-button-disabled)",
		".ytp-ad-skip-button-container:not(.ytp-ad-skip-button-disabled) .ytp-ad-skip-button",
		".ytp-ad-skip-button-container:not(.ytp-ad-skip-button-disabled) button",
		"button.ytp-ad-skip-button-modern",
		".ytp-ad-skip-button-slot:not(.ytp-ad-skip-button-disabled) .ytp-ad-button-icon",
		"button.ytp-ad-skip-button-slot",
		".video-ads .ytp-ad-skip-button-container button",
		".ytp-ad-skip-button-modern .ytp-ad-button-icon"
	];
	//#endregion
	//#region src/chrome/content/adblock/youtube/skipAd.ts
	function isSkipElementClickable(el) {
		if (!el.isConnected) return false;
		if (el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled")) return false;
		if (el.classList.contains("ytp-ad-skip-button-disabled")) return false;
		if (el.closest(".ytp-ad-skip-button-container")?.classList.contains("ytp-ad-skip-button-disabled")) return false;
		const style = getComputedStyle(el);
		if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
		const rect = el.getBoundingClientRect();
		return rect.width >= 2 && rect.height >= 2;
	}
	function playerRoot() {
		return document.querySelector("#movie_player, .html5-video-player");
	}
	function findSkipButton() {
		const scope = playerRoot() ?? document;
		for (const selector of YOUTUBE_SKIP_BUTTON_SELECTORS) {
			const el = scope.querySelector(selector);
			if (el && isSkipElementClickable(el)) return el;
		}
		for (const el of scope.querySelectorAll("button, div[role=\"button\"], span[role=\"button\"], .ytp-button")) {
			const label = `${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`.toLowerCase();
			if (!/\bskip\b/.test(label)) continue;
			if (isSkipElementClickable(el)) return el;
		}
		return null;
	}
	function forceClick(el) {
		try {
			el.click();
		} catch {}
		const opts = {
			bubbles: true,
			cancelable: true,
			view: window,
			buttons: 1
		};
		for (const type of [
			"pointerdown",
			"mousedown",
			"pointerup",
			"mouseup",
			"click"
		]) el.dispatchEvent(new MouseEvent(type, opts));
	}
	/** Click “Skip ad” in the page context (MAIN world). Returns true if a click was attempted. */
	function tryAutoSkipAd() {
		const button = findSkipButton();
		if (!button) return false;
		forceClick(button);
		return true;
	}
	//#endregion
	//#region src/chrome/content/adblock/youtube/isolated.ts
	var STYLE_ID = "toolbox-adblock-youtube";
	var REPORT_DELAY_MS = 1500;
	var FAST_FORWARD_RATE = 16;
	var AD_POLL_MS = 200;
	var enabled = false;
	var pendingBlocked = 0;
	var reportTimer = null;
	var playerObserver = null;
	var pollTimer = null;
	var adPollTimer = null;
	var enforcementTimer = null;
	var playerMutationTimer = null;
	var saved = null;
	var adActive = false;
	function queueReport(count) {
		if (count <= 0) return;
		pendingBlocked += count;
		if (reportTimer) return;
		reportTimer = setTimeout(() => {
			reportTimer = null;
			const youtube = pendingBlocked;
			pendingBlocked = 0;
			try {
				chrome.runtime.sendMessage({
					type: "ADBLOCK_COSMETIC_REPORT",
					youtube
				}).catch(() => {});
			} catch {}
		}, REPORT_DELAY_MS);
	}
	function injectCss() {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = `${YOUTUBE_COSMETIC_SELECTORS.join(",\n")}{display:none!important}`;
		(document.head ?? document.documentElement).appendChild(style);
	}
	function getPlayer() {
		return document.querySelector("#movie_player, .html5-video-player");
	}
	function getVideo(player) {
		return player.querySelector("video.html5-main-video, video");
	}
	function isAdPlaying(player) {
		if (YOUTUBE_AD_PLAYER_CLASSES.some((cls) => player.classList.contains(cls))) return true;
		return YOUTUBE_AD_UI_SELECTORS.some((selector) => player.querySelector(selector));
	}
	function restoreVideo(video) {
		if (!saved || !video) return;
		video.muted = saved.muted;
		video.playbackRate = saved.rate;
		saved = null;
	}
	/**
	* Hiding YouTube's ad-blocker notice with CSS leaves its modal backdrop over the page, which
	* greys it out and swallows every click. Remove the dialog and backdrop together instead.
	*/
	function dismissEnforcementDialog() {
		const notice = document.querySelector("ytd-enforcement-message-view-model");
		if (!notice) return;
		(notice.closest("tp-yt-paper-dialog") ?? notice).remove();
		document.querySelectorAll("tp-yt-iron-overlay-backdrop").forEach((el) => el.remove());
		document.body?.style.removeProperty("overflow");
		document.documentElement.style.removeProperty("overflow");
		const player = getPlayer();
		const video = player ? getVideo(player) : null;
		if (video?.paused && !video.ended) video.play().catch(() => void 0);
	}
	/** Fallback when an ad still slips through pruning: mute, fast-forward, skip. */
	function checkPlayer() {
		dismissEnforcementDialog();
		const player = getPlayer();
		if (!player) return;
		const video = getVideo(player);
		if (!isAdPlaying(player)) {
			if (adActive) {
				adActive = false;
				restoreVideo(video);
				stopAdPoll();
			}
			return;
		}
		startAdPoll();
		if (!video) return;
		if (!adActive) {
			adActive = true;
			saved = {
				muted: video.muted,
				rate: video.playbackRate || 1
			};
			queueReport(1);
		}
		video.muted = true;
		if (video.playbackRate !== FAST_FORWARD_RATE) video.playbackRate = FAST_FORWARD_RATE;
		if (tryAutoSkipAd()) return;
		if (Number.isFinite(video.duration) && video.duration > 0 && video.duration < 600) {
			const nearEnd = video.duration - .05;
			if (video.currentTime < nearEnd) video.currentTime = nearEnd;
		}
	}
	function stopPoll() {
		if (!pollTimer) return;
		clearInterval(pollTimer);
		pollTimer = null;
	}
	function resetPlayerObserver() {
		playerObserver?.disconnect();
		playerObserver = null;
		if (playerMutationTimer) clearTimeout(playerMutationTimer);
		playerMutationTimer = null;
	}
	function observePlayer() {
		const player = getPlayer();
		if (!player) return;
		if (!playerObserver) {
			playerObserver = new MutationObserver(() => {
				if (playerMutationTimer) return;
				playerMutationTimer = setTimeout(() => {
					playerMutationTimer = null;
					checkPlayer();
				}, 50);
			});
			playerObserver.observe(player, {
				subtree: true,
				childList: true,
				attributes: true,
				attributeFilter: ["class", "aria-disabled"]
			});
		}
		checkPlayer();
		stopPoll();
	}
	function startAdPoll() {
		if (adPollTimer) return;
		adPollTimer = setInterval(checkPlayer, AD_POLL_MS);
	}
	function stopAdPoll() {
		if (!adPollTimer) return;
		clearInterval(adPollTimer);
		adPollTimer = null;
	}
	function start() {
		injectCss();
		observePlayer();
		enforcementTimer ??= setInterval(dismissEnforcementDialog, 1e3);
		if (!getPlayer()) pollTimer ??= setInterval(() => {
			observePlayer();
		}, 1e3);
	}
	function stop() {
		document.getElementById(STYLE_ID)?.remove();
		resetPlayerObserver();
		stopPoll();
		stopAdPoll();
		if (enforcementTimer) clearInterval(enforcementTimer);
		enforcementTimer = null;
		const player = getPlayer();
		restoreVideo(player ? getVideo(player) : null);
		adActive = false;
	}
	function isEnabled(raw) {
		const state = raw;
		if (state?.enabled === false || state?.youtubeEnabled === false || state?.lists?.youtube === false) return false;
		const host = location.hostname.replace(/^www\./, "");
		return !(state?.allowlist ?? []).some((entry) => host === entry || host.endsWith(`.${entry}`));
	}
	function applyState(raw) {
		const next = isEnabled(raw);
		if (next === enabled) return;
		enabled = next;
		if (enabled) start();
		else stop();
	}
	var guarded = window;
	if (!guarded.__toolboxYtIsolated && window === window.top) {
		guarded.__toolboxYtIsolated = true;
		window.addEventListener("message", (event) => {
			if (event.source !== window || !enabled) return;
			const data = event.data;
			if (data?.source === "toolbox-adblock" && data.type === "yt-pruned") queueReport(Number(data.count) > 0 ? 1 : 0);
		});
		chrome.storage.local.get("adblock", (result) => applyState(result.adblock));
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area === "local" && changes.adblock) applyState(changes.adblock.newValue);
		});
		document.addEventListener("yt-navigate-finish", () => {
			if (!enabled) return;
			resetPlayerObserver();
			observePlayer();
		});
	}
	//#endregion
})();
