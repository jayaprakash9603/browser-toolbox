(function() {
	//#region src/chrome/content/adblock/scriptlets/jsonPrune.ts
	var YT_AD_KEYS = [
		"adPlacements",
		"adSlots",
		"playerAds",
		"adBreakHeartbeatParams"
	];
	var NESTED_KEYS = [
		"playerResponse",
		"playerConfig",
		"response"
	];
	var MAX_DEPTH = 4;
	function isRecord(value) {
		return Boolean(value) && typeof value === "object";
	}
	function stripAdKeys(record) {
		let removed = 0;
		for (const key of YT_AD_KEYS) if (key in record) {
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
		if (YT_AD_KEYS.some((key) => key in data)) return true;
		return isRecord(data.playerResponse) && YT_AD_KEYS.some((key) => key in data.playerResponse);
	}
	function pruneYoutubeResponseText(text) {
		if (!/"(adPlacements|adSlots|playerAds|enforcementMessageViewModel)"/.test(text)) return {
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
	//#region src/chrome/content/adblock/youtube/main.ts
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
	var guarded = window;
	if (!guarded.__toolboxYtMain) {
		guarded.__toolboxYtMain = true;
		patchJsonParse();
		patchResponse();
		patchXhr();
		trapGlobal("ytInitialPlayerResponse");
	}
	//#endregion
})();
