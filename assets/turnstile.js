import { i as react } from "./framework-D_rUT4EX.js";
const R=react();
const SITE_KEY="0x4AAAAAAGQkp-k50TRBvdEe";
let apiPromise,activeWidget=null;
function loadApi(){
  if(window.turnstile)return Promise.resolve(window.turnstile);
  if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async=true;script.defer=true;
    script.onload=()=>window.turnstile?resolve(window.turnstile):reject(new Error("Security check unavailable"));
    script.onerror=()=>{script.remove();apiPromise=undefined;reject(new Error("Security check unavailable"));};
    document.head.appendChild(script);
  });
  return apiPromise;
}
export function resetChallenge(){if(activeWidget!==null&&window.turnstile){try{window.turnstile.reset(activeWidget)}catch{}}}
export function TurnstileField(){
 const ref=R.useRef(null);const [status,setStatus]=R.useState("Loading security check…");
 R.useEffect(()=>{let cancelled=false,id=null;
 loadApi().then(api=>{if(cancelled||!ref.current)return;
  id=api.render(ref.current,{sitekey:SITE_KEY,action:"waitlist",theme:"auto",size:"flexible",appearance:"interaction-only",callback:()=>setStatus("Security check complete."),"expired-callback":()=>{setStatus("Security check expired. Retrying…");resetChallenge()},"error-callback":()=>{setStatus("Security check failed. Reload if it does not retry.")}});
  activeWidget=id;
 }).catch(()=>{if(!cancelled)setStatus("Security check unavailable. Please reload.")});
 return()=>{cancelled=true;if(id!==null&&window.turnstile){try{window.turnstile.remove(id)}catch{}}if(activeWidget===id)activeWidget=null;};
 },[]);
 return R.createElement("div",{className:"waitlist-security"},R.createElement("div",{ref}),R.createElement("small",{role:"status","aria-live":"polite"},status));
}
