export const accounts = [
  {id:'AP-2041',name:'Nord / Search',geo:'Германия',owner:'Марк',status:'В работе',spend:4280,revenue:7210,score:96},
  {id:'AP-2042',name:'Atlas / Performance',geo:'Польша',owner:'Алина',status:'Готов',spend:3150,revenue:5480,score:92},
  {id:'AP-2043',name:'Nova / Discovery',geo:'Испания',owner:'Марк',status:'Прогрев',spend:1680,revenue:2630,score:78},
  {id:'AP-2044',name:'Bloom / Search',geo:'Франция',owner:'Даша',status:'В работе',spend:3920,revenue:6540,score:94},
  {id:'AP-2045',name:'Orbit / Shopping',geo:'Италия',owner:'Алина',status:'Проверка',spend:920,revenue:1140,score:64},
  {id:'AP-2046',name:'Pulse / Video',geo:'Германия',owner:'Даша',status:'Готов',spend:2450,revenue:4120,score:89}
];
export const sections = {overview:'Обзор',farming:'Фарм-отдел',buying:'Медиабаинг',finance:'Финансы',ai:'AI-аналитика'};
export function totals(rows, factor=1) {const spend=Math.round(rows.reduce((s,r)=>s+r.spend,0)*factor);const revenue=Math.round(rows.reduce((s,r)=>s+r.revenue,0)*factor);return {spend,revenue,profit:revenue-spend,roi:spend?Math.round((revenue-spend)/spend*100):0};}
export function filterAccounts(query='',status='Все статусы') {return accounts.filter(r=>(status==='Все статусы'||r.status===status)&&`${r.id} ${r.name} ${r.geo} ${r.owner}`.toLowerCase().includes(query.toLowerCase()));}
