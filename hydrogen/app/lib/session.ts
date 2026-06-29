import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from "@shopify/remix-oxygen";

/**
 * Hydrogen session wrapper with a `isPending` flag so we only `Set-Cookie`
 * when something actually changed during the request.
 */
export class AppSession {
  public isPending = false;

  constructor(
    private sessionStorage: SessionStorage,
    private session: Session
  ) {}

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: "session",
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets,
      },
    });
    const session = await storage.getSession(request.headers.get("Cookie"));
    return new this(storage, session);
  }

  get has() {
    return this.session.has.bind(this.session);
  }
  get get() {
    return this.session.get.bind(this.session);
  }
  get flash() {
    this.isPending = true;
    return this.session.flash.bind(this.session);
  }
  get unset() {
    this.isPending = true;
    return this.session.unset.bind(this.session);
  }
  set(key: string, value: unknown) {
    this.isPending = true;
    this.session.set(key, value);
  }
  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }
  commit() {
    this.isPending = false;
    return this.sessionStorage.commitSession(this.session);
  }
}
