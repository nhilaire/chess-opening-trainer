import meta from '../../factory-app.json';
import pkg from '../../package.json';

function loads(modulePath: string): boolean {
  try {
    jest.requireActual(modulePath);
    return true;
  } catch {
    return false;
  }
}

// AC-35: firebase "none" means no analytics code at all; the APK manifest check (AD_ID) is done on the device build.
describe('privacy (firebase none)', () => {
  it('has no Firebase or analytics dependency', () => {
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(meta.firebase).toBe('none');
    expect(deps.filter((d) => /firebase|analytics|crashlytics|sentry|amplitude|mixpanel/i.test(d))).toEqual([]);
  });

  it('has no telemetry module and no Firebase plugin', () => {
    expect(loads('../telemetry/telemetry')).toBe(false);
    expect(JSON.stringify(require('../../app.json'))).not.toMatch(/firebase/i);
  });

  it('blocks the advertising ID permission', () => {
    const config = require('../../app.config.js')({ config: {} });
    expect(config.android.blockedPermissions).toContain('com.google.android.gms.permission.AD_ID');
  });
});
