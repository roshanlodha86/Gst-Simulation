/**
 * GST Calculation & Rule 88A ITC Offset Engine
 * Implements statutory Indian GST calculation and input tax credit offset algorithm
 */

var GSTEngine = (function() {
  'use strict';

  // Indian State Codes dictionary
  var STATE_CODES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "32": "Kerala",
    "33": "Tamil Nadu", "36": "Telangana", "37": "Andhra Pradesh"
  };

  /**
   * Determine Place of Supply and calculate tax splits
   * @param {string} supplierStateCode e.g. "27"
   * @param {string} posStateCode e.g. "27" or "29"
   * @param {number} taxableValue e.g. 100000
   * @param {number} ratePct e.g. 18
   */
  function calculateItemTax(supplierStateCode, posStateCode, taxableValue, ratePct) {
    taxableValue = Number(taxableValue) || 0;
    ratePct = Number(ratePct) || 0;
    var isIntraState = (String(supplierStateCode) === String(posStateCode));
    var totalTax = (taxableValue * ratePct) / 100;

    if (isIntraState) {
      // Intra-state supply: CGST + SGST (50% each)
      var halfRate = ratePct / 2;
      var halfTax = totalTax / 2;
      return {
        isIntraState: true,
        supplyType: "Intra-State (CGST + SGST)",
        taxableValue: taxableValue,
        ratePct: ratePct,
        igstRate: 0,
        igstAmount: 0,
        cgstRate: halfRate,
        cgstAmount: halfTax,
        sgstRate: halfRate,
        sgstAmount: halfTax,
        totalTax: totalTax,
        totalInvoiceValue: taxableValue + totalTax
      };
    } else {
      // Inter-state supply: IGST (100%)
      return {
        isIntraState: false,
        supplyType: "Inter-State (IGST)",
        taxableValue: taxableValue,
        ratePct: ratePct,
        igstRate: ratePct,
        igstAmount: totalTax,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        totalTax: totalTax,
        totalInvoiceValue: taxableValue + totalTax
      };
    }
  }

  /**
   * Official GST Rule 88A Input Tax Credit (ITC) Offset Algorithm
   * Order of Utilization:
   * 1. IGST Credit -> IGST Liability
   * 2. Remaining IGST Credit -> CGST and SGST Liability in any order
   * 3. CGST Credit -> CGST Liability, then remaining against IGST (never SGST)
   * 4. SGST Credit -> SGST Liability, then remaining against IGST (never CGST)
   * 5. Remaining liabilities must be paid in Cash.
   */
  function offsetItcRule88A(liability, availableItc, availableCash) {
    var liab = {
      igst: Number(liability.igst) || 0,
      cgst: Number(liability.cgst) || 0,
      sgst: Number(liability.sgst) || 0,
      cess: Number(liability.cess) || 0
    };

    var itc = {
      igst: Number(availableItc.igst) || 0,
      cgst: Number(availableItc.cgst) || 0,
      sgst: Number(availableItc.sgst) || 0,
      cess: Number(availableItc.cess) || 0
    };

    var cash = {
      igst: Number(availableCash.igst) || 0,
      cgst: Number(availableCash.cgst) || 0,
      sgst: Number(availableCash.sgst) || 0,
      cess: Number(availableCash.cess) || 0
    };

    var paidWithItc = {
      igstFromIgst: 0,
      cgstFromIgst: 0,
      sgstFromIgst: 0,
      cgstFromCgst: 0,
      igstFromCgst: 0,
      sgstFromSgst: 0,
      igstFromSgst: 0,
      cessFromCess: 0
    };

    // Step 1: IGST Credit against IGST Liability
    var igstSetoff = Math.min(liab.igst, itc.igst);
    paidWithItc.igstFromIgst = igstSetoff;
    liab.igst -= igstSetoff;
    itc.igst -= igstSetoff;

    // Step 2: Remaining IGST Credit against CGST and SGST (Rule 88A)
    if (itc.igst > 0 && liab.cgst > 0) {
      var cgstFromIgst = Math.min(liab.cgst, itc.igst);
      paidWithItc.cgstFromIgst = cgstFromIgst;
      liab.cgst -= cgstFromIgst;
      itc.igst -= cgstFromIgst;
    }
    if (itc.igst > 0 && liab.sgst > 0) {
      var sgstFromIgst = Math.min(liab.sgst, itc.igst);
      paidWithItc.sgstFromIgst = sgstFromIgst;
      liab.sgst -= sgstFromIgst;
      itc.igst -= sgstFromIgst;
    }

    // Step 3: CGST Credit against CGST Liability, then against IGST
    if (itc.cgst > 0 && liab.cgst > 0) {
      var cgstSetoff = Math.min(liab.cgst, itc.cgst);
      paidWithItc.cgstFromCgst = cgstSetoff;
      liab.cgst -= cgstSetoff;
      itc.cgst -= cgstSetoff;
    }
    if (itc.cgst > 0 && liab.igst > 0) {
      var igstFromCgst = Math.min(liab.igst, itc.cgst);
      paidWithItc.igstFromCgst = igstFromCgst;
      liab.igst -= igstFromCgst;
      itc.cgst -= igstFromCgst;
    }

    // Step 4: SGST Credit against SGST Liability, then against IGST
    if (itc.sgst > 0 && liab.sgst > 0) {
      var sgstSetoff = Math.min(liab.sgst, itc.sgst);
      paidWithItc.sgstFromSgst = sgstSetoff;
      liab.sgst -= sgstSetoff;
      itc.sgst -= sgstSetoff;
    }
    if (itc.sgst > 0 && liab.igst > 0) {
      var igstFromSgst = Math.min(liab.igst, itc.sgst);
      paidWithItc.igstFromSgst = igstFromSgst;
      liab.igst -= igstFromSgst;
      itc.sgst -= igstFromSgst;
    }

    // Step 5: Cess Credit against Cess Liability
    if (itc.cess > 0 && liab.cess > 0) {
      var cessSetoff = Math.min(liab.cess, itc.cess);
      paidWithItc.cessFromCess = cessSetoff;
      liab.cess -= cessSetoff;
      itc.cess -= cessSetoff;
    }

    // Step 6: Remaining unpaid liability must be discharged through Cash Ledger
    var paidWithCash = {
      igst: Math.min(liab.igst, cash.igst),
      cgst: Math.min(liab.cgst, cash.cgst),
      sgst: Math.min(liab.sgst, cash.sgst),
      cess: Math.min(liab.cess, cash.cess)
    };

    var shortfallCash = {
      igst: Math.max(0, liab.igst - paidWithCash.igst),
      cgst: Math.max(0, liab.cgst - paidWithCash.cgst),
      sgst: Math.max(0, liab.sgst - paidWithCash.sgst),
      cess: Math.max(0, liab.cess - paidWithCash.cess)
    };

    var totalShortfall = shortfallCash.igst + shortfallCash.cgst + shortfallCash.sgst + shortfallCash.cess;

    return {
      canDischarge: (totalShortfall === 0),
      totalShortfall: totalShortfall,
      paidWithItc: paidWithItc,
      totalItcUtilized: {
        igst: paidWithItc.igstFromIgst + paidWithItc.cgstFromIgst + paidWithItc.sgstFromIgst,
        cgst: paidWithItc.cgstFromCgst + paidWithItc.igstFromCgst,
        sgst: paidWithItc.sgstFromSgst + paidWithItc.igstFromSgst,
        cess: paidWithItc.cessFromCess
      },
      paidWithCash: paidWithCash,
      shortfallCash: shortfallCash,
      remainingItcBalance: itc,
      remainingCashBalance: {
        igst: cash.igst - paidWithCash.igst,
        cgst: cash.cgst - paidWithCash.cgst,
        sgst: cash.sgst - paidWithCash.sgst,
        cess: cash.cess - paidWithCash.cess
      }
    };
  }

  return {
    STATE_CODES: STATE_CODES,
    calculateItemTax: calculateItemTax,
    offsetItcRule88A: offsetItcRule88A
  };
})();
