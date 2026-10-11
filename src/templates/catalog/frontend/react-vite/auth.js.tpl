let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAuthSession(session) {
  accessToken = session.accessToken;
}

export function clearAuthSession() {
  accessToken = null;
}
