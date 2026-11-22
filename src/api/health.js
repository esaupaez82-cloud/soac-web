'use strict';
module.exports=(_req,res)=>{res.setHeader('Cache-Control','no-store');return res.status(200).json({ok:true,app:'SOAC® V4 MAESTRO',version:'0.2.0-direccion.3',moduleStatus:'BLOQUEADO_CON_CAUSA',certified:false});};
