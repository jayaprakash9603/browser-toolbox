(function() {
	//#region src/core/interceptor/constants.ts
	var INTERCEPTOR_PAGE_CONFIG_KEY = "interceptorPageConfig";
	var PAGE_MESSAGE_KEY = "__toolboxInterceptor";
	var PAGE_COMMAND_KEY = "__toolboxInterceptorCmd";
	//#endregion
	//#region src/chrome/content/interceptor/isolated.ts
	function loadConfig() {
		return [];
	}
	var config = loadConfig();
	var showToast = false;
	chrome.runtime.onMessage.addListener((message) => {
		if (message?.type === "INTERCEPTOR_CONFIG") {
			config = message.config;
			showToast = Boolean(message.showToast);
			window.postMessage({
				[PAGE_COMMAND_KEY]: "config",
				config,
				showToast
			}, window.location.origin || "*");
		}
	});
	chrome.storage.session.get(INTERCEPTOR_PAGE_CONFIG_KEY).then((session) => {
		const stored = session[INTERCEPTOR_PAGE_CONFIG_KEY];
		if (stored?.length) {
			config = stored;
			window.postMessage({
				[PAGE_COMMAND_KEY]: "config",
				config,
				showToast
			}, window.location.origin || "*");
		}
	});
	window.addEventListener("message", (event) => {
		if (event.source !== window) return;
		const data = event.data;
		if (!data || typeof data !== "object" || !data["__toolboxInterceptor"]) return;
		const payload = data[PAGE_MESSAGE_KEY];
		chrome.runtime.sendMessage({
			type: "INTERCEPTOR_PAGE_EVENT",
			event: payload
		});
	});
	//#endregion
})();
