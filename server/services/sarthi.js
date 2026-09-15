// Presentation only. Readiness, source verification and matching stay in their existing services.
export function questionLanguage(question) {
  if (/[\u0900-\u097f]/u.test(question)) return 'hi';
  return /\b(mera|meri|mere|mujhe|hum|hai|hain|hua|ho gaya|karu|karna|kya|kyu|kyun|kaise|konsa|kaunsa|ab|chahiye|nahi|daal|liye)\b/i.test(question) ? 'hinglish' : 'en';
}
export function requestedAmount(question) {
  const match = question.match(/(?:₹\s*|rs\.?\s*|inr\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|लाख|crore|करोड़)(?=\s|[.,!?]|$)/iu);
  if (!match) { const currency=question.match(/(?:₹|\bINR\b|\bRs\.?)\s*([\d,]+(?:\.\d+)?)/i); const value=currency?Number(currency[1].replaceAll(',','')):0; return value>0 && value<=1e10 ? value : null; }
  const amount = Number(match[1]) * (/crore|करोड़/iu.test(match[2]) ? 10000000 : 100000);
  return amount > 0 && amount <= 1e10 ? amount : null;
}
const choose = (language, en, hi, hinglish) => language === 'hi' ? hi : language === 'hinglish' ? hinglish : en;
export function localizedFact(fact, language) {
  return language === 'en' ? fact.text : fact.translations?.[language] || fact.text;
}
export function answerExtras(context, intent, language) {
  const next = context.actions[0];
  const nextFact = next && context.modelContext.facts.find(f=>f.id===next.factId);
  const recommendedNextStep = nextFact ? localizedFact(nextFact, language) : choose(language,
    'Review the application and give lender-sharing consent when you are ready to prepare it.',
    'Application की details देखें। तैयार होने पर lender के साथ sharing की consent दें।',
    'Application ki details check karein. Taiyar hone par lender sharing ki consent dein.');
  const questions = intent === 'match' || intent === 'compare'
    ? [['Why does this loan match me?','यह loan मुझसे क्यों match करता है?','Yeh loan mere liye kyu match karta hai?'],['What is missing?','अभी क्या missing है?','Abhi kya missing hai?'],['What should I fix first?','पहले क्या ठीक करूँ?','Pehle kya fix karu?']]
    : intent === 'documents' || intent === 'unverified'
      ? [['What else is pending?','और क्या pending है?','Aur kya pending hai?'],['What should I upload next?','अब कौन-सा document upload करूँ?','Ab konsa document upload karu?'],['Check my loan matches','मेरे loan matches बताएं','Mere loan matches batao']]
      : context.summary.blockers || context.summary.review
        ? [['Which documents should I upload?','कौन-से documents upload करूँ?','Konse documents upload karu?'],['Is anything mismatching?','क्या कोई जानकारी mismatch है?','Kya kuch mismatch hai?'],['Which evidence is unverified?','कौन-सा evidence source से verify नहीं हुआ?','Konsa evidence source se verify nahi hua?']]
        : [['Compare my top options.','मेरे top options compare करें','Mere top options compare karo'],['Which evidence is unverified?','कौन-सा evidence source से verify नहीं हुआ?','Konsa evidence source se verify nahi hua?'],['What should I do next?','अब मुझे क्या करना चाहिए?','Ab mujhe kya karna chahiye?']];
  return { recommendedNextStep, suggestions: questions.map(q=>choose(language,...q)).slice(0,3), language };
}
export function introduction(context, intent, language) {
  const issueCount=context.summary.blockers+context.summary.review;
  if (intent==='readiness' || intent==='blockers') return choose(language,
    issueCount?'Your preparation still needs attention. Here is what is holding it up:':'Your current package satisfies the available readiness checks. Source verification is a separate check.',
    issueCount?'आपकी application में अभी कुछ काम बाकी है। ये चीज़ें ठीक करनी हैं:':'आपके package के configured readiness checks पूरे हैं। Source verification अलग check है।',
    issueCount?'Aapki application mein abhi kuch kaam baaki hai. Yeh cheezein fix karni hain:':'Aapke package ke configured readiness checks complete hain. Source verification alag check hai.');
  if(intent==='next')return choose(language,'Fix these in priority order:','इस क्रम में अगला काम करें:','Is priority order mein agla kaam karein:');
  if(intent==='documents')return choose(language,'Here is the recorded document status. A passed readiness check does not mean the issuing authority verified the document.','यह आपके document का recorded status है। Readiness check pass होने का मतलब authority verification नहीं है।','Yeh aapke document ka recorded status hai. Readiness pass hone ka matlab authority verification nahi hai.');
  if(intent==='match' || intent==='compare')return choose(language,'These are the available configured options. Compare the recorded match reasons and indicative costs before choosing.','ये configured options उपलब्ध हैं। चुनने से पहले match reasons और indicative costs देखें।','Yeh configured options available hain. Choose karne se pehle match reasons aur indicative costs dekhein.');
  return '';
}
