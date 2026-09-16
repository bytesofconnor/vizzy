export const ADMIN_VIEWS = ['meter', 'eval', 'log'] as const;
export type AdminView = (typeof ADMIN_VIEWS)[number];

export function parseAdminView(value: string | undefined): AdminView {
  return ADMIN_VIEWS.includes(value as AdminView) ? (value as AdminView) : 'meter';
}
