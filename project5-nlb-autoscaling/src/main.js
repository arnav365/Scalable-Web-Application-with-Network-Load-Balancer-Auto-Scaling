/**
 * Network Flow Lab — entry point.
 * Each module is initialised independently so one failure never blanks the page.
 */
import { initMotionToggle } from './animations/motion.js';
import { initReveal } from './animations/reveal.js';
import { hydrateIcons } from './components/icons.js';
import { initNav } from './components/nav.js';
import { initStatus } from './sections/status.js';
import { initHero } from './sections/hero.js';
import { initTopology } from './sections/topology.js';
import { initInstances } from './sections/instances.js';
import { initDistribution } from './sections/distribution.js';
import { initAutoScaling } from './sections/autoscaling.js';
import { initBlueprint } from './sections/blueprint.js';
import { initDeployment } from './sections/deployment.js';
import { initValidation } from './sections/validation.js';

const modules = {
  initMotionToggle,
  hydrateIcons,
  initNav,
  initStatus,
  initHero,
  initTopology,
  initInstances,
  initDistribution,
  initAutoScaling,
  initBlueprint,
  initDeployment,
  initValidation,
  initReveal,
};

for (const [name, init] of Object.entries(modules)) {
  try {
    init();
  } catch (err) {
    console.error(`[flow-lab] ${name} failed`, err);
  }
}
