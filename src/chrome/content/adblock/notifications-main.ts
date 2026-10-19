type GuardedWindow = Window & { __toolboxNoNotify?: boolean }

function denyNotifications(): void {
  const NotificationCtor = window.Notification as typeof Notification | undefined
  if (NotificationCtor) {
    try {
      Object.defineProperty(NotificationCtor, 'permission', {
        configurable: true,
        get: () => 'denied' as NotificationPermission,
      })
      NotificationCtor.requestPermission = (callback?: NotificationPermissionCallback) => {
        callback?.('denied')
        return Promise.resolve('denied' as NotificationPermission)
      }
    } catch {
      /* locked by the page */
    }
  }

  const pushProto = (window as Window & { PushManager?: { prototype: PushManager } }).PushManager
    ?.prototype
  if (pushProto) {
    try {
      pushProto.subscribe = () =>
        Promise.reject(new DOMException('Push notifications are blocked', 'NotAllowedError'))
      pushProto.permissionState = () => Promise.resolve('denied' as PermissionState)
    } catch {
      /* locked by the page */
    }
  }

  const permissions = navigator.permissions as Permissions | undefined
  if (permissions?.query) {
    const query = permissions.query.bind(permissions)
    permissions.query = (descriptor: PermissionDescriptor) => {
      if (descriptor?.name === 'notifications' || (descriptor?.name as string) === 'push') {
        return Promise.resolve({
          name: descriptor.name,
          state: 'denied',
          onchange: null,
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent: () => false,
        } as unknown as PermissionStatus)
      }
      return query(descriptor)
    }
  }
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxNoNotify) {
  guarded.__toolboxNoNotify = true
  denyNotifications()
}
