import type { Messages } from './messages';

declare global {
  // Use type safe message keys with `next-intl`
  interface IntlMessages extends Messages {}
}
