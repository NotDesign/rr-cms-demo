export const DEMO_INTEGRATOR_ID = 'INT-DEMO';

export const organizationSections = [
  ['integrators', '遊戲集成商'],
  ['wrappers', '包網商'],
  ['sites', '現金網'],
  ['agents-1', '第一層代理'],
  ['agents-2', '第二層代理']
];

const parentLevels = {
  '遊戲集成商': '遊戲商',
  '包網商': '遊戲集成商',
  '現金網': '包網商',
  '第一層代理': '現金網',
  '第二層代理': '第一層代理'
};

export function organizationParents(organizations, level) {
  if(level==='現金網')return organizations.filter(org=>['包網商','遊戲集成商','遊戲商'].includes(org.level));
  const expected = parentLevels[level];
  if (!expected) return [];
  if (level === '包網商' && !organizations.some(org => org.level === expected)) {
    return organizations.filter(org => org.level === '遊戲商');
  }
  return organizations.filter(org => org.level === expected);
}

export function recordOrganizationId(record) {
  return record.agent2Id || record.agent1Id || record.cashId;
}

// The browser demo assigns synthetic agent relationships without importing client data.
export function withDemoOrganizationHierarchy(data) {
  const supplier = data.organizations.find(org => org.level === '遊戲商');
  if (!supplier || data.organizations.some(org => org.id === DEMO_INTEGRATOR_ID)) return data;

  const integrator = {
    id: DEMO_INTEGRATOR_ID, parent: supplier.id, level: '遊戲集成商', name: '示例遊戲集成商'
  };
  const organizations = [...data.organizations.map(org => (
    org.level === '包網商' && org.parent === supplier.id ? {...org, parent: integrator.id} : org
  )), integrator];

  for (const site of data.organizations.filter(org => org.level === '現金網')) {
    const agent1Id = 'AG1-' + site.id;
    organizations.push({id: agent1Id, parent: site.id, level: '第一層代理', name: site.id + ' · 示範代理'});
    for (const group of [1, 2]) {
      organizations.push({
        id: 'AG2-' + site.id + '-' + group, parent: agent1Id, level: '第二層代理',
        name: site.id + ' · 代理 ' + group
      });
    }
  }

  const records = data.records.map(record => {
    const player = String(record.player_id || record.player);
    const group = Array.from(player).reduce((sum, char) => sum + char.codePointAt(0), 0) % 2 + 1;
    return {...record, integratorId: integrator.id, agent1Id: 'AG1-' + record.cashId,
      agent2Id: 'AG2-' + record.cashId + '-' + group};
  });
  return {...data, organizations, records};
}

// A cash network may connect without a wrapper; never label its integrator as one.
export function cashWrapper(organizations,site){
 const node=typeof site==='string'?organizations.find(o=>o.id===site):site;
 const parent=organizations.find(o=>o.id===node?.parent);return parent?.level==='包網商'?parent:null;
}
export function cashWrapperName(organizations,site){return cashWrapper(organizations,site)?.name||'無包網商';}
