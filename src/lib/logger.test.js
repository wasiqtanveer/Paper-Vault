import { describe, it, expect, vi, afterEach } from 'vitest';
import { reportError, reportWarning, setErrorReporter, installGlobalErrorHandlers } from './logger';

afterEach(() => { setErrorReporter(null); vi.restoreAllMocks(); });

describe('logger', () => {
  it('writes errors to the console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError('boom', { a: 1 });
    expect(spy).toHaveBeenCalledWith('boom', { a: 1 });
  });

  it('writes warnings to the console', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportWarning('careful');
    expect(spy).toHaveBeenCalledWith('careful');
  });

  it('forwards errors to a registered reporter', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reporter = vi.fn();
    setErrorReporter(reporter);
    const err = new Error('x');
    reportError(err, { where: 'test' });
    expect(reporter).toHaveBeenCalledWith(err, [{ where: 'test' }]);
  });

  it('survives a reporter that throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setErrorReporter(() => { throw new Error('reporter down'); });
    expect(() => reportError('still fine')).not.toThrow();
  });

  it('reports uncaught errors and unhandled rejections until removed', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reporter = vi.fn();
    setErrorReporter(reporter);
    const target = new EventTarget();
    const remove = installGlobalErrorHandlers(target);

    const e = new Event('error'); e.error = new Error('uncaught');
    target.dispatchEvent(e);
    const r = new Event('unhandledrejection'); r.reason = new Error('rejected');
    target.dispatchEvent(r);
    expect(reporter).toHaveBeenCalledTimes(2);

    remove();
    target.dispatchEvent(new Event('error'));
    expect(reporter).toHaveBeenCalledTimes(2);
  });
});
