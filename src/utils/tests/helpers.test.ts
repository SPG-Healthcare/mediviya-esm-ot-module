import { handleFreeze } from '../helpers';

describe('handleFreeze', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-26T10:30:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false when the date is invalid', () => {
    expect(handleFreeze('not-a-date', 7)).toBe(false);
  });

  it('returns true when the date is in the past', () => {
    expect(handleFreeze('2026-05-25T12:00:00', 7)).toBe(true);
  });

  it('returns true when the date is today', () => {
    expect(handleFreeze('2026-05-26T23:59:59', 7)).toBe(true);
  });

  it('returns true when the date is within the freeze period', () => {
    expect(handleFreeze('2026-06-02T23:59:59', 7)).toBe(true);
  });

  it('returns false when the date is after the freeze period', () => {
    expect(handleFreeze('2026-06-03T00:00:00', 7)).toBe(false);
  });
});
