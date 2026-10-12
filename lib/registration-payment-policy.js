"use strict";
/* Future registration-fee policy. No live bank/provider integration or public payment endpoints. */
const FEE_NAIRA=2000;
const FEE_KOBO=FEE_NAIRA*100;
const CURRENCY="NGN";
function canActivateRegistration({account,settlement,verification}={}){
 if(!account||account.status!=="pending_payment"||account.ageAssurance!=="verified_adult")
  return Object.freeze({activate:false,reason:"Account eligibility and consent checks are incomplete."});
 if(verification?.emailVerified!==true||verification?.approvedTerms!==true)
  return Object.freeze({activate:false,reason:"Registration ownership checks remain incomplete."});
 if(!settlement||settlement.origin!=="trusted_bank_server"||settlement.signatureVerified!==true)
  return Object.freeze({activate:false,reason:"Signed settlement confirmation is required."});
 if(settlement.currency!==CURRENCY||settlement.amountKobo!==FEE_KOBO||
    settlement.status!=="settled"||settlement.final===false)
  return Object.freeze({activate:false,reason:"Payment is missing, partial, or unsettled."});
 if(typeof account.bankReference!=="string"||!account.bankReference||
    settlement.uniqueReference!==account.bankReference)
  return Object.freeze({activate:false,reason:"Bank payment reference does not match the account."});
 if(typeof settlement.transactionId!=="string"||!settlement.transactionId)
  return Object.freeze({activate:false,reason:"Settlement transaction identity is missing."});
 return Object.freeze({activate:true,reason:"Eligible pending registration has a verified settled bank transfer.",transactionId:settlement.transactionId});
}
/* Caller must enforce transaction uniqueness, atomic state transition,
   signed webhook replay prevention, recheck with provider, refunds/reversals,
   and permanent audit trail in the actual backend before enabling registration. */
module.exports={FEE_NAIRA,FEE_KOBO,CURRENCY,canActivateRegistration};
