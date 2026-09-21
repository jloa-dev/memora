/**
 * Memora - Audio completely disabled per user preference
 */

export const haptics = {
  enabled: false,
  init() {},
  toggle() { return false; },
  playTap() {},
  playChime() {},
  playSwitch() {}
};
