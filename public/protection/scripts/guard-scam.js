(function() {
	//#endregion
	//#region src/core/protection/constants.ts
	/** Message key the page-world guards use to talk to the isolated protection script. */
	var PAGE_MESSAGE_KEY = "__toolboxProtection";
	//#endregion
	//#region src/chrome/content/protection/pageBridge.ts
	/** Page-world guards cannot reach chrome.*; the isolated protection script relays this. */
	function signalIsolated(kind) {
		try {
			window.postMessage({ [PAGE_MESSAGE_KEY]: kind }, window.location.origin || "*");
		} catch {}
	}
	function onIsolatedCommand(command, handler) {
		window.addEventListener("message", (event) => {
			if (event.source !== window) return;
			const data = event.data;
			if (data && typeof data === "object" && data["__toolboxProtectionCmd"] === command) handler();
		});
	}
	function userActivationActive() {
		const activation = navigator.userActivation;
		return activation ? activation.isActive : false;
	}
	//#endregion
	//#region src/chrome/content/protection/guard-scam.ts
	/**
	* Page world, top frame, document_start. Breaks the tricks tech-support scam pages use to
	* "lock" the browser: endless alert/confirm loops, forced fullscreen fake error screens,
	* keyboard lock, back-button traps via history flooding, and "Leave site?" prompts.
	*
	* Normal pages are untouched until enough of these show up together; then the page is put in
	* lockdown and every trick is neutralised at once.
	*/
	var DIALOG_WINDOW_MS = 15e3;
	var DIALOG_FLOOD = 3;
	var HISTORY_WINDOW_MS = 3e3;
	var HISTORY_FLOOD = 15;
	var LOCKDOWN_SCORE = 3;
	var score = 0;
	var locked = false;
	var dialogTimes = [];
	var historyTimes = [];
	var unloadHandlers = [];
	function recent(times, windowMs) {
		const cutoff = Date.now() - windowMs;
		while (times.length && times[0] < cutoff) times.shift();
		return times.length;
	}
	function addScore(points) {
		score += points;
		if (!locked && score >= LOCKDOWN_SCORE) lockdown();
	}
	function lockdown() {
		if (locked) return;
		locked = true;
		try {
			if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		} catch {}
		try {
			navigator.keyboard?.unlock();
		} catch {}
		try {
			document.exitPointerLock?.();
		} catch {}
		for (const handler of unloadHandlers) window.removeEventListener("beforeunload", handler);
		window.onbeforeunload = null;
		signalIsolated("lockdown");
	}
	function patchDialogs() {
		const nativeAlert = window.alert.bind(window);
		const nativeConfirm = window.confirm.bind(window);
		const nativePrompt = window.prompt.bind(window);
		const gate = () => {
			dialogTimes.push(Date.now());
			if (recent(dialogTimes, DIALOG_WINDOW_MS) >= DIALOG_FLOOD) addScore(LOCKDOWN_SCORE);
			return !locked;
		};
		window.alert = (message) => {
			if (gate()) nativeAlert(message);
		};
		window.confirm = (message) => gate() ? nativeConfirm(message) : false;
		window.prompt = (message, defaultValue) => gate() ? nativePrompt(message, defaultValue) : null;
	}
	function patchFullscreen() {
		const proto = Element.prototype;
		const native = proto.requestFullscreen;
		if (!native) return;
		proto.requestFullscreen = function(options) {
			if (locked || !userActivationActive()) {
				addScore(1);
				return Promise.reject(new DOMException("Fullscreen blocked", "NotAllowedError"));
			}
			return native.call(this, options);
		};
		if (proto.webkitRequestFullscreen) proto.webkitRequestFullscreen = proto.requestFullscreen;
	}
	function patchKeyboardLock() {
		const keyboard = navigator.keyboard;
		if (!keyboard?.lock) return;
		const native = keyboard.lock.bind(keyboard);
		keyboard.lock = (keys) => {
			addScore(2);
			if (locked) return Promise.reject(new DOMException("Keyboard lock blocked", "NotAllowedError"));
			return native(keys);
		};
	}
	function patchHistory() {
		const nativePush = history.pushState.bind(history);
		history.pushState = (data, unused, url) => {
			historyTimes.push(Date.now());
			if (recent(historyTimes, HISTORY_WINDOW_MS) >= HISTORY_FLOOD) {
				addScore(LOCKDOWN_SCORE);
				return;
			}
			if (locked) return;
			nativePush(data, unused, url);
		};
	}
	function patchBeforeUnload() {
		const nativeAdd = window.addEventListener.bind(window);
		window.addEventListener = function(type, listener, options) {
			if (!listener) return;
			if (type === "beforeunload") {
				if (locked) return;
				unloadHandlers.push(listener);
			}
			nativeAdd(type, listener, options);
		};
	}
	var guarded = window;
	if (!guarded.__toolboxScamGuard && window.top === window) {
		guarded.__toolboxScamGuard = true;
		patchDialogs();
		patchFullscreen();
		patchKeyboardLock();
		patchHistory();
		patchBeforeUnload();
		onIsolatedCommand("lockdown", lockdown);
	}
	//#endregion
})();
