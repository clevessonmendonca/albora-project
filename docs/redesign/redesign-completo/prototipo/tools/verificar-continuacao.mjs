import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(base, 'evidencias');
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({channel:'chrome', headless:true});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const report = {date:new Date().toISOString(), checks:[], screens:[], errors};
const origin = process.env.PROTOTYPE_URL || 'http://127.0.0.1:5180';
async function go(route, phase='durante', state='ok', theme='light') {
  await page.evaluate(({route,phase,state,theme})=>{A.store.set('phase',phase);A.store.set('state',state);A.store.set('theme',theme);A.applyTheme(); location.hash=route; A.render();}, {route,phase,state,theme});
  await page.waitForTimeout(400);
}
try {
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  const routes = [
    ['fotos','#/h/e/e1/fotos','durante'],['hoje','#/h/e/e1/hoje','antes'],
    ['equipe','#/f/v1/equipe','durante'],['clientes','#/f/v1/equipe?aba=clientes','durante'],
    ['ajustes','#/f/v1/ajustes','durante'],['consentimento','#/g/marina-rafael?passo=nome','durante']
  ];
  for (const [width,height] of [[320,740],[390,844],[768,1024],[1440,1000],[844,390],[640,360]]) {
    await page.setViewportSize({width,height});
    for (const [name,route,phase] of routes) {
      await go(route,phase);
      await page.addScriptTag({path:path.join(base,'tools/audit.js')});
      const result = await page.evaluate(()=>AUDIT.run());
      report.screens.push({...result,height,name});
      if ([390,1440,844].includes(width)) await page.screenshot({path:path.join(out,`${name}-depois-${width}.png`),fullPage:width===1440});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await go('#/h/e/e1/fotos');
  assert.equal(await page.locator('.hv-disclosure').getAttribute('open'),null);
  await page.locator('.hv-disclosure summary').focus(); await page.keyboard.press('Enter');
  await page.locator('#hv-q').fill('zzzz-sem-pessoa');
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
  assert.ok(await page.locator('.hv-tile').count()>0);
  await page.locator('[data-act="hv-f"][data-f="revisar"]').click();
  assert.ok(await page.locator('.hv-tile').count()>0);
  report.checks.push('Fotos: divulgação por teclado, busca sem resultado, limpar e revisar');
  await go('#/f/v1/equipe');
  await page.locator('[data-input="vd-person-search"]').fill('Rogerio');
  assert.equal(await page.locator('[data-vd-people] .li:visible').count(),1);
  await page.locator('[data-input="vd-person-search"]').fill('ninguém encontrado');
  assert.ok(await page.locator('[data-vd-no-results]').isVisible());
  await page.getByRole('button',{name:'Limpar busca',exact:true}).click();
  await page.locator('[data-change="vd-person-sort"]').selectOption('desc');
  report.checks.push('Equipe: busca sem acento, vazio recuperável, limpar e ordenar');
  await go('#/f/v1/ajustes');
  await page.locator('input[name="nome"]').fill('Aurora — rascunho');
  await go('#/f/v1/equipe'); await go('#/f/v1/ajustes');
  assert.equal(await page.locator('input[name="nome"]').inputValue(),'Aurora — rascunho');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  assert.equal(await page.locator('input[name="nome"]').inputValue(),'Aurora — rascunho');
  await page.locator('input[name="nome"]').fill('Descartar este nome');
  await page.getByRole('button',{name:'Descartar alterações',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Descartar alterações',exact:true}).click();
  assert.equal(await page.locator('input[name="nome"]').inputValue(),'Aurora — rascunho');
  await page.locator('[data-section="vd-packages"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'vd-packages');
  report.checks.push('Ajustes: rascunho entre rotas, salvar, descartar com confirmação e foco nas seções');
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('negado')}}});const button=document.createElement('button');button.dataset.text='https://albora.app/e/exemplo';A.acts.copy(button)});
  const dialog=page.getByRole('dialog',{name:'Copie o link',exact:true});
  await dialog.waitFor();assert.equal(await dialog.locator('input').inputValue(),'https://albora.app/e/exemplo');
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
  report.checks.push('Clipboard negado: alternativa selecionável, fechamento por Escape');
  for (const state of ['loading','empty','error']) {
    await go('#/h/e/e1/fotos','durante',state);
    assert.ok(await page.locator(state==='loading'?'.skeleton':'.empty').count()>0);
  }
  report.checks.push('Fotos: estados carregando, vazio e erro');
  await go('#/g/marina-rafael?passo=nome');
  assert.equal(await page.locator('input[name="consent"]').isChecked(),false);
  await page.locator('[data-act="g-termo"]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.act),'g-termo');
  report.checks.push('Consentimento: sem pré-seleção, termo acessível, foco retorna ao fechar');
  for(const [name,route,phase] of routes){await go(route,phase,'ok','dark');await page.addScriptTag({path:path.join(base,'tools/audit.js')});report.screens.push({...await page.evaluate(()=>AUDIT.run()),height:844,name,theme:'dark'});}
  assert.equal(report.screens.filter(x=>x.overflowX||x.contrast.length||x.tinyTargets.length).length,0,'Falha de contraste, overflow ou alvo pequeno');
  assert.equal(errors.length,0,errors.join('\n'));
} catch(e) { report.failure=e.stack; process.exitCode=1; }
finally {await fs.writeFile(path.join(out,'validacao-continuacao.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify({checks:report.checks,screens:report.screens.length,issues:report.screens.filter(x=>x.overflowX||x.contrast.length||x.tinyTargets.length).map(x=>({name:x.name,vw:x.vw,height:x.height,overflow:x.overflowX,contrast:x.contrast,tiny:x.tinyTargets})),errors,failure:report.failure},null,2));await browser.close();}
