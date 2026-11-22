'use strict';
module.exports=(_req,res)=>{res.setHeader('Cache-Control','no-store');return res.status(410).json({ok:false,code:'UNSAFE_TEST_RETIRED',error:'La prueba que modificaba datos mediante GET fue retirada. Usa pruebas controladas.'});};
