/**
 * Page world, top frame, document_start. Push-notification spam asks for permission the
 * moment a page loads; real sites ask after the user clicks something. Requests made without a
 * user gesture are answered "denied" without showing Chrome's prompt.
 */
import { signalIsolated, userActivationActive } from './pageBridge'

type GuardedWindow = Window & { __toolboxNotifyGuard?: boolean }

function patchNotification(): void {
  const NotificationCtor = window.Notification as typeof Notification | undefined
  if (!NotificationCtor?.requestPermission) return
  const native = NotificationCtor.requestPermission.bind(NotificationCtor)
  NotificationCtor.requestPermission = (callback?: NotificationPermissionCallback) => {
    if (NotificationCtor.permission === 'default' && !userActivationActive()) {
      signalIsolated('notification')
      callback?.('denied')
      return Promise.resolve('denied' as NotificationPermission)
    }
    return native(callback)
  }
}

function patchPushSubscribe(): void {
  const proto = (window as Window & { PushManager?: { prototype: PushManager } }).PushManager
    ?.prototype
  if (!proto?.subscribe) return
  const native = proto.subscribe
  proto.subscribe = function (this: PushManager, options?: PushSubscriptionOptionsInit) {
    if (Notification.permission === 'default' && !userActivationActive()) {
      signalIsolated('notification')
      return Promise.reject(new DOMException('Push subscription blocked', 'NotAllowedError'))
    }
    return native.call(this, options)
  }
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxNotifyGuard && window.top === window) {
  guarded.__toolboxNotifyGuard = true
  patchNotification()
  patchPushSubscribe()
}
