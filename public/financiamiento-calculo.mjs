export const terms = [12, 18, 24, 36, 48, 60];
export const gps = {installation: 2300, monthly: 150};

export function referenceDownPercent(year) {
  return year <= 2011 ? 50 : 35;
}

export function quoteFinancing({price, down, year, months, lender, monthlyRate, openingPercent, insurance}) {
  const min = referenceDownPercent(year);
  if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1 ||
      !terms.includes(months) || (year <= 2011 && (lender !== 'CLASA' || months > 18))) {
    throw Error('Revisa el año, la financiera y el plazo. Para 2011 o anteriores, la referencia es CLASA directo a 12 o 18 meses.');
  }
  if (![price,down].every(value=>Number.isFinite(value)&&value>0) || down>=price ||
      Math.round(down*100)<Math.round(price*min)) {
    throw Error('El enganche de referencia debe ser al menos '+min+'% y menor al precio de venta.');
  }
  if (insurance !== null && (!Number.isFinite(insurance)||insurance<0)) throw Error('Revisa el importe del seguro.');
  const direct = lender === 'CLASA';
  if (!direct && lender !== 'Confirmada') throw Error('Selecciona un esquema.');
  const rate = direct ? 3 : monthlyRate;
  const opening = direct ? 3 : openingPercent;
  if (![rate,opening].every(value=>Number.isFinite(value)&&value>=0&&value<=100)) {
    throw Error('Captura la tasa mensual y la apertura confirmadas.');
  }
  const principal=Math.round(price*100)-Math.round(down*100);
  const r=rate/100;
  const regular=Math.round(r===0?principal/months:principal*r/-Math.expm1(-months*Math.log1p(r)));
  let balance=principal;
  const payments=[];
  for(let period=1;period<=months;period++){
    const interest=Math.round(balance*r);
    const capital=period===months?balance:Math.min(balance,Math.max(0,regular-interest));
    balance-=capital;
    const monitoring=direct?gps.monthly:0;
    payments.push({period,capital:capital/100,interest:interest/100,gps:monitoring,total:(capital+interest)/100+monitoring,balance:balance/100});
  }
  const commission=Math.round(principal*opening/100)/100;
  return {principal:principal/100,rate,opening,commission,min,payments,
    initial:Math.round((down+commission+(direct?gps.installation:0)+(insurance??0))*100)/100};
}
