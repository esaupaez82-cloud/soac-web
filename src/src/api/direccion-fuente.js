'use strict';
const C=require('../lib/core'),A=require('../lib/auth'),{db}=require('../lib/db'),source=require('../lib/source');
module.exports=async(req,res)=>{try{if(req.method!=='GET')return C.json(res,405,{ok:false,error:'MÃ©todo no permitido.'});if(!C.cookies(req)[A.SESSION])C.fail(401,'LOGIN_REQUIRED','Inicia sesiÃ³n para continuar.');const p=db(),s=await A.session(req,p);A.direction(s);return C.json(res,200,{ok:true,...await source.read(p,req,s)});}catch(e){return C.error(res,e);}};
