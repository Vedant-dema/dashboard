/** DOM ids for in-drawer scroll navigation (`#${id}` anchors). */
export const CONTACT_DRAWER_SECTION_IDS = {
  contact: 'timetable-contact-section-contact',
  location: 'timetable-contact-section-location',
  people: 'timetable-contact-section-people',
  history: 'timetable-contact-section-history',
  vehicle: 'timetable-contact-section-vehicle',
  activity: 'timetable-contact-section-activity',
} as const

export type ContactDrawerSectionId = (typeof CONTACT_DRAWER_SECTION_IDS)[keyof typeof CONTACT_DRAWER_SECTION_IDS]
