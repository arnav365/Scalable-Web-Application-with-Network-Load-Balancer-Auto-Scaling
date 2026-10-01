/**
 * EC2 instance slots shown on the server tiles.
 *
 * These are DEMO values describing the intended configuration. No instance
 * IDs or IP addresses are invented: those fields stay empty until real data
 * arrives from a deployed instance's /instance.json (see user-data.sh).
 */
export const INSTANCE_SLOTS = [
  { slot: 'EC2-01', az: 'AZ-1', subnet: '10.0.1.0/24', state: 'healthy', role: 'Baseline' },
  { slot: 'EC2-02', az: 'AZ-2', subnet: '10.0.2.0/24', state: 'healthy', role: 'Baseline' },
  { slot: 'EC2-03', az: 'AZ-1', subnet: '10.0.1.0/24', state: 'standby', role: 'Scale-out' },
  { slot: 'EC2-04', az: 'AZ-2', subnet: '10.0.2.0/24', state: 'standby', role: 'Scale-out' },
];

export const INSTANCE_DEFAULTS = {
  os: 'Ubuntu 24.04 LTS',
  webServer: 'Apache2',
  port: '80',
  type: 't3.micro',
};

/** Path each instance serves its own identity on (written by user data). */
export const LIVE_ENDPOINT = 'instance.json';
