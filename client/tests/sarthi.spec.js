import { test, expect } from '@playwright/test';

async function openAssistant(page) {
  await page.goto('/login');await page.getByLabel('Email address').fill('demo@submitsafe.in');await page.getByLabel('Password',{exact:true}).fill('Demo@123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);
  await page.goto('/loans/home');await page.getByRole('button',{name:'SUBMIT SARTHI',exact:true}).click();
  const panel=page.getByRole('complementary',{name:'SUBMIT SARTHI'});await expect(panel.getByRole('button',{name:'Ask Submit Sarthi',exact:true})).toBeVisible();
  await expect(panel.getByLabel('Ask about this application')).toBeEnabled();return panel;
}
test('voice transcript, language, stop and denied permission preserve typed free-form questions',async({page})=>{
  await page.addInitScript(()=>{
    window.__speechInstances=[];
    window.SpeechRecognition=class {
      constructor(){window.__speechInstances.push(this);}
      start(){this.started=true;}
      stop(){this.onend?.();}
      abort(){this.aborted=true;}
    };
  });
  const panel=await openAssistant(page);const answer=panel.getByRole('region',{name:'Submit Sarthi response'});
  for(const [language,question]of [['en-IN','Why is my application not ready?'],['hi-IN','Mera application ready kyu nahi hai?'],['hi-IN','Ab mujhe next kya karna chahiye?']]) {
    await panel.getByLabel('Voice language').selectOption(language);await panel.getByRole('button',{name:'Start voice input'}).click();await expect(panel.getByRole('status')).toContainText('Listening...');
    expect(await page.evaluate(()=>window.__speechInstances.at(-1).lang)).toBe(language);
    await page.evaluate(text=>{const recognition=window.__speechInstances.at(-1);const result=Object.assign([{transcript:text}],{isFinal:true});recognition.onresult({results:[result]});recognition.onend();},question);
    await expect(panel.getByLabel('Ask about this application')).toHaveValue(question);await expect(answer).toContainText(/Recommended next step|Agla recommended step/);await expect(answer.getByRole('button')).toHaveCount(3);
  }
  await panel.getByRole('button',{name:'Start voice input'}).click();await panel.getByRole('button',{name:'Stop listening'}).click();await expect(panel.getByRole('status')).toContainText("I couldn't understand that");
  await panel.getByRole('button',{name:'Start voice input'}).click();await page.evaluate(()=>{const r=window.__speechInstances.at(-1);r.onerror({error:'not-allowed'});r.onend();});await expect(panel.getByRole('status')).toContainText('Microphone permission was not granted');
  await panel.getByLabel('Ask about this application').fill('मेरी application में क्या missing है?');await panel.getByRole('button',{name:'Ask Submit Sarthi',exact:true}).click();await expect(answer).toContainText('अगला कदम');
  await panel.getByRole('button',{name:'Start voice input'}).click();await panel.getByRole('button',{name:'Close Submit Sarthi'}).click();expect(await page.evaluate(()=>window.__speechInstances.at(-1).aborted)).toBe(true);
  await page.getByRole('button',{name:'SUBMIT SARTHI',exact:true}).click();await expect(panel.getByLabel('Voice language')).toHaveValue('hi-IN');
});
test('unsupported voice keeps the question box and application summary working',async({page})=>{
  await page.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});const panel=await openAssistant(page);
  await expect(panel).toContainText('Voice input is not supported in this browser. You can still type your question.');
  await panel.getByLabel('Ask about this application').fill('Is my PAN verified?');await panel.getByRole('button',{name:'Ask Submit Sarthi',exact:true}).click();await expect(panel.getByRole('region',{name:'Submit Sarthi response'})).toContainText('PAN');
});
