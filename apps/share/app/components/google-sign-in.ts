const SOURCE = 'https://accounts.google.com/gsi/client';

type CredentialHandler = (credential: string) => void;

type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
    ux_mode?: 'popup' | 'redirect';
    use_fedcm_for_prompt?: boolean;
    itp_support?: boolean;
  }) => void;
  prompt: () => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'continue_with' | 'signin';
      ux_mode?: 'popup' | 'redirect';
    }
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let bootedFor: string | null = null;
let override: CredentialHandler | null = null;
let navFallback: CredentialHandler | null = null;

function dispatch(credential: string) {
  if (override) {
    override(credential);
    return;
  }
  navFallback?.(credential);
}

export function registerNavGoogle(handler: CredentialHandler) {
  navFallback = handler;
}

export function takeGoogleCredential(handler: CredentialHandler) {
  override = handler;
  return () => {
    if (override === handler) {
      override = null;
    }
  };
}

export function bootGoogleSignIn(clientId: string) {
  const google = window.google;
  if (!google || bootedFor === clientId) {
    return;
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      dispatch(response.credential);
    },
    auto_select: false,
    ux_mode: 'popup',
    use_fedcm_for_prompt: false,
    itp_support: true,
  });
  bootedFor = clientId;
}

export function loadGoogleScript(): Promise<void> {
  if (window.google) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => resolve();
    const prior = document.querySelector(`script[src="${SOURCE}"]`);
    if (prior) {
      prior.addEventListener('load', done);
      if (window.google) {
        resolve();
      }
      return;
    }
    const script = document.createElement('script');
    script.src = SOURCE;
    script.async = true;
    script.addEventListener('load', done);
    document.head.appendChild(script);
  });
}

export async function promptGoogleSignIn(clientId: string | undefined): Promise<void> {
  if (!window.google && clientId) {
    await loadGoogleScript();
  }
  if (!window.google) {
    throw new Error('Google sign-in is not available in this browser.');
  }
  bootGoogleSignIn(clientId || 'vizzy');
  window.google.accounts.id.prompt();
}
