export const onRequest = () => Response.json({error:"Registration is not available yet. Please check back soon."}, {status:503,headers:{"Cache-Control":"no-store"}});
