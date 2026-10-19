(function() {
	//#region src/chrome/content/adblock/popups-main.ts
	var MESSAGE_KEY = "__toolboxAdblock";
	var CLICK_WINDOW_MS = 1200;
	var GESTURE_MERGE_MS = 700;
	var OVERLAY_COVERAGE = .6;
	/** Sign-in and payment pop-ups legitimately open outside a user gesture (after an async token fetch). */
	var TRUSTED_POPUP_HOSTS = /(^|\.)(accounts\.google\.com|appleid\.apple\.com|login\.microsoftonline\.com|login\.live\.com|facebook\.com|api\.twitter\.com|twitter\.com|x\.com|github\.com|discord\.com|linkedin\.com|paypal\.com|stripe\.com|auth0\.com|okta\.com|firebaseapp\.com|slack\.com|zoom\.us|spotify\.com|reddit\.com)$/;
	var CONTROL_SELECTOR = "a[href],button,input,select,textarea,summary,label,[role=\"button\"],[role=\"link\"],[role=\"menuitem\"],[role=\"tab\"]";
	var lastClick = {
		target: null,
		time: 0,
		consumed: true
	};
	function report() {
		try {
			window.postMessage({ [MESSAGE_KEY]: "popup-blocked" }, window.location.origin || "*");
		} catch {}
	}
	function viewportCoverage(rect) {
		const width = Math.max(window.innerWidth, 1);
		const height = Math.max(window.innerHeight, 1);
		const w = Math.min(rect.right, width) - Math.max(rect.left, 0);
		const h = Math.min(rect.bottom, height) - Math.max(rect.top, 0);
		if (w <= 0 || h <= 0) return 0;
		return w * h / (width * height);
	}
	/** A big, invisible, clickable layer on top of the page: the classic "click anywhere" ad trap. */
	function isHijackOverlay(el) {
		if (el === document.documentElement || el === document.body) return false;
		let style;
		try {
			style = getComputedStyle(el);
		} catch {
			return false;
		}
		if (style.position !== "fixed" && style.position !== "absolute") return false;
		if (viewportCoverage(el.getBoundingClientRect()) < OVERLAY_COVERAGE) return false;
		if (el.querySelector("img,video,canvas,svg,input,button,form,p,h1,h2,h3")) return false;
		if ((el.textContent ?? "").trim().length > 40) return false;
		return true;
	}
	/** True when the click landed on something a person would actually click to open a link. */
	function isRealControl(el) {
		if (!el || el === document.documentElement || el === document.body) return false;
		const control = el.closest(CONTROL_SELECTOR);
		if (control) return !isHijackOverlay(control);
		if (isHijackOverlay(el)) return false;
		try {
			return getComputedStyle(el).cursor === "pointer";
		} catch {
			return false;
		}
	}
	function recordClick(event) {
		if (!event.isTrusted) return;
		const target = event.target instanceof Element ? event.target : null;
		const now = Date.now();
		if (target === lastClick.target && now - lastClick.time < GESTURE_MERGE_MS) {
			lastClick.time = now;
			return;
		}
		lastClick = {
			target,
			time: now,
			consumed: false
		};
	}
	function resolveUrl(url) {
		if (url === void 0 || url === null || url === "") return null;
		try {
			return new URL(String(url), location.href);
		} catch {
			return null;
		}
	}
	function isTrustedPopupUrl(url) {
		return !!url && TRUSTED_POPUP_HOSTS.test(url.hostname);
	}
	function userActivationActive() {
		const activation = navigator.userActivation;
		return activation ? activation.isActive : true;
	}
	/** Decides whether a new window may open right now, consuming the click if so. */
	function allowNewWindow(url) {
		if (isTrustedPopupUrl(url)) return true;
		if (!lastClick.consumed && Date.now() - lastClick.time <= CLICK_WINDOW_MS && userActivationActive() && isRealControl(lastClick.target)) {
			lastClick.consumed = true;
			return true;
		}
		return false;
	}
	function stubWindow() {
		const noop = () => void 0;
		return {
			closed: false,
			opener: null,
			name: "",
			location: {
				href: "about:blank",
				assign: noop,
				replace: noop,
				reload: noop,
				toString: () => "about:blank"
			},
			document: {
				write: noop,
				writeln: noop,
				open: noop,
				close: noop,
				body: null,
				head: null
			},
			focus: noop,
			blur: noop,
			close: noop,
			postMessage: noop,
			addEventListener: noop,
			removeEventListener: noop
		};
	}
	function patchWindowOpen() {
		const nativeOpen = window.open;
		const guardedOpen = function(url, target, features) {
			if (allowNewWindow(resolveUrl(url))) return nativeOpen.call(window, url, target, features);
			report();
			return stubWindow();
		};
		try {
			Object.defineProperty(window, "open", {
				configurable: true,
				get: () => guardedOpen,
				set: () => void 0
			});
		} catch {
			window.open = guardedOpen;
		}
	}
	function opensNewContext(anchor) {
		const target = (anchor.getAttribute("target") ?? "").toLowerCase();
		return target !== "" && target !== "_self" && target !== "_top" && target !== "_parent";
	}
	function isFileLike(anchor) {
		return anchor.hasAttribute("download") || /^(blob|data):/i.test(anchor.href);
	}
	function isInvisible(anchor) {
		if (!anchor.isConnected) return true;
		const rect = anchor.getBoundingClientRect();
		if (rect.width < 2 || rect.height < 2) return true;
		return getComputedStyle(anchor).visibility === "hidden";
	}
	/** Ad scripts build a hidden `<a target=_blank>` and call `.click()` on it. */
	function patchAnchorClick() {
		const nativeClick = HTMLAnchorElement.prototype.click;
		HTMLAnchorElement.prototype.click = function() {
			if (opensNewContext(this) && !isFileLike(this) && isInvisible(this) && !allowNewWindow(resolveUrl(this.href))) {
				report();
				return;
			}
			nativeClick.call(this);
		};
	}
	/** Swallows clicks on transparent full-page links and removes the trap so the page works again. */
	function onCaptureClick(event) {
		if (!event.isTrusted) return;
		const path = event.composedPath();
		for (const node of path) {
			if (!(node instanceof Element)) continue;
			if (node === document.body || node === document.documentElement) break;
			if (!isHijackOverlay(node)) continue;
			if (!(node.matches("a[href]") || node.hasAttribute("onclick") || getComputedStyle(node).cursor === "pointer")) continue;
			event.preventDefault();
			event.stopImmediatePropagation();
			node.style.setProperty("display", "none", "important");
			report();
			return;
		}
	}
	function install() {
		patchWindowOpen();
		patchAnchorClick();
		for (const type of [
			"pointerdown",
			"mousedown",
			"touchstart",
			"click"
		]) window.addEventListener(type, recordClick, true);
		window.addEventListener("click", onCaptureClick, true);
	}
	var guarded = window;
	if (!guarded.__toolboxPopups) {
		guarded.__toolboxPopups = true;
		install();
	}
	//#endregion
})();
