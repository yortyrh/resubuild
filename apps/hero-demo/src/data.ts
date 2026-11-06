/** The same sample CV as the landing page and the login screen (Ana Castillo). */
export const cv = {
  name: 'Ana Castillo',
  headline: 'Senior Product Engineer',
  file: 'ana-castillo-cv-2019-final(3).pdf',
  company: 'Northwind Logistics',
  place: 'Remote',
  role: 'Staff Engineer, Checkout',
  dates: '2021 – Present',
  earlier: {
    company: 'Fieldwork Studio',
    place: 'Porto',
    role: 'Full-Stack Developer',
    dates: '2017 – 2021',
    highlights: [
      'Shipped four client apps on a shared React and Node toolkit',
      'Introduced end-to-end tests that halved release rollbacks',
    ],
  },
  school: 'University of Porto',
  schoolDates: '2013 – 2017',
  highlights: [
    'Led a team of six through the payments platform migration',
    'Wrote the on-call guide used by four product teams',
  ],
  /** The bullet typed in the editor scene. */
  typed: 'Cut checkout latency by 40% by moving pricing to the edge',
};

export const job = {
  company: 'Orbital Freight',
  position: 'Senior Product Engineer',
  posting: [
    'Senior Product Engineer, Pricing',
    'Own the pricing engine behind our freight marketplace.',
    '5+ years with TypeScript, Postgres and low-latency APIs.',
  ],
  baseCv: 'Ana Castillo — Product Engineer',
  pdf: 'ana-castillo-orbital-freight.pdf',
};

/** Frames of the three scenes and the fade between them. */
export const timing = {
  fps: 30,
  fade: 10,
  importScene: 150,
  editScene: 150,
  tailorScene: 170,
};

export const totalFrames =
  timing.importScene + timing.editScene + timing.tailorScene - 2 * timing.fade;

export const steps = ['Import', 'Edit on the page', 'Tailor and export'] as const;
