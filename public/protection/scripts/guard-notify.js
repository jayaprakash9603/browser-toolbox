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
	function userActivationActive() {
		const activation = navigator.userActivation;
		return activation ? activation.isActive : false;
	}
	//#endregion
	//#region src/chrome/content/protection/guard-notify.ts
	/**
	* Page world, top frame, document_start. Push-notification spam asks for permission the
	* moment a page loads; real sites ask after the user clicks something. Requests made without a
	* user gesture are answered "denied" without showing Chrome's prompt.
	*/
	function patchNotification() {
		const NotificationCtor = window.Notification;
		if (!NotificationCtor?.requestPermission) return;
		const native = NotificationCtor.requestPermission.bind(NotificationCtor);
		NotificationCtor.requestPermission = (callback) => {
			if (NotificationCtor.permission === "default" && !userActivationActive()) {
				signalIsolated("notification");
				callback?.("denied");
				return Promise.resolve("denied");
			}
			return native(callback);
		};
	}
	function patchPushSubscribe() {
		const proto = window.PushManager?.prototype;
		if (!proto?.subscribe) return;
		const native = proto.subscribe;
		proto.subscribe = function(options) {
			if (Notification.permission === "default" && !userActivationActive()) {
				signalIsolated("notification");
				return Promise.reject(new DOMException("Push subscription blocked", "NotAllowedError"));
			}
			return native.call(this, options);
		};
	}
	var guarded = window;
	if (!guarded.__toolboxNotifyGuard && window.top === window) {
		guarded.__toolboxNotifyGuard = true;
		patchNotification();
		patchPushSubscribe();
	}
	//#endregion
})();
