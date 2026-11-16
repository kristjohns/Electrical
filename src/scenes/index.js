// Scene order = video order
const { api } = require('../timeline');
const files = ['00_intro', '01_basics', '02_generation', '03_generator', '04_transmission', '05_balance', '06_distribution', '07_systems', '08_home', '09_breaker', '10_rcd', '11_circuits', '12_loads', '13_day', '14_safety', '15_recap'];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const f of files) {
  if (only && !only.some(o => f.includes(o))) continue;
  let mod;
  try { mod = require('./' + f); } catch (e) { if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(f)) continue; throw e; }
  mod(api);
}
