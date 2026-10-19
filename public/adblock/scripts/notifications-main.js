(function() {
	//#region src/chrome/content/adblock/notifications-main.ts
	function denyNotifications() {
		const NotificationCtor = window.Notification;
		if (NotificationCtor) try {
			Object.defineProperty(NotificationCtor, "permission", {
				configurable: true,
				get: () => "denied"
			});
			NotificationCtor.requestPermission = (callback) => {
				callback?.("denied");
				return Promise.resolve("denied");
			};
		} catch {}
		const pushProto = window.PushManager?.prototype;
		if (pushProto) try {
			pushProto.subscribe = () => Promise.reject(new DOMException("Push notifications are blocked", "NotAllowedError"));
			pushProto.permissionState = () => Promise.resolve("denied");
		} catch {}
		const permissions = navigator.permissions;
		if (permissions?.query) {
			const query = permissions.query.bind(permissions);
			permissions.query = (descriptor) => {
				if (descriptor?.name === "notifications" || descriptor?.name === "push") return Promise.resolve({
					name: descriptor.name,
					state: "denied",
					onchange: null,
					addEventListener() {},
					removeEventListener() {},
					dispatchEvent: () => false
				});
				return query(descriptor);
			};
		}
	}
	var guarded = window;
	if (!guarded.__toolboxNoNotify) {
		guarded.__toolboxNoNotify = true;
		denyNotifications();
	}
	//#endregion
})();
