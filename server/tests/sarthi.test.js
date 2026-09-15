import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Store } from '../services/store.js';
import { getConfig } from '../config/index.js';
import { createApp } from '../app.js';
import { seed } from '../seed/data.js';
import { questionLanguage, requestedAmount } from '../services/sarthi.js';
import { rahulProfile, homeDocumentLines } from './homeFixtures.js';
import { analyzeText } from '../services/documentAnalysis.js';

test('Sarthi free-form English/Hindi questions use current facts and question-only loan scenarios',async t=>{
  const config=getConfig({AI_PROVIDER:'MOCK'});const store=new Store(config);await store.connect();await seed(store);t.after(()=>store.close());
  const api=request(createApp({config,store}));const login=(await api.post('/api/auth/login').send({email:'rahul@submitsafe.in',password:'Demo@123'})).body;const auth={Authorization:`Bearer ${login.token}`};
  const ask=async message=>(await api.post('/api/copilot/chat').set(auth).send({loanType:'HOME',message}).expect(200)).body;
  for(const question of ['Why am I not ready?','What should I fix next?','What else is missing?','Is my PAN verified?','Mera application ready hai?','Mera PAN verify hua hai?','Ab mujhe kya karna chahiye?','मेरी application में क्या missing है?','Maine documents daal diye phir bhi ready nahi dikha raha.']){
    const reply=await ask(question);assert.equal(reply.status,'success',question);assert.equal(reply.language,questionLanguage(question));assert.ok(reply.recommendedNextStep);assert.ok(reply.suggestions.length>0 && reply.suggestions.length<=3);assert.ok(reply.answer.includes('MISSING') || reply.answer.includes('Upload'));
    if(questionLanguage(question)==='hi')assert.match(reply.answer,/[\u0900-\u097f]/u);
    if(questionLanguage(question)==='hinglish')assert.match(reply.answer,/hai|karein|baaki/);
  }
  await api.post('/api/loans/match').set(auth).send(rahulProfile).expect(200);
  for(const question of ['I need a ₹10 lakh loan. Suggest the best available match.','Mere liye konsa loan better hai?']){const reply=await ask(question);assert.equal(reply.status,'success');assert.equal(reply.references.filter(r=>r.type==='product').length,3);assert.ok(!reply.answer.includes('guaranteed'));}
  assert.match((await ask('I need a ₹10 lakh loan. Suggest the best available match.')).answer,/INR 1000000/);
  assert.match((await ask('Which loan matches me?')).answer,/INR 2500000/,'Question scenario must not overwrite saved matching input');
  const user=await store.one('User',{email:'rahul@submitsafe.in'});const doc=await store.create('Document',{userId:user._id,documentType:'PAN',status:'passed'});
  await store.create('DocumentAnalysis',{documentId:doc._id,...analyzeText({text:homeDocumentLines.PAN.join('\n'),documentType:'PAN',confidence:95,user})});
  const reply=await ask('Mera PAN verify hua hai?');assert.match(reply.answer,/SOURCE_NOT_VERIFIED|verify nahi hua/);assert.doesNotMatch(reply.answer,/ABCDE1234F|Rahul Sharma/);assert.equal(reply.summary.satisfied,1);
  assert.equal(requestedAmount('10 लाख चाहिए'),1000000);assert.equal(requestedAmount('INR 10,00,000'),1000000);
});
