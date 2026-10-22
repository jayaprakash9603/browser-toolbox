(function() {
	//#region src/chrome/content/adblock/scriptlets/jsonPrune.ts
	/**
	* Only the ad schedule. YouTube checks that `playerAds`, the `adBreak*` params and the other ad
	* fields are still present; stripping them is detected and answered with a forced buffering
	* delay ("Experiencing interruptions?") or a stopped player. Same scope as uBO's quick fixes.
	*/
	var YT_AD_KEYS = ["adPlacements", "adSlots"];
	/** Do not recurse into generic `response` — it appears on comment/browse APIs and is not player ads. */
	var NESTED_KEYS = ["playerResponse", "playerConfig"];
	var MAX_DEPTH = 4;
	function isRecord(value) {
		return Boolean(value) && typeof value === "object";
	}
	/** Empty ad arrays appear on browse/comment payloads — pruning them breaks loading and is wasted work. */
	function isNonEmptyAdValue(value) {
		if (value == null) return false;
		if (Array.isArray(value)) return value.length > 0;
		if (typeof value === "object") return Object.keys(value).length > 0;
		return true;
	}
	function recordHasAdPayload(record) {
		if (YT_AD_KEYS.some((key) => key in record && isNonEmptyAdValue(record[key]))) return true;
		const renderers = record.auxiliaryUi?.messageRenderers;
		return isRecord(renderers) && "enforcementMessageViewModel" in renderers;
	}
	function stripAdKeys(record) {
		let removed = 0;
		for (const key of YT_AD_KEYS) if (key in record && isNonEmptyAdValue(record[key])) {
			delete record[key];
			removed++;
		}
		const renderers = record.auxiliaryUi?.messageRenderers;
		if (isRecord(renderers) && "enforcementMessageViewModel" in renderers) {
			delete renderers.enforcementMessageViewModel;
			removed++;
		}
		return removed;
	}
	/**
	* Removes ad payloads from a YouTube player/next response, mutating it in place
	* so YouTube keeps the exact object (and Response/XHR) it created.
	* Returns how many ad entries were removed.
	*/
	function pruneYoutubeAdsInPlace(data, depth = 0) {
		if (!isRecord(data) || depth > MAX_DEPTH) return 0;
		if (Array.isArray(data)) return data.reduce((sum, item) => sum + pruneYoutubeAdsInPlace(item, depth + 1), 0);
		let removed = stripAdKeys(data);
		for (const key of NESTED_KEYS) removed += pruneYoutubeAdsInPlace(data[key], depth + 1);
		return removed;
	}
	/** Cheap check used by the JSON.parse hook before walking an object. */
	function hasYoutubeAdPayload(data) {
		if (!isRecord(data)) return false;
		if (Array.isArray(data)) return data.some((item) => hasYoutubeAdPayload(item));
		if (recordHasAdPayload(data)) return true;
		const pr = data.playerResponse;
		return isRecord(pr) && recordHasAdPayload(pr);
	}
	function pruneYoutubeResponseText(text) {
		if (!/"(adPlacements|adSlots|enforcementMessageViewModel)"\s*:\s*(?!\[\s*\])(?!\{\s*\})/.test(text)) return {
			text,
			removed: 0
		};
		try {
			const parsed = JSON.parse(text);
			const removed = pruneYoutubeAdsInPlace(parsed);
			return removed ? {
				text: JSON.stringify(parsed),
				removed
			} : {
				text,
				removed: 0
			};
		} catch {
			return {
				text,
				removed: 0
			};
		}
	}
	function isYoutubePlayerEndpoint(url) {
		return /\/youtubei\/v1\/(player|next|reel\/reel_item_watch)/.test(url);
	}
	//#endregion
	//#region src/chrome/content/adblock/youtube/antiDetect.ts
	/**
	* When YouTube suspects an ad blocker it schedules playback behind a 17 s timer (the
	* "Experiencing interruptions?" buffering) and pauses or tears down the player from an
	* `onAbnormalityDetected` callback. These hooks mirror uBO's quick fixes for both:
	* `nano-stb, [native code], 17000, 0.001` and the Promise.then filter in its serverContract patch.
	*/
	var PENALTY_DELAY_MS = 17e3;
	var BOOST_FACTOR = .001;
	function boostedDelay(handler, delay) {
		if (Number(delay) !== 17e3 || typeof handler !== "function") return delay;
		return String(handler).includes("[native code]") ? PENALTY_DELAY_MS * BOOST_FACTOR : delay;
	}
	function installPenaltyTimerBooster(win = window) {
		win.setTimeout = new Proxy(win.setTimeout, { apply(target, thisArg, args) {
			if (args.length > 1) args[1] = boostedDelay(args[0], args[1]);
			return Reflect.apply(target, thisArg, args);
		} });
	}
	var checked = /* @__PURE__ */ new WeakMap();
	function isAbnormalityHandler(fn) {
		if (typeof fn !== "function") return false;
		let hit = checked.get(fn);
		if (hit === void 0) {
			try {
				hit = Function.prototype.toString.call(fn).includes("onAbnormalityDetected");
			} catch {
				hit = false;
			}
			checked.set(fn, hit);
		}
		return hit;
	}
	var noop = () => void 0;
	function installAbnormalityFilter(win = window) {
		const proto = win.Promise.prototype;
		proto.then = new Proxy(proto.then, { apply(target, thisArg, args) {
			if (isAbnormalityHandler(args[0])) args[0] = noop;
			return Reflect.apply(target, thisArg, args);
		} });
	}
	//#endregion
	//#region src/chrome/content/adblock/youtube/selectors.ts
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
	//#region src/chrome/content/adblock/youtube/main.ts
	var SKIP_POLL_MS = 200;
	var MESSAGE_SOURCE = "toolbox-adblock";
	function reportPruned(count) {
		if (count > 0) window.postMessage({
			source: MESSAGE_SOURCE,
			type: "yt-pruned",
			count
		}, "*");
	}
	function patchJsonParse() {
		JSON.parse = new Proxy(JSON.parse, { apply(target, thisArg, args) {
			const result = Reflect.apply(target, thisArg, args);
			if (hasYoutubeAdPayload(result)) reportPruned(pruneYoutubeAdsInPlace(result));
			return result;
		} });
	}
	function patchResponse() {
		const proto = Response.prototype;
		proto.json = new Proxy(proto.json, { apply(target, thisArg, args) {
			return Reflect.apply(target, thisArg, args).then((data) => {
				if (hasYoutubeAdPayload(data)) reportPruned(pruneYoutubeAdsInPlace(data));
				return data;
			});
		} });
		proto.text = new Proxy(proto.text, { apply(target, thisArg, args) {
			const promise = Reflect.apply(target, thisArg, args);
			if (!isYoutubePlayerEndpoint(thisArg.url)) return promise;
			return promise.then((text) => {
				const pruned = pruneYoutubeResponseText(text);
				reportPruned(pruned.removed);
				return pruned.text;
			});
		} });
	}
	function patchXhr() {
		const proto = XMLHttpRequest.prototype;
		const textDesc = Object.getOwnPropertyDescriptor(proto, "responseText");
		const responseDesc = Object.getOwnPropertyDescriptor(proto, "response");
		if (!textDesc?.get || !responseDesc?.get) return;
		const getText = textDesc.get;
		const getResponse = responseDesc.get;
		const cache = /* @__PURE__ */ new WeakMap();
		const prunedText = (xhr) => {
			if (xhr.readyState !== 4 || !isYoutubePlayerEndpoint(xhr.responseURL)) return null;
			const cached = cache.get(xhr);
			if (cached != null) return cached;
			const pruned = pruneYoutubeResponseText(getText.call(xhr));
			reportPruned(pruned.removed);
			cache.set(xhr, pruned.text);
			return pruned.text;
		};
		Object.defineProperty(proto, "responseText", {
			...textDesc,
			get() {
				if (this.responseType !== "" && this.responseType !== "text") return getText.call(this);
				return prunedText(this) ?? getText.call(this);
			}
		});
		Object.defineProperty(proto, "response", {
			...responseDesc,
			get() {
				const raw = getResponse.call(this);
				if (this.responseType === "json") {
					if (hasYoutubeAdPayload(raw)) reportPruned(pruneYoutubeAdsInPlace(raw));
					return raw;
				}
				if (this.responseType !== "" && this.responseType !== "text") return raw;
				return prunedText(this) ?? raw;
			}
		});
	}
	function trapGlobal(name) {
		const win = window;
		let current = win[name];
		if (current) reportPruned(pruneYoutubeAdsInPlace(current));
		try {
			Object.defineProperty(win, name, {
				configurable: true,
				get: () => current,
				set(value) {
					reportPruned(pruneYoutubeAdsInPlace(value));
					current = value;
				}
			});
		} catch {}
	}
	function pruneInlineGlobals() {
		const win = window;
		for (const key of ["ytInitialPlayerResponse", "ytInitialData"]) if (win[key]) reportPruned(pruneYoutubeAdsInPlace(win[key]));
	}
	var skipObserver = null;
	var skipDebounce = null;
	function scheduleSkipTry() {
		if (skipDebounce) return;
		skipDebounce = setTimeout(() => {
			skipDebounce = null;
			tryAutoSkipAd();
		}, 40);
	}
	function attachSkipObserver() {
		const player = document.querySelector("#movie_player");
		if (!player || skipObserver) return;
		skipObserver = new MutationObserver(() => scheduleSkipTry());
		skipObserver.observe(player, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: [
				"class",
				"aria-disabled",
				"style"
			]
		});
	}
	function startAutoSkip() {
		window.setInterval(() => {
			const player = document.querySelector("#movie_player");
			if (!player) return;
			if (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting") || Boolean(player.querySelector(".ytp-ad-player-overlay, .ytp-ad-module"))) tryAutoSkipAd();
		}, SKIP_POLL_MS);
		window.setInterval(attachSkipObserver, 2e3);
		document.addEventListener("yt-navigate-finish", () => {
			skipObserver?.disconnect();
			skipObserver = null;
			attachSkipObserver();
			tryAutoSkipAd();
		});
		attachSkipObserver();
	}
	var guarded = window;
	if (!guarded.__toolboxAdblockYtMain && window === window.top) {
		guarded.__toolboxAdblockYtMain = true;
		installPenaltyTimerBooster();
		installAbnormalityFilter();
		patchJsonParse();
		patchResponse();
		patchXhr();
		trapGlobal("ytInitialPlayerResponse");
		trapGlobal("ytInitialData");
		pruneInlineGlobals();
		startAutoSkip();
	}
	//#endregion
})();
