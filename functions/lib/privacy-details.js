export function privacyDetails(env){
 const name=typeof env.WAITLIST_CONTROLLER_NAME==="string"?env.WAITLIST_CONTROLLER_NAME.trim():"";
 const email=typeof env.WAITLIST_CONTACT_EMAIL==="string"?env.WAITLIST_CONTACT_EMAIL.trim():"";
 if(!name||name.length>160||email.length>254||!/^[-a-zA-Z0-9.!#$%&'*+/=?^_`{|}~]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(email))return null;
 return {name,email};
}
