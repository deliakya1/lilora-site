// Original HTML/CSS educational diagram; text stays selectable and reflows on phones.
export function sharedCareDiagram(lang){
 const tr=lang==='tr';
 const t=tr?{
 title:'İki kişi. Tek bakım kaydı.',people:['1. kişi','2. kişi'],record:'Ortak bitki kaydı',detail:'Adı · oda · fotoğraf',
 steps:['Son kaydı oku','Bitkiyi kontrol et','Yapılanı kaydet'],hints:['Kim, ne zaman, ne yaptı?','Harcı ve bitkinin durumunu gözlemle.','Gerçekte olanı seç; üç sonucu birbirine karıştırma.'],
 outcomes:[['Kontrol edildi','Su verilmedi.'],['Sulandı','Süzüldü; biriken su boşaltıldı.'],['Hatırlatma ertelendi','Kontrol hâlâ bekliyor.']],
 caption:'İki kişi aynı bitki kaydını kullanır: son kaydı okur, bitkiyi kontrol eder ve kontrolü, sulamayı ya da ertelenen hatırlatmayı ayrı kaydeder. Erteleme, kontrolün tamamlandığı anlamına gelmez. Özgün eğitim şeması; uygulama ekranı değildir.'
 }:{title:'Two people. One care record.',people:['Person one','Person two'],record:'One shared plant record',detail:'Name · room · photo',
 steps:['Read the latest record','Check the actual plant','Record what happened'],hints:['Who did what, and when?','Observe the mix and the plant’s condition.','Choose what actually happened; keep these outcomes distinct.'],
 outcomes:[['Checked','No water added.'],['Watered','Drained; collected runoff emptied.'],['Reminder postponed','Checking is still pending.']],
 caption:'Two people use one plant record: read the latest entry, check the plant, and separately record a check, watering, or postponed reminder. Postponement does not mean a check is complete. Original educational diagram, not an app screenshot.'};
 return `<figure class="shared-care-diagram" aria-labelledby="shared-care-title"><h2 id="shared-care-title">${t.title}</h2><div class="shared-care-people">${t.people.map(p=>`<div><span class="care-person" aria-hidden="true"></span><span>${p}</span></div>`).join('')}</div><div class="shared-care-record"><strong>${t.record}</strong><span>${t.detail}</span></div><ol class="shared-care-steps">${t.steps.map((step,i)=>`<li><span class="care-step-number" aria-hidden="true">${i+1}</span><div><h3>${step}</h3><p>${t.hints[i]}</p>${i===2?`<ul class="shared-care-outcomes">${t.outcomes.map(([title,detail],j)=>`<li class="${j===2?'care-pending':'care-completed'}"><strong>${title}</strong><span>${detail}</span></li>`).join('')}</ul>`:''}</div></li>`).join('')}</ol><figcaption>${t.caption}</figcaption></figure>`;
}
