import { useEffect, useRef, useState } from 'react';
import { useSessionState } from './useResource';

export function useSarthiVoice({ enabled, contextKey, onText, onQuestion }) {
  const [language,setLanguage]=useSessionState('submitsafe.sarthi-language','en-IN');
  const [listening,setListening]=useState(false); const [notice,setNotice]=useState('');
  const active=useRef(null);const callbacks=useRef({onText,onQuestion}); callbacks.current={onText,onQuestion};
  const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
  function cancel() { const recognition=active.current;active.current=null;if(recognition){recognition.onend=null;recognition.onresult=null;recognition.onerror=null;recognition.abort();}setListening(false); }
  useEffect(()=>{ cancel();setNotice('');return cancel; },[enabled,contextKey]);
  function start() {
    if(!Recognition){setNotice('Voice input is not supported in this browser. You can still type your question.');return;}
    if(!enabled || active.current)return;
    setNotice('');let transcript='';let failed=false;
    const recognition=new Recognition();active.current=recognition;
    recognition.lang=language==='hi-IN'?'hi-IN':'en-IN';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;
    recognition.onresult=event=>{
      if(active.current!==recognition)return;
      let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0].transcript+' ';
      callbacks.current.onText(text.trim().slice(0,1200));
      transcript=Array.from(event.results).filter(result=>result.isFinal).map(result=>result[0].transcript).join(' ').trim().slice(0,1200);
    };
    recognition.onerror=event=>{if(active.current!==recognition)return;failed=true;setNotice(['not-allowed','service-not-allowed'].includes(event.error)?'Microphone permission was not granted. You can still type your question.':"I couldn't understand that. Please try speaking again or type your question.");setListening(false);};
    recognition.onend=()=>{if(active.current!==recognition)return;active.current=null;setListening(false);if(!failed && transcript)callbacks.current.onQuestion(transcript);else if(!failed)setNotice("I couldn't understand that. Please try speaking again or type your question.");};
    try {setListening(true);recognition.start();}catch{active.current=null;setListening(false);setNotice('Microphone permission was not granted. You can still type your question.');}
  }
  return { language,setLanguage,listening,notice,supported:!!Recognition,start,stop:()=>active.current?.stop() };
}
